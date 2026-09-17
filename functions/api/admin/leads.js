// /api/admin/leads — protected by _middleware.js
// GET    → list all leads, newest first
// POST   → { name, business, business_type, contact, status, message } →
//          add a lead manually (e.g. a phone or in-person enquiry that
//          didn't come through the website's contact form) — emails
//          NOTIFY_EMAIL a confirmation, same as a lead from the public
//          contact form, so it shows up in your inbox either way
// PUT    → { id, name, business, business_type, contact, status, message }
//          → edit an existing lead's full details
// PATCH  → { id, status } → update just a lead's status (used by the
//          inline status dropdown in the leads table)
// DELETE → { id } → remove a lead

import { json } from '../../_utils/auth.js';
import { brandedEmailHtml, sendResendEmail } from '../../_utils/email.js';

const STATUS_OPTIONS = ['New', 'Contacted', 'Won', 'Lost'];

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM leads ORDER BY created_at DESC'
    ).all();
    return json({ leads: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) return json({ error: 'name is required' }, 400);

    const status = STATUS_OPTIONS.includes(body.status) ? body.status : 'New';

    const result = await env.DB.prepare(
      `INSERT INTO leads (name, business, business_type, contact, status, message)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(name, body.business || null, body.business_type || null, body.contact || null, status, body.message || null).run();

    if (env.NOTIFY_EMAIL) {
      const subject = `New lead added: ${name}${body.business ? ' (' + body.business + ')' : ''}`;
      const bodyText =
        `A lead was added manually in the admin console:\n\n` +
        `Name: ${name}\nBusiness: ${body.business || ''}\nBusiness type: ${body.business_type || ''}\n` +
        `Contact: ${body.contact || ''}\nStatus: ${status}\nMessage: ${body.message || ''}`;

      const html = brandedEmailHtml({
        badgeText: 'New lead',
        introText: 'A lead was added manually in the admin console.',
        rows: [
          ['Name', name],
          ['Business', body.business],
          ['Business type', body.business_type],
          ['Contact', body.contact],
          ['Status', status],
          ['Message', body.message]
        ],
        footerText: 'Sent automatically from your SitePragati admin backend.'
      });

      await sendResendEmail(env, { to: env.NOTIFY_EMAIL, subject, text: bodyText, html });
      // Lead is already saved in D1 regardless of whether the email succeeds.
    }

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
    const name = (body.name || '').trim();
    if (!name) return json({ error: 'name is required' }, 400);

    const status = STATUS_OPTIONS.includes(body.status) ? body.status : 'New';

    await env.DB.prepare(
      `UPDATE leads SET name = ?, business = ?, business_type = ?, contact = ?, status = ?, message = ?
       WHERE id = ?`
    ).bind(name, body.business || null, body.business_type || null, body.contact || null, status, body.message || null, body.id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  try {
    const { id, status } = await request.json();
    if (!id || !status) return json({ error: 'id and status are required' }, 400);

    await env.DB.prepare('UPDATE leads SET status = ? WHERE id = ?')
      .bind(status, id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  try {
    const { id } = await request.json();
    if (!id) return json({ error: 'id is required' }, 400);

    await env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
