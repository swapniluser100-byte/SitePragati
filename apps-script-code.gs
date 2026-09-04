// Paste this entire file into the Apps Script editor
// (Extensions > Apps Script from within your Google Sheet)
//
// This is your lead management system: every enquiry submitted on the
// SitePragati website is logged as a new row in a "Leads" tab and emailed
// to you immediately. The Google Sheet IS your management dashboard —
// no separate admin panel needed.
//
// It also acts as the server-side backend for the Razorpay test-mode demo:
// order creation and payment signature verification happen here, so the
// Razorpay secret key never touches the website's frontend code.
//
// IMPORTANT — Razorpay keys are NOT stored in this file. Set them as
// Script Properties instead (Apps Script's equivalent of a .env file):
//   Project Settings (gear icon) → Script Properties → Add property
//     RAZORPAY_KEY_ID     = rzp_test_...
//     RAZORPAY_KEY_SECRET = ...
// This keeps the secret out of any file that might end up in GitHub.

const RECIPIENT_EMAIL = 'youremail@gmail.com'; // <-- CHANGE THIS to your email

function doPost(e) {
  var sheet = getOrCreateSheet('Leads', [
    'Timestamp', 'Name', 'Business Name', 'Business Type', 'Contact', 'Message'
  ]);

  var name = e.parameter.name || '';
  var business = e.parameter.business || '';
  var businessType = e.parameter.businessType || '';
  var contact = e.parameter.contact || '';
  var message = e.parameter.message || '';
  var timestamp = new Date();

  sheet.appendRow([timestamp, name, business, businessType, contact, message]);

  var subject = 'New enquiry from ' + name + (business ? ' (' + business + ')' : '');
  var body =
    'A new enquiry came in through the SitePragati website:\n\n' +
    'Name: ' + name + '\n' +
    'Business: ' + business + '\n' +
    'Business type: ' + businessType + '\n' +
    'Contact: ' + contact + '\n' +
    'Message: ' + message + '\n' +
    'Received: ' + timestamp;

  MailApp.sendEmail(RECIPIENT_EMAIL, subject, body);

  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handles the Razorpay demo: ?action=create_order and ?action=verify_payment
function doGet(e) {
  var action = e.parameter.action;

  if (action === 'create_order') {
    return createRazorpayOrder(e);
  }
  if (action === 'verify_payment') {
    return verifyRazorpayPayment(e);
  }
  return jsonOutput({ error: 'Unknown action' });
}

function createRazorpayOrder(e) {
  var props = PropertiesService.getScriptProperties();
  var keyId = props.getProperty('RAZORPAY_KEY_ID');
  var keySecret = props.getProperty('RAZORPAY_KEY_SECRET');

  if (!keyId || !keySecret) {
    return jsonOutput({ error: 'Razorpay keys not configured. Set them in Script Properties.' });
  }

  var amountRupees = Number(e.parameter.amount);
  if (!amountRupees || amountRupees < 1) {
    return jsonOutput({ error: 'Invalid amount' });
  }

  var amountPaise = Math.round(amountRupees * 100);
  if (amountPaise < 100) {
    return jsonOutput({ error: 'Minimum amount is ₹1' });
  }

  var payload = {
    amount: amountPaise,
    currency: 'INR',
    receipt: 'receipt_' + new Date().getTime()
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Basic ' + Utilities.base64Encode(keyId + ':' + keySecret)
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch('https://api.razorpay.com/v1/orders', options);
  var data = JSON.parse(response.getContentText());

  if (data.error) {
    return jsonOutput({ error: data.error.description || 'Razorpay error creating order' });
  }

  return jsonOutput({
    order_id: data.id,
    amount: data.amount,
    currency: data.currency,
    key_id: keyId // safe to expose — this is the public key, not the secret
  });
}

function verifyRazorpayPayment(e) {
  var props = PropertiesService.getScriptProperties();
  var keySecret = props.getProperty('RAZORPAY_KEY_SECRET');

  var orderId = e.parameter.razorpay_order_id;
  var paymentId = e.parameter.razorpay_payment_id;
  var signature = e.parameter.razorpay_signature;
  var amount = e.parameter.amount || '';
  var note = e.parameter.note || '';

  if (!orderId || !paymentId || !signature) {
    return jsonOutput({ verified: false, error: 'Missing fields' });
  }
  if (!keySecret) {
    return jsonOutput({ verified: false, error: 'Razorpay keys not configured' });
  }

  var payload = orderId + '|' + paymentId;
  var signatureBytes = Utilities.computeHmacSha256Signature(payload, keySecret);
  var computedSignature = signatureBytes.map(function (byte) {
    var v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');

  var verified = (computedSignature === signature);

  if (verified) {
    var sheet = getOrCreateSheet('Payments', [
      'Timestamp', 'Order ID', 'Payment ID', 'Amount (₹)', 'Note', 'Status'
    ]);
    sheet.appendRow([new Date(), orderId, paymentId, amount, note, 'Verified']);

    MailApp.sendEmail(
      RECIPIENT_EMAIL,
      'Payment verified — ₹' + amount,
      'A payment was successfully created and verified via Razorpay.\n\n' +
      'Order ID: ' + orderId + '\n' +
      'Payment ID: ' + paymentId + '\n' +
      'Amount: ₹' + amount + '\n' +
      'Note: ' + note
    );
  }

  return jsonOutput({ verified: verified });
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

