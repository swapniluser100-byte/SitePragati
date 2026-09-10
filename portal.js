// ===== Shared: role toggle + auth =====
let loginRole = 'customer'; // default selected tab on the login screen

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function setRole(role) {
  loginRole = role;
  document.getElementById('roleCustomerBtn').classList.toggle('active', role === 'customer');
  document.getElementById('roleAdminBtn').classList.toggle('active', role === 'admin');
  document.getElementById('emailFieldWrap').hidden = (role === 'admin');
  document.getElementById('email').required = (role === 'customer');
  document.getElementById('loginSub').textContent = role === 'admin' ? 'Admin console' : 'Customer portal';
  document.getElementById('loginHelp').hidden = (role === 'admin');
  document.getElementById('loginError').textContent = '';
}

document.getElementById('roleCustomerBtn').addEventListener('click', () => setRole('customer'));
document.getElementById('roleAdminBtn').addEventListener('click', () => setRole('admin'));

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
}

function showCustomerDashboard(businessName) {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('adminDashboard').hidden = true;
  document.getElementById('customerDashboard').hidden = false;
  document.getElementById('welcomeLine').textContent = businessName ? `Welcome, ${businessName}` : '';
  loadCustomerTickets();
}

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
const STATUS_OPTIONS = ['New', 'Contacted', 'Won', 'Lost'];

async function loadLeads() {
  const tbody = document.getElementById('leadsTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="empty-note">Loading…</td></tr>';

  try {
    const res = await fetch('/api/admin/leads');
    const data = await res.json();

    if (!data.leads || data.leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-note">No leads yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.leads.map(lead => `
      <tr data-id="${lead.id}">
        <td>${escapeHtml(new Date(lead.created_at).toLocaleDateString())}</td>
        <td>${escapeHtml(lead.name)}</td>
        <td>${escapeHtml(lead.business)}</td>
        <td>${escapeHtml(lead.business_type)}</td>
        <td>${escapeHtml(lead.contact)}</td>
        <td class="message-cell">${escapeHtml(lead.message)}</td>
        <td>
          <select class="status-select" data-id="${lead.id}">
            ${STATUS_OPTIONS.map(s => `<option value="${s}" ${s === lead.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn-danger" data-delete-lead="${lead.id}">Delete</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('change', () => updateLeadStatus(select.dataset.id, select.value));
    });
    tbody.querySelectorAll('[data-delete-lead]').forEach(btn => {
      btn.addEventListener('click', () => deleteLead(btn.dataset.deleteLead));
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-note">Could not load leads.</td></tr>';
  }
}

async function updateLeadStatus(id, status) {
  await fetch('/api/admin/leads', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(id), status })
  });
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

document.getElementById('refreshLeads').addEventListener('click', loadLeads);

// ===== Customers =====
let customersCache = [];
let currentCustomerId = null;

async function loadCustomers() {
  const list = document.getElementById('customersList');
  list.innerHTML = '<p class="empty-note">Loading…</p>';

  try {
    const res = await fetch('/api/admin/customers');
    const data = await res.json();
    customersCache = data.customers || [];

    if (customersCache.length === 0) {
      list.innerHTML = '<p class="empty-note">No customers yet.</p>';
      return;
    }

    list.innerHTML = customersCache.map(c => `
      <div class="cs-card">
        <div class="cs-card-info">
          <h3>${escapeHtml(c.business_name)}</h3>
          <p class="unique-id">${c.unique_id ? 'ID: ' + escapeHtml(c.unique_id) : 'ID: not yet assigned — edit and save to generate'}</p>
          <p>${escapeHtml(c.contact_name || '')} ${c.phone ? '· ' + escapeHtml(c.phone) : ''}</p>
          <p>${c.next_payment_due_date ? 'Next due: ' + escapeHtml(c.next_payment_due_date) : 'No due date set'}${c.next_payment_due_amount ? ' — ₹' + escapeHtml(String(c.next_payment_due_amount)) : ''}</p>
          <p class="total-paid">Total paid: ₹${escapeHtml(String(c.total_paid ?? 0))}</p>
        </div>
        <div class="cs-card-actions">
          <button class="btn btn-outline btn-small" data-view-txns="${c.id}">Transactions</button>
          <button class="btn btn-outline btn-small" data-edit-cust="${c.id}">Edit</button>
          <button class="btn-danger" data-delete-cust="${c.id}">Delete</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-view-txns]').forEach(btn => {
      btn.addEventListener('click', () => openCustomerDetail(btn.dataset.viewTxns));
    });
    list.querySelectorAll('[data-edit-cust]').forEach(btn => {
      btn.addEventListener('click', () => openCustomerForm(btn.dataset.editCust));
    });
    list.querySelectorAll('[data-delete-cust]').forEach(btn => {
      btn.addEventListener('click', () => deleteCustomer(btn.dataset.deleteCust));
    });
  } catch (err) {
    list.innerHTML = '<p class="empty-note">Could not load customers.</p>';
  }
}

const custForm = document.getElementById('customerForm');
const custFields = {
  id: document.getElementById('custId'),
  business_name: document.getElementById('custBusinessName'),
  contact_name: document.getElementById('custContactName'),
  email: document.getElementById('custEmail'),
  password: document.getElementById('custPassword'),
  phone: document.getElementById('custPhone'),
  address: document.getElementById('custAddress'),
  next_payment_due_date: document.getElementById('custNextDueDate'),
  next_payment_due_amount: document.getElementById('custNextDueAmount')
};

function clearCustomerForm() {
  Object.values(custFields).forEach(el => el.value = '');
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
    }
  }

  custForm.hidden = false;
  custForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('addCustomerBtn').addEventListener('click', () => openCustomerForm(null));
document.getElementById('custCancelBtn').addEventListener('click', () => {
  custForm.hidden = true;
  clearCustomerForm();
});

document.getElementById('custSaveBtn').addEventListener('click', async () => {
  const payload = {};
  Object.entries(custFields).forEach(([key, el]) => { payload[key] = el.value; });

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

  const method = isEdit ? 'PUT' : 'POST';
  if (!isEdit) delete payload.id;
  if (isEdit && !payload.password.trim()) delete payload.password; // don't overwrite existing password

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
    custForm.hidden = true;
    clearCustomerForm();
    loadCustomers();
  } catch (err) {
    alert('Something went wrong saving this customer.');
  }
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

async function loadTickets() {
  const tbody = document.getElementById('ticketsTableBody');
  tbody.innerHTML = '<tr><td colspan="4" class="empty-note">Loading…</td></tr>';

  try {
    const res = await fetch('/api/admin/tickets');
    const data = await res.json();
    ticketsCache = data.tickets || [];

    if (ticketsCache.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-note">No tickets yet.</td></tr>';
      return;
    }

    tbody.innerHTML = ticketsCache.map(t => `
      <tr class="clickable-row" data-ticket-id="${t.id}">
        <td>${escapeHtml(new Date(t.created_at).toLocaleDateString())}</td>
        <td>${escapeHtml(t.business_name)}</td>
        <td>${escapeHtml(t.subject)}</td>
        <td><span class="status-badge ${statusClass(t.status)}">${escapeHtml(t.status)}</span></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => openTicketDetail(row.dataset.ticketId));
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-note">Could not load tickets.</td></tr>';
  }
}

function renderTicketDetailInfo(t) {
  document.getElementById('ticketDetailInfo').innerHTML = `
    <h3>${escapeHtml(t.subject)}</h3>
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

document.getElementById('refreshTickets').addEventListener('click', loadTickets);

// ===== Customer detail view (transactions) =====
function renderCustomerDetailInfo(c) {
  document.getElementById('customerDetailInfo').innerHTML = `
    <h3>${escapeHtml(c.business_name)}</h3>
    <p class="unique-id">${c.unique_id ? 'ID: ' + escapeHtml(c.unique_id) : 'ID: not yet assigned'}</p>
    <p>${escapeHtml(c.contact_name || '')} ${c.phone ? '· ' + escapeHtml(c.phone) : ''}</p>
    <p>${escapeHtml(c.address || '')}</p>
    <p class="due-amount">${c.next_payment_due_date ? 'Next due: ' + escapeHtml(c.next_payment_due_date) : 'No due date set'}${c.next_payment_due_amount ? ' — ₹' + escapeHtml(String(c.next_payment_due_amount)) : ''}</p>
    <p class="total-paid">Total paid: ₹${escapeHtml(String(c.total_paid ?? 0))}</p>
  `;
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

async function loadTransactions(customerId) {
  const tbody = document.getElementById('transactionsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="empty-note">Loading…</td></tr>';

  try {
    const res = await fetch(`/api/admin/transactions?customer_id=${customerId}`);
    const data = await res.json();

    if (!data.transactions || data.transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-note">No transactions yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.transactions.map(t => `
      <tr>
        <td>${escapeHtml(t.transaction_date || '')}</td>
        <td>₹${escapeHtml(String(t.amount))}</td>
        <td>${escapeHtml(t.description || '')}</td>
        <td>${escapeHtml(t.status)}</td>
        <td>
          <button class="btn btn-outline btn-small" data-edit-txn="${t.id}">Edit</button>
          <button class="btn-danger" data-delete-txn="${t.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit-txn]').forEach(btn => {
      btn.addEventListener('click', () => openTransactionForm(data.transactions.find(t => String(t.id) === btn.dataset.editTxn)));
    });
    tbody.querySelectorAll('[data-delete-txn]').forEach(btn => {
      btn.addEventListener('click', () => deleteTransaction(btn.dataset.deleteTxn));
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-note">Could not load transactions.</td></tr>';
  }
}

const txnForm = document.getElementById('transactionForm');
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

  txnForm.hidden = false;
  txnForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('addTransactionBtn').addEventListener('click', () => openTransactionForm(null));
document.getElementById('txnCancelBtn').addEventListener('click', () => {
  txnForm.hidden = true;
  clearTransactionForm();
});

document.getElementById('txnSaveBtn').addEventListener('click', async () => {
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
    txnForm.hidden = true;
    clearTransactionForm();
    loadTransactions(currentCustomerId);
    refreshCurrentCustomerTotal();
  } catch (err) {
    alert('Something went wrong saving this transaction.');
  }
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
          <button class="btn btn-outline btn-small" data-edit-cs="${cs.id}">Edit</button>
          <button class="btn-danger" data-delete-cs="${cs.id}">Delete</button>
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

const csForm = document.getElementById('caseStudyForm');
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

  csForm.hidden = false;
  csForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('addCaseStudyBtn').addEventListener('click', () => openCaseStudyForm(null));
document.getElementById('csCancelBtn').addEventListener('click', () => {
  csForm.hidden = true;
  clearCaseStudyForm();
});

document.getElementById('csSaveBtn').addEventListener('click', async () => {
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
    csForm.hidden = true;
    clearCaseStudyForm();
    loadCaseStudies();
  } catch (err) {
    alert('Something went wrong saving this case study.');
  }
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

async function loadCustomerTickets() {
  const list = document.getElementById('ticketsList');
  list.innerHTML = '<p class="empty-note">Loading…</p>';

  try {
    const res = await fetch('/api/customer/tickets');
    const data = await res.json();

    if (!data.tickets || data.tickets.length === 0) {
      list.innerHTML = '<p class="empty-note">No tickets yet — raise one above if you need something updated or fixed.</p>';
      return;
    }

    list.innerHTML = data.tickets.map(t => `
      <div class="ticket-card">
        <div class="ticket-card-head">
          <h3>${escapeHtml(t.subject)}</h3>
          <span class="status-badge ${statusClass(t.status)}">${escapeHtml(t.status)}</span>
        </div>
        <p>${escapeHtml(t.description || '')}</p>
        <p class="ticket-date">Raised ${escapeHtml(new Date(t.created_at).toLocaleDateString())}</p>
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
      </div>
    `).join('');

    list.querySelectorAll('.payment-submit-btn').forEach(btn => {
      btn.addEventListener('click', () => submitPaymentReference(btn.dataset.ticketId));
    });

    list.querySelectorAll('.conversation-toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleCustomerConversation(btn.dataset.ticketId, btn));
    });

    list.querySelectorAll('.comment-post-btn').forEach(btn => {
      btn.addEventListener('click', () => postCustomerComment(btn.dataset.ticketId));
    });
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

const ticketForm = document.getElementById('ticketForm');

document.getElementById('newTicketBtn').addEventListener('click', () => {
  ticketForm.hidden = false;
  ticketForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('ticketCancelBtn').addEventListener('click', () => {
  ticketForm.hidden = true;
  document.getElementById('ticketSubject').value = '';
  document.getElementById('ticketDescription').value = '';
});

document.getElementById('ticketSaveBtn').addEventListener('click', async () => {
  const subject = document.getElementById('ticketSubject').value.trim();
  const description = document.getElementById('ticketDescription').value.trim();

  if (!subject) {
    alert('Please enter a subject for the ticket.');
    return;
  }

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
    ticketForm.hidden = true;
    document.getElementById('ticketSubject').value = '';
    document.getElementById('ticketDescription').value = '';
    loadCustomerTickets();
  } catch (err) {
    alert('Something went wrong submitting this ticket.');
  }
});


// ===== Init =====
// ===== Init =====
// If arriving via a link like portal.html?role=admin, pre-select that tab
// on the login screen (only matters if not already logged in).
const requestedRole = new URLSearchParams(window.location.search).get('role');
if (requestedRole === 'admin' || requestedRole === 'customer') {
  setRole(requestedRole);
}

checkSession();
