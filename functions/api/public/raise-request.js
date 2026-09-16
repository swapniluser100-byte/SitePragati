// Public, unauthenticated endpoint so a customer's OWN website can link
// straight to /raise-request.html?customerId=<unique_id> and let them
// raise a support ticket without logging into the portal.
//
// GET  ?customerId=<unique_id>              -> { business_name } if valid
// GET  ?customerId=<unique_id>&ticketId=<n> -> { business_name, ticket }
//      so a customer can check status without logging in. Scoped to
//      BOTH ids together — a ticket's numeric id alone is guessable/
//      sequential, so it's only ever looked up joined against the
//      customer_id it belongs to, never on its own.
// POST multipart form { customerId, subject, description, file? }
//      -> creates a ticket for that customer (+ a ticket_comments row
//         with the file, if one was attached), notifies the admin, and
//         returns the new ticket's id so the customer can save it to
//         check status later.
//
// customerId here is always the customer's public `unique_id` (a random
// 15-char string from generateRandomId, shown in the admin Customers
// tab) — never the internal numeric `id` — so this can't be used to
// enumerate or address other customers.

import { json } from '../../_utils/auth.js';
import { brandedEmailHtml, sendResendEmail } from '../../_utils/email.js';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

async function findCustomer(env, uniqueId) {
  if (!uniqueId) return null;
  return env.DB.prepare(
    'SELECT id, business_name FROM customers WHERE unique_id = ?'
  ).bind(uniqueId).first();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const uniqueId = (url.searchParams.get('customerId') || '').trim();
  const ticketId = (url.searchParams.get('ticketId') || '').trim();

  const customer = await findCustomer(env, uniqueId);
  if (!customer) return json({ error: 'Customer not found' }, 404);

  if (ticketId) {
    const ticket = await env.DB.prepare(
      'SELECT id, subject, status, created_at FROM tickets WHERE id = ? AND customer_id = ?'
    ).bind(Number(ticketId), customer.id).first();

    if (!ticket) return json({ error: 'No request found with that ID for this customer' }, 404);
    return json({ business_name: customer.business_name, ticket });
  }

  return json({ business_name: customer.business_name });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const formData = await request.formData();
    const uniqueId = (formData.get('customerId') || '').toString().trim();
    const subject = (formData.get('subject') || '').toString().trim();
    const description = (formData.get('description') || '').toString().trim();
    const file = formData.get('file');
    const hasFile = file && typeof file === 'object' && file.size > 0;

    const customer = await findCustomer(env, uniqueId);
    if (!customer) return json({ error: 'Customer not found' }, 404);
    if (!subject) return json({ error: 'Subject is required' }, 400);
    if (hasFile && file.size > MAX_FILE_BYTES) {
      return json({ error: 'File is too large (10MB max)' }, 400);
    }

    const result = await env.DB.prepare(
      `INSERT INTO tickets (customer_id, subject, description, status)
       VALUES (?, ?, ?, 'Open')`
    ).bind(customer.id, subject, description).run();

    const ticketId = result.meta.last_row_id;
    let fileName = null;

    if (hasFile) {
      const fileKey = `ticket-${ticketId}/${Date.now()}-${file.name}`;
      await env.TICKET_FILES.put(fileKey, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' }
      });
      fileName = file.name;

      await env.DB.prepare(
        `INSERT INTO ticket_comments (ticket_id, author_type, author_name, comment, file_key, file_name)
         VALUES (?, 'customer', ?, '', ?, ?)`
      ).bind(ticketId, customer.business_name, fileKey, fileName).run();
    }

    if (env.NOTIFY_EMAIL) {
      const emailSubject = `New request from ${customer.business_name}: ${subject}`;
      const bodyText =
        `A new request was raised via the external "Raise a Request" page:\n\n` +
        `Business: ${customer.business_name}\nSubject: ${subject}\nDescription: ${description}` +
        (fileName ? `\nAttachment: ${fileName}` : '');

      const html = brandedEmailHtml({
        badgeText: 'New request',
        introText: `${customer.business_name} raised a new request through the external request page.`,
        rows: [
          ['Business', customer.business_name],
          ['Subject', subject],
          ['Description', description],
          fileName ? ['Attachment', fileName] : null
        ].filter(Boolean),
        footerText: 'Manage this ticket in your admin console → Tickets tab.'
      });

      await sendResendEmail(env, { to: env.NOTIFY_EMAIL, subject: emailSubject, text: bodyText, html });
      // Ticket is already saved in D1 regardless of whether the email succeeds.
    }

    return json({ result: 'success', ticket_id: ticketId });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
