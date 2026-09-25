// ===== Shared: role toggle + auth =====
let loginRole = 'customer'; // default selected tab on the login screen
let loggedInBusinessName = ''; // set on successful customer login/session check

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

// Shared icon-only Edit/Delete button markup, used across the admin
// console's Leads, Customers, Transactions, and Case Studies lists.
const EDIT_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const DELETE_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

function editButtonHtml(dataAttr, id) {
  return `<button class="btn btn-outline btn-small btn-icon" ${dataAttr}="${id}" aria-label="Edit" title="Edit">${EDIT_ICON_SVG}</button>`;
}
function deleteButtonHtml(dataAttr, id) {
  return `<button class="btn-danger btn-icon" ${dataAttr}="${id}" aria-label="Delete" title="Delete">${DELETE_ICON_SVG}</button>`;
}

function setRole(role) {
  loginRole = role;
  document.getElementById('roleCustomerBtn').classList.toggle('active', role === 'customer');
  document.getElementById('roleAdminBtn').classList.toggle('active', role === 'admin');
  document.getElementById('emailFieldWrap').hidden = (role === 'admin');
  document.getElementById('email').required = (role === 'customer');
  document.getElementById('loginSub').textContent = role === 'admin' ? 'Admin console' : 'Customer portal';
  document.getElementById('loginHelp').hidden = (role === 'admin');
  document.getElementById('adminForgotPasswordRow').hidden = (role !== 'admin');
  document.getElementById('loginError').textContent = '';
}

document.getElementById('roleCustomerBtn').addEventListener('click', () => setRole('customer'));
document.getElementById('roleAdminBtn').addEventListener('click', () => setRole('admin'));

// ===== Admin: forgot password / reset password =====
function showLoginCard(cardId) {
  ['loginForm', 'forgotPasswordCard', 'resetPasswordCard'].forEach(id => {
    document.getElementById(id).hidden = (id !== cardId);
  });
}

document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('forgotPasswordMsg').textContent = '';
  document.getElementById('forgotPasswordMsg').classList.remove('success');
  showLoginCard('forgotPasswordCard');
});

document.getElementById('backToLoginFromForgot').addEventListener('click', (e) => {
  e.preventDefault();
  showLoginCard('loginForm');
});

const sendResetEmailBtn = document.getElementById('sendResetEmailBtn');
sendResetEmailBtn.addEventListener('click', () => {
  withButtonSpinner(sendResetEmailBtn, 'Sending…', async () => {
    const msg = document.getElementById('forgotPasswordMsg');
    try {
      await fetch('/api/admin/forgot-password', { method: 'POST' });
      msg.textContent = 'If email is configured, a reset link has been sent — check your inbox.';
      msg.classList.add('success');
    } catch (err) {
      msg.textContent = 'Something went wrong. Please try again.';
      msg.classList.remove('success');
    }
  });
});

let adminResetToken = null;

const submitResetPasswordBtn = document.getElementById('submitResetPasswordBtn');
submitResetPasswordBtn.addEventListener('click', () => {
  const password = document.getElementById('resetNewPassword').value;
  const confirmPassword = document.getElementById('resetConfirmPassword').value;
  const msg = document.getElementById('resetPasswordMsg');
  msg.classList.remove('success');

  if (password.length < 8) {
    msg.textContent = 'Password must be at least 8 characters.';
    return;
  }
  if (password !== confirmPassword) {
    msg.textContent = 'Passwords do not match.';
    return;
  }

  withButtonSpinner(submitResetPasswordBtn, 'Saving…', async () => {
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminResetToken, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        msg.textContent = data.error || 'Could not reset the password.';
        return;
      }
      msg.textContent = 'Password updated — you can log in now.';
      msg.classList.add('success');
      document.getElementById('resetNewPassword').value = '';
      document.getElementById('resetConfirmPassword').value = '';
      setTimeout(() => {
        setRole('admin');
        showLoginCard('loginForm');
      }, 1500);
    } catch (err) {
      msg.textContent = 'Something went wrong. Please try again.';
    }
  });
});

async function checkSession() {
  try {
    const res = await fetch('/api/whoami');
    const data = await res.json();
    if (data.role === 'admin') {
      showAdminDashboard();
    } else if (data.role === 'customer') {
      showCustomerDashboard(data.businessName);
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('adminDashboard').hidden = true;
  document.getElementById('customerDashboard').hidden = true;
}

function showAdminDashboard() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('adminDashboard').hidden = false;
  document.getElementById('customerDashboard').hidden = true;
  loadLeads();
  loadCustomers();
  loadTickets();
  loadCaseStudies();
  loadRenewals();
}

function showCustomerDashboard(businessName) {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('adminDashboard').hidden = true;
  document.getElementById('customerDashboard').hidden = false;
  document.getElementById('welcomeLine').textContent = businessName ? `Welcome, ${businessName}` : '';
  loggedInBusinessName = businessName || '';
  loadCustomerTickets();
}

// ===== Referral banner =====
const REFERRAL_MESSAGE = "Hi! I've been using SitePragati for my business website — affordable, fast, with ordering and support built in. If you know a business that needs a website, tell them to check SitePragati out: https://sitepragati.pages.dev";

document.getElementById('referralWhatsappBtn').addEventListener('click', () => {
  window.open(`https://wa.me/?text=${encodeURIComponent(REFERRAL_MESSAGE)}`, '_blank');
});

document.getElementById('referralCopyBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const original = btn.textContent;
  try {
    await navigator.clipboard.writeText(REFERRAL_MESSAGE);
    btn.textContent = 'Copied!';
  } catch (err) {
    alert('Could not copy automatically — here\'s the message to share:\n\n' + REFERRAL_MESSAGE);
  }
  setTimeout(() => { btn.textContent = original; }, 2000);
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  const endpoint = loginRole === 'admin' ? '/api/admin/login' : '/api/customer/login';
  const body = loginRole === 'admin'
    ? { password }
    : { email: document.getElementById('email').value, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed';
      return;
    }
    document.getElementById('password').value = '';
    if (loginRole === 'admin') {
      showAdminDashboard();
    } else {
      showCustomerDashboard(data.businessName);
    }
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again.';
  }
});

document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

document.getElementById('customerLogoutBtn').addEventListener('click', async () => {
  await fetch('/api/customer/logout', { method: 'POST' });
  showLogin();
});

// ===== Admin dashboard =====

// ===== Tabs =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
  });
});

// ===== Leads =====
const STATUS_OPTIONS = ['New', 'Contacted', 'In Progress', 'Converted', 'Lost'];
// Cycled by row position to color each name avatar — purely decorative,
// doesn't need to be stable per-lead across reloads.
const LEAD_AVATAR_COLORS = ['#2F6F62', '#1B2544', '#C77F1F', '#B0453A', '#6D4AAE'];

function leadStatusClass(status) {
  return 'lead-status-' + String(status || 'New').toLowerCase().replace(/\s+/g, '-');
}

function leadInitials(name) {
  // Skip word-like tokens with no letter/number (e.g. the "-" in
  // "Demo - Prakruti Nursery") so a name in that shape still gets real
  // initials ("DP") instead of one letter and a stray dash.
  const parts = String(name || '').trim().split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w));
  const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return initials.toUpperCase() || '?';
}

let leadsCache = [];
let leadSearchTerm = '';
let leadStatusFilter = ''; // '' = all — set by clicking a stat card
let leadSortField = 'created_at';
let leadSortDir = 'desc';

async function loadLeads() {
  const tbody = document.getElementById('leadsTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="empty-note">Loading…</td></tr>';

  try {
    const res = await fetch('/api/admin/leads');
    const data = await res.json();
    leadsCache = data.leads || [];
    computeLeadStats(leadsCache);
    renderLeadsTable();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-note">Could not load leads.</td></tr>';
  }
}

// The stat row always reflects every lead, regardless of the current
// search term or status filter — same convention as the Customers tab.
function computeLeadStats(leads) {
  document.getElementById('leadStatTotal').textContent = leads.length;
  document.getElementById('leadStatContacted').textContent = leads.filter(l => l.status === 'Contacted').length;
  document.getElementById('leadStatInProgress').textContent = leads.filter(l => l.status === 'In Progress').length;
  document.getElementById('leadStatConverted').textContent = leads.filter(l => l.status === 'Converted').length;
}

function renderLeadsTable() {
  const tbody = document.getElementById('leadsTableBody');

  if (leadsCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-note">No leads yet.</td></tr>';
    return;
  }

  const term = leadSearchTerm.trim().toLowerCase();
  let rows = !term ? leadsCache : leadsCache.filter(l =>
    [l.name, l.business, l.contact].some(v => v && String(v).toLowerCase().includes(term))
  );
  if (leadStatusFilter) rows = rows.filter(l => l.status === leadStatusFilter);

  rows = rows.slice().sort((a, b) => {
    const va = (a[leadSortField] ?? '').toString().toLowerCase();
    const vb = (b[leadSortField] ?? '').toString().toLowerCase();
    if (va < vb) return leadSortDir === 'asc' ? -1 : 1;
    if (va > vb) return leadSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-note">No leads match your search.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((lead, i) => `
    <tr data-id="${lead.id}">
      <td>${escapeHtml(new Date(lead.created_at).toLocaleDateString())}</td>
      <td>
        <span class="lead-name-cell">
          <span class="lead-avatar" style="background:${LEAD_AVATAR_COLORS[i % LEAD_AVATAR_COLORS.length]}">${escapeHtml(leadInitials(lead.name))}</span>
          ${escapeHtml(lead.name)}
        </span>
      </td>
      <td>${escapeHtml(lead.business || '-')}</td>
      <td>${lead.business_type ? `<span class="type-pill">${escapeHtml(lead.business_type)}</span>` : '-'}</td>
      <td>${escapeHtml(lead.contact || '-')}</td>
      <td class="message-cell">${escapeHtml(lead.message || '-')}</td>
      <td>
        <select class="lead-status-select ${leadStatusClass(lead.status)}" data-id="${lead.id}">
          ${STATUS_OPTIONS.map(s => `<option value="${s}" ${s === lead.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td class="actions-col">
        ${editButtonHtml('data-edit-lead', lead.id)}
        ${deleteButtonHtml('data-delete-lead', lead.id)}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.lead-status-select').forEach(select => {
    select.addEventListener('change', () => {
      select.className = 'lead-status-select ' + leadStatusClass(select.value);
      updateLeadStatus(select.dataset.id, select.value);
    });
  });
  tbody.querySelectorAll('[data-edit-lead]').forEach(btn => {
    btn.addEventListener('click', () => openLeadModal(btn.dataset.editLead));
  });
  tbody.querySelectorAll('[data-delete-lead]').forEach(btn => {
    btn.addEventListener('click', () => deleteLead(btn.dataset.deleteLead));
  });
}

document.getElementById('leadSearchInput').addEventListener('input', (e) => {
  leadSearchTerm = e.target.value;
  renderLeadsTable();
});

document.querySelectorAll('.lead-stat-card').forEach(card => {
  card.addEventListener('click', () => {
    leadStatusFilter = card.dataset.leadFilter;
    document.querySelectorAll('.lead-stat-card').forEach(c => c.classList.toggle('active', c === card));
    renderLeadsTable();
  });
});

document.querySelectorAll('#leadsTable .sortable-th').forEach(th => {
  th.addEventListener('click', () => {
    const field = th.dataset.sortField;
    if (leadSortField === field) {
      leadSortDir = leadSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      leadSortField = field;
      leadSortDir = 'asc';
    }
    document.querySelectorAll('#leadsTable .sortable-th').forEach(h => h.classList.toggle('sorted', h === th));
    renderLeadsTable();
  });
});

async function updateLeadStatus(id, status) {
  await fetch('/api/admin/leads', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(id), status })
  });
  const lead = leadsCache.find(l => String(l.id) === String(id));
  if (lead) lead.status = status;
  computeLeadStats(leadsCache);
}

async function deleteLead(id) {
  if (!confirm('Delete this lead? This cannot be undone.')) return;
  await fetch('/api/admin/leads', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(id) })
  });
  loadLeads();
}

// ===== Add / edit a lead manually (phone/in-person enquiries) =====
// Generic modal helper: wires backdrop-click and Escape-to-close for a
// popup overlay. Each form still owns its own open (populate fields,
// set title) and save/cancel logic — this just handles show/hide plumbing.
function makeModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  function show() { overlay.hidden = false; }
  function hide() { overlay.hidden = true; }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) hide(); });
  return { show, hide };
}

// Shows a spinner + label on a button for the duration of an async
// action, disabling it to prevent double-submits, and always restores
// it afterward regardless of success or failure.
async function withButtonSpinner(btn, busyLabel, fn) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span>${busyLabel}`;
  try {
    await fn();
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

const leadModal = makeModal('leadModalOverlay');
const leadFields = {
  id: document.getElementById('leadId'),
  name: document.getElementById('leadName'),
  business: document.getElementById('leadBusiness'),
  business_type: document.getElementById('leadBusinessType'),
  contact: document.getElementById('leadContact'),
  status: document.getElementById('leadStatus'),
  message: document.getElementById('leadMessage')
};

function clearLeadForm() {
  Object.entries(leadFields).forEach(([key, el]) => { el.value = key === 'status' ? 'New' : ''; });
}

function openLeadModal(id) {
  clearLeadForm();
  document.getElementById('leadModalTitle').textContent = id ? 'Edit lead' : 'Add lead';

  if (id) {
    const lead = leadsCache.find(x => String(x.id) === String(id));
    if (lead) {
      Object.keys(leadFields).forEach(key => {
        if (lead[key] != null) leadFields[key].value = lead[key];
      });
    }
  }

  leadModal.show();
  leadFields.name.focus();
}

document.getElementById('addLeadBtn').addEventListener('click', () => openLeadModal(null));
document.getElementById('leadCancelBtn').addEventListener('click', () => {
  leadModal.hide();
  clearLeadForm();
});
document.getElementById('leadModalCloseBtn').addEventListener('click', () => {
  leadModal.hide();
  clearLeadForm();
});

const leadSaveBtn = document.getElementById('leadSaveBtn');
leadSaveBtn.addEventListener('click', () => {
  const payload = {};
  Object.entries(leadFields).forEach(([key, el]) => { payload[key] = el.value; });

  if (!payload.name.trim()) {
    alert('Name is required.');
    return;
  }

  const isEdit = !!payload.id;
  const method = isEdit ? 'PUT' : 'POST';
  if (!isEdit) delete payload.id;

  withButtonSpinner(leadSaveBtn, 'Saving…', async () => {
    try {
      const res = await fetch('/api/admin/leads', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert('Error: ' + (data.error || 'Could not save'));
        return;
      }
      leadModal.hide();
      clearLeadForm();
      loadLeads();
    } catch (err) {
      alert('Something went wrong saving this lead.');
    }
  });
});

// ===== Customers =====

// Builds the "Raise a Request" link customers put on their own website,
// or shows a note that one isn't available yet (unique_id is only
// generated once a customer has been saved at least once).
function requestLinkBlockHtml(customer) {
  if (!customer.unique_id) {
    return `<p class="unique-id">ID: not yet assigned — edit and save to generate</p>`;
  }
  const url = `${window.location.origin}/raise-request?customerId=${encodeURIComponent(customer.unique_id)}`;
  return `
    <p class="unique-id">ID: ${escapeHtml(customer.unique_id)}</p>
    <p class="request-link-row">
      <input type="text" class="request-link-field" value="${escapeHtml(url)}" readonly>
      <button type="button" class="btn btn-outline btn-small" data-copy-link="${escapeHtml(url)}">Copy request link</button>
    </p>`;
}

// Quick-access links to the customer's own live site and its admin
// console, so you don't have to dig through old emails to find them.
function customerLinksBlockHtml(c) {
  const links = [];
  if (c.website_url) links.push(`<a href="${escapeHtml(c.website_url)}" target="_blank" rel="noopener">🌐 Website</a>`);
  if (c.admin_console_url) links.push(`<a href="${escapeHtml(c.admin_console_url)}" target="_blank" rel="noopener">🔧 Admin console</a>`);
  if (links.length === 0) return '';
  return `<p class="customer-links">${links.join(' &nbsp;·&nbsp; ')}</p>`;
}

function wireCopyLinkButtons(root) {
  root.querySelectorAll('[data-copy-link]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.dataset.copyLink;
      const original = btn.textContent;
      try {
        await navigator.clipboard.writeText(url);
        btn.textContent = 'Copied!';
      } catch (err) {
        alert('Could not copy automatically — here\'s the link to share:\n\n' + url);
      }
      setTimeout(() => { btn.textContent = original; }, 2000);
    });
  });
}
let customersCache = [];
let currentCustomerId = null;

async function loadCustomers() {
  const list = document.getElementById('customersList');
  list.innerHTML = '<p class="empty-note">Loading…</p>';

  try {
    const res = await fetch('/api/admin/customers');
    const data = await res.json();
    customersCache = data.customers || [];
    computeCustomerStats(customersCache);
    populateTicketCustomerFilter(); // keep the Tickets tab's customer filter in sync
    filterCustomers(); // re-render, keeping whatever search term is already typed in
  } catch (err) {
    list.innerHTML = '<p class="empty-note">Could not load customers.</p>';
  }
}

// The top stat row always reflects every customer, not just the ones a
// search term currently matches — same convention as the Renewals tab.
// "Active" has no separate concept in this app yet (there's no way to
// deactivate a customer short of deleting them), so it mirrors the total.
function computeCustomerStats(customers) {
  const totalPaid = customers.reduce((sum, c) => sum + Number(c.total_paid || 0), 0);
  const totalPending = customers.reduce((sum, c) => sum + Number(c.total_pending || 0), 0);

  document.getElementById('custStatTotal').textContent = customers.length;
  document.getElementById('custStatActive').textContent = customers.length;
  document.getElementById('custStatPaid').textContent = '₹' + totalPaid.toLocaleString('en-IN');
  document.getElementById('custStatPending').textContent = '₹' + totalPending.toLocaleString('en-IN');
}

function renderCustomersList(customers) {
  const list = document.getElementById('customersList');

  if (customersCache.length === 0) {
    list.innerHTML = '<p class="empty-note">No customers yet.</p>';
    return;
  }
  if (customers.length === 0) {
    list.innerHTML = '<p class="empty-note">No customers match your search.</p>';
    return;
  }

  list.innerHTML = customers.map(c => {
    // A customer with any Pending/Overdue balance shows that instead of
    // what's already been paid — that's the number that needs attention.
    const isPending = Number(c.total_pending || 0) > 0;
    const boxAmount = isPending ? Number(c.total_pending || 0) : Number(c.total_paid || 0);
    const boxCount = isPending ? Number(c.pending_txn_count || 0) : Number(c.paid_txn_count || 0);

    return `
    <div class="cs-card cust-card">
      <span class="cust-card-avatar">🏢</span>
      <div class="cs-card-info">
        <h3>${escapeHtml(c.business_name)}</h3>
        ${requestLinkBlockHtml(c)}
        ${customerLinksBlockHtml(c)}
        <p>${escapeHtml(c.contact_name || '')} ${c.phone ? '· ' + escapeHtml(c.phone) : ''}</p>
      </div>
      <div class="cust-card-stat ${isPending ? 'cust-card-stat-pending' : 'cust-card-stat-paid'}">
        <p class="cust-card-stat-label">${isPending ? 'Pending Amount' : 'Total Paid'}</p>
        <p class="cust-card-stat-value">₹${boxAmount.toLocaleString('en-IN')}</p>
        <p class="cust-card-stat-count">${boxCount} transaction${boxCount === 1 ? '' : 's'}</p>
      </div>
      <span class="status-pill ${isPending ? 'status-pill-pending' : 'status-pill-paid'}">${isPending ? 'Pending' : 'Paid'}</span>
      <div class="cs-card-actions">
        <button class="btn btn-outline btn-small" data-view-txns="${c.id}">📎 Transactions</button>
        ${editButtonHtml('data-edit-cust', c.id)}
        ${deleteButtonHtml('data-delete-cust', c.id)}
      </div>
    </div>
  `;
  }).join('');

  list.querySelectorAll('[data-view-txns]').forEach(btn => {
    btn.addEventListener('click', () => openCustomerDetail(btn.dataset.viewTxns));
  });
  list.querySelectorAll('[data-edit-cust]').forEach(btn => {
    btn.addEventListener('click', () => openCustomerForm(btn.dataset.editCust));
  });
  list.querySelectorAll('[data-delete-cust]').forEach(btn => {
    btn.addEventListener('click', () => deleteCustomer(btn.dataset.deleteCust));
  });
  wireCopyLinkButtons(list);
}

// Client-side search across name, contact, phone, and email — the
// customer list is already fetched in full, so no need to round-trip
// to the server for something this small.
function filterCustomers() {
  const term = document.getElementById('customerSearchInput').value.trim().toLowerCase();
  const filtered = !term ? customersCache : customersCache.filter(c =>
    [c.business_name, c.contact_name, c.phone, c.email].some(v => v && String(v).toLowerCase().includes(term))
  );
  renderCustomersList(filtered);
}

document.getElementById('customerSearchInput').addEventListener('input', filterCustomers);

const custModal = makeModal('customerModalOverlay');
const custFields = {
  id: document.getElementById('custId'),
  business_name: document.getElementById('custBusinessName'),
  contact_name: document.getElementById('custContactName'),
  email: document.getElementById('custEmail'),
  password: document.getElementById('custPassword'),
  phone: document.getElementById('custPhone'),
  address: document.getElementById('custAddress'),
  website_url: document.getElementById('custWebsiteUrl'),
  admin_console_url: document.getElementById('custAdminConsoleUrl'),
  notes: document.getElementById('custNotes'),
  renewal_frequency: document.getElementById('custRenewalFrequency'),
  renewal_amount: document.getElementById('custRenewalAmount'),
  renewal_start_date: document.getElementById('custRenewalStartDate')
};
// Handled separately from custFields — a checkbox's .value isn't its
// checked state, so the generic value-based loops below don't apply to it.
const custRenewalRequiredField = document.getElementById('custRenewalRequired');

function clearCustomerForm() {
  Object.values(custFields).forEach(el => el.value = '');
  custRenewalRequiredField.checked = false;
}

function openCustomerForm(id) {
  clearCustomerForm();
  document.getElementById('customerFormTitle').textContent = id ? 'Edit customer' : 'Add customer';
  document.getElementById('custPasswordNote').textContent = id
    ? '(leave blank to keep current password)'
    : '(required for new customers)';

  if (id) {
    const c = customersCache.find(x => String(x.id) === String(id));
    if (c) {
      Object.keys(custFields).forEach(key => {
        // Never pre-fill the password field — it's write-only from the UI's perspective.
        if (key !== 'password' && c[key] != null) custFields[key].value = c[key];
      });
      custRenewalRequiredField.checked = !!c.renewal_required;
    }
  }

  custModal.show();
}

document.getElementById('addCustomerBtn').addEventListener('click', () => openCustomerForm(null));
document.getElementById('custCancelBtn').addEventListener('click', () => {
  custModal.hide();
  clearCustomerForm();
});
document.getElementById('customerModalCloseBtn').addEventListener('click', () => {
  custModal.hide();
  clearCustomerForm();
});

const custSaveBtn = document.getElementById('custSaveBtn');
custSaveBtn.addEventListener('click', () => {
  const payload = {};
  Object.entries(custFields).forEach(([key, el]) => { payload[key] = el.value; });
  payload.renewal_required = custRenewalRequiredField.checked;

  if (!payload.business_name.trim()) {
    alert('Business name is required.');
    return;
  }

  const isEdit = !!payload.id;

  if (!isEdit && !payload.email.trim()) {
    alert('Email is required — it becomes the customer\'s portal login.');
    return;
  }
  if (!isEdit && !payload.password.trim()) {
    alert('Password is required for a new customer.');
    return;
  }
  if (payload.renewal_required && !payload.renewal_frequency) {
    alert('Please select a frequency since Renewal required is checked.');
    return;
  }
  if (payload.renewal_required && !(Number(payload.renewal_amount) > 0)) {
    alert('Please enter a renewal amount greater than 0 since Renewal required is checked.');
    return;
  }
  if (payload.renewal_required && !payload.renewal_start_date) {
    alert('Please enter a renewal start date since Renewal required is checked.');
    return;
  }

  const method = isEdit ? 'PUT' : 'POST';
  if (!isEdit) delete payload.id;
  if (isEdit && !payload.password.trim()) delete payload.password; // don't overwrite existing password

  withButtonSpinner(custSaveBtn, 'Saving…', async () => {
    try {
      const res = await fetch('/api/admin/customers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert('Error: ' + (data.error || 'Could not save'));
        return;
      }
      custModal.hide();
      clearCustomerForm();
      loadCustomers();
    } catch (err) {
      alert('Something went wrong saving this customer.');
    }
  });
});

async function deleteCustomer(id) {
  if (!confirm('Delete this customer and ALL their transactions? This cannot be undone.')) return;
  await fetch('/api/admin/customers', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(id) })
  });
  loadCustomers();
}

// ===== Tickets (admin view — all customers) =====
const TICKET_STATUS_OPTIONS = ['Open', 'In Progress', 'Payment Pending', 'Payment Submitted', 'Payment Received', 'Resolved', 'Closed'];
let ticketsCache = [];
let currentTicketId = null;

const TICKET_CLOSED_STATUSES = ['Resolved', 'Closed'];

function ticketRowHtml(t, i) {
  return `
    <tr class="clickable-row" data-ticket-id="${t.id}">
      <td>${escapeHtml(new Date(t.created_at).toLocaleDateString())}</td>
      <td>
        <span class="lead-name-cell">
          <span class="lead-avatar" style="background:${LEAD_AVATAR_COLORS[i % LEAD_AVATAR_COLORS.length]}">${escapeHtml(leadInitials(t.business_name))}</span>
          ${escapeHtml(t.business_name)}
        </span>
      </td>
      <td>${escapeHtml(t.subject)}</td>
      <td><span class="status-badge ${statusClass(t.status)}">${escapeHtml(t.status)}</span></td>
      <td class="actions-col">
        <button type="button" class="btn btn-outline btn-small" data-view-ticket="${t.id}">👁 View</button>
        <span class="row-menu-wrap">
          <button type="button" class="btn btn-outline btn-icon" data-menu-toggle="${t.id}" aria-label="More actions" title="More actions">⋮</button>
          <span class="row-menu" data-menu="${t.id}" hidden>
            <button type="button" class="row-menu-item row-menu-danger" data-delete-ticket="${t.id}">🗑 Delete ticket</button>
          </span>
        </span>
      </td>
    </tr>`;
}

function wireTicketRowClicks(container) {
  container.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', () => openTicketDetail(row.dataset.ticketId));
  });
  container.querySelectorAll('[data-view-ticket]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openTicketDetail(btn.dataset.viewTicket); });
  });
  container.querySelectorAll('[data-menu-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = container.querySelector(`[data-menu="${btn.dataset.menuToggle}"]`);
      document.querySelectorAll('.row-menu').forEach(m => { if (m !== menu) m.hidden = true; });
      menu.hidden = !menu.hidden;
    });
  });
  container.querySelectorAll('[data-delete-ticket]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this ticket and its conversation? This cannot be undone.')) return;
      await fetch('/api/admin/tickets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(btn.dataset.deleteTicket) })
      });
      loadTickets();
    });
  });
}

// Closes any open row "⋮" menu when clicking elsewhere on the page.
document.addEventListener('click', () => {
  document.querySelectorAll('.row-menu').forEach(m => m.hidden = true);
});

function populateTicketCustomerFilter() {
  const select = document.getElementById('ticketFilterCustomer');
  const current = select.value;
  const options = customersCache.map(c => `<option value="${c.id}">${escapeHtml(c.business_name)}</option>`).join('');
  select.innerHTML = '<option value="">All customers</option>' + options;
  select.value = current; // preserve selection across refreshes, if still valid
}

// ===== Add a ticket on a customer's behalf (e.g. a phone request) =====
const addTicketModal = makeModal('addTicketModalOverlay');
const addTicketFields = {
  customer_id: document.getElementById('addTicketCustomer'),
  subject: document.getElementById('addTicketSubject'),
  description: document.getElementById('addTicketDescription')
};

function clearAddTicketForm() {
  addTicketFields.subject.value = '';
  addTicketFields.description.value = '';
  addTicketFields.customer_id.value = '';
}

document.getElementById('addTicketBtn').addEventListener('click', () => {
  clearAddTicketForm();
  const options = customersCache.map(c => `<option value="${c.id}">${escapeHtml(c.business_name)}</option>`).join('');
  addTicketFields.customer_id.innerHTML = '<option value="">— Select a customer —</option>' + options;
  addTicketModal.show();
});

document.getElementById('addTicketCancelBtn').addEventListener('click', () => {
  addTicketModal.hide();
  clearAddTicketForm();
});
document.getElementById('addTicketModalCloseBtn').addEventListener('click', () => {
  addTicketModal.hide();
  clearAddTicketForm();
});

const addTicketSaveBtn = document.getElementById('addTicketSaveBtn');
addTicketSaveBtn.addEventListener('click', () => {
  const customerId = addTicketFields.customer_id.value;
  const subject = addTicketFields.subject.value.trim();

  if (!customerId) {
    alert('Please select a customer.');
    return;
  }
  if (!subject) {
    alert('Subject is required.');
    return;
  }

  withButtonSpinner(addTicketSaveBtn, 'Saving…', async () => {
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: Number(customerId),
          subject,
          description: addTicketFields.description.value
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert('Error: ' + (data.error || 'Could not save'));
        return;
      }
      addTicketModal.hide();
      clearAddTicketForm();
      loadTickets();
    } catch (err) {
      alert('Something went wrong saving this ticket.');
    }
  });
});

// The stat row always reflects every ticket, regardless of the current
// filters/search — same convention as the Leads and Customers tabs.
// "Open Tickets" and "Resolved" are buckets (anything not yet
// Resolved/Closed, and Resolved-or-Closed respectively); "In Progress"
// is that one exact status — together Open+InProgress+Resolved should
// only double-count a ticket once each is figured by its own rule.
function computeTicketStats(tickets) {
  document.getElementById('ticketStatTotal').textContent = tickets.length;
  document.getElementById('ticketStatOpen').textContent = tickets.filter(t => !TICKET_CLOSED_STATUSES.includes(t.status)).length;
  document.getElementById('ticketStatInProgress').textContent = tickets.filter(t => t.status === 'In Progress').length;
  document.getElementById('ticketStatResolved').textContent = tickets.filter(t => TICKET_CLOSED_STATUSES.includes(t.status)).length;
}

let ticketSearchTerm = '';
let ticketStatFilter = ''; // '' | 'open' | 'In Progress' | 'closed' — set by clicking a stat card

function applyTicketFilters() {
  const customerFilter = document.getElementById('ticketFilterCustomer').value;
  const statusFilter = document.getElementById('ticketFilterStatus').value;
  const term = ticketSearchTerm.trim().toLowerCase();

  let filtered = ticketsCache;
  if (customerFilter) filtered = filtered.filter(t => String(t.customer_id) === customerFilter);
  if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
  if (term) {
    filtered = filtered.filter(t =>
      [t.business_name, t.subject, t.id, t.reference_code].some(v => v && String(v).toLowerCase().includes(term))
    );
  }
  if (ticketStatFilter === 'open') filtered = filtered.filter(t => !TICKET_CLOSED_STATUSES.includes(t.status));
  else if (ticketStatFilter === 'closed') filtered = filtered.filter(t => TICKET_CLOSED_STATUSES.includes(t.status));
  else if (ticketStatFilter) filtered = filtered.filter(t => t.status === ticketStatFilter);

  const open = filtered.filter(t => !TICKET_CLOSED_STATUSES.includes(t.status));
  const closed = filtered.filter(t => TICKET_CLOSED_STATUSES.includes(t.status));

  const tbody = document.getElementById('ticketsTableBody');
  tbody.innerHTML = open.length
    ? open.map(ticketRowHtml).join('')
    : '<tr><td colspan="5" class="empty-note">No open tickets match these filters.</td></tr>';
  wireTicketRowClicks(tbody.parentElement);
  document.getElementById('openTicketsCount').textContent = open.length;

  const closedTbody = document.getElementById('closedTicketsTableBody');
  closedTbody.innerHTML = closed.length
    ? closed.map(ticketRowHtml).join('')
    : '<tr><td colspan="5" class="empty-note">No closed tickets match these filters.</td></tr>';
  wireTicketRowClicks(closedTbody.parentElement);
  document.getElementById('closedTicketsCount').textContent = closed.length;
}

document.getElementById('ticketFilterCustomer').addEventListener('change', applyTicketFilters);
document.getElementById('ticketFilterStatus').addEventListener('change', applyTicketFilters);

document.getElementById('ticketSearchInput').addEventListener('input', (e) => {
  ticketSearchTerm = e.target.value;
  applyTicketFilters();
});

document.getElementById('resetTicketFiltersBtn').addEventListener('click', () => {
  document.getElementById('ticketFilterCustomer').value = '';
  document.getElementById('ticketFilterStatus').value = '';
  document.getElementById('ticketSearchInput').value = '';
  ticketSearchTerm = '';
  ticketStatFilter = '';
  document.querySelectorAll('.ticket-stat-card').forEach(c => c.classList.toggle('active', c.dataset.ticketStat === ''));
  applyTicketFilters();
});

document.querySelectorAll('.ticket-stat-card').forEach(card => {
  card.addEventListener('click', () => {
    ticketStatFilter = card.dataset.ticketStat;
    document.querySelectorAll('.ticket-stat-card').forEach(c => c.classList.toggle('active', c === card));
    applyTicketFilters();
  });
});

document.querySelectorAll('.ticket-section-header').forEach(header => {
  header.addEventListener('click', () => {
    const target = document.getElementById(header.dataset.toggleSection);
    target.hidden = !target.hidden;
    header.classList.toggle('collapsed', target.hidden);
  });
});

async function loadTickets() {
  const tbody = document.getElementById('ticketsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="empty-note">Loading…</td></tr>';

  try {
    const res = await fetch('/api/admin/tickets');
    const data = await res.json();
    ticketsCache = data.tickets || [];

    computeTicketStats(ticketsCache);
    populateTicketCustomerFilter();
    applyTicketFilters();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-note">Could not load tickets.</td></tr>';
  }
}

function renderTicketDetailInfo(t) {
  document.getElementById('ticketDetailInfo').innerHTML = `
    <h3>${escapeHtml(t.subject)}</h3>
    ${t.reference_code ? `<p class="unique-id">Request ID: ${escapeHtml(t.reference_code)}</p>` : ''}
    <p>${escapeHtml(t.business_name)} · ${escapeHtml(new Date(t.created_at).toLocaleDateString())}</p>
    <p style="white-space:pre-wrap; margin-top:10px;">${escapeHtml(t.description || 'No description provided.')}</p>
    ${t.payment_amount ? `<p class="due-amount" style="margin-top:10px;">Amount due: ₹${escapeHtml(String(t.payment_amount))}</p>` : ''}
    ${t.payment_reference ? `<p class="txn-ref">Transaction reference: ${escapeHtml(t.payment_reference)}</p>` : ''}
  `;
}

function openTicketDetail(id) {
  currentTicketId = id;
  const t = ticketsCache.find(x => String(x.id) === String(id));
  if (!t) return;

  document.getElementById('ticketsListView').hidden = true;
  document.getElementById('ticketDetailView').hidden = false;

  renderTicketDetailInfo(t);

  const statusSelect = document.getElementById('ticketDetailStatus');
  statusSelect.innerHTML = TICKET_STATUS_OPTIONS.map(s =>
    `<option value="${s}" ${s === t.status ? 'selected' : ''}>${s}</option>`
  ).join('');

  document.getElementById('newCommentText').value = '';
  document.getElementById('newCommentFile').value = '';
  document.getElementById('commentFormMsg').textContent = '';
  loadAdminTicketComments(id);
}

// ===== Edit a ticket's subject/description (status changes use the
// dropdown above instead — they carry payment/email side effects) =====
const ticketEditModal = makeModal('ticketEditModalOverlay');
const ticketEditFields = {
  id: document.getElementById('ticketEditId'),
  subject: document.getElementById('ticketEditSubject'),
  description: document.getElementById('ticketEditDescription')
};

function clearTicketEditForm() {
  Object.values(ticketEditFields).forEach(el => el.value = '');
}

document.getElementById('editTicketBtn').addEventListener('click', () => {
  const t = ticketsCache.find(x => String(x.id) === String(currentTicketId));
  if (!t) return;
  ticketEditFields.id.value = t.id;
  ticketEditFields.subject.value = t.subject || '';
  ticketEditFields.description.value = t.description || '';
  ticketEditModal.show();
});

document.getElementById('ticketEditCancelBtn').addEventListener('click', () => {
  ticketEditModal.hide();
  clearTicketEditForm();
});
document.getElementById('ticketEditModalCloseBtn').addEventListener('click', () => {
  ticketEditModal.hide();
  clearTicketEditForm();
});

const ticketEditSaveBtn = document.getElementById('ticketEditSaveBtn');
ticketEditSaveBtn.addEventListener('click', () => {
  const subject = ticketEditFields.subject.value.trim();
  if (!subject) {
    alert('Subject is required.');
    return;
  }

  withButtonSpinner(ticketEditSaveBtn, 'Saving…', async () => {
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Number(ticketEditFields.id.value),
          subject,
          description: ticketEditFields.description.value
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert('Error: ' + (data.error || 'Could not save'));
        return;
      }
      ticketEditModal.hide();
      clearTicketEditForm();
      await loadTickets();
      const updated = ticketsCache.find(x => String(x.id) === String(currentTicketId));
      if (updated) renderTicketDetailInfo(updated);
    } catch (err) {
      alert('Something went wrong saving this ticket.');
    }
  });
});

function renderCommentThread(comments, downloadBase) {
  if (!comments || comments.length === 0) {
    return '<p class="empty-note">No messages yet.</p>';
  }
  return comments.map(c => `
    <div class="comment-bubble comment-${c.author_type}">
      <div class="comment-meta">
        <strong>${escapeHtml(c.author_name || (c.author_type === 'admin' ? 'SitePragati' : 'Customer'))}</strong>
        <span>${escapeHtml(new Date(c.created_at).toLocaleString())}</span>
      </div>
      ${c.comment ? `<p class="comment-text">${escapeHtml(c.comment)}</p>` : ''}
      ${c.file_key ? `<a class="comment-file" href="${downloadBase}?key=${encodeURIComponent(c.file_key)}&name=${encodeURIComponent(c.file_name || 'file')}" target="_blank" rel="noopener">📎 ${escapeHtml(c.file_name || 'Download file')}</a>` : ''}
    </div>
  `).join('');
}

async function loadAdminTicketComments(ticketId) {
  const list = document.getElementById('ticketCommentsList');
  list.innerHTML = '<p class="empty-note">Loading…</p>';
  try {
    const res = await fetch(`/api/admin/ticket-comments?ticket_id=${ticketId}`);
    const data = await res.json();
    list.innerHTML = renderCommentThread(data.comments, '/api/admin/ticket-file');
  } catch (err) {
    list.innerHTML = '<p class="empty-note">Could not load conversation.</p>';
  }
}

document.getElementById('postCommentBtn').addEventListener('click', async () => {
  const text = document.getElementById('newCommentText').value.trim();
  const fileInput = document.getElementById('newCommentFile');
  const msgEl = document.getElementById('commentFormMsg');
  const file = fileInput.files[0];

  if (!text && !file) {
    msgEl.textContent = 'Write a message or attach a file.';
    return;
  }

  const formData = new FormData();
  formData.append('ticket_id', currentTicketId);
  formData.append('comment', text);
  if (file) formData.append('file', file);

  msgEl.textContent = 'Posting…';

  try {
    const res = await fetch('/api/admin/ticket-comments', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok || data.error) {
      msgEl.textContent = 'Error: ' + (data.error || 'Could not post');
      return;
    }
    document.getElementById('newCommentText').value = '';
    fileInput.value = '';
    msgEl.textContent = '';
    loadAdminTicketComments(currentTicketId);
  } catch (err) {
    msgEl.textContent = 'Something went wrong. Please try again.';
  }
});

document.getElementById('backToTicketsBtn').addEventListener('click', () => {
  document.getElementById('ticketDetailView').hidden = true;
  document.getElementById('ticketsListView').hidden = false;
  currentTicketId = null;
  loadTickets();
});

document.getElementById('deleteTicketBtn').addEventListener('click', async () => {
  if (!confirm('Delete this ticket and its conversation? This cannot be undone.')) return;

  await fetch('/api/admin/tickets', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(currentTicketId) })
  });

  document.getElementById('ticketDetailView').hidden = true;
  document.getElementById('ticketsListView').hidden = false;
  currentTicketId = null;
  loadTickets();
});

document.getElementById('ticketDetailStatus').addEventListener('change', async (e) => {
  const status = e.target.value;
  let paymentAmount = null;

  if (status === 'Payment Pending') {
    const entered = prompt('Enter the amount due from the customer (₹):');
    if (entered === null) {
      const t = ticketsCache.find(x => String(x.id) === String(currentTicketId));
      if (t) e.target.value = t.status; // revert dropdown
      return;
    }
    paymentAmount = Number(entered);
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      const t = ticketsCache.find(x => String(x.id) === String(currentTicketId));
      if (t) e.target.value = t.status;
      return;
    }
  }

  const res = await fetch('/api/admin/tickets', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(currentTicketId), status, payment_amount: paymentAmount })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    alert('Error: ' + (data.error || 'Could not update status'));
    const t = ticketsCache.find(x => String(x.id) === String(currentTicketId));
    if (t) e.target.value = t.status;
    return;
  }

  // Refresh cached data and re-render the detail panel with the new state
  const listRes = await fetch('/api/admin/tickets');
  const listData = await listRes.json();
  ticketsCache = listData.tickets || [];
  const updated = ticketsCache.find(x => String(x.id) === String(currentTicketId));
  if (updated) renderTicketDetailInfo(updated);
});


// ===== Customer detail view (transactions) =====
function renderCustomerDetailInfo(c) {
  const info = document.getElementById('customerDetailInfo');
  info.innerHTML = `
    <div class="cust-info-card">
      <span class="cust-info-avatar" aria-hidden="true">👤</span>
      <div class="cust-info-main">
        <h3>${escapeHtml(c.business_name)}</h3>
        ${requestLinkBlockHtml(c)}
        ${customerLinksBlockHtml(c)}
        <p>${escapeHtml(c.contact_name || '')} ${c.phone ? '· ' + escapeHtml(c.phone) : ''}</p>
        <p>${escapeHtml(c.address || '')}</p>
        ${c.notes ? `<p><strong>Notes:</strong></p><p style="white-space:pre-wrap;">${escapeHtml(c.notes)}</p>` : ''}
      </div>
    </div>
  `;
  wireCopyLinkButtons(info);
}

function openCustomerDetail(id) {
  currentCustomerId = id;
  const c = customersCache.find(x => String(x.id) === String(id));
  if (!c) return;

  document.getElementById('customersListView').hidden = true;
  document.getElementById('customerDetailView').hidden = false;

  renderCustomerDetailInfo(c);
  loadTransactions(id);
}

document.getElementById('backToCustomersBtn').addEventListener('click', () => {
  document.getElementById('customerDetailView').hidden = true;
  document.getElementById('customersListView').hidden = false;
  currentCustomerId = null;
});

let transactionsCache = [];
let transactionStatusFilter = '';

const TXN_STAT_CARDS = [
  { status: 'Paid', label: 'Paid Amount', icon: '💰', cls: 'txn-stat-paid' },
  { status: 'Pending', label: 'Pending Amount', icon: '🕐', cls: 'txn-stat-pending' },
  { status: 'Overdue', label: 'Overdue Amount', icon: '⚠️', cls: 'txn-stat-overdue' }
];

function renderTransactionStats() {
  const sums = { Paid: 0, Pending: 0, Overdue: 0 };
  const counts = { Paid: 0, Pending: 0, Overdue: 0 };

  transactionsCache.forEach(t => {
    if (sums[t.status] === undefined) return;
    sums[t.status] += Number(t.amount);
    counts[t.status]++;
  });

  const wrap = document.getElementById('customerTxnStats');
  wrap.innerHTML = TXN_STAT_CARDS.map(card => `
    <button type="button" class="txn-stat-card ${card.cls} ${transactionStatusFilter === card.status ? 'active' : ''}" data-txn-stat="${card.status}">
      <span class="txn-stat-icon">${card.icon}</span>
      <span class="txn-stat-text">
        <span class="txn-stat-label">${card.label}</span>
        <span class="txn-stat-value">₹${sums[card.status].toLocaleString('en-IN')}</span>
        <span class="txn-stat-count">${counts[card.status]} transaction${counts[card.status] === 1 ? '' : 's'}</span>
      </span>
      <span class="txn-stat-chevron" aria-hidden="true">&rsaquo;</span>
    </button>
  `).join('');

  wrap.querySelectorAll('[data-txn-stat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.txnStat;
      transactionStatusFilter = transactionStatusFilter === status ? '' : status;
      renderTransactionStats();
      renderTransactionsTable();
    });
  });
}

function renderTransactionsTable() {
  const tbody = document.getElementById('transactionsTableBody');
  const filtered = transactionStatusFilter
    ? transactionsCache.filter(t => t.status === transactionStatusFilter)
    : transactionsCache;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-note">${transactionStatusFilter ? 'No ' + transactionStatusFilter.toLowerCase() + ' transactions.' : 'No transactions yet.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => `
    <tr>
      <td>${escapeHtml(t.transaction_date || '')}</td>
      <td>₹${escapeHtml(String(t.amount))}</td>
      <td>${escapeHtml(t.description || '')}</td>
      <td>${escapeHtml(t.status)}</td>
      <td class="actions-col">
        ${editButtonHtml('data-edit-txn', t.id)}
        ${deleteButtonHtml('data-delete-txn', t.id)}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit-txn]').forEach(btn => {
    btn.addEventListener('click', () => openTransactionForm(transactionsCache.find(t => String(t.id) === btn.dataset.editTxn)));
  });
  tbody.querySelectorAll('[data-delete-txn]').forEach(btn => {
    btn.addEventListener('click', () => deleteTransaction(btn.dataset.deleteTxn));
  });
}

async function loadTransactions(customerId) {
  const tbody = document.getElementById('transactionsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="empty-note">Loading…</td></tr>';
  transactionStatusFilter = '';

  try {
    const res = await fetch(`/api/admin/transactions?customer_id=${customerId}`);
    const data = await res.json();
    transactionsCache = data.transactions || [];
    renderTransactionStats();
    renderTransactionsTable();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-note">Could not load transactions.</td></tr>';
  }
}

const txnModal = makeModal('transactionModalOverlay');
const txnFields = {
  id: document.getElementById('txnId'),
  customer_id: document.getElementById('txnCustomerId'),
  amount: document.getElementById('txnAmount'),
  transaction_date: document.getElementById('txnDate'),
  status: document.getElementById('txnStatus'),
  description: document.getElementById('txnDescription')
};

function clearTransactionForm() {
  txnFields.id.value = '';
  txnFields.amount.value = '';
  txnFields.transaction_date.value = '';
  txnFields.status.value = 'Paid';
  txnFields.description.value = '';
}

function openTransactionForm(txn) {
  clearTransactionForm();
  document.getElementById('transactionFormTitle').textContent = txn ? 'Edit transaction' : 'Add transaction';
  txnFields.customer_id.value = currentCustomerId;

  if (txn) {
    txnFields.id.value = txn.id;
    txnFields.amount.value = txn.amount;
    txnFields.transaction_date.value = txn.transaction_date || '';
    txnFields.status.value = txn.status || 'Paid';
    txnFields.description.value = txn.description || '';
  }

  txnModal.show();
}

document.getElementById('addTransactionBtn').addEventListener('click', () => openTransactionForm(null));
document.getElementById('txnCancelBtn').addEventListener('click', () => {
  txnModal.hide();
  clearTransactionForm();
});
document.getElementById('transactionModalCloseBtn').addEventListener('click', () => {
  txnModal.hide();
  clearTransactionForm();
});

const txnSaveBtn = document.getElementById('txnSaveBtn');
txnSaveBtn.addEventListener('click', () => {
  const payload = {
    id: txnFields.id.value || undefined,
    customer_id: Number(txnFields.customer_id.value),
    amount: Number(txnFields.amount.value),
    transaction_date: txnFields.transaction_date.value,
    status: txnFields.status.value,
    description: txnFields.description.value
  };

  if (!payload.amount) {
    alert('Amount is required.');
    return;
  }

  const isEdit = !!payload.id;
  const method = isEdit ? 'PUT' : 'POST';

  withButtonSpinner(txnSaveBtn, 'Saving…', async () => {
    try {
      const res = await fetch('/api/admin/transactions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert('Error: ' + (data.error || 'Could not save'));
        return;
      }
      txnModal.hide();
      clearTransactionForm();
      loadTransactions(currentCustomerId);
      refreshCurrentCustomerTotal();
    } catch (err) {
      alert('Something went wrong saving this transaction.');
    }
  });
});

// Re-fetches customers (to get fresh total_paid) and updates the detail
// panel in place, without leaving the transactions view.
async function refreshCurrentCustomerTotal() {
  try {
    const res = await fetch('/api/admin/customers');
    const data = await res.json();
    customersCache = data.customers || [];
    const c = customersCache.find(x => String(x.id) === String(currentCustomerId));
    if (c) renderCustomerDetailInfo(c);
  } catch (err) {
    // Non-critical — the total will still be correct next time the list loads.
  }
}

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction? This cannot be undone.')) return;
  await fetch('/api/admin/transactions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(id) })
  });
  loadTransactions(currentCustomerId);
  refreshCurrentCustomerTotal();
}

// ===== Case Studies =====
let caseStudiesCache = [];

async function loadCaseStudies() {
  const list = document.getElementById('caseStudiesList');
  list.innerHTML = '<p class="empty-note">Loading…</p>';

  try {
    const res = await fetch('/api/admin/case-studies');
    const data = await res.json();
    caseStudiesCache = data.case_studies || [];

    if (caseStudiesCache.length === 0) {
      list.innerHTML = '<p class="empty-note">No case studies yet.</p>';
      return;
    }

    list.innerHTML = caseStudiesCache.map(cs => `
      <div class="cs-card">
        <div class="cs-card-info">
          <h3>${escapeHtml(cs.business_name)}</h3>
          <p>${escapeHtml(cs.category || '')} · sort order ${cs.sort_order}</p>
          <p>${escapeHtml((cs.description || '').slice(0, 120))}${(cs.description || '').length > 120 ? '…' : ''}</p>
        </div>
        <div class="cs-card-actions">
          ${editButtonHtml('data-edit-cs', cs.id)}
          ${deleteButtonHtml('data-delete-cs', cs.id)}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-edit-cs]').forEach(btn => {
      btn.addEventListener('click', () => openCaseStudyForm(btn.dataset.editCs));
    });
    list.querySelectorAll('[data-delete-cs]').forEach(btn => {
      btn.addEventListener('click', () => deleteCaseStudy(btn.dataset.deleteCs));
    });
  } catch (err) {
    list.innerHTML = '<p class="empty-note">Could not load case studies.</p>';
  }
}

const csModal = makeModal('caseStudyModalOverlay');
const csFields = {
  id: document.getElementById('csId'),
  business_name: document.getElementById('csBusinessName'),
  category: document.getElementById('csCategory'),
  site_url: document.getElementById('csSiteUrl'),
  image_file: document.getElementById('csImageFile'),
  sort_order: document.getElementById('csSortOrder'),
  description: document.getElementById('csDescription'),
  stat1_label: document.getElementById('csStat1Label'),
  stat1_value: document.getElementById('csStat1Value'),
  stat2_label: document.getElementById('csStat2Label'),
  stat2_value: document.getElementById('csStat2Value'),
  stat3_label: document.getElementById('csStat3Label'),
  stat3_value: document.getElementById('csStat3Value')
};

function clearCaseStudyForm() {
  Object.entries(csFields).forEach(([key, el]) => {
    el.value = key === 'sort_order' ? '0' : '';
  });
}

function openCaseStudyForm(id) {
  clearCaseStudyForm();
  document.getElementById('csFormTitle').textContent = id ? 'Edit case study' : 'Add case study';

  if (id) {
    const cs = caseStudiesCache.find(c => String(c.id) === String(id));
    if (cs) {
      Object.keys(csFields).forEach(key => {
        if (cs[key] != null) csFields[key].value = cs[key];
      });
    }
  }

  csModal.show();
}

document.getElementById('addCaseStudyBtn').addEventListener('click', () => openCaseStudyForm(null));
document.getElementById('csCancelBtn').addEventListener('click', () => {
  csModal.hide();
  clearCaseStudyForm();
});
document.getElementById('caseStudyModalCloseBtn').addEventListener('click', () => {
  csModal.hide();
  clearCaseStudyForm();
});

const csSaveBtn = document.getElementById('csSaveBtn');
csSaveBtn.addEventListener('click', () => {
  const payload = {};
  Object.entries(csFields).forEach(([key, el]) => {
    payload[key] = el.value;
  });

  if (!payload.business_name.trim()) {
    alert('Business name is required.');
    return;
  }

  const isEdit = !!payload.id;
  const method = isEdit ? 'PUT' : 'POST';
  if (!isEdit) delete payload.id;

  withButtonSpinner(csSaveBtn, 'Saving…', async () => {
    try {
      const res = await fetch('/api/admin/case-studies', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert('Error: ' + (data.error || 'Could not save'));
        return;
      }
      csModal.hide();
      clearCaseStudyForm();
      loadCaseStudies();
    } catch (err) {
      alert('Something went wrong saving this case study.');
    }
  });
});

async function deleteCaseStudy(id) {
  if (!confirm('Delete this case study? This cannot be undone.')) return;
  await fetch('/api/admin/case-studies', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(id) })
  });
  loadCaseStudies();
}

// ===== Renewals =====
const RENEWAL_DUE_SOON_DAYS = 7;

function todayISODate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function addDaysISO(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// Renewed is stored; Due / Due Soon are computed live from due_date vs
// today every time this renders, so the badge never goes stale.
function renewalDisplayStatus(r) {
  if (r.status === 'Renewed') return 'Renewed';
  const today = todayISODate();
  const dueSoonCutoff = addDaysISO(today, RENEWAL_DUE_SOON_DAYS);
  if (r.due_date >= today && r.due_date <= dueSoonCutoff) return 'Due Soon';
  return 'Due';
}

let renewalsCache = [];

function renewalFrequencyBadge(frequency) {
  const cls = 'freq-' + (frequency || '').toLowerCase().replace(/\s+/g, '-');
  return `<span class="freq-badge ${cls}">${escapeHtml(frequency)}</span>`;
}

function renewalRowHtml(r) {
  const displayStatus = renewalDisplayStatus(r);
  const actionBtn = displayStatus === 'Renewed'
    ? `<button type="button" class="btn btn-outline btn-small" data-view-renewal="${r.id}">View</button>`
    : `<button type="button" class="btn btn-primary btn-small" data-renew="${r.id}">Renew</button>`;

  return `
    <tr data-id="${r.id}">
      <td>
        <strong>${escapeHtml(r.business_name)}</strong><br>
        <span class="renewal-subtext">${escapeHtml(r.email || r.phone || '')}</span>
      </td>
      <td class="unique-id">${escapeHtml(r.customer_unique_id || '')}</td>
      <td>${renewalFrequencyBadge(r.frequency)}</td>
      <td>${escapeHtml(r.due_date)}</td>
      <td>₹${escapeHtml(String(r.amount))}</td>
      <td><span class="status-badge ${statusClass(displayStatus)}">${escapeHtml(displayStatus)}</span></td>
      <td class="actions-col">
        ${actionBtn}
        ${editButtonHtml('data-edit-renewal', r.id)}
        ${deleteButtonHtml('data-delete-renewal', r.id)}
      </td>
    </tr>
  `;
}

function computeRenewalStats(list) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let dueThisMonth = 0;
  let dueThisYear = 0;
  let renewedThisMonth = 0;
  let renewedThisYear = 0;

  list.forEach(r => {
    if (r.status === 'Renewed') {
      if (!r.renewed_at) return;
      const renewedDate = new Date(r.renewed_at);
      if (renewedDate.getFullYear() === currentYear) {
        renewedThisYear += Number(r.amount);
        if (renewedDate.getMonth() === currentMonth) renewedThisMonth += Number(r.amount);
      }
      return;
    }
    const [y, m] = r.due_date.split('-').map(Number);
    if (y === currentYear) {
      dueThisYear += Number(r.amount);
      if (m - 1 === currentMonth) dueThisMonth += Number(r.amount);
    }
  });

  document.getElementById('renewalStatMonth').textContent = '₹' + dueThisMonth.toLocaleString('en-IN');
  document.getElementById('renewalStatYear').textContent = '₹' + dueThisYear.toLocaleString('en-IN');
  document.getElementById('renewalStatCount').textContent = list.length;
  document.getElementById('renewalStatRenewedMonth').textContent = '₹' + renewedThisMonth.toLocaleString('en-IN');
  document.getElementById('renewalStatRenewedYear').textContent = '₹' + renewedThisYear.toLocaleString('en-IN');
}

function applyRenewalFilters() {
  const term = document.getElementById('renewalSearchInput').value.trim().toLowerCase();
  const statusFilter = document.getElementById('renewalFilterStatus').value;
  const freqFilter = document.getElementById('renewalFilterFrequency').value;
  const fromFilter = document.getElementById('renewalFilterFrom').value;
  const toFilter = document.getElementById('renewalFilterTo').value;

  let filtered = renewalsCache;

  if (term) {
    filtered = filtered.filter(r =>
      (r.business_name || '').toLowerCase().includes(term) ||
      (r.contact_name || '').toLowerCase().includes(term) ||
      (r.email || '').toLowerCase().includes(term) ||
      (r.phone || '').toLowerCase().includes(term)
    );
  }
  if (statusFilter) filtered = filtered.filter(r => renewalDisplayStatus(r) === statusFilter);
  if (freqFilter) filtered = filtered.filter(r => r.frequency === freqFilter);
  if (fromFilter) filtered = filtered.filter(r => r.due_date >= fromFilter);
  if (toFilter) filtered = filtered.filter(r => r.due_date <= toFilter);

  const tbody = document.getElementById('renewalsTableBody');
  tbody.innerHTML = filtered.length
    ? filtered.map(renewalRowHtml).join('')
    : '<tr><td colspan="7" class="empty-note">No renewals match these filters.</td></tr>';

  tbody.querySelectorAll('[data-renew]').forEach(btn => {
    btn.addEventListener('click', () => renewRenewal(btn.dataset.renew));
  });
  tbody.querySelectorAll('[data-view-renewal]').forEach(btn => {
    btn.addEventListener('click', () => openRenewalModal(btn.dataset.viewRenewal));
  });
  tbody.querySelectorAll('[data-edit-renewal]').forEach(btn => {
    btn.addEventListener('click', () => openRenewalModal(btn.dataset.editRenewal));
  });
  tbody.querySelectorAll('[data-delete-renewal]').forEach(btn => {
    btn.addEventListener('click', () => deleteRenewalRecord(btn.dataset.deleteRenewal));
  });
}

document.getElementById('renewalSearchInput').addEventListener('input', applyRenewalFilters);
document.getElementById('renewalFilterStatus').addEventListener('change', applyRenewalFilters);
document.getElementById('renewalFilterFrequency').addEventListener('change', applyRenewalFilters);
document.getElementById('renewalFilterFrom').addEventListener('change', applyRenewalFilters);
document.getElementById('renewalFilterTo').addEventListener('change', applyRenewalFilters);

// `announceAutoCreated`: when true (the "Refresh Renewals" button), tells
// the admin how many missing renewal records the check just created —
// skipped on the tab's normal/passive loads so it doesn't pop up unasked.
async function loadRenewals(announceAutoCreated = false) {
  const tbody = document.getElementById('renewalsTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="empty-note">Loading…</td></tr>';

  try {
    const res = await fetch('/api/admin/renewals');
    const data = await res.json();
    renewalsCache = data.renewals || [];
    computeRenewalStats(renewalsCache);
    applyRenewalFilters();

    if (announceAutoCreated) {
      const count = data.auto_created || 0;
      alert(count > 0
        ? `Created ${count} missing renewal record${count === 1 ? '' : 's'}.`
        : 'No missing renewals found — every renewal-required customer already has one queued up.');
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-note">Could not load renewals.</td></tr>';
  }
}

function populateRenewalCustomerSelect() {
  const select = document.getElementById('renewalCustomer');
  const options = customersCache.map(c => `<option value="${c.id}">${escapeHtml(c.business_name)}</option>`).join('');
  select.innerHTML = '<option value="">— Select a customer —</option>' + options;
}

const renewalModal = makeModal('renewalModalOverlay');
const renewalFields = {
  id: document.getElementById('renewalId'),
  customer_id: document.getElementById('renewalCustomer'),
  frequency: document.getElementById('renewalFrequency'),
  due_date: document.getElementById('renewalDueDate'),
  amount: document.getElementById('renewalAmount'),
  status: document.getElementById('renewalStatus')
};

function clearRenewalForm() {
  renewalFields.id.value = '';
  renewalFields.customer_id.value = '';
  renewalFields.frequency.value = 'Yearly';
  renewalFields.due_date.value = '';
  renewalFields.amount.value = '';
  renewalFields.status.value = 'Pending';
}

function openRenewalModal(id) {
  clearRenewalForm();
  populateRenewalCustomerSelect();
  document.getElementById('renewalModalTitle').textContent = id ? 'Update Renewal Record' : 'Create Renewal Record';

  if (id) {
    const r = renewalsCache.find(x => String(x.id) === String(id));
    if (r) {
      renewalFields.id.value = r.id;
      renewalFields.customer_id.value = r.customer_id;
      renewalFields.frequency.value = r.frequency;
      renewalFields.due_date.value = r.due_date;
      renewalFields.amount.value = r.amount;
      renewalFields.status.value = r.status;
    }
  }

  renewalModal.show();
}

document.getElementById('addRenewalBtn').addEventListener('click', () => openRenewalModal(null));
document.getElementById('renewalCancelBtn').addEventListener('click', () => {
  renewalModal.hide();
  clearRenewalForm();
});
document.getElementById('renewalModalCloseBtn').addEventListener('click', () => {
  renewalModal.hide();
  clearRenewalForm();
});

const renewalSaveBtn = document.getElementById('renewalSaveBtn');
renewalSaveBtn.addEventListener('click', () => {
  const payload = {
    id: renewalFields.id.value,
    customer_id: Number(renewalFields.customer_id.value),
    frequency: renewalFields.frequency.value,
    due_date: renewalFields.due_date.value,
    amount: Number(renewalFields.amount.value),
    status: renewalFields.status.value
  };

  if (!payload.customer_id) {
    alert('Please select a customer.');
    return;
  }
  if (!payload.due_date) {
    alert('Please set a renewal due date.');
    return;
  }
  if (!payload.amount || payload.amount <= 0) {
    alert('Please enter an amount greater than 0.');
    return;
  }

  const isEdit = !!payload.id;
  const method = isEdit ? 'PUT' : 'POST';
  if (!isEdit) delete payload.id;

  withButtonSpinner(renewalSaveBtn, 'Saving…', async () => {
    try {
      const res = await fetch('/api/admin/renewals', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert('Error: ' + (data.error || 'Could not save'));
        return;
      }
      renewalModal.hide();
      clearRenewalForm();
      loadRenewals();
    } catch (err) {
      alert('Something went wrong saving this renewal.');
    }
  });
});

const renewalSuccessModal = makeModal('renewalSuccessOverlay');

async function renewRenewal(id) {
  if (!confirm('Mark this renewal as Renewed? This will automatically create the next renewal cycle.')) return;

  try {
    const res = await fetch('/api/admin/renewals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(id) })
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      alert('Error: ' + (data.error || 'Could not renew'));
      return;
    }

    const r = renewalsCache.find(x => String(x.id) === String(id));
    document.getElementById('renewalSuccessDetails').textContent =
      `Customer: ${r ? r.business_name : ''}\nNew Due Date: ${data.next.due_date}\nAmount: ₹${data.next.amount}`;
    await loadRenewals();
    renewalSuccessModal.show();
  } catch (err) {
    alert('Something went wrong processing this renewal.');
  }
}

document.getElementById('renewalSuccessOkBtn').addEventListener('click', () => renewalSuccessModal.hide());

async function deleteRenewalRecord(id) {
  if (!confirm('Delete this renewal record? This cannot be undone.')) return;
  await fetch('/api/admin/renewals', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(id) })
  });
  loadRenewals();
}

const refreshRenewalsBtn = document.getElementById('refreshRenewalsBtn');
refreshRenewalsBtn.addEventListener('click', () => {
  withButtonSpinner(refreshRenewalsBtn, 'Checking…', () => loadRenewals(true));
});

document.getElementById('exportRenewalsBtn').addEventListener('click', () => {
  const rows = [['Customer Name', 'Customer ID', 'Frequency', 'Renewal Due Date', 'Amount Due', 'Status']];
  renewalsCache.forEach(r => {
    rows.push([r.business_name, r.customer_unique_id || '', r.frequency, r.due_date, r.amount, renewalDisplayStatus(r)]);
  });
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'renewals.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// ===== Customer dashboard =====

// ===== Tickets =====

function statusClass(status) {
  return 'status-' + (status || 'open').toLowerCase().replace(/\s+/g, '-');
}

const PAYMENT_UPI_ID = 'swapnil.barad@axisbank';
const PAYMENT_PAYEE_NAME = 'SitePragati';

function buildUpiLink(amount, note) {
  const params = new URLSearchParams({ pa: PAYMENT_UPI_ID, pn: PAYMENT_PAYEE_NAME, cu: 'INR' });
  if (amount) params.set('am', amount);
  if (note) params.set('tn', note);
  return 'upi://pay?' + params.toString();
}

function upiQrUrl(amount, note) {
  const link = buildUpiLink(amount, note);
  return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(link);
}

function renderTicketPaymentSection(t) {
  if (t.status === 'Payment Pending') {
    return `
      <div class="ticket-payment">
        <p class="payment-due">Amount due: ₹${escapeHtml(String(t.payment_amount))}</p>
        <img src="${upiQrUrl(t.payment_amount, t.subject)}" alt="Scan to pay via UPI" class="payment-qr" width="150" height="150">
        <p class="payment-note">Scan with any UPI app to pay, then enter the transaction reference number below.</p>
        <input type="text" class="payment-ref-input" data-ticket-id="${t.id}" placeholder="Transaction reference number">
        <button type="button" class="btn btn-primary btn-small payment-submit-btn" data-ticket-id="${t.id}">Submit payment</button>
        <p class="payment-status-msg" data-ticket-id="${t.id}"></p>
      </div>`;
  }
  if (t.status === 'Payment Submitted') {
    return `
      <div class="ticket-payment ticket-payment-submitted">
        <p>Payment reference submitted: <strong>${escapeHtml(t.payment_reference || '')}</strong></p>
        <p class="payment-note">Awaiting verification from SitePragati.</p>
      </div>`;
  }
  if (t.status === 'Payment Received') {
    return `
      <div class="ticket-payment ticket-payment-confirmed">
        <p>✓ Payment of ₹${escapeHtml(String(t.payment_amount))} confirmed${t.payment_reference ? ` — ref: ${escapeHtml(t.payment_reference)}` : ''}</p>
      </div>`;
  }
  return '';
}

function buildTicketCardHtml(t) {
  return `
      <div class="ticket-card">
        <div class="ticket-card-head">
          <h3>${escapeHtml(t.subject)}</h3>
          <span class="status-badge ${statusClass(t.status)}">${escapeHtml(t.status)}</span>
        </div>
        <p>${escapeHtml(t.description || '')}</p>
        <p class="ticket-date">Raised ${escapeHtml(new Date(t.created_at).toLocaleDateString())}${t.reference_code ? ` · Request ID: ${escapeHtml(t.reference_code)}` : ''}</p>
        ${renderTicketPaymentSection(t)}
        <button type="button" class="btn btn-outline btn-small conversation-toggle" data-ticket-id="${t.id}">💬 View conversation</button>
        <div class="ticket-comments-section" data-ticket-id="${t.id}" hidden>
          <div class="comments-list" data-ticket-id="${t.id}"><p class="empty-note">Loading…</p></div>
          <div class="comment-form">
            <textarea class="new-comment-text" data-ticket-id="${t.id}" rows="3" placeholder="Write a message…"></textarea>
            <div class="comment-form-row">
              <input type="file" class="new-comment-file" data-ticket-id="${t.id}">
              <button type="button" class="btn btn-primary btn-small comment-post-btn" data-ticket-id="${t.id}">Send</button>
            </div>
            <p class="comment-form-msg" data-ticket-id="${t.id}"></p>
          </div>
        </div>
      </div>`;
}

function wireTicketCardEvents(container) {
  container.querySelectorAll('.payment-submit-btn').forEach(btn => {
    btn.addEventListener('click', () => submitPaymentReference(btn.dataset.ticketId));
  });
  container.querySelectorAll('.conversation-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleCustomerConversation(btn.dataset.ticketId, btn));
  });
  container.querySelectorAll('.comment-post-btn').forEach(btn => {
    btn.addEventListener('click', () => postCustomerComment(btn.dataset.ticketId));
  });
}

let customerTicketsCache = [];

function applyCustomerTicketFilters() {
  const statusFilter = document.getElementById('customerFilterStatus').value;
  let filtered = customerTicketsCache;
  if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);

  const list = document.getElementById('ticketsList');
  const closedSection = document.getElementById('customerClosedSection');

  if (statusFilter === 'Closed') {
    list.innerHTML = filtered.length
      ? filtered.map(buildTicketCardHtml).join('')
      : '<p class="empty-note">No closed tickets match this filter.</p>';
    wireTicketCardEvents(list);
    closedSection.hidden = true;
    return;
  }

  const active = filtered.filter(t => t.status !== 'Closed');
  const closed = filtered.filter(t => t.status === 'Closed');

  list.innerHTML = active.length
    ? active.map(buildTicketCardHtml).join('')
    : '<p class="empty-note">No tickets yet — raise one above if you need something updated or fixed.</p>';
  wireTicketCardEvents(list);

  document.getElementById('customerClosedCount').textContent = closed.length;
  closedSection.hidden = closed.length === 0;

  const closedList = document.getElementById('customerClosedList');
  closedList.innerHTML = closed.map(buildTicketCardHtml).join('');
  wireTicketCardEvents(closedList);
}

document.getElementById('customerFilterStatus').addEventListener('change', applyCustomerTicketFilters);

document.getElementById('toggleCustomerClosed').addEventListener('click', () => {
  const closedList = document.getElementById('customerClosedList');
  const isHidden = closedList.hidden;
  closedList.hidden = !isHidden;
  const count = document.getElementById('customerClosedCount').textContent;
  document.getElementById('toggleCustomerClosed').innerHTML = isHidden
    ? `Hide closed tickets (<span id="customerClosedCount">${count}</span>)`
    : `Show closed tickets (<span id="customerClosedCount">${count}</span>)`;
});

async function loadCustomerTickets() {
  const list = document.getElementById('ticketsList');
  list.innerHTML = '<p class="empty-note">Loading…</p>';

  try {
    const res = await fetch('/api/customer/tickets');
    const data = await res.json();
    customerTicketsCache = data.tickets || [];

    document.getElementById('customerFilterName').value = loggedInBusinessName || '';
    applyCustomerTicketFilters();
  } catch (err) {
    list.innerHTML = '<p class="empty-note">Could not load tickets.</p>';
  }
}

async function toggleCustomerConversation(ticketId, btn) {
  const section = document.querySelector(`.ticket-comments-section[data-ticket-id="${ticketId}"]`);
  const isHidden = section.hidden;
  section.hidden = !isHidden;
  btn.textContent = isHidden ? '💬 Hide conversation' : '💬 View conversation';

  if (isHidden) {
    loadCustomerTicketComments(ticketId);
  }
}

async function loadCustomerTicketComments(ticketId) {
  const list = document.querySelector(`.comments-list[data-ticket-id="${ticketId}"]`);
  list.innerHTML = '<p class="empty-note">Loading…</p>';
  try {
    const res = await fetch(`/api/customer/ticket-comments?ticket_id=${ticketId}`);
    const data = await res.json();
    list.innerHTML = renderCommentThread(data.comments, '/api/customer/ticket-file');
  } catch (err) {
    list.innerHTML = '<p class="empty-note">Could not load conversation.</p>';
  }
}

async function postCustomerComment(ticketId) {
  const textEl = document.querySelector(`.new-comment-text[data-ticket-id="${ticketId}"]`);
  const fileEl = document.querySelector(`.new-comment-file[data-ticket-id="${ticketId}"]`);
  const msgEl = document.querySelector(`.comment-form-msg[data-ticket-id="${ticketId}"]`);
  const text = textEl.value.trim();
  const file = fileEl.files[0];

  if (!text && !file) {
    msgEl.textContent = 'Write a message or attach a file.';
    return;
  }

  const formData = new FormData();
  formData.append('ticket_id', ticketId);
  formData.append('comment', text);
  if (file) formData.append('file', file);

  msgEl.textContent = 'Sending…';

  try {
    const res = await fetch('/api/customer/ticket-comments', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok || data.error) {
      msgEl.textContent = 'Error: ' + (data.error || 'Could not send');
      return;
    }
    textEl.value = '';
    fileEl.value = '';
    msgEl.textContent = '';
    loadCustomerTicketComments(ticketId);
  } catch (err) {
    msgEl.textContent = 'Something went wrong. Please try again.';
  }
}

async function submitPaymentReference(ticketId) {
  const input = document.querySelector(`.payment-ref-input[data-ticket-id="${ticketId}"]`);
  const msgEl = document.querySelector(`.payment-status-msg[data-ticket-id="${ticketId}"]`);
  const reference = input.value.trim();

  if (!reference) {
    msgEl.textContent = 'Please enter your transaction reference number.';
    return;
  }

  msgEl.textContent = 'Submitting…';

  try {
    const res = await fetch('/api/customer/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(ticketId), payment_reference: reference })
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      msgEl.textContent = 'Error: ' + (data.error || 'Could not submit payment');
      return;
    }
    loadCustomerTickets();
  } catch (err) {
    msgEl.textContent = 'Something went wrong. Please try again.';
  }
}

const ticketModal = makeModal('ticketModalOverlay');

document.getElementById('newTicketBtn').addEventListener('click', () => {
  ticketModal.show();
});

document.getElementById('ticketCancelBtn').addEventListener('click', () => {
  ticketModal.hide();
  document.getElementById('ticketSubject').value = '';
  document.getElementById('ticketDescription').value = '';
});
document.getElementById('ticketModalCloseBtn').addEventListener('click', () => {
  ticketModal.hide();
  document.getElementById('ticketSubject').value = '';
  document.getElementById('ticketDescription').value = '';
});

const ticketSaveBtn = document.getElementById('ticketSaveBtn');
ticketSaveBtn.addEventListener('click', () => {
  const subject = document.getElementById('ticketSubject').value.trim();
  const description = document.getElementById('ticketDescription').value.trim();

  if (!subject) {
    alert('Please enter a subject for the ticket.');
    return;
  }

  withButtonSpinner(ticketSaveBtn, 'Submitting…', async () => {
    try {
      const res = await fetch('/api/customer/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, description })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert('Error: ' + (data.error || 'Could not submit ticket'));
        return;
      }
      ticketModal.hide();
      document.getElementById('ticketSubject').value = '';
      document.getElementById('ticketDescription').value = '';
      loadCustomerTickets();
    } catch (err) {
      alert('Something went wrong submitting this ticket.');
    }
  });
});


// ===== Init =====
// If arriving via a link like portal.html?role=admin, pre-select that tab
// on the login screen (only matters if not already logged in).
const requestedRole = new URLSearchParams(window.location.search).get('role');
if (requestedRole === 'admin' || requestedRole === 'customer') {
  setRole(requestedRole);
}

// A password-reset email link (?admin_reset_token=...) always wins over
// whatever checkSession() would otherwise show — even an existing admin
// session shouldn't hide an explicit reset request.
const resetTokenFromUrl = new URLSearchParams(window.location.search).get('admin_reset_token');

checkSession().then(() => {
  if (resetTokenFromUrl) {
    adminResetToken = resetTokenFromUrl;
    showLogin();
    setRole('admin');
    showLoginCard('resetPasswordCard');
    window.history.replaceState({}, '', window.location.pathname);
  }
});
