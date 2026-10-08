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
  const url = c.site_url ? (/^https?:\/\//.test(c.site_url) ? c.site_url : 'https://' + c.site_url) : '';
  const siteLink = url
    ? `<a class="case-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">Visit live site →</a>`
    : '';
  const screen = url
    ? `<iframe src="${escapeHtml(url)}" loading="lazy" referrerpolicy="no-referrer" title="Live preview of ${escapeHtml(c.business_name)}"></iframe>`
    : '';
  return `
    <div class="case-item">
      <div class="case-laptop" aria-hidden="true">
        <div class="case-laptop-frame">
          <div class="case-laptop-cam"></div>
          <div class="case-laptop-screen">${screen}</div>
        </div>
        <div class="case-laptop-hinge"></div>
        <div class="case-laptop-deck"></div>
        <div class="case-laptop-shadow"></div>
      </div>
      <div class="case-feature">
        ${c.category ? `<span class="case-category">${escapeHtml(c.category)}</span>` : ''}
        <h3>${escapeHtml(c.business_name)}</h3>
        <p>${escapeHtml(c.description || '')}</p>
        <div class="case-stats">
          ${statHtml(c.stat1_label, c.stat1_value)}
          ${statHtml(c.stat2_label, c.stat2_value)}
          ${statHtml(c.stat3_label, c.stat3_value)}
        </div>
        ${siteLink}
      </div>
    </div>`;
}

function dotHtml(c, index, activeIndex) {
  const active = index === activeIndex ? ' active' : '';
  return `<button type="button" class="case-dot${active}" aria-label="Show case study: ${escapeHtml(c.business_name)}" aria-current="${index === activeIndex}"></button>`;
}

async function loadCaseStudies() {
  const stage = document.getElementById('caseStudyGrid');
  const controls = document.getElementById('caseCarouselControls');
  const dotsEl = document.getElementById('caseDots');
  const prevBtn = document.getElementById('casePrevBtn');
  const nextBtn = document.getElementById('caseNextBtn');
  if (!stage) return;

  let caseStudies = [];
  let activeIndex = 0;

  function render() {
    stage.innerHTML = caseCardHtml(caseStudies[activeIndex]);
    if (dotsEl) {
      dotsEl.innerHTML = caseStudies.map((c, i) => dotHtml(c, i, activeIndex)).join('');
      Array.from(dotsEl.children).forEach((dot, i) => {
        dot.addEventListener('click', () => {
          activeIndex = i;
          render();
        });
      });
    }
  }

  try {
    const res = await fetch('/api/case-studies');
    const data = await res.json();
    caseStudies = data.case_studies || [];
    if (caseStudies.length === 0) {
      stage.closest('section').hidden = true;
      return;
    }
    render();
    if (controls) controls.hidden = caseStudies.length <= 1;
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        activeIndex = (activeIndex - 1 + caseStudies.length) % caseStudies.length;
        render();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        activeIndex = (activeIndex + 1) % caseStudies.length;
        render();
      });
    }
  } catch (err) {
    // Non-critical — just hide the section rather than show a broken one.
    stage.closest('section').hidden = true;
  }
}

loadCaseStudies();
