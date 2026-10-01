// /api/admin/recommendations — protected by _middleware.js
// GET    ?customer_id=X → list recommendations for one customer, newest first
// POST   → create a new recommendation { customer_id, name, details }
// PUT    → { id, ...fields } → update an existing recommendation
// DELETE → { id } → remove one

import { json } from '../../_utils/auth.js';
import { brandedEmailHtml, sendResendEmail } from '../../_utils/email.js';

const FIELDS = ['customer_id', 'name', 'details'];

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customer_id');

    if (!customerId) return json({ error: 'customer_id query param is required' }, 400);

    const { results } = await env.DB.prepare(
      'SELECT * FROM recommendations WHERE customer_id = ? ORDER BY id DESC'
    ).bind(customerId).all();

    return json({ recommendations: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.customer_id || !body.name) {
      return json({ error: 'customer_id and name are required' }, 400);
    }

    const customer = await env.DB.prepare(
      'SELECT business_name, email FROM customers WHERE id = ?'
    ).bind(body.customer_id).first();
    if (!customer) return json({ error: 'Customer not found' }, 404);

    const values = FIELDS.map(f => body[f] ?? null);
    const placeholders = FIELDS.map(() => '?').join(', ');

    await env.DB.prepare(
      `INSERT INTO recommendations (${FIELDS.join(', ')}) VALUES (${placeholders})`
    ).bind(...values).run();

    if (customer.email) {
      const portalUrl = `${new URL(request.url).origin}/portal.html`;
      const emailSubject = `A new recommendation for ${customer.business_name}: ${body.name}`;
      const bodyText =
        `Hi ${customer.business_name}, our team has a new recommendation to help improve your website:\n\n` +
        `${body.name}\n${body.details || ''}\n\n` +
        `Log in to your customer portal to view this and any other recommendations: ${portalUrl}`;

      const html = brandedEmailHtml({
        badgeText: 'New recommendation',
        introText: `Hi ${customer.business_name}, we've been reviewing your website and have a new recommendation we think could help your business — take a look below, and let us know if you'd like help putting it in place.`,
        rows: [
          ['Recommendation', body.name],
          ['Why it helps', body.details || '']
        ],
        ctaText: 'View in your portal',
        ctaUrl: portalUrl,
        footerText: 'Log in to your customer portal any time to see this and any other recommendations.'
      });

      await sendResendEmail(env, { to: customer.email, subject: emailSubject, text: bodyText, html });
      // Recommendation is already saved in D1 regardless of whether the email succeeds.
    }

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.id) return json({ error: 'id is required' }, 400);
    if (!body.name) return json({ error: 'name is required' }, 400);

    const setClause = FIELDS.map(f => `${f} = ?`).join(', ');
    const values = FIELDS.map(f => body[f] ?? null);

    await env.DB.prepare(
      `UPDATE recommendations SET ${setClause} WHERE id = ?`
    ).bind(...values, body.id).run();

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

    await env.DB.prepare('DELETE FROM recommendations WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
