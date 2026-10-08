// Homepage-only: fetches the admin-managed case studies from the existing
// public /api/case-studies endpoint and renders them into the "Our Work"
// section. No backend changes — this endpoint already existed, just
// wasn't used anywhere on the public site yet.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function statHtml(label, value) {
  if (!value) return '';
  return `<div class="case-stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label || '')}</span></div>`;
}

function caseCardHtml(c) {
  const siteLink = c.site_url
    ? `<a class="case-link" href="${/^https?:\/\//.test(c.site_url) ? escapeHtml(c.site_url) : 'https://' + escapeHtml(c.site_url)}" target="_blank" rel="noopener">Visit live site →</a>`
    : '';
  return `
    <div class="case-card">
      ${c.category ? `<span class="case-category">${escapeHtml(c.category)}</span>` : ''}
      <h3>${escapeHtml(c.business_name)}</h3>
      <p>${escapeHtml(c.description || '')}</p>
      <div class="case-stats">
        ${statHtml(c.stat1_label, c.stat1_value)}
        ${statHtml(c.stat2_label, c.stat2_value)}
        ${statHtml(c.stat3_label, c.stat3_value)}
      </div>
      ${siteLink}
    </div>`;
}

async function loadCaseStudies() {
  const grid = document.getElementById('caseStudyGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/case-studies');
    const data = await res.json();
    const caseStudies = data.case_studies || [];
    if (caseStudies.length === 0) {
      grid.closest('section').hidden = true;
      return;
    }
    grid.innerHTML = caseStudies.map(caseCardHtml).join('');
  } catch (err) {
    // Non-critical — just hide the section rather than show a broken one.
    grid.closest('section').hidden = true;
  }
}

loadCaseStudies();
