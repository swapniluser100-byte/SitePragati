// Home page only: "Our work" case studies (loaded from D1 via
// /api/case-studies) and the "Refer a business" CTA.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function renderCaseStudy(c) {
  const url = c.site_url ? escapeHtml(c.site_url) : '';
  const img = c.image_file ? `images/${escapeHtml(c.image_file)}` : 'images/case-placeholder.svg';
  return `
    <div class="case-study">
      <div class="case-visual">
        <div class="browser-frame">
          <div class="browser-bar">
            <span></span><span></span><span></span>
            <div class="browser-url">${url || 'live site'}</div>
          </div>
          <img src="${img}" alt="Preview of the ${escapeHtml(c.business_name)} website">
        </div>
      </div>
      <div class="case-copy">
        <p class="case-kicker">${escapeHtml(c.category || '')}</p>
        <h3>${escapeHtml(c.business_name)}</h3>
        <p>${escapeHtml(c.description || '')}</p>
        <ul class="case-stats">
          ${c.stat1_value ? `<li><strong>${escapeHtml(c.stat1_value)}</strong><span>${escapeHtml(c.stat1_label)}</span></li>` : ''}
          ${c.stat2_value ? `<li><strong>${escapeHtml(c.stat2_value)}</strong><span>${escapeHtml(c.stat2_label)}</span></li>` : ''}
          ${c.stat3_value ? `<li><strong>${escapeHtml(c.stat3_value)}</strong><span>${escapeHtml(c.stat3_label)}</span></li>` : ''}
        </ul>
      </div>
    </div>`;
}

async function loadCaseStudies() {
  const container = document.getElementById('caseStudyContainer');
  const statusEl = document.getElementById('workStatus');
  try {
    const res = await fetch('/api/case-studies');
    const data = await res.json();

    if (data.error) {
      statusEl.textContent = 'Could not load case studies right now.';
      return;
    }
    if (!data.case_studies || data.case_studies.length === 0) {
      statusEl.textContent = 'Case studies coming soon.';
      return;
    }

    container.innerHTML = data.case_studies.map(renderCaseStudy).join('');
  } catch (err) {
    statusEl.textContent = 'Could not load case studies right now.';
  }
}

loadCaseStudies();

// Refer a business — send them to the contact page with the message prefilled
document.getElementById('referBusinessBtn').addEventListener('click', () => {
  window.location.href = 'contact.html?intent=referral';
});
