// Prefill the message field when arriving from a Pricing CTA
// (?package=Standard) or the "Refer a business" banner (?intent=referral).
(function prefillFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const pkg = params.get('package');
  const intent = params.get('intent');
  const messageField = document.getElementById('message');

  if (pkg) {
    messageField.value = `I'm interested in the ${pkg} package.`;
  } else if (intent === 'referral') {
    messageField.value = "I'd like to refer a business to SitePragati.";
  }

  if (pkg || intent === 'referral') {
    document.getElementById('name').focus();
  }
})();

document.getElementById('enquiryForm').addEventListener('submit', function(e){
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const formNote = document.getElementById('formNote');

  const formData = new FormData(form);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  fetch('/api/enquiry', {
    method: 'POST',
    body: formData
  })
  .then(async (res) => {
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Something went wrong');
    }
    submitBtn.textContent = 'Sent';
    formNote.textContent = 'Thanks — we\'ll get back to you within a day.';
    form.reset();
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send enquiry';
    }, 3000);
  })
  .catch(() => {
    alert('Something went wrong. Please try again or email us directly.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send enquiry';
  });
});
