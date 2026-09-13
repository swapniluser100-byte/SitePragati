// Public "Raise a Request" page — customers reach this via a link on
// their own website with their unique customer ID in the URL, e.g.
// https://sitepragati.in/raise-request.html?customerId=abc123. No
// login required; the customer field is read-only, sourced entirely
// from the server-verified ID, never from anything the visitor types.

const params = new URLSearchParams(window.location.search);
const customerId = (params.get('customerId') || '').trim();

const loadingNote = document.getElementById('loadingNote');
const errorNote = document.getElementById('errorNote');
const form = document.getElementById('requestForm');
const successNote = document.getElementById('successNote');

function showError(message) {
  loadingNote.hidden = true;
  errorNote.hidden = false;
  errorNote.textContent = message;
}

async function init() {
  if (!customerId) {
    showError('This link is missing a customer reference. Please use the link provided to you, or contact us directly.');
    return;
  }

  try {
    const res = await fetch(`/api/public/raise-request?customerId=${encodeURIComponent(customerId)}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      showError("We couldn't find your account for this link. Please check the link or contact us directly.");
      return;
    }

    document.getElementById('customerDisplay').value = data.business_name;
    loadingNote.hidden = true;
    form.hidden = false;
  } catch (err) {
    showError('Something went wrong loading this page. Please try again.');
  }
}

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
  formData.append('customerId', customerId);
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
    successNote.textContent = "Thanks — your request has been submitted. We'll be in touch soon.";
  } catch (err) {
    statusNote.textContent = 'Something went wrong submitting this request. Please try again.';
    submitBtn.disabled = false;
  }
});

init();
