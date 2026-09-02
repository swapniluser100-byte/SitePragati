document.getElementById("year").textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", isOpen);
});
navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// Pricing CTAs — scroll to contact and prefill the message
document.querySelectorAll(".price-cta").forEach((btn) => {
  btn.addEventListener("click", () => {
    const pkg = btn.dataset.package;
    const messageField = document.getElementById("message");
    messageField.value = `I'm interested in the ${pkg} package.`;
    document
      .getElementById("contact")
      .scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("name").focus();
  });
});

// Google Apps Script Web app URL — paste yours here (ends in /exec)
const FORM_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyj0Aoo5McNV3ihAB47cDVH1MUFJgp30BTCpuM737nHoOsrfcTSPxp53FqiUGZZJlE1/exec";

document.getElementById("enquiryForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const formNote = document.getElementById("formNote");

  if (FORM_ENDPOINT.includes("PASTE_YOUR")) {
    alert(
      "Form endpoint not set up yet. See DEPLOY-GUIDE.md to connect Google Sheets + email.",
    );
    return;
  }

  const formData = new FormData(form);
  formData.append("type", "lead");

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  fetch(FORM_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    body: formData,
  })
    .then(() => {
      submitBtn.textContent = "Sent";
      formNote.textContent = "Thanks — we'll get back to you within a day.";
      form.reset();
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send enquiry";
      }, 3000);
    })
    .catch(() => {
      alert("Something went wrong. Please try again or email us directly.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Send enquiry";
    });
});
