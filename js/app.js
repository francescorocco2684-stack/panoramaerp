(() => {
  'use strict';

  const STORAGE_EXPENSES = 'ppc_expenses';
  const STORAGE_DEADLINES = 'ppc_deadlines';
  const STORAGE_INSTALLMENTS = 'ppc_installments';
  const STORAGE_INCOMES = 'ppc_incomes';
  const STORAGE_INCOME_SCHEDULES = 'ppc_income_schedules';
  const STORAGE_CUSTOM_CATEGORIES = 'ppc_custom_categories';

  const EXPENSE_CATEGORIES = ['Bollette', 'Affitto/Mutuo', 'Spesa', 'Trasporti', 'Assicurazioni', 'Tasse', 'Abbonamenti', 'Salute', 'Svago', 'Altro'];
  const INCOME_CATEGORIES = ['Stipendio', 'Freelance', 'Bonus', 'Rimborso', 'Regalo', 'Altra entrata'];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const euro = (n) => '€' + (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function daysBetween(dateISO) {
    const ms = new Date(dateISO + 'T00:00:00') - new Date(todayISO() + 'T00:00:00');
    return Math.round(ms / 86400000);
  }

  function formatDate(dateISO) {
    const d = new Date(dateISO + 'T00:00:00');
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ---------- Storage ----------
  const Store = {
    load(key) {
      try {
        return JSON.parse(localStorage.getItem(key)) || [];
      } catch (e) {
        return [];
      }
    },
    save(key, data) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  let expenses = Store.load(STORAGE_EXPENSES);
  let deadlines = Store.load(STORAGE_DEADLINES);
  let installments = Store.load(STORAGE_INSTALLMENTS);
  let incomes = Store.load(STORAGE_INCOMES);
  let incomeSchedules = Store.load(STORAGE_INCOME_SCHEDULES);
  let customCategories = Store.load(STORAGE_CUSTOM_CATEGORIES);

  function saveExpenses() { Store.save(STORAGE_EXPENSES, expenses); }
  function saveDeadlines() { Store.save(STORAGE_DEADLINES, deadlines); }
  function saveInstallments() { Store.save(STORAGE_INSTALLMENTS, installments); }
  function saveIncomes() { Store.save(STORAGE_INCOMES, incomes); }
  function saveIncomeSchedules() { Store.save(STORAGE_INCOME_SCHEDULES, incomeSchedules); }
  function saveCustomCategories() { Store.save(STORAGE_CUSTOM_CATEGORIES, customCategories); }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  // ---------- Navigation ----------
  const views = {
    dashboard: '#view-dashboard',
    expenses: '#view-expenses',
    deadlines: '#view-deadlines',
    installments: '#view-installments',
    incomes: '#view-incomes',
    charts: '#view-charts'
  };
  let currentView = 'dashboard';

  function switchView(name) {
    currentView = name;
    Object.entries(views).forEach(([key, sel]) => {
      $(sel).hidden = key !== name;
    });
    $$('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === name));
    render();
  }

  $$('.nav-btn').forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.view)));

  // ---------- Expenses month filter ----------
  let expMonthCursor = new Date();
  expMonthCursor.setDate(1);

  $('#expenses-prev').addEventListener('click', () => {
    expMonthCursor.setMonth(expMonthCursor.getMonth() - 1);
    renderExpensesView();
  });
  $('#expenses-next').addEventListener('click', () => {
    expMonthCursor.setMonth(expMonthCursor.getMonth() + 1);
    renderExpensesView();
  });

  function isSameMonth(dateISO, refDate) {
    const d = new Date(dateISO + 'T00:00:00');
    return d.getFullYear() === refDate.getFullYear() && d.getMonth() === refDate.getMonth();
  }

  // ---------- Deadlines filter ----------
  let deadlineFilter = 'open';
  $$('#view-deadlines .filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      deadlineFilter = tab.dataset.filter;
      $$('#view-deadlines .filter-tab').forEach((t) => t.classList.toggle('active', t === tab));
      renderDeadlinesView();
    });
  });

  // ---------- Income sub-tab & month filter ----------
  let incomeSubTab = 'entrate';
  let incomeMonthCursor = new Date();
  incomeMonthCursor.setDate(1);

  $$('#view-incomes .filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      incomeSubTab = tab.dataset.incomeFilter;
      $$('#view-incomes .filter-tab').forEach((t) => t.classList.toggle('active', t === tab));
      $('#income-entrate-panel').hidden = incomeSubTab !== 'entrate';
      $('#income-ricorrenti-panel').hidden = incomeSubTab !== 'ricorrenti';
      renderIncomesView();
    });
  });

  $('#income-prev').addEventListener('click', () => {
    incomeMonthCursor.setMonth(incomeMonthCursor.getMonth() - 1);
    renderIncomesView();
  });
  $('#income-next').addEventListener('click', () => {
    incomeMonthCursor.setMonth(incomeMonthCursor.getMonth() + 1);
    renderIncomesView();
  });

  // ---------- Rendering ----------
  function render() {
    if (currentView === 'dashboard') renderDashboard();
    if (currentView === 'expenses') renderExpensesView();
    if (currentView === 'deadlines') renderDeadlinesView();
    if (currentView === 'installments') renderInstallmentsView();
    if (currentView === 'incomes') renderIncomesView();
  }

  function euroSigned(n) {
    const num = Number(n) || 0;
    const sign = num > 0 ? '+' : (num < 0 ? '-' : '');
    return sign + '€' + Math.abs(num).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderDashboard() {
    const now = new Date();
    const monthExpenses = expenses.filter((e) => isSameMonth(e.date, now));
    const totalMonth = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    $('#sum-expenses-month').textContent = euro(totalMonth);

    const monthIncomes = incomes.filter((i) => isSameMonth(i.date, now));
    const totalIncomeMonth = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
    $('#sum-income-month').textContent = euro(totalIncomeMonth);

    const balance = totalIncomeMonth - totalMonth;
    const balanceEl = $('#sum-balance-month');
    balanceEl.textContent = euroSigned(balance);
    balanceEl.classList.toggle('positive', balance >= 0);
    balanceEl.classList.toggle('negative', balance < 0);

    const unpaid = deadlines.filter((d) => !d.paid);
    const totalUnpaid = unpaid.reduce((s, d) => s + Number(d.amount), 0);
    $('#sum-unpaid').textContent = euro(totalUnpaid);

    const overdue = unpaid.filter((d) => daysBetween(d.dueDate) < 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const panelOverdue = $('#panel-overdue');
    panelOverdue.hidden = overdue.length === 0;
    renderDeadlineList('#list-overdue', overdue);

    const upcoming = unpaid
      .filter((d) => { const diff = daysBetween(d.dueDate); return diff >= 0 && diff <= 7; })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const listUpcoming = $('#list-upcoming');
    if (upcoming.length === 0) {
      listUpcoming.innerHTML = '<li class="empty-state">Nessuna scadenza imminente</li>';
    } else {
      renderDeadlineList('#list-upcoming', upcoming);
    }

    renderCategoryChart(monthExpenses);
  }

  function renderCategoryChart(monthExpenses) {
    const chart = $('#chart-categories');
    if (monthExpenses.length === 0) {
      chart.innerHTML = '<p class="empty-state">Nessuna spesa questo mese</p>';
      return;
    }
    const byCategory = {};
    monthExpenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });
    const max = Math.max(...Object.values(byCategory));
    const rows = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => `
        <div class="chart-row">
          <span class="chart-label">${escapeHtml(cat)}</span>
          <span class="chart-bar-wrap"><span class="chart-bar" style="width:${(amount / max) * 100}%"></span></span>
          <span class="chart-value">${euro(amount)}</span>
        </div>`)
      .join('');
    chart.innerHTML = rows;
  }

  function renderExpensesView() {
    const label = expMonthCursor.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    $('#expenses-month-label').textContent = label.charAt(0).toUpperCase() + label.slice(1);

    const monthExpenses = expenses
      .filter((e) => isSameMonth(e.date, expMonthCursor))
      .sort((a, b) => b.date.localeCompare(a.date));

    const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    $('#expenses-total').textContent = 'Totale: ' + euro(total);

    const list = $('#list-expenses');
    if (monthExpenses.length === 0) {
      list.innerHTML = '<li class="empty-state">Nessuna spesa in questo mese</li>';
      return;
    }
    list.innerHTML = monthExpenses.map((e) => `
      <li class="item" data-id="${e.id}" data-type="expense">
        <div class="item-main">
          <span class="item-desc">${escapeHtml(e.description)}</span>
          <span class="item-meta">${escapeHtml(e.category)} · ${formatDate(e.date)}</span>
        </div>
        <span class="item-amount expense">${euro(e.amount)}</span>
      </li>`).join('');
    attachItemHandlers(list);
  }

  function renderDeadlinesView() {
    let list = deadlines.filter((d) => (deadlineFilter === 'open' ? !d.paid : d.paid));
    list = list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    renderDeadlineList('#list-deadlines', list, true);
  }

  function renderDeadlineList(selector, list, allowMarkPaid) {
    const el = $(selector);
    if (list.length === 0) {
      el.innerHTML = '<li class="empty-state">Niente da mostrare</li>';
      return;
    }
    el.innerHTML = list.map((d) => {
      const diff = daysBetween(d.dueDate);
      let badge = '';
      if (!d.paid) {
        if (diff < 0) badge = `<span class="badge badge-overdue">Scaduta</span>`;
        else if (diff <= 7) badge = `<span class="badge badge-soon">${diff === 0 ? 'Oggi' : diff + 'g'}</span>`;
      }
      const amountClass = d.paid ? 'paid' : (diff < 0 ? 'overdue' : 'expense');
      return `
      <li class="item" data-id="${d.id}" data-type="deadline">
        <div class="item-main">
          <span class="item-desc">${escapeHtml(d.description)}${badge}</span>
          <span class="item-meta">${escapeHtml(d.category)} · ${formatDate(d.dueDate)}${d.recurring !== 'none' ? ' · ricorrente' : ''}</span>
        </div>
        <span class="item-amount ${amountClass}">${euro(d.amount)}</span>
      </li>`;
    }).join('');
    attachItemHandlers(el);
  }

  function monthsBetweenInclusive(startISO, endISO) {
    const s = new Date(startISO + 'T00:00:00');
    const e = new Date(endISO + 'T00:00:00');
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  }

  function isInstallmentActive(item) {
    const t = todayISO();
    return t >= item.startDate && t <= item.endDate;
  }

  function renderInstallmentsView() {
    const sorted = [...installments].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const active = installments.filter(isInstallmentActive);
    const activeMonthlyTotal = active.reduce((s, i) => s + Number(i.amount), 0);
    $('#installments-total').textContent = active.length === 0
      ? 'Nessuna rata attiva'
      : `Rate attive: ${active.length} · Impegno mensile: ${euro(activeMonthlyTotal)}`;

    const list = $('#list-installments');
    if (sorted.length === 0) {
      list.innerHTML = '<li class="empty-state">Nessuna rata registrata</li>';
      return;
    }
    list.innerHTML = sorted.map(renderInstallmentItem).join('');
    attachItemHandlers(list);
  }

  function renderInstallmentItem(item) {
    const totalMonths = Math.max(1, monthsBetweenInclusive(item.startDate, item.endDate));
    const today = todayISO();
    let paidMonths;
    if (today < item.startDate) paidMonths = 0;
    else if (today > item.endDate) paidMonths = totalMonths;
    else paidMonths = monthsBetweenInclusive(item.startDate, today);
    paidMonths = Math.min(totalMonths, Math.max(0, paidMonths));
    const remainingMonths = totalMonths - paidMonths;
    const pct = Math.round((paidMonths / totalMonths) * 100);

    let badge;
    if (today > item.endDate) badge = `<span class="badge badge-done">Completata</span>`;
    else if (today < item.startDate) badge = `<span class="badge badge-soon">Da iniziare</span>`;
    else badge = `<span class="badge badge-active">In corso</span>`;

    return `
      <li class="item" data-id="${item.id}" data-type="installment">
        <div class="item-main">
          <span class="item-desc">${escapeHtml(item.description)}${badge}</span>
          <span class="item-meta">${escapeHtml(item.category)} · ${formatDate(item.startDate)} → ${formatDate(item.endDate)}</span>
          <span class="item-meta">Rata ${paidMonths}/${totalMonths} · ${remainingMonths} rimanenti</span>
          <span class="chart-bar-wrap installment-progress"><span class="chart-bar" style="width:${pct}%"></span></span>
        </div>
        <div class="item-amount-wrap">
          <span class="item-amount expense">${euro(item.amount)}</span>
          <span class="item-meta">/mese</span>
        </div>
      </li>`;
  }

  function renderIncomesView() {
    if (incomeSubTab === 'entrate') renderIncomeEntriesView();
    else renderIncomeSchedulesView();
  }

  function renderIncomeEntriesView() {
    const label = incomeMonthCursor.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    $('#income-month-label').textContent = label.charAt(0).toUpperCase() + label.slice(1);

    const monthIncomes = incomes
      .filter((i) => isSameMonth(i.date, incomeMonthCursor))
      .sort((a, b) => b.date.localeCompare(a.date));

    const total = monthIncomes.reduce((s, i) => s + Number(i.amount), 0);
    $('#income-total').textContent = 'Totale: ' + euro(total);

    const list = $('#list-incomes');
    if (monthIncomes.length === 0) {
      list.innerHTML = '<li class="empty-state">Nessuna entrata in questo mese</li>';
      return;
    }
    list.innerHTML = monthIncomes.map((i) => `
      <li class="item" data-id="${i.id}" data-type="income">
        <div class="item-main">
          <span class="item-desc">${escapeHtml(i.description)}</span>
          <span class="item-meta">${escapeHtml(i.category)} · ${formatDate(i.date)}</span>
        </div>
        <span class="item-amount paid">+${euro(i.amount)}</span>
      </li>`).join('');
    attachItemHandlers(list);
  }

  function renderIncomeSchedulesView() {
    const sorted = [...incomeSchedules].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const list = $('#list-income-schedules');
    if (sorted.length === 0) {
      list.innerHTML = '<li class="empty-state">Nessuna entrata ricorrente configurata</li>';
      return;
    }
    list.innerHTML = sorted.map((s) => {
      const diff = daysBetween(s.dueDate);
      let badge = '';
      if (diff < 0) badge = `<span class="badge badge-overdue">In ritardo</span>`;
      else if (diff <= 7) badge = `<span class="badge badge-soon">${diff === 0 ? 'Oggi' : diff + 'g'}</span>`;
      return `
      <li class="item" data-id="${s.id}" data-type="income_recurring">
        <div class="item-main">
          <span class="item-desc">${escapeHtml(s.description)}${badge}</span>
          <span class="item-meta">${escapeHtml(s.category)} · prossima il ${formatDate(s.dueDate)} · ricorrente</span>
        </div>
        <span class="item-amount paid">+${euro(s.amount)}</span>
      </li>`;
    }).join('');
    attachItemHandlers(list);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function attachItemHandlers(listEl) {
    listEl.querySelectorAll('.item').forEach((li) => {
      li.addEventListener('click', () => openEditModal(li.dataset.type, li.dataset.id));
    });
  }

  // ---------- Modal ----------
  const overlay = $('#modal-overlay');
  const form = $('#entry-form');
  let modalType = 'expense';
  let editingId = null;

  const TYPE_LABELS = {
    expense: { title: 'Nuova spesa', date: 'Data', amount: 'Importo (€)' },
    deadline: { title: 'Nuova scadenza', date: 'Scadenza', amount: 'Importo (€)' },
    installment: { title: 'Nuova rata', date: 'Data inizio', amount: 'Importo rata mensile (€)' },
    income: { title: 'Nuova entrata', date: 'Data', amount: 'Importo (€)' },
    income_recurring: { title: 'Nuova entrata ricorrente', date: 'Prossima data', amount: 'Importo previsto (€)' }
  };
  const INCOME_TYPES = ['income', 'income_recurring'];

  function populateCategorySelect(type) {
    const base = INCOME_TYPES.includes(type) ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const options = [...base, ...customCategories.filter((c) => !base.includes(c))];
    const select = $('#field-category');
    const prevValue = select.value;
    select.innerHTML = options.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')
      + '<option value="__new__">+ Nuova categoria…</option>';
    if (options.includes(prevValue)) select.value = prevValue;
  }

  $('#field-category').addEventListener('change', (e) => {
    if (e.target.value !== '__new__') return;
    const name = (window.prompt('Nome della nuova categoria:') || '').trim();
    if (name && !customCategories.includes(name)) {
      customCategories.push(name);
      saveCustomCategories();
    }
    populateCategorySelect(modalType);
    if (name) $('#field-category').value = name;
  });

  function setModalType(type) {
    modalType = type;
    $$('.type-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
    const labels = TYPE_LABELS[type];
    $('#field-date-label').textContent = labels.date;
    $('#field-amount-label').textContent = labels.amount;
    $('#field-recurring-wrap').hidden = !(type === 'deadline' || type === 'income_recurring');
    $('#field-date-end-wrap').hidden = type !== 'installment';
    $('#field-date-end').required = type === 'installment';
    $('#modal-title').textContent = editingId ? 'Modifica' : labels.title;
    populateCategorySelect(type);
  }

  $$('.type-btn').forEach((btn) => btn.addEventListener('click', () => setModalType(btn.dataset.type)));

  function collectionForType(type) {
    if (type === 'expense') return expenses;
    if (type === 'deadline') return deadlines;
    if (type === 'installment') return installments;
    if (type === 'income') return incomes;
    return incomeSchedules;
  }

  function openAddModal() {
    editingId = null;
    form.reset();
    $('#entry-id').value = '';
    $('#field-date').value = todayISO();
    $('#field-date-end').value = '';
    $('#field-recurring').value = 'none';
    $('#btn-delete').hidden = true;

    const isIncomeView = currentView === 'incomes';
    $('#type-toggle-expense').hidden = isIncomeView;
    $('#type-toggle-income').hidden = !isIncomeView;

    let defaultType = 'expense';
    if (currentView === 'deadlines') defaultType = 'deadline';
    if (currentView === 'installments') defaultType = 'installment';
    if (isIncomeView) defaultType = incomeSubTab === 'ricorrenti' ? 'income_recurring' : 'income';
    if (defaultType === 'deadline' || defaultType === 'income_recurring') $('#field-recurring').value = 'monthly';
    setModalType(defaultType);
    overlay.hidden = false;
  }

  function openEditModal(type, id) {
    editingId = id;
    const item = collectionForType(type).find((x) => x.id === id);
    if (!item) return;
    $('#entry-id').value = id;
    $('#field-description').value = item.description;
    $('#field-amount').value = item.amount;
    $('#field-date').value = (type === 'expense' || type === 'income') ? item.date
      : (type === 'installment' ? item.startDate : item.dueDate);
    $('#field-date-end').value = type === 'installment' ? item.endDate : '';
    $('#field-note').value = item.note || '';
    $('#field-recurring').value = item.recurring || 'none';
    $('#btn-delete').hidden = false;
    // Editing never changes the entry's fundamental type.
    $('#type-toggle-expense').hidden = true;
    $('#type-toggle-income').hidden = true;
    setModalType(type);
    $('#field-category').value = item.category;
    overlay.hidden = false;

    // Add "mark as done" affordance for open deadlines / income schedules
    toggleMarkPaidButton(type, item);
  }

  let markPaidBtn = null;
  function toggleMarkPaidButton(type, item) {
    if (markPaidBtn) { markPaidBtn.remove(); markPaidBtn = null; }
    if (type === 'deadline' && !item.paid) {
      markPaidBtn = document.createElement('button');
      markPaidBtn.type = 'button';
      markPaidBtn.className = 'btn btn-primary';
      markPaidBtn.textContent = 'Segna come pagata';
      markPaidBtn.style.marginBottom = '10px';
      markPaidBtn.style.width = '100%';
      markPaidBtn.addEventListener('click', () => markDeadlinePaid(item.id));
      $('.modal-actions').before(markPaidBtn);
    } else if (type === 'income_recurring') {
      markPaidBtn = document.createElement('button');
      markPaidBtn.type = 'button';
      markPaidBtn.className = 'btn btn-primary';
      markPaidBtn.textContent = 'Segna come ricevuto';
      markPaidBtn.style.marginBottom = '10px';
      markPaidBtn.style.width = '100%';
      markPaidBtn.addEventListener('click', () => promptIncomeReceipt(item.id));
      $('.modal-actions').before(markPaidBtn);
    }
  }

  function closeModal() {
    overlay.hidden = true;
    if (markPaidBtn) { markPaidBtn.remove(); markPaidBtn = null; }
  }

  $('#modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  $('#fab').addEventListener('click', openAddModal);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const description = $('#field-description').value.trim();
    const amount = parseFloat($('#field-amount').value);
    const category = $('#field-category').value;
    const date = $('#field-date').value;
    const dateEnd = $('#field-date-end').value;
    const note = $('#field-note').value.trim();

    if (!description || isNaN(amount) || !date) return;
    if (modalType === 'installment' && (!dateEnd || dateEnd < date)) return;

    if (modalType === 'expense') {
      if (editingId) {
        const item = expenses.find((x) => x.id === editingId);
        Object.assign(item, { description, amount, category, date, note });
      } else {
        expenses.push({ id: uid(), description, amount, category, date, note });
      }
      saveExpenses();
    } else if (modalType === 'deadline') {
      const recurring = $('#field-recurring').value;
      if (editingId) {
        const item = deadlines.find((x) => x.id === editingId);
        Object.assign(item, { description, amount, category, dueDate: date, note, recurring });
      } else {
        deadlines.push({ id: uid(), description, amount, category, dueDate: date, note, recurring, paid: false, paidDate: null });
      }
      saveDeadlines();
    } else if (modalType === 'installment') {
      if (editingId) {
        const item = installments.find((x) => x.id === editingId);
        Object.assign(item, { description, amount, category, startDate: date, endDate: dateEnd, note });
      } else {
        installments.push({ id: uid(), description, amount, category, startDate: date, endDate: dateEnd, note });
      }
      saveInstallments();
    } else if (modalType === 'income') {
      if (editingId) {
        const item = incomes.find((x) => x.id === editingId);
        Object.assign(item, { description, amount, category, date, note });
      } else {
        incomes.push({ id: uid(), description, amount, category, date, note });
      }
      saveIncomes();
    } else {
      const recurring = $('#field-recurring').value;
      if (editingId) {
        const item = incomeSchedules.find((x) => x.id === editingId);
        Object.assign(item, { description, amount, category, dueDate: date, note, recurring });
      } else {
        incomeSchedules.push({ id: uid(), description, amount, category, dueDate: date, note, recurring, paid: false, paidDate: null });
      }
      saveIncomeSchedules();
    }

    closeModal();
    render();
    toast('Salvato');
  });

  $('#btn-delete').addEventListener('click', () => {
    if (!editingId) return;
    if (modalType === 'expense') {
      expenses = expenses.filter((x) => x.id !== editingId);
      saveExpenses();
    } else if (modalType === 'deadline') {
      deadlines = deadlines.filter((x) => x.id !== editingId);
      saveDeadlines();
    } else if (modalType === 'installment') {
      installments = installments.filter((x) => x.id !== editingId);
      saveInstallments();
    } else if (modalType === 'income') {
      incomes = incomes.filter((x) => x.id !== editingId);
      saveIncomes();
    } else {
      incomeSchedules = incomeSchedules.filter((x) => x.id !== editingId);
      saveIncomeSchedules();
    }
    closeModal();
    render();
    toast('Eliminato');
  });

  function nextDueDate(dateISO, recurring) {
    const d = new Date(dateISO + 'T00:00:00');
    if (recurring === 'monthly') d.setMonth(d.getMonth() + 1);
    if (recurring === 'yearly') d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  function markDeadlinePaid(id) {
    const item = deadlines.find((x) => x.id === id);
    if (!item) return;

    expenses.push({
      id: uid(),
      description: item.description,
      amount: item.amount,
      category: item.category,
      date: todayISO(),
      note: item.note || ''
    });
    saveExpenses();

    if (item.recurring && item.recurring !== 'none') {
      item.dueDate = nextDueDate(item.dueDate, item.recurring);
      item.paid = false;
      item.paidDate = null;
    } else {
      item.paid = true;
      item.paidDate = todayISO();
    }
    saveDeadlines();

    closeModal();
    render();
    toast('Segnata come pagata');
  }

  function promptIncomeReceipt(id) {
    const item = incomeSchedules.find((x) => x.id === id);
    if (!item) return;

    const input = window.prompt(`Importo ricevuto per "${item.description}"`, item.amount);
    if (input === null) return;
    const amount = parseFloat(String(input).replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast('Importo non valido');
      return;
    }

    incomes.push({
      id: uid(),
      description: item.description,
      amount,
      category: item.category,
      date: todayISO(),
      note: item.note || ''
    });
    saveIncomes();

    // Remember the (possibly edited) amount as the new expected default.
    item.amount = amount;
    if (item.recurring && item.recurring !== 'none') {
      item.dueDate = nextDueDate(item.dueDate, item.recurring);
      item.paid = false;
      item.paidDate = null;
    } else {
      item.paid = true;
      item.paidDate = todayISO();
    }
    saveIncomeSchedules();

    closeModal();
    render();
    toast('Entrata registrata');
  }

  // ---------- Export ----------
  $('#btn-export').addEventListener('click', () => {
    const data = { expenses, deadlines, installments, incomes, incomeSchedules, customCategories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ppc-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Backup esportato');
  });

  // ---------- Service worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // ---------- Init ----------
  render();
})();
