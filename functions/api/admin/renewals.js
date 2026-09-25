// /api/admin/renewals — protected by _middleware.js
// GET    → list all renewals, joined with the customer's business name,
//          contact name, email, phone, and unique_id (for search/display).
//          Also opportunistically auto-creates a Pending renewal for any
//          renewal_required customer who doesn't already have one — see
//          autoCreateMissingRenewals below.
// POST   → { customer_id, frequency, due_date, amount, status? } →
//          create a new renewal record (status defaults to 'Pending';
//          pass 'Renewed' only when backfilling an already-paid cycle).
//          Also creates a matching transaction — 'Pending' unless the
//          renewal itself was created 'Renewed', in which case 'Paid'.
// PUT    → { id, customer_id, frequency, due_date, amount, status } →
//          edit an existing renewal record's details, including a
//          direct status correction. Keeps the renewal's linked
//          transaction (by renewal_id) in sync: same amount/frequency/
//          due date, and status mirrors Pending -> Pending, Renewed ->
//          Paid. This does NOT create a next-cycle renewal; that
//          cascade only happens via PATCH (the "Renew" button).
// PATCH  → { id } → mark a renewal "Renewed" (flips its linked
//          transaction from Pending to Paid — no new transaction is
//          created here), and automatically creates the next cycle's
//          renewal for the same customer (due_date advanced by
//          `frequency`, same amount) along with ITS OWN new Pending
//          transaction. Returns the just-renewed record and the newly
//          created next-cycle record.
// DELETE → { id } → remove a renewal record and its linked transaction

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

// Keeps a renewal's linked transaction (matched by renewal_id) mirroring
// the renewal itself: Pending renewal -> Pending transaction dated its
// due_date; Renewed renewal -> Paid transaction dated when it was
// renewed. Creates the transaction if this renewal doesn't have one yet
// (every renewal-writing path below calls this, so in practice one
// always exists after the first call) — this keeps the two rows in
// sync regardless of which endpoint changed the renewal.
async function syncRenewalTransaction(env, renewal) {
  const isRenewed = renewal.status === 'Renewed';
  const txnStatus = isRenewed ? 'Paid' : 'Pending';
  const transactionDate = isRenewed
    ? (renewal.renewed_at ? renewal.renewed_at.slice(0, 10) : new Date().toISOString().slice(0, 10))
    : renewal.due_date;
  const description = `Renewal payment (${renewal.frequency}) — due ${renewal.due_date}`;

  const existing = await env.DB.prepare('SELECT id FROM transactions WHERE renewal_id = ?').bind(renewal.id).first();
  if (existing) {
    await env.DB.prepare(
      `UPDATE transactions SET customer_id = ?, amount = ?, transaction_date = ?, description = ?, status = ? WHERE id = ?`
    ).bind(renewal.customer_id, renewal.amount, transactionDate, description, txnStatus, existing.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO transactions (customer_id, amount, transaction_date, description, status, renewal_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(renewal.customer_id, renewal.amount, transactionDate, description, txnStatus, renewal.id).run();
  }
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

    const insertResult = await env.DB.prepare(
      `INSERT INTO renewals (customer_id, frequency, due_date, amount, status)
       VALUES (?, ?, ?, ?, 'Pending')`
    ).bind(c.id, frequency, dueDate, amount).run();

    await syncRenewalTransaction(env, {
      id: insertResult.meta.last_row_id, customer_id: c.id, frequency, due_date: dueDate, amount, status: 'Pending', renewed_at: null
    });
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

    const renewedAt = status === 'Renewed' ? new Date().toISOString() : null;

    const result = await env.DB.prepare(
      `INSERT INTO renewals (customer_id, frequency, due_date, amount, status, renewed_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(customerId, frequency, dueDate, amount, status, renewedAt).run();

    await syncRenewalTransaction(env, {
      id: result.meta.last_row_id, customer_id: customerId, frequency, due_date: dueDate, amount, status, renewed_at: renewedAt
    });

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

    await syncRenewalTransaction(env, {
      id: body.id, customer_id: customerId, frequency, due_date: dueDate, amount, status, renewed_at: renewedAt
    });

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

    // Flips this renewal's existing linked transaction from Pending to
    // Paid — no new transaction is created here.
    await syncRenewalTransaction(env, {
      id: current.id, customer_id: current.customer_id, frequency: current.frequency,
      due_date: current.due_date, amount: current.amount, status: 'Renewed', renewed_at: now
    });

    const nextDueDate = advanceDueDate(current.due_date, current.frequency);
    const insertResult = await env.DB.prepare(
      `INSERT INTO renewals (customer_id, frequency, due_date, amount, status)
       VALUES (?, ?, ?, ?, 'Pending')`
    ).bind(current.customer_id, current.frequency, nextDueDate, current.amount).run();

    // The next cycle starts life Pending, with its own new transaction.
    await syncRenewalTransaction(env, {
      id: insertResult.meta.last_row_id, customer_id: current.customer_id, frequency: current.frequency,
      due_date: nextDueDate, amount: current.amount, status: 'Pending', renewed_at: null
    });

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

    // Explicit, in case FK cascade isn't enforced depending on D1's
    // pragma settings — same defensive pattern used elsewhere.
    await env.DB.prepare('DELETE FROM transactions WHERE renewal_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM renewals WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
