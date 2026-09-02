// Paste this entire file into the Apps Script editor
// (Extensions > Apps Script from within your Google Sheet)
//
// This is your lead management system: every enquiry submitted on the
// SitePragati website is logged as a new row in a "Leads" tab and emailed
// to you immediately. The Google Sheet IS your management dashboard —
// no separate admin panel needed.

const RECIPIENT_EMAIL = "swapniluser100@gmail.com"; // <-- CHANGE THIS to your email

function doPost(e) {
  var sheet = getOrCreateSheet("Leads", [
    "Timestamp",
    "Name",
    "Business Name",
    "Business Type",
    "Contact",
    "Message",
  ]);

  var name = e.parameter.name || "";
  var business = e.parameter.business || "";
  var businessType = e.parameter.businessType || "";
  var contact = e.parameter.contact || "";
  var message = e.parameter.message || "";
  var timestamp = new Date();

  sheet.appendRow([timestamp, name, business, businessType, contact, message]);

  var subject =
    "New enquiry from " + name + (business ? " (" + business + ")" : "");
  var body =
    "A new enquiry came in through the SitePragati website:\n\n" +
    "Name: " +
    name +
    "\n" +
    "Business: " +
    business +
    "\n" +
    "Business type: " +
    businessType +
    "\n" +
    "Contact: " +
    contact +
    "\n" +
    "Message: " +
    message +
    "\n" +
    "Received: " +
    timestamp;

  MailApp.sendEmail(RECIPIENT_EMAIL, subject, body);

  return ContentService.createTextOutput(
    JSON.stringify({ result: "success" }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  return sheet;
}
