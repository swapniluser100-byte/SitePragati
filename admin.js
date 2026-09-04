const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');

// ===== Auth =====
async function checkSession() {
  const res = await fetch('/api/admin/leads');
  if (res.ok) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginScreen.hidden = false;
  dashboard.hidden = true;
}

function showDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden = false;
  loadLeads();
  loadCustomers();
  loadCaseStudies();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed';
      return;
    }
    document.getElementById('password').value = '';
    showDashboard();
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again.';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

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
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

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
          <p>${escapeHtml(c.contact_name || '')} ${c.phone ? '· ' + escapeHtml(c.phone) : ''}</p>
          <p>${c.next_payment_due_date ? 'Next due: ' + escapeHtml(c.next_payment_due_date) : 'No due date set'}${c.next_payment_due_amount ? ' — ₹' + escapeHtml(String(c.next_payment_due_amount)) : ''}</p>
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

  if (id) {
    const c = customersCache.find(x => String(x.id) === String(id));
    if (c) {
      Object.keys(custFields).forEach(key => {
        if (c[key] != null) custFields[key].value = c[key];
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
  const method = isEdit ? 'PUT' : 'POST';
  if (!isEdit) delete payload.id;

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

// ===== Customer detail view (transactions) =====
function openCustomerDetail(id) {
  currentCustomerId = id;
  const c = customersCache.find(x => String(x.id) === String(id));
  if (!c) return;

  document.getElementById('customersListView').hidden = true;
  document.getElementById('customerDetailView').hidden = false;

  document.getElementById('customerDetailInfo').innerHTML = `
    <h3>${escapeHtml(c.business_name)}</h3>
    <p>${escapeHtml(c.contact_name || '')} ${c.phone ? '· ' + escapeHtml(c.phone) : ''}</p>
    <p>${escapeHtml(c.address || '')}</p>
    <p class="due-amount">${c.next_payment_due_date ? 'Next due: ' + escapeHtml(c.next_payment_due_date) : 'No due date set'}${c.next_payment_due_amount ? ' — ₹' + escapeHtml(String(c.next_payment_due_amount)) : ''}</p>
  `;

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
  } catch (err) {
    alert('Something went wrong saving this transaction.');
  }
});

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction? This cannot be undone.')) return;
  await fetch('/api/admin/transactions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Number(id) })
  });
  loadTransactions(currentCustomerId);
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

// ===== Init =====
checkSession();
