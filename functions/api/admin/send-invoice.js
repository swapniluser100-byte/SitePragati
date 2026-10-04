// POST /api/admin/send-invoice — { customerId, transactionId } to invoice an
// existing Pending/Overdue transaction as-is, or { customerId, amount,
// description } to invoice a fresh amount typed on the spot (not tied to
// any transaction, nothing is recorded). Emails the customer a branded
// invoice with the amount/description and a UPI QR code to pay, same
// UPI ID (customer's own, falling back to the app default) and QR style
// already used for ticket payments.

import { json } from '../../_utils/auth.js';
import { brandedEmailHtml, sendResendEmail, esc } from '../../_utils/email.js';

const PAYEE_NAME = 'SitePragati';

function buildUpiLink(upiId, amount, note) {
  const params = new URLSearchParams({ pa: upiId, pn: PAYEE_NAME, cu: 'INR' });
  if (amount) params.set('am', amount);
  if (note) params.set('tn', note);
  return 'upi://pay?' + params.toString();
}

function upiQrUrl(upiId, amount, note) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(buildUpiLink(upiId, amount, note));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const customerId = body.customerId;
    if (!customerId) return json({ error: 'customerId is required' }, 400);

    const customer = await env.DB.prepare(
      'SELECT id, business_name, email, upi_id FROM customers WHERE id = ?'
    ).bind(customerId).first();
    if (!customer) return json({ error: 'Customer not found' }, 404);
    if (!customer.email) return json({ error: 'This customer has no login email set — add one first' }, 400);

    let amount, description;
    if (body.transactionId) {
      const txn = await env.DB.prepare(
        'SELECT id, customer_id, amount, description FROM transactions WHERE id = ?'
      ).bind(body.transactionId).first();
      if (!txn || Number(txn.customer_id) !== Number(customer.id)) {
        return json({ error: 'Transaction not found for this customer' }, 404);
      }
      amount = txn.amount;
      description = txn.description || '';
    } else {
      amount = Number(body.amount);
      description = (body.description || '').trim();
      if (!amount || amount <= 0) return json({ error: 'A valid amount is required' }, 400);
    }

    const upiId = customer.upi_id || env.PAYMENT_UPI_ID;
    const amountDisplay = Number(amount).toLocaleString('en-IN');
    const qrUrl = upiQrUrl(upiId, amount, description || 'Invoice');

    const html = brandedEmailHtml({
      badgeText: 'Invoice',
      introText: `Here's an invoice from SitePragati, ${customer.business_name}.`,
      rows: [
        ['Amount', `₹${amountDisplay}`],
        ['Description', description]
      ],
      footerText: 'Scan the QR code above with any UPI app (Google Pay, PhonePe, Paytm, etc.) to pay.',
      extraHtml: `
        <p style="text-align:center; margin:24px 0 4px;">
          <img src="${qrUrl}" alt="Scan to pay via UPI" width="180" height="180" style="display:block; margin:0 auto; border-radius:8px;">
        </p>
        <p style="text-align:center; font-size:13px; color:#545B70; margin:8px 0 0;">UPI ID: ${esc(upiId)}</p>`
    });

    const sendResult = await sendResendEmail(env, {
      to: customer.email,
      subject: `Invoice from SitePragati — ₹${amountDisplay}`,
      text: `Invoice from SitePragati\nAmount: ₹${amountDisplay}\nDescription: ${description || '-'}\n\nPay via UPI ID: ${upiId}`,
      html
    });

    if (!sendResult.ok) return json({ error: 'Could not send the invoice email. Check RESEND_API_KEY/FROM_EMAIL are configured.' }, 500);

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
