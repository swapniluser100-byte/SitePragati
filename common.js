// Shared across every marketing page (index, pricing, contact):
// footer year, mobile nav toggle, the Login dropdown, and the "Refer a
// business" CTA.

document.getElementById('year').textContent = new Date().getFullYear();

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Login dropdown (Admin / Customer)
const loginDropdownBtn = document.getElementById('loginDropdownBtn');
const loginDropdownMenu = document.getElementById('loginDropdownMenu');

loginDropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = !loginDropdownMenu.hidden;
  loginDropdownMenu.hidden = isOpen;
  loginDropdownBtn.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (e) => {
  if (!loginDropdownMenu.hidden && !loginDropdownMenu.contains(e.target) && e.target !== loginDropdownBtn) {
    loginDropdownMenu.hidden = true;
    loginDropdownBtn.setAttribute('aria-expanded', 'false');
  }
});

// Refer a business — send them to the contact page with the message prefilled
const referBusinessBtn = document.getElementById('referBusinessBtn');
if (referBusinessBtn) {
  referBusinessBtn.addEventListener('click', () => {
    window.location.href = 'contact.html?intent=referral';
  });
}
