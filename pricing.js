// Pricing CTAs — send to the contact page with the chosen package
// carried in the URL so the enquiry message can be prefilled there.
document.querySelectorAll('.price-cta').forEach(btn => {
  btn.addEventListener('click', () => {
    window.location.href = `contact.html?package=${encodeURIComponent(btn.dataset.package)}`;
  });
});
