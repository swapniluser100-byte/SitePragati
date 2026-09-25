// /api/admin/renewals — protected by _middleware.js
// GET    → list all renewals, joined with the customer's business name,
//          contact name, email, phone, and unique_id (for search/display).
//          Also opportunistically auto-creates a Pending renewal for any
//          renewal_required customer who doesn't already have one — see
//          autoCreateMissingRenewals below.
// POST   → { customer_id, frequency, due_date, amount, status? } →
//          create a new renewal record (status defaults to 'Pending';
//          pass 'Renewed' only when backfilling an already-paid cycle)
// PUT    → { id, customer_id, frequency, due_date, amount, status } →
//          edit an existing renewal record's details, including a
//          direct status correction. This is a plain field update —
//          it does NOT create a next-cycle renewal or a transaction
//          even if status is set to 'Renewed' here; that cascade only
//          happens via PATCH (the "Renew" button).
// PATCH  → { id } → mark a renewal "Renewed", automatically create the
//          next cycle's renewal for the same customer (due_date
//          advanced by `frequency`, same amount), and log a matching
//          'Paid' transaction for the customer. Returns the just-
//          renewed record and the newly created next-cycle record.
// DELETE → { id } → remove a renewal record

import { json } from '../../_utils/auth.js';

const FREQUENCY_MONTHS = { 'Monthly': 1, 'Half Yearly': 6, 'Yearly': 12 };
const STATUS_OPTIONS = ['Pending', 'Renewed'];

// Advances an ISO date string by N months, clamping to the last day of
// the target month when the original day doesn't exist there (e.g.
// Jan 31 + 1 month -> Feb 28/29, not an overflowed March date).
function advanceDueDate(dateStr, frequency) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const monthsToAdd = FREQUENCY_MONTHS[frequency] || 12;

  let newMonthIndex = (m - 1) + monthsToAdd;
  const newYear = y + Math.floor(newMonthIndex / 12);
  newMonthIndex = ((newMonthIndex % 12) + 12) % 12;

  const daysInNewMonth = new Date(Date.UTC(newYear, newMonthIndex + 1, 0)).getUTCDate();
  const newDay = Math.min(d, daysInNewMonth);

  const mm = String(newMonthIndex + 1).padStart(2, '0');
  const dd = String(newDay).padStart(2, '0');
  return `${newYear}-${mm}-${dd}`;
}

// For every customer with renewal_required checked, makes sure at
// least one Pending renewal is queued up for them. Skips a customer
// entirely if they already have ANY Pending renewal (whether created
// manually, by the Renew button's own next-cycle cascade, or by a
// previous run of this same check) — that's what stops this from ever
// creating a duplicate.
//
// When a customer has no Pending renewal, prefer advancing from their
// most recently Renewed cycle (same due-date math the Renew button
// uses) — this matters when a renewal was marked Renewed directly via
// the edit form instead of the Renew button, which doesn't create a
// next cycle on its own; advancing from history here avoids reseeding
// the same stale due date. Only a customer with NO renewal history at
// all falls back to their customers.next_payment_due_date/amount
// columns — these are no longer editable from the admin console (the
// form fields were removed), so that fallback only still helps
// customers who already had them set before that change. For any
// customer who's never had a renewal, seed their first cycle with
// "+ Create Renewal" in this tab; every cycle after that is handled
// automatically by this function and the Renew button.
async function autoCreateMissingRenewals(env) {
  const { results: candidates } = await env.DB.prepare(`
    SELECT id, next_payment_due_date, next_payment_due_amount, renewal_frequency
    FROM customers
    WHERE renewal_required = 1
  `).all();

  for (const c of candidates) {
    if (!FREQUENCY_MONTHS[c.renewal_frequency]) continue;

    const existingPending = await env.DB.prepare(
      `SELECT id FROM renewals WHERE customer_id = ? AND status = 'Pending' LIMIT 1`
    ).bind(c.id).first();
    if (existingPending) continue;

    const lastRenewed = await env.DB.prepare(
      `SELECT due_date, amount, frequency FROM renewals
       WHERE customer_id = ? AND status = 'Renewed'
       ORDER BY due_date DESC LIMIT 1`
    ).bind(c.id).first();

    let dueDate, amount, frequency;
    if (lastRenewed) {
      frequency = lastRenewed.frequency;
      dueDate = advanceDueDate(lastRenewed.due_date, frequency);
      amount = lastRenewed.amount;
    } else if (c.next_payment_due_date && c.next_payment_due_amount) {
      frequency = c.renewal_frequency;
      dueDate = c.next_payment_due_date;
      amount = c.next_payment_due_amount;
    } else {
      continue;
    }

    await env.DB.prepare(
      `INSERT INTO renewals (customer_id, frequency, due_date, amount, status)
       VALUES (?, ?, ?, ?, 'Pending')`
    ).bind(c.id, frequency, dueDate, amount).run();
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    await autoCreateMissingRenewals(env);

    const { results } = await env.DB.prepare(`
      SELECT
        renewals.*,
        customers.business_name, customers.contact_name,
        customers.email, customers.phone, customers.unique_id AS customer_unique_id
      FROM renewals
      JOIN customers ON customers.id = renewals.customer_id
      ORDER BY renewals.due_date ASC
    `).all();
    return json({ renewals: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const customerId = Number(body.customer_id);
    const frequency = body.frequency;
    const dueDate = (body.due_date || '').trim();
    const amount = Number(body.amount);
    const status = STATUS_OPTIONS.includes(body.status) ? body.status : 'Pending';

    if (!customerId) return json({ error: 'customer_id is required' }, 400);
    if (!FREQUENCY_MONTHS[frequency]) return json({ error: 'frequency must be Monthly, Half Yearly, or Yearly' }, 400);
    if (!dueDate) return json({ error: 'due_date is required' }, 400);
    if (!amount || amount <= 0) return json({ error: 'amount must be greater than 0' }, 400);

    const result = await env.DB.prepare(
      `INSERT INTO renewals (customer_id, frequency, due_date, amount, status)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(customerId, frequency, dueDate, amount, status).run();

    return json({ result: 'success', id: result.meta.last_row_id });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.id) return json({ error: 'id is required' }, 400);

    const customerId = Number(body.customer_id);
    const frequency = body.frequency;
    const dueDate = (body.due_date || '').trim();
    const amount = Number(body.amount);
    const status = STATUS_OPTIONS.includes(body.status) ? body.status : 'Pending';

    if (!customerId) return json({ error: 'customer_id is required' }, 400);
    if (!FREQUENCY_MONTHS[frequency]) return json({ error: 'frequency must be Monthly, Half Yearly, or Yearly' }, 400);
    if (!dueDate) return json({ error: 'due_date is required' }, 400);
    if (!amount || amount <= 0) return json({ error: 'amount must be greater than 0' }, 400);

    // Setting status to Renewed directly here (rather than via the
    // Renew button) still needs a renewed_at timestamp, or this record
    // would silently vanish from the "Renewed this month/year" stats,
    // which key off renewed_at. Only stamp it the moment it FIRST
    // becomes Renewed — leave an already-Renewed record's original
    // timestamp alone on later edits, and clear it if reverted back to
    // Pending.
    const existing = await env.DB.prepare('SELECT status, renewed_at FROM renewals WHERE id = ?').bind(body.id).first();
    let renewedAt = existing ? existing.renewed_at : null;
    if (status === 'Renewed' && (!existing || existing.status !== 'Renewed')) {
      renewedAt = new Date().toISOString();
    } else if (status === 'Pending') {
      renewedAt = null;
    }

    await env.DB.prepare(
      `UPDATE renewals SET customer_id = ?, frequency = ?, due_date = ?, amount = ?, status = ?, renewed_at = ? WHERE id = ?`
    ).bind(customerId, frequency, dueDate, amount, status, renewedAt, body.id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  try {
    const { id } = await request.json();
    if (!id) return json({ error: 'id is required' }, 400);

    const current = await env.DB.prepare('SELECT * FROM renewals WHERE id = ?').bind(id).first();
    if (!current) return json({ error: 'Renewal not found' }, 404);
    if (current.status === 'Renewed') return json({ error: 'This renewal is already marked Renewed' }, 400);

    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE renewals SET status = 'Renewed', renewed_at = ? WHERE id = ?`
    ).bind(now, id).run();

    const nextDueDate = advanceDueDate(current.due_date, current.frequency);
    const insertResult = await env.DB.prepare(
      `INSERT INTO renewals (customer_id, frequency, due_date, amount, status)
       VALUES (?, ?, ?, ?, 'Pending')`
    ).bind(current.customer_id, current.frequency, nextDueDate, current.amount).run();

    const transactionDate = now.slice(0, 10);
    const description = `Renewal payment (${current.frequency}) — due ${current.due_date}`;
    await env.DB.prepare(
      `INSERT INTO transactions (customer_id, amount, transaction_date, description, status)
       VALUES (?, ?, ?, ?, 'Paid')`
    ).bind(current.customer_id, current.amount, transactionDate, description).run();

    return json({
      result: 'success',
      renewed: { id: current.id, due_date: current.due_date, amount: current.amount, status: 'Renewed' },
      next: { id: insertResult.meta.last_row_id, due_date: nextDueDate, amount: current.amount, status: 'Pending' }
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  try {
    const { id } = await request.json();
    if (!id) return json({ error: 'id is required' }, 400);

    await env.DB.prepare('DELETE FROM renewals WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
