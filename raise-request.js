// Public "Raise a Request" page — customers reach this via a link on
// their own website with their unique customer ID in the URL, e.g.
// https://sitepragati.in/raise-request?customerId=abc123. No login
// required; the customer field is read-only, sourced entirely from
// the server-verified ID, never from anything the visitor types.
//
// If the ID is missing from the URL (or turns out invalid), the
// visitor can type it in directly instead of hitting a dead end.

const params = new URLSearchParams(window.location.search);
let currentCustomerId = (params.get('customerId') || '').trim();

const loadingNote = document.getElementById('loadingNote');
const lookupForm = document.getElementById('lookupForm');
const lookupError = document.getElementById('lookupError');
const form = document.getElementById('requestForm');
const successNote = document.getElementById('successNote');
const modeToggle = document.getElementById('modeToggle');
const trackForm = document.getElementById('trackForm');
const trackError = document.getElementById('trackError');
const trackResult = document.getElementById('trackResult');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function setMode(mode) {
  modeToggle.querySelectorAll('.mode-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  form.hidden = mode !== 'raise';
  trackForm.hidden = mode !== 'track';
  trackResult.hidden = true;
  trackError.hidden = true;
  successNote.hidden = true;
}

modeToggle.querySelectorAll('.mode-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

function showLookupForm(message) {
  loadingNote.hidden = true;
  form.hidden = true;
  lookupForm.hidden = false;
  if (message) {
    lookupError.hidden = false;
    lookupError.textContent = message;
  } else {
    lookupError.hidden = true;
  }
}

async function lookupCustomer(id) {
  const res = await fetch(`/api/public/raise-request?customerId=${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || data.error) return null;
  return data;
}

async function init() {
  if (!currentCustomerId) {
    loadingNote.hidden = true;
    showLookupForm();
    return;
  }

  loadingNote.hidden = false;
  const customer = await lookupCustomer(currentCustomerId).catch(() => null);

  if (!customer) {
    showLookupForm("We couldn't find an account for that customer ID. Please check it and try again.");
    return;
  }

  document.getElementById('customerDisplay').value = customer.business_name;
  loadingNote.hidden = true;
  lookupForm.hidden = true;
  modeToggle.hidden = false;
  setMode('raise');
}

lookupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('lookupCustomerId').value.trim();
  const lookupBtn = document.getElementById('lookupBtn');

  if (!id) return;

  lookupBtn.disabled = true;
  lookupError.hidden = true;

  const customer = await lookupCustomer(id).catch(() => null);
  lookupBtn.disabled = false;

  if (!customer) {
    lookupError.hidden = false;
    lookupError.textContent = "We couldn't find an account for that customer ID. Please check it and try again.";
    return;
  }

  currentCustomerId = id;
  document.getElementById('customerDisplay').value = customer.business_name;
  lookupForm.hidden = true;
  modeToggle.hidden = false;
  setMode('raise');

  // Keep the URL shareable/refreshable once we know a valid ID.
  const url = new URL(window.location.href);
  url.searchParams.set('customerId', id);
  window.history.replaceState({}, '', url);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const subject = document.getElementById('reqSubject').value.trim();
  const description = document.getElementById('reqDescription').value.trim();
  const file = document.getElementById('reqFile').files[0];
  const statusNote = document.getElementById('reqStatusNote');
  const submitBtn = document.getElementById('reqSubmitBtn');

  if (!subject) {
    statusNote.textContent = 'Please enter what this request is about.';
    return;
  }

  const formData = new FormData();
  formData.append('customerId', currentCustomerId);
  formData.append('subject', subject);
  formData.append('description', description);
  if (file) formData.append('file', file);

  submitBtn.disabled = true;
  statusNote.textContent = 'Submitting…';

  try {
    const res = await fetch('/api/public/raise-request', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok || data.error) {
      statusNote.textContent = 'Error: ' + (data.error || 'Could not submit your request.');
      submitBtn.disabled = false;
      return;
    }

    form.hidden = true;
    successNote.hidden = false;
    successNote.innerHTML = `Thanks — your request has been submitted. <strong>Save this ID to check its status later: #${escapeHtml(String(data.ticket_id))}</strong>`;
  } catch (err) {
    statusNote.textContent = 'Something went wrong submitting this request. Please try again.';
    submitBtn.disabled = false;
  }
});

const STATUS_CLASS = {
  'Open': 'track-status-open',
  'In Progress': 'track-status-in-progress',
  'Payment Pending': 'track-status-payment-pending',
  'Payment Submitted': 'track-status-payment-submitted',
  'Payment Received': 'track-status-payment-received',
  'Resolved': 'track-status-resolved',
  'Closed': 'track-status-closed'
};

trackForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const ticketId = document.getElementById('trackTicketId').value.trim();
  const trackBtn = document.getElementById('trackBtn');

  if (!ticketId) return;

  trackBtn.disabled = true;
  trackError.hidden = true;
  trackResult.hidden = true;

  try {
    const res = await fetch(`/api/public/raise-request?customerId=${encodeURIComponent(currentCustomerId)}&ticketId=${encodeURIComponent(ticketId)}`);
    const data = await res.json();
    trackBtn.disabled = false;

    if (!res.ok || data.error || !data.ticket) {
      trackError.hidden = false;
      trackError.textContent = data.error || 'No request found with that ID.';
      return;
    }

    const t = data.ticket;
    const statusClass = STATUS_CLASS[t.status] || 'track-status-open';
    trackResult.innerHTML = `
      <h3>${escapeHtml(t.subject)}</h3>
      <p>Request #${escapeHtml(String(t.id))} · ${escapeHtml(new Date(t.created_at).toLocaleDateString())}</p>
      <span class="track-status-badge ${statusClass}">${escapeHtml(t.status)}</span>
    `;
    trackResult.hidden = false;
  } catch (err) {
    trackBtn.disabled = false;
    trackError.hidden = false;
    trackError.textContent = 'Something went wrong checking this request. Please try again.';
  }
});

init();
