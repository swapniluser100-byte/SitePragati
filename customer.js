const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');

// ===== Auth =====
async function checkSession() {
  const res = await fetch('/api/customer/tickets');
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
  loadTickets();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  try {
    const res = await fetch('/api/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed';
      return;
    }
    document.getElementById('password').value = '';
    document.getElementById('welcomeLine').textContent = `Welcome, ${data.businessName || ''}`;
    showDashboard();
  } catch (err) {
    errorEl.textContent = 'Something went wrong. Please try again.';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/customer/logout', { method: 'POST' });
  showLogin();
});

// ===== Tickets =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function statusClass(status) {
  return 'status-' + (status || 'open').toLowerCase().replace(/\s+/g, '-');
}

async function loadTickets() {
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
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<p class="empty-note">Could not load tickets.</p>';
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
    loadTickets();
  } catch (err) {
    alert('Something went wrong submitting this ticket.');
  }
});

// ===== Init =====
checkSession();
