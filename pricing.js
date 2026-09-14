// Pricing CTAs — send to the contact page with the chosen package
// carried in the URL so the enquiry message can be prefilled there.
document.querySelectorAll('.price-cta').forEach(btn => {
  btn.addEventListener('click', () => {
    window.location.href = `contact.html?package=${encodeURIComponent(btn.dataset.package)}`;
  });
});

// Google Apps Script Web app URL — paste yours here (ends in /exec)
const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyj0Aoo5McNV3ihAB47cDVH1MUFJgp30BTCpuM737nHoOsrfcTSPxp53FqiUGZZJlE1/exec';

// ===== Razorpay test checkout demo =====
// Order creation and signature verification both happen server-side in
// Apps Script (see apps-script-code.gs) — the secret key never touches
// this file or the browser.
document.getElementById('razorpayPayBtn').addEventListener('click', async () => {
  const amountInput = document.getElementById('demoAmount');
  const statusEl = document.getElementById('razorpayStatus');
  const amount = Number(amountInput.value);

  if (!amount || amount < 1) {
    statusEl.textContent = 'Enter a valid amount.';
    return;
  }
  if (FORM_ENDPOINT.includes('PASTE_YOUR')) {
    statusEl.textContent = 'Backend not set up yet — see DEPLOY-GUIDE.md.';
    return;
  }

  statusEl.textContent = 'Creating order...';

  try {
    const orderRes = await fetch(`${FORM_ENDPOINT}?action=create_order&amount=${amount}`);
    const orderData = await orderRes.json();

    if (orderData.error) {
      statusEl.textContent = 'Error: ' + orderData.error;
      return;
    }

    statusEl.textContent = '';

    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.order_id,
      name: 'SitePragati',
      description: 'Test payment demo',
      theme: { color: '#1B2544' },
      handler: async function (response) {
        statusEl.textContent = 'Verifying payment...';
        try {
          const verifyUrl = `${FORM_ENDPOINT}?action=verify_payment`
            + `&razorpay_order_id=${response.razorpay_order_id}`
            + `&razorpay_payment_id=${response.razorpay_payment_id}`
            + `&razorpay_signature=${response.razorpay_signature}`
            + `&amount=${amount}&note=${encodeURIComponent('Website demo payment')}`;
          const verifyRes = await fetch(verifyUrl);
          const verifyData = await verifyRes.json();
          statusEl.textContent = verifyData.verified
            ? 'Payment verified ✓ — logged to your Sheet.'
            : 'Payment could not be verified.';
        } catch (err) {
          statusEl.textContent = 'Verification request failed. Please contact support.';
        }
      },
      modal: {
        ondismiss: function () {
          statusEl.textContent = 'Payment cancelled.';
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
      statusEl.textContent = 'Payment failed: ' + response.error.description;
    });
    rzp.open();
  } catch (err) {
    statusEl.textContent = 'Something went wrong creating the order. Please try again.';
  }
});
