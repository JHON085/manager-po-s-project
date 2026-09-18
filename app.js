(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const cfg = window.PO_CONFIG || {};

  const authPage = $('authPage');
  const appPage = $('appPage');
  const authForm = $('authForm');
  const authEmail = $('authEmail');
  const authPassword = $('authPassword');
  const authMessage = $('authMessage');
  const loginBtn = $('loginBtn');
  const viewerBtn = $('viewerBtn');
  const logoutBtn = $('logoutBtn');
  const userEmail = $('userEmail');
  const syncPill = $('syncPill');
  const rolePill = $('rolePill');

  const newPoBtn = $('newPoBtn');
  const importExcelBtn = $('importExcelBtn');
  const excelFileInput = $('excelFileInput');
  const poModal = $('poModal');
  const closeModalBtn = $('closeModalBtn');
  const cancelPoBtn = $('cancelPoBtn');
  const poForm = $('poForm');
  const modalTitle = $('modalTitle');
  const savePoBtn = $('savePoBtn');
  const formError = $('formError');

  const poId = $('poId');
  const poNumber = $('poNumber');
  const supplier = $('supplier');
  const client = $('client');
  const poOrigin = $('poOrigin');
  const incoterm = $('incoterm');
  const responsible = $('responsible');
  const orderDate = $('orderDate');
  const estimatedReadyDate = $('estimatedReadyDate');
  const poStatus = $('poStatus');
  const notes = $('notes');

  const currency = $('currency');
  const transportation = $('transportation');
  const amountPo = $('amountPo');
  const supplierQuotationNo = $('supplierQuotationNo');
  const supplierPrice = $('supplierPrice');
  const quotationNo = $('quotationNo');
  const workOrder = $('workOrder');
  const lspConsulted = $('lspConsulted');
  const followUpStatus = $('followUpStatus');
  const hiddenStatus = $('hiddenStatus');

  const ordersBody = $('ordersBody');
  const attentionList = $('attentionList');
  const searchInput = $('searchInput');
  const statusFilter = $('statusFilter');
  const situationFilter = $('situationFilter');
  const metricActive = $('metricActive');
  const metricOnTime = $('metricOnTime');
  const metricNear = $('metricNear');
  const metricLate = $('metricLate');
  const metricDone = $('metricDone');
  const toast = $('toast');


  const poView = $('poView');
  const quotesView = $('quotesView');
  const modeTabs = [...document.querySelectorAll('.mode-tab')];
  const quoteNavBadge = $('quoteNavBadge');
  const quoteSetup = $('quoteSetup');
  const newQuoteBtn = $('newQuoteBtn');
  const refreshQuotesBtn = $('refreshQuotesBtn');
  const quoteModal = $('quoteModal');
  const closeQuoteModalBtn = $('closeQuoteModalBtn');
  const cancelQuoteBtn = $('cancelQuoteBtn');
  const quoteForm = $('quoteForm');
  const quoteModalTitle = $('quoteModalTitle');
  const quoteFormError = $('quoteFormError');
  const saveQuoteBtn = $('saveQuoteBtn');
  const quoteId = $('quoteId');
  const quoteReference = $('quoteReference');
  const quoteSupplier = $('quoteSupplier');
  const quoteClient = $('quoteClient');
  const quoteSentAt = $('quoteSentAt');
  const quoteTargetHours = $('quoteTargetHours');
  const quoteResponseAt = $('quoteResponseAt');
  const quoteOwner = $('quoteOwner');
  const quoteNotes = $('quoteNotes');
  const qWaiting = $('qWaiting');
  const qOnTime = $('qOnTime');
  const qAttention = $('qAttention');
  const qLate = $('qLate');
  const qAverage = $('qAverage');
  const quoteAttentionList = $('quoteAttentionList');
  const quoteSearch = $('quoteSearch');
  const quoteStatusFilter = $('quoteStatusFilter');
  const quoteRows = $('quoteRows');

  const EDITOR_EMAILS = new Set([
    'joao@zpmcbrazil.com',
    'moreira@zpmcbrazil.com',
    'leandro@zpmcbrazil.com'
  ]);

  let db = null;
  let currentUser = null;
  let accessMode = 'signed_out'; // signed_out | editor | viewer
  let orders = [];
  let refreshTimer = null;
  let elapsedRenderTimer = null;
  let realtimeChannel = null;
  let loadingOrders = false;
  let quotes = [];
  let loadingQuotes = false;
  let quotesTableAvailable = true;
  let activeMode = 'pos';

  function showMessage(el, text, type = 'error') {
    el.textContent = text;
    el.className = `message ${type}`;
  }

  function hideMessage(el) {
    el.textContent = '';
    el.className = 'message hidden';
  }

  function setSync(text) {
    syncPill.textContent = text;
  }

  function showToast(text, error = false, duration = 3600) {
    toast.textContent = text;
    toast.className = error ? 'toast error' : 'toast';
    setTimeout(() => { toast.className = 'toast hidden'; }, duration);
  }

  function normalizedEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function isEditorEmail(email) {
    return EDITOR_EMAILS.has(normalizedEmail(email));
  }

  function canRead() {
    return accessMode === 'editor' || accessMode === 'viewer';
  }

  function canEdit() {
    return accessMode === 'editor' && currentUser && isEditorEmail(currentUser.email);
  }

  function requireEditor(message = 'Modo espectador: esta ação é somente para editores.') {
    if (canEdit()) return true;
    showToast(message, true, 5000);
    return false;
  }

  function applyPermissionUI() {
    const editor = canEdit();
    document.querySelectorAll('[data-editor-only]').forEach((el) => {
      el.classList.toggle('hidden', !editor);
    });
    if (rolePill) {
      rolePill.textContent = editor ? 'Editor' : (accessMode === 'viewer' ? 'Espectador' : '');
      rolePill.classList.toggle('hidden', !canRead());
      rolePill.classList.toggle('viewer', accessMode === 'viewer');
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function dateFromISO(value) {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  function daysFromToday(value) {
    const target = dateFromISO(value);
    if (!target) return null;
    const now = dateFromISO(todayISO());
    return Math.round((target - now) / 86400000);
  }

  function formatDate(value) {
    if (!value) return '—';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }


  function formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }


  function formatDateOnly(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function parsePtBrNumber(value) {
    const raw = String(value ?? '').trim().replace(/\s/g, '');
    if (!raw) return null;
    let normalized = raw;
    if (normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) {
      // Ex.: 3.000 ou 12.500.000 (milhar no padrão brasileiro).
      normalized = normalized.replace(/\./g, '');
    } else {
      const dots = (normalized.match(/\./g) || []).length;
      if (dots > 1) normalized = normalized.replace(/\./g, '');
    }
    normalized = normalized.replace(/[^0-9.-]/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  function formatPtBrNumber(value) {
    if (value === null || value === undefined || value === '') return '';
    const n = typeof value === 'number' ? value : parsePtBrNumber(value);
    if (!Number.isFinite(n)) return '';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  }

  function formatElapsedSeconds(seconds) {
    let totalMinutes = Math.max(0, Math.floor(Number(seconds || 0) / 60));
    const days = Math.floor(totalMinutes / 1440);
    totalMinutes %= 1440;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    parts.push(`${minutes}min`);
    return parts.join(' ');
  }

  function supplierElapsedSeconds(order, endValue = null) {
    if (!order?.supplier_sent_at) return 0;

    // Versões antigas não possuíam os campos de pausa/retomada.
    const accumulated = Math.max(0, Number(order.supplier_wait_seconds || 0));
    const resumedAt = order.supplier_wait_resumed_at;

    if (order.supplier_confirmed_at) {
      if (accumulated > 0) return accumulated;
      const start = new Date(order.supplier_sent_at);
      const end = new Date(order.supplier_confirmed_at);
      return Math.max(0, Math.floor((end - start) / 1000));
    }

    const runningFrom = new Date(resumedAt || order.supplier_sent_at);
    const end = endValue ? new Date(endValue) : new Date();
    if (Number.isNaN(runningFrom.getTime()) || Number.isNaN(end.getTime())) return accumulated;
    return accumulated + Math.max(0, Math.floor((end - runningFrom) / 1000));
  }

  function formatElapsed(startValue, endValue = null) {
    if (!startValue) return null;
    const start = new Date(startValue);
    const end = endValue ? new Date(endValue) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    let totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
    const days = Math.floor(totalMinutes / 1440);
    totalMinutes %= 1440;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    parts.push(`${minutes}min`);
    return parts.join(' ');
  }

  function supplierWaitHtml(order) {
    const status = normalizeSystemStatus(order.status);
    const started = order.supplier_sent_at;
    const confirmed = order.supplier_confirmed_at;

    if (!started) {
      if (status === 'Aguardando resposta do fornecedor') {
        return '<span class="supplier-timer timer-not-started">Contagem não iniciada</span>';
      }
      return '<span class="supplier-timer timer-empty">—</span>';
    }

    const elapsed = formatElapsedSeconds(supplierElapsedSeconds(order));

    if (confirmed) {
      return `<span class="supplier-timer timer-done">Confirmou em ${escapeHtml(elapsed)}</span><small class="supplier-timer-meta">Enviada ${escapeHtml(formatDateTime(started))} • Confirmada ${escapeHtml(formatDateTime(confirmed))}</small>`;
    }

    if (status !== 'Aguardando resposta do fornecedor') {
      return `<span class="supplier-timer timer-empty">—</span><small class="supplier-timer-meta">PO enviada ${escapeHtml(formatDateTime(started))}</small>`;
    }

    return `<span class="supplier-timer timer-running">Aguardando há ${escapeHtml(elapsed)}</span><small class="supplier-timer-meta">Enviada ${escapeHtml(formatDateTime(started))}</small>`;
  }

  function normalizeSystemStatus(status) {
    const raw = String(status || '').trim();

    // Compatibilidade com registros antigos, antes da troca de nome do status.
    if (
      raw === 'Aguardando resposta do fornecedor' ||
      raw === 'Aguardando recebimento da PO pelo fornecedor'
    ) {
      return 'Aguardando resposta do fornecedor';
    }

    if (raw === 'Cancelado' || raw === 'Cancelada') return 'Cancelado';
    if (['Concluído', 'Pronto', 'Embarcado'].includes(raw)) return 'Concluído';
    return 'Em produção';
  }

  function statusDisplay(status) {
    const normalized = normalizeSystemStatus(status);
    return normalized === 'Cancelado' ? 'Cancelada' : normalized;
  }

  function getHealth(order) {
    const status = normalizeSystemStatus(order.status);
    if (status === 'Cancelado') {
      return { key: 'done', label: 'Cancelada', cls: 'neutral', days: null };
    }
    if (status === 'Concluído') {
      return { key: 'done', label: 'Concluído', cls: 'neutral', days: null };
    }
    const days = daysFromToday(order.estimated_ready_date);
    if (days === null) return { key: 'unknown', label: 'Sem data', cls: 'neutral', days: null };
    if (days < 0) return { key: 'late', label: `Atrasado ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`, cls: 'danger', days };
    if (days === 0) return { key: 'near', label: 'Vence hoje', cls: 'warn', days };
    if (days <= 4) return { key: 'near', label: `Próximo • ${days} dia${days === 1 ? '' : 's'}`, cls: 'warn', days };
    return { key: 'ontime', label: `No prazo • ${days} dias`, cls: 'ok', days };
  }

  function valueOrEmpty(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function openModal(order = null) {
    if (!requireEditor()) return;
    poForm.reset();
    hideMessage(formError);
    poId.value = '';
    orderDate.value = todayISO();
    poStatus.value = 'Aguardando resposta do fornecedor';
    modalTitle.textContent = 'Novo PO';

    if (order) {
      modalTitle.textContent = 'Editar PO';
      poId.value = order.id;
      poNumber.value = order.po_number || '';
      supplier.value = order.supplier || '';
      client.value = order.client || '';
      poOrigin.value = order.origin || '';
      incoterm.value = order.incoterm || '';
      responsible.value = order.responsible || '';
      orderDate.value = order.order_date || '';
      estimatedReadyDate.value = order.estimated_ready_date || '';
      poStatus.value = normalizeSystemStatus(order.status);
      notes.value = order.notes || '';

      currency.value = order.currency || '';
      transportation.value = order.transportation || '';
      amountPo.value = formatPtBrNumber(order.amount_po);
      supplierQuotationNo.value = order.supplier_quotation_no || '';
      supplierPrice.value = formatPtBrNumber(order.supplier_price);
      quotationNo.value = order.quotation_no || '';
      workOrder.value = order.work_order || '';
      lspConsulted.value = order.lsp_consulted || '';
      followUpStatus.value = order.follow_up_status || '';
      hiddenStatus.value = order.hidden_status || '';
    }

    poModal.classList.remove('hidden');
    setTimeout(() => poNumber.focus(), 50);
  }

  function closeModal() {
    poModal.classList.add('hidden');
    poForm.reset();
    hideMessage(formError);
    savePoBtn.disabled = false;
    savePoBtn.textContent = 'Salvar PO';
  }



  function showMode(mode) {
    activeMode = mode === 'quotes' ? 'quotes' : 'pos';
    poView.classList.toggle('hidden', activeMode !== 'pos');
    quotesView.classList.toggle('hidden', activeMode !== 'quotes');
    modeTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === activeMode));
    if (activeMode === 'quotes') loadQuotes(true);
  }

  async function stopRealtime() {
    if (realtimeChannel && db) {
      try { await db.removeChannel(realtimeChannel); } catch (_) {}
      realtimeChannel = null;
    }
  }

  function startRealtime() {
    if (!db || !canRead()) return;
    if (realtimeChannel) {
      try { db.removeChannel(realtimeChannel); } catch (_) {}
      realtimeChannel = null;
    }

    realtimeChannel = db
      .channel('po-control-shared-live-v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => loadOrders(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'china_quotes' }, () => loadQuotes(true))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSync('Ao vivo');
      });
  }

  function setAccessView(user = null, mode = 'signed_out') {
    currentUser = user || null;
    accessMode = mode;

    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (elapsedRenderTimer) {
      clearInterval(elapsedRenderTimer);
      elapsedRenderTimer = null;
    }
    stopRealtime();

    if (canRead()) {
      authPage.classList.add('hidden');
      appPage.classList.remove('hidden');
      userEmail.textContent = canEdit() ? (currentUser.email || '') : 'Modo espectador';
      applyPermissionUI();
      loadOrders();
      loadQuotes(true);
      startRealtime();

      // Fallback caso o Realtime esteja temporariamente indisponível.
      refreshTimer = setInterval(() => {
        if (canRead() && !document.hidden) { loadOrders(true); loadQuotes(true); }
      }, 60000);

      // Atualiza apenas os contadores de espera sem precisar consultar o banco.
      elapsedRenderTimer = setInterval(() => {
        if (canRead() && !document.hidden && activeMode === 'pos') renderTable();
      }, 30000);
    } else {
      if (accessMode === 'signed_out') sessionStorage.removeItem('po_access_mode');
      appPage.classList.add('hidden');
      authPage.classList.remove('hidden');
      userEmail.textContent = '';
      applyPermissionUI();
      orders = [];
      quotes = [];
      render();
      renderQuotes();
    }
  }

  async function loadOrders(quiet = false) {
    if (!canRead() || loadingOrders) return;
    loadingOrders = true;
    if (!quiet) setSync('Sincronizando...');
    try {
      const { data, error } = await db
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setSync('Erro no banco');
        if (!quiet) showToast(`Erro ao carregar POs: ${error.message}`, true, 6000);
        return;
      }

      orders = (data || []).map((row) => ({ ...row, status: normalizeSystemStatus(row.status) }));
      const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSync(`Sincronizado • ${time}`);
      render();
    } finally {
      loadingOrders = false;
    }
  }

  function renderMetrics() {
    const active = orders.filter((o) => ['Aguardando resposta do fornecedor', 'Em produção'].includes(normalizeSystemStatus(o.status)));
    const health = active.map(getHealth);
    metricActive.textContent = active.length;
    metricOnTime.textContent = health.filter((h) => h.key === 'ontime').length;
    metricNear.textContent = health.filter((h) => h.key === 'near').length;
    metricLate.textContent = health.filter((h) => h.key === 'late').length;
    if (metricDone) metricDone.textContent = orders.filter((o) => normalizeSystemStatus(o.status) === 'Concluído').length;
  }

  function renderAttention() {
    const list = orders
      .map((o) => ({ order: o, health: getHealth(o) }))
      .filter((x) => x.health.key === 'late' || x.health.key === 'near')
      .sort((a, b) => (a.health.days ?? 9999) - (b.health.days ?? 9999))
      .slice(0, 8);

    if (!list.length) {
      attentionList.innerHTML = '<div class="empty">Nenhum PO precisa de atenção agora. ✅</div>';
      return;
    }

    attentionList.innerHTML = list.map(({ order, health }) => `
      <button type="button" class="alert-row attention-jump" data-attention-id="${order.id}" title="Localizar este PO na lista">
        <div>
          <strong>${escapeHtml(order.po_number)} — ${escapeHtml(order.supplier)}</strong>
          <small>Estimativa: ${formatDate(order.estimated_ready_date)} • ${escapeHtml(order.client || 'Sem cliente')}</small>
        </div>
        <span class="badge ${health.cls}">${health.label}</span>
      </button>
    `).join('');
  }

  function focusOrderInTable(id) {
    if (!id) return;
    searchInput.value = '';
    statusFilter.value = '';
    if (situationFilter) situationFilter.value = '';
    renderTable();

    requestAnimationFrame(() => {
      const row = ordersBody.querySelector(`tr[data-po-id="${id}"]`);
      if (!row) {
        showToast('Não consegui localizar este PO na lista.', true);
        return;
      }
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('row-focus');
      setTimeout(() => row.classList.remove('row-focus'), 2400);
    });
  }

  function renderTable() {
    const search = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const situation = situationFilter?.value || '';
    const filtered = orders.filter((o) => {
      const text = [
        o.po_number, o.supplier, o.client, o.origin, o.responsible,
        o.quotation_no, o.work_order, o.supplier_quotation_no, o.follow_up_status
      ].filter(Boolean).join(' ').toLowerCase();
      const h = getHealth(o);
      const situationOk = !situation ||
        (situation === 'today' && h.key === 'near' && h.days === 0) ||
        (situation === 'near' && h.key === 'near' && h.days > 0) ||
        (situation === 'done' && h.key === 'done') ||
        h.key === situation;
      return (!search || text.includes(search)) && (!status || normalizeSystemStatus(o.status) === status) && situationOk;
    });

    const priority = { late: 0, near: 1, ontime: 2, unknown: 3, done: 4 };
    filtered.sort((a, b) => {
      const ah = getHealth(a), bh = getHealth(b);
      const p = (priority[ah.key] ?? 9) - (priority[bh.key] ?? 9);
      if (p) return p;
      if (ah.key === 'late') return (ah.days ?? 0) - (bh.days ?? 0);
      if (ah.key === 'near' || ah.key === 'ontime') return (ah.days ?? 9999) - (bh.days ?? 9999);
      return String(a.po_number || '').localeCompare(String(b.po_number || ''));
    });

    if (!filtered.length) {
      ordersBody.innerHTML = '<tr><td colspan="9" class="empty">Nenhum PO encontrado.</td></tr>';
      return;
    }

    ordersBody.innerHTML = filtered.map((o) => {
      const health = getHealth(o);
      return `
        <tr class="row-${health.key}" data-po-id="${o.id}">
          <td>${canEdit() ? `<button class="po-link" data-action="edit" data-id="${o.id}">${escapeHtml(o.po_number)}</button>` : `<span class="po-number-readonly">${escapeHtml(o.po_number)}</span>`}</td>
          <td>${escapeHtml(o.supplier)}</td>
          <td>${escapeHtml(o.client || '—')}</td>
          <td>${formatDate(o.estimated_ready_date)}</td>
          <td>${escapeHtml(o.follow_up_status || o.status || '—')}</td>
          <td><span class="badge ${health.cls}">${health.label}</span></td>
          <td>
            <span class="badge ${normalizeSystemStatus(o.status) === 'Concluído' ? 'ok' : normalizeSystemStatus(o.status) === 'Cancelado' ? 'neutral' : normalizeSystemStatus(o.status) === 'Aguardando resposta do fornecedor' ? 'status-waiting' : 'status-production'}">${escapeHtml(statusDisplay(o.status))}</span>
            ${normalizeSystemStatus(o.status) === 'Concluído' && o.completed_at ? `<small class="completion-date">Concluído em ${escapeHtml(formatDateOnly(o.completed_at))}</small>` : ''}
          </td>
          <td>${supplierWaitHtml(o)}</td>
          <td>${canEdit() ? `
            <div class="actions">
              <button class="btn btn-secondary btn-small" data-action="edit" data-id="${o.id}">Editar</button>
              ${normalizeSystemStatus(o.status) === 'Aguardando resposta do fornecedor' && !o.supplier_sent_at ? `<button class="btn btn-primary btn-small" data-action="supplier-start" data-id="${o.id}">PO enviada</button>` : ''}
              ${normalizeSystemStatus(o.status) === 'Aguardando resposta do fornecedor' && o.supplier_sent_at && !o.supplier_confirmed_at ? `<button class="btn btn-primary btn-small" data-action="supplier-confirm" data-id="${o.id}">Fornecedor confirmou</button>` : ''}
              ${['Aguardando resposta do fornecedor', 'Em produção'].includes(normalizeSystemStatus(o.status)) ? `<button class="btn btn-secondary btn-small" data-action="complete" data-id="${o.id}">Concluir</button>` : ''}
            </div>` : '<span class="readonly-text">Somente leitura</span>'}
          </td>
        </tr>
      `;
    }).join('');
  }

  function render() {
    renderMetrics();
    renderAttention();
    renderTable();
  }

  async function handleLogin(event) {
    event.preventDefault();
    sessionStorage.removeItem('po_access_mode');
    hideMessage(authMessage);
    const email = normalizedEmail(authEmail.value);
    if (!email || !authPassword.value) {
      showMessage(authMessage, 'Preencha e-mail e senha.');
      return;
    }
    if (!isEditorEmail(email)) {
      showMessage(authMessage, 'Este e-mail não possui acesso de edição. Use o Modo espectador.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password: authPassword.value
    });
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';

    if (error) {
      showMessage(authMessage, error.message);
      return;
    }
    if (data?.user && !isEditorEmail(data.user.email)) {
      await db.auth.signOut();
      showMessage(authMessage, 'Usuário sem permissão de edição.');
    }
  }

  async function enterViewerMode() {
    hideMessage(authMessage);
    sessionStorage.setItem('po_access_mode', 'viewer');
    try { await db.auth.signOut(); } catch (_) {}
    setAccessView(null, 'viewer');
  }

  function optionalNumber(input) {
    return parsePtBrNumber(input.value);
  }

  async function handleSavePO(event) {
    event.preventDefault();
    hideMessage(formError);

    const isEditing = Boolean(poId.value);
    if (!poNumber.value.trim() || !supplier.value.trim()) {
      showMessage(formError, 'Preencha Número do PO e Fornecedor.');
      return;
    }

    if (!requireEditor()) {
      showMessage(formError, 'Modo espectador não pode salvar alterações.');
      return;
    }

    const existing = isEditing ? orders.find((o) => o.id === poId.value) : null;
    const oldStatus = existing ? normalizeSystemStatus(existing.status) : null;
    const newStatus = normalizeSystemStatus(poStatus.value);
    const now = new Date().toISOString();

    savePoBtn.disabled = true;
    savePoBtn.textContent = 'Salvando...';

    const payload = {
      po_number: poNumber.value.trim(),
      supplier: supplier.value.trim(),
      client: client.value.trim() || null,
      origin: poOrigin.value.trim() || null,
      incoterm: incoterm.value || null,
      responsible: responsible.value.trim() || null,
      order_date: orderDate.value || null,
      estimated_ready_date: estimatedReadyDate.value || null,
      status: newStatus,
      notes: notes.value.trim() || null,
      currency: currency.value.trim() || null,
      transportation: transportation.value.trim() || null,
      amount_po: optionalNumber(amountPo),
      supplier_quotation_no: supplierQuotationNo.value.trim() || null,
      supplier_price: optionalNumber(supplierPrice),
      quotation_no: quotationNo.value.trim() || null,
      work_order: workOrder.value.trim() || null,
      lsp_consulted: lspConsulted.value.trim() || null,
      follow_up_status: followUpStatus.value.trim() || null,
      hidden_status: hiddenStatus.value.trim() || null
    };

    // Data de conclusão: nasce ao concluir, some ao reabrir e recebe uma nova data
    // somente quando o processo for concluído novamente.
    if (newStatus === 'Concluído') {
      payload.completed_at = oldStatus === 'Concluído' && existing?.completed_at
        ? existing.completed_at
        : now;
    } else {
      payload.completed_at = null;
    }

    // Se a confirmação do fornecedor foi marcada por engano e o usuário voltar
    // para "Aguardando resposta", a contagem retoma exatamente do ponto em que parou.
    // supplier_sent_at continua sendo a data/hora ORIGINAL do envio.
    if (
      existing &&
      newStatus === 'Aguardando resposta do fornecedor' &&
      oldStatus !== 'Aguardando resposta do fornecedor' &&
      existing.supplier_sent_at &&
      existing.supplier_confirmed_at
    ) {
      payload.supplier_wait_seconds = supplierElapsedSeconds(existing, existing.supplier_confirmed_at);
      payload.supplier_wait_resumed_at = now;
      payload.supplier_confirmed_at = null;
    }

    let result;
    try {
      if (isEditing) {
        result = await db
          .from('purchase_orders')
          .update(payload)
          .eq('id', poId.value)
          .select()
          .single();
      } else {
        result = await db
          .from('purchase_orders')
          .insert({ ...payload, user_id: currentUser.id })
          .select()
          .single();
      }
    } catch (err) {
      savePoBtn.disabled = false;
      savePoBtn.textContent = 'Salvar PO';
      showMessage(formError, `Erro inesperado: ${err.message || err}`);
      return;
    }

    if (result.error) {
      savePoBtn.disabled = false;
      savePoBtn.textContent = 'Salvar PO';
      showMessage(formError, `Não foi possível salvar: ${result.error.message}`);
      return;
    }

    closeModal();
    showToast(isEditing ? 'PO atualizado com sucesso.' : 'PO cadastrado com sucesso.');
    await loadOrders();
  }

  async function markCompleted(id) {
    if (!requireEditor()) return;
    const { error } = await db
      .from('purchase_orders')
      .update({ completed_at: new Date().toISOString(), status: 'Concluído' })
      .eq('id', id);

    if (error) {
      showToast(`Erro ao atualizar: ${error.message}`, true);
      return;
    }
    showToast('PO concluído. Data da conclusão registrada.');
    await loadOrders();
  }


  async function startSupplierWait(id) {
    if (!requireEditor()) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (order.supplier_sent_at && !confirm(`A PO ${order.po_number} já possui uma data de envio. Reiniciar a contagem a partir de agora?`)) return;

    const now = new Date().toISOString();
    const { error } = await db
      .from('purchase_orders')
      .update({
        status: 'Aguardando resposta do fornecedor',
        supplier_sent_at: now,
        supplier_confirmed_at: null,
        supplier_wait_seconds: 0,
        supplier_wait_resumed_at: now
      })
      .eq('id', id);

    if (error) {
      showToast(`Erro ao iniciar contagem: ${error.message}`, true, 6000);
      return;
    }
    showToast('PO enviada ao fornecedor. Contagem iniciada.');
    await loadOrders(true);
  }

  async function confirmSupplierReceipt(id) {
    if (!requireEditor()) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (!order.supplier_sent_at) {
      showToast('Inicie a contagem de envio antes de confirmar o recebimento.', true, 5000);
      return;
    }

    const now = new Date().toISOString();
    const elapsedSeconds = supplierElapsedSeconds(order, now);
    const { error } = await db
      .from('purchase_orders')
      .update({
        supplier_confirmed_at: now,
        supplier_wait_seconds: elapsedSeconds,
        supplier_wait_resumed_at: null,
        status: 'Em produção'
      })
      .eq('id', id);

    if (error) {
      showToast(`Erro ao registrar confirmação: ${error.message}`, true, 6000);
      return;
    }
    showToast(`Fornecedor confirmou. Tempo de resposta: ${formatElapsedSeconds(elapsedSeconds)}.`);
    await loadOrders(true);
  }

  function cleanText(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text && text !== '-' ? text : null;
  }

  function cleanPo(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text || text === '-' || text === '0') return null;
    return text.replace(/\.0$/, '');
  }

  function numberOrNull(value) {
    if (value === null || value === undefined || value === '' || value === '-') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const cleaned = String(value).trim().replace(/,/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function parseDateString(text) {
    if (!text) return null;
    const value = String(text).trim();
    const iso = value.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

    const br = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
    if (!br) return null;
    let year = Number(br[3]);
    if (year < 100) year += 2000;
    const month = Number(br[2]);
    const day = Number(br[1]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function excelDateToISO(value) {
    if (value === null || value === undefined || value === '' || value === 0 || value === '-') return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const millis = Date.UTC(1899, 11, 30) + Math.round(value * 86400000);
      const d = new Date(millis);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    }
    return parseDateString(value);
  }

  function getCell(row, expectedHeader) {
    const expected = expectedHeader.trim().toLowerCase();
    const key = Object.keys(row).find((k) => String(k).trim().toLowerCase() === expected);
    return key ? row[key] : null;
  }

  function parseIncoterm(value) {
    const raw = String(value || '').toUpperCase().replace(/\s+/g, ' ').trim();
    if (!raw) return null;
    if (/FOB\s*\/\s*FCA/.test(raw) || /FOB\/FCA/.test(raw)) return 'FOB/FCA';
    const known = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CIP', 'DAP', 'DDP'];
    return known.find((term) => new RegExp(`\\b${term}\\b`).test(raw)) || null;
  }

  function mapExcelStatus(statusValue, hiddenValue) {
    const hidden = String(hiddenValue || '').trim().toLowerCase();
    if (hidden.includes('cancelada') || hidden.includes('cancelado')) return 'Cancelado';

    const status = String(statusValue || '').trim().toLowerCase();
    if (
      (status.includes('aguardando recebimento') && status.includes('fornecedor')) ||
      (status.includes('aguardando resposta') && status.includes('fornecedor'))
    ) return 'Aguardando resposta do fornecedor';
    if (status === 'docs recebidos e enviado ao cliente' || status.includes('conclu') || status.includes('finaliz')) return 'Concluído';
    return 'Em produção';
  }

  function hashText(text) {
    let h1 = 0xdeadbeef ^ text.length;
    let h2 = 0x41c6ce57 ^ text.length;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
  }

  function excelRowToRecord(row, fileName) {
    const purchaseOrder = cleanPo(getCell(row, 'Purchase Order'));
    if (!purchaseOrder) return null;

    const sourceNo = numberOrNull(getCell(row, 'NO.'));
    const supplierValue = cleanText(getCell(row, 'Supplier')) || 'Não informado';
    const supplierQuote = cleanText(getCell(row, 'Supplier Quotation nº'));
    const amount = numberOrNull(getCell(row, 'Amount of PO'));
    const transportationRaw = cleanText(getCell(row, 'Transportation'));
    const followStatus = cleanText(getCell(row, 'Status'));
    const hidden = cleanText(getCell(row, 'Status oculto'));

    const fingerprint = `followup:${sourceNo ?? 'x'}:${purchaseOrder}`;

    return {
      po_number: purchaseOrder,
      supplier: supplierValue,
      client: cleanText(getCell(row, 'Customer')),
      origin: null,
      incoterm: parseIncoterm(transportationRaw),
      responsible: null,
      order_date: excelDateToISO(getCell(row, 'PO Received')),
      estimated_ready_date: excelDateToISO(getCell(row, 'Promised delivery time Quotation')),
      actual_ready_date: null,
      status: mapExcelStatus(followStatus, hidden),
      notes: null,
      source_no: sourceNo === null ? null : Math.trunc(sourceNo),
      currency: cleanText(getCell(row, 'Sales')),
      transportation: transportationRaw,
      amount_po: amount,
      supplier_quotation_no: supplierQuote,
      supplier_price: numberOrNull(getCell(row, 'Supplier Price')),
      quotation_no: cleanText(getCell(row, 'Quotation NO.')),
      work_order: cleanText(getCell(row, 'Work Order')),
      lsp_consulted: cleanText(getCell(row, 'LSP Consulted')),
      follow_up_status: followStatus,
      hidden_status: hidden,
      import_source: fileName,
      import_fingerprint: fingerprint,
      source_data: row
    };
  }

  function importRowKey(record) {
    return `${record.source_no ?? 'x'}|${record.po_number}`;
  }

  function analyzeRecords(records) {
    const health = records.map(getHealth);
    return {
      active: records.filter((r) => ['Aguardando resposta do fornecedor', 'Em produção'].includes(normalizeSystemStatus(r.status))).length,
      late: health.filter((h) => h.key === 'late').length,
      today: health.filter((h) => h.key === 'near' && h.days === 0).length,
      near: health.filter((h) => h.key === 'near' && h.days > 0).length,
      ontime: health.filter((h) => h.key === 'ontime').length,
      done: records.filter((r) => normalizeSystemStatus(r.status) === 'Concluído').length,
      unknown: health.filter((h) => h.key === 'unknown').length
    };
  }

  async function handleExcelImport(file) {
    if (!requireEditor('Somente editores podem sincronizar a FOLLOW UP.')) return;
    if (!window.XLSX) {
      showToast('A biblioteca de Excel não foi carregada. Atualize a página.', true, 6000);
      return;
    }

    importExcelBtn.disabled = true;
    importExcelBtn.textContent = 'Lendo Excel...';

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheetName = workbook.SheetNames.find((n) => n.trim().toUpperCase() === 'FOLLOW UP') || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) throw new Error('Não encontrei a aba FOLLOW UP.');

      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
      const mapped = rawRows.map((row) => excelRowToRecord(row, file.name)).filter(Boolean);

      // A chave NO. + Purchase Order é estável e permite atualizar a mesma linha
      // quando prazo, status, preço ou outros campos mudarem na FOLLOW UP.
      const uniqueMap = new Map();
      for (const record of mapped) uniqueMap.set(importRowKey(record), record);
      const records = [...uniqueMap.values()];
      if (!records.length) throw new Error('Nenhum PO válido foi encontrado na planilha.');

      const analysis = analyzeRecords(records);
      const message = [
        `FOLLOW UP encontrada: ${records.length} registros válidos.`,
        '',
        `🔴 Atrasados: ${analysis.late}`,
        `🟠 Vencem hoje: ${analysis.today}`,
        `🟡 Próximos (1–4 dias): ${analysis.near}`,
        `🟢 No prazo (+4 dias): ${analysis.ontime}`,
        `✅ Concluídos: ${analysis.done}`,
        analysis.unknown ? `⚪ Sem data reconhecível: ${analysis.unknown}` : '',
        '',
        'Sincronizar esta versão da planilha com o PO Control?'
      ].filter(Boolean).join('\n');
      if (!confirm(message)) return;

      setSync('Comparando com o Supabase...');
      const { data: existingData, error: existingError } = await db
        .from('purchase_orders')
        .select('id,user_id,source_no,po_number,import_fingerprint,import_source')
        .not('import_source', 'is', null);
      if (existingError) throw new Error(existingError.message);

      const existingByKey = new Map();
      const duplicateIds = [];
      for (const row of (existingData || [])) {
        const key = `${row.source_no ?? 'x'}|${row.po_number}`;
        if (!existingByKey.has(key)) existingByKey.set(key, row);
        else duplicateIds.push(row.id);
      }

      const incomingKeys = new Set(records.map(importRowKey));
      const nowIds = new Set();
      let updatedCount = 0;
      let newCount = 0;

      const synced = records.map((record) => {
        const key = importRowKey(record);
        const existing = existingByKey.get(key);
        if (existing) {
          updatedCount++;
          nowIds.add(existing.id);
          return {
            ...record,
            id: existing.id,
            user_id: existing.user_id || currentUser.id,
            // Mantém o fingerprint antigo se essa linha veio de uma versão anterior,
            // evitando conflito na primeira sincronização desta nova versão.
            import_fingerprint: existing.import_fingerprint || record.import_fingerprint
          };
        }
        newCount++;
        return { ...record, id: crypto.randomUUID() };
      });

      const batchSize = 80;
      for (let i = 0; i < synced.length; i += batchSize) {
        const batch = synced.slice(i, i + batchSize);
        importExcelBtn.textContent = `Sincronizando ${Math.min(i + batch.length, synced.length)}/${synced.length}...`;
        setSync(`Sincronizando ${Math.min(i + batch.length, synced.length)}/${synced.length}`);

        const { error } = await db
          .from('purchase_orders')
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

        if (error) {
          const migrationHint = /column|constraint|estimated_ready_date|import_fingerprint/i.test(error.message)
            ? ' Rode primeiro o arquivo migration_excel_import.sql no SQL Editor do Supabase.'
            : '';
          throw new Error(`${error.message}.${migrationHint}`);
        }
      }

      // Remove linhas antigas da importação que deixaram de existir na planilha atual
      // e duplicatas históricas, mantendo POs criados manualmente intactos.
      const staleIds = (existingData || [])
        .filter((row) => !incomingKeys.has(`${row.source_no ?? 'x'}|${row.po_number}`))
        .map((row) => row.id);
      const toDelete = [...new Set([...duplicateIds, ...staleIds])];
      for (let i = 0; i < toDelete.length; i += 100) {
        const ids = toDelete.slice(i, i + 100);
        const { error } = await db
          .from('purchase_orders')
          .delete()
          .in('id', ids);
        if (error) throw new Error(`Dados sincronizados, mas houve erro ao limpar linhas antigas: ${error.message}`);
      }

      showToast(`FOLLOW UP sincronizada: ${newCount} novos, ${updatedCount} atualizados${toDelete.length ? `, ${toDelete.length} antigos removidos` : ''}.`, false, 7000);
      await loadOrders();
    } catch (err) {
      console.error(err);
      showToast(`Erro na sincronização: ${err.message || err}`, true, 9000);
      setSync('Erro na sincronização');
    } finally {
      importExcelBtn.disabled = false;
      importExcelBtn.textContent = 'Sincronizar Excel';
      excelFileInput.value = '';
    }
  }



  function formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  function datetimeLocalValue(value = null) {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function hoursLabel(hours) {
    if (!Number.isFinite(hours)) return '—';
    const h = Math.max(0, hours);
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
    if (h < 48) return `${h.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
    return `${(h / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
  }

  function quoteTiming(q) {
    const sent = new Date(q.sent_at).getTime();
    const target = Number(q.target_hours || 24);
    const deadline = sent + target * 3600000;
    const end = q.response_at ? new Date(q.response_at).getTime() : Date.now();
    const elapsed = Math.max(0, (end - sent) / 3600000);
    const remaining = (deadline - Date.now()) / 3600000;
    if (q.response_at) {
      return elapsed <= target
        ? { key:'answered', label:'Respondida no prazo', cls:'ok', elapsed, remaining, deadline }
        : { key:'answered', label:'Respondida com atraso', cls:'answered-late', elapsed, remaining, deadline };
    }
    if (remaining < 0) return { key:'late', label:`Atrasada ${hoursLabel(Math.abs(remaining))}`, cls:'danger', elapsed, remaining, deadline };
    if (remaining <= 4) return { key:'attention', label:`Atenção • ${hoursLabel(remaining)} restantes`, cls:'attention', elapsed, remaining, deadline };
    return { key:'ontime', label:`Dentro do prazo • ${hoursLabel(remaining)} restantes`, cls:'ok', elapsed, remaining, deadline };
  }

  function renderQuoteSetup(message = '') {
    if (!quoteSetup) return;
    if (!message) {
      quoteSetup.classList.add('hidden');
      quoteSetup.textContent = '';
      return;
    }
    quoteSetup.textContent = message;
    quoteSetup.classList.remove('hidden');
  }

  async function loadQuotes(quiet = false) {
    if (!canRead() || loadingQuotes) return;
    loadingQuotes = true;
    try {
      const { data, error } = await db
        .from('china_quotes')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) {
        quotes = [];
        quotesTableAvailable = false;
        renderQuoteSetup('Cotações China ainda não foram ativadas no Supabase. Rode o arquivo migration_china_quotes.sql uma vez no SQL Editor.');
        renderQuotes();
        if (!quiet && !/relation|china_quotes|user_id/i.test(error.message)) showToast(`Erro ao carregar cotações: ${error.message}`, true, 6000);
        return;
      }
      quotesTableAvailable = true;
      renderQuoteSetup('');
      quotes = data || [];
      renderQuotes();
    } finally {
      loadingQuotes = false;
    }
  }

  function renderQuoteMetrics() {
    const pending = quotes.filter((q) => !q.response_at);
    const answered = quotes.filter((q) => q.response_at);
    qWaiting.textContent = pending.length;
    qOnTime.textContent = pending.filter((q) => quoteTiming(q).key === 'ontime').length;
    qAttention.textContent = pending.filter((q) => quoteTiming(q).key === 'attention').length;
    qLate.textContent = pending.filter((q) => quoteTiming(q).key === 'late').length;
    const avg = answered.length ? answered.reduce((sum, q) => sum + quoteTiming(q).elapsed, 0) / answered.length : null;
    qAverage.textContent = avg === null ? '—' : hoursLabel(avg);
    const urgent = pending.filter((q) => ['attention','late'].includes(quoteTiming(q).key)).length;
    quoteNavBadge.textContent = urgent;
    quoteNavBadge.classList.toggle('hidden', urgent === 0);
  }

  function renderQuoteAttention() {
    const list = quotes
      .filter((q) => !q.response_at)
      .map((q) => ({ quote:q, timing:quoteTiming(q) }))
      .filter((x) => ['attention','late'].includes(x.timing.key))
      .sort((a,b) => a.timing.remaining - b.timing.remaining)
      .slice(0, 8);

    if (!list.length) {
      quoteAttentionList.innerHTML = '<div class="empty">Nenhuma cotação precisa de atenção agora. ✅</div>';
      return;
    }
    quoteAttentionList.innerHTML = list.map(({quote, timing}) => `
      <div class="alert-row">
        <div>
          <strong>${escapeHtml(quote.reference)} — ${escapeHtml(quote.supplier)}</strong>
          <small>Enviada: ${formatDateTime(quote.sent_at)} • Meta: ${quote.target_hours}h${quote.client ? ` • ${escapeHtml(quote.client)}` : ''}</small>
        </div>
        <span class="badge ${timing.cls}">${timing.label}</span>
      </div>
    `).join('');
  }

  function renderQuoteTable() {
    const search = (quoteSearch?.value || '').trim().toLowerCase();
    const filter = quoteStatusFilter?.value || '';
    let list = quotes.filter((q) => {
      const text = [q.reference, q.supplier, q.client, q.owner, q.notes].filter(Boolean).join(' ').toLowerCase();
      const timing = quoteTiming(q);
      const statusOk = !filter ||
        (filter === 'answered' && !!q.response_at) ||
        (!q.response_at && timing.key === filter);
      return (!search || text.includes(search)) && statusOk;
    });

    const priority = { late:0, attention:1, ontime:2, answered:3 };
    list.sort((a,b) => {
      const ah = quoteTiming(a), bh = quoteTiming(b);
      const p = (priority[ah.key] ?? 9) - (priority[bh.key] ?? 9);
      if (p) return p;
      if (!a.response_at && !b.response_at) return ah.remaining - bh.remaining;
      return new Date(b.sent_at) - new Date(a.sent_at);
    });

    if (!list.length) {
      quoteRows.innerHTML = `<tr><td colspan="10" class="empty">${quotesTableAvailable ? 'Nenhuma cotação encontrada.' : 'Ative a tabela china_quotes no Supabase.'}</td></tr>`;
      return;
    }

    quoteRows.innerHTML = list.map((q) => {
      const t = quoteTiming(q);
      const rowClass = t.key === 'late' ? 'quote-row-late' : (t.key === 'attention' ? 'quote-row-attention' : '');
      return `<tr class="${rowClass}">
        <td>${canEdit() ? `<button class="po-link" data-quote-action="edit" data-id="${q.id}">${escapeHtml(q.reference)}</button>` : `<span class="po-number-readonly">${escapeHtml(q.reference)}</span>`}</td>
        <td>${escapeHtml(q.supplier)}</td>
        <td>${escapeHtml(q.client || '—')}</td>
        <td>${formatDateTime(q.sent_at)}<span class="quote-deadline">Prazo: ${formatDateTime(new Date(t.deadline).toISOString())}</span></td>
        <td>${Number(q.target_hours || 24)}h</td>
        <td>${formatDateTime(q.response_at)}</td>
        <td>${hoursLabel(t.elapsed)}</td>
        <td><span class="badge ${t.cls}">${t.label}</span></td>
        <td>${escapeHtml(q.owner || '—')}</td>
        <td>${canEdit() ? `<div class="actions">
          ${!q.response_at ? `<button class="btn btn-primary btn-small" data-quote-action="answered" data-id="${q.id}">Respondida</button>` : ''}
          <button class="btn btn-secondary btn-small" data-quote-action="edit" data-id="${q.id}">Editar</button>
        </div>` : '<span class="readonly-text">Somente leitura</span>'}</td>
      </tr>`;
    }).join('');
  }

  function renderQuotes() {
    if (!qWaiting) return;
    renderQuoteMetrics();
    renderQuoteAttention();
    renderQuoteTable();
  }

  function openQuoteModal(q = null) {
    if (!requireEditor()) return;
    if (!quotesTableAvailable) {
      showToast('Primeiro rode migration_china_quotes.sql no Supabase.', true, 6000);
      return;
    }
    quoteForm.reset();
    hideMessage(quoteFormError);
    quoteId.value = '';
    quoteSentAt.value = datetimeLocalValue();
    quoteTargetHours.value = '24';
    quoteResponseAt.value = '';
    quoteModalTitle.textContent = 'Nova cotação China';
    if (q) {
      quoteModalTitle.textContent = 'Editar cotação China';
      quoteId.value = q.id;
      quoteReference.value = q.reference || '';
      quoteSupplier.value = q.supplier || '';
      quoteClient.value = q.client || '';
      quoteSentAt.value = datetimeLocalValue(q.sent_at);
      quoteTargetHours.value = String(q.target_hours || 24);
      quoteResponseAt.value = q.response_at ? datetimeLocalValue(q.response_at) : '';
      quoteOwner.value = q.owner || '';
      quoteNotes.value = q.notes || '';
    }
    quoteModal.classList.remove('hidden');
    setTimeout(() => quoteReference.focus(), 50);
  }

  function closeQuoteModal() {
    quoteModal.classList.add('hidden');
    quoteForm.reset();
    hideMessage(quoteFormError);
    saveQuoteBtn.disabled = false;
    saveQuoteBtn.textContent = 'Salvar cotação';
  }

  async function handleSaveQuote(event) {
    event.preventDefault();
    hideMessage(quoteFormError);
    if (!requireEditor()) return;
    if (!quoteReference.value.trim() || !quoteSupplier.value.trim() || !quoteSentAt.value || !quoteTargetHours.value) {
      showMessage(quoteFormError, 'Preencha Referência, Fornecedor, Enviada em e Meta de resposta.');
      return;
    }
    const sent = new Date(quoteSentAt.value);
    const response = quoteResponseAt.value ? new Date(quoteResponseAt.value) : null;
    if (response && response < sent) {
      showMessage(quoteFormError, 'A resposta não pode ser anterior ao envio.');
      return;
    }
    saveQuoteBtn.disabled = true;
    saveQuoteBtn.textContent = 'Salvando...';
    const isEditing = Boolean(quoteId.value);
    const payload = {
      reference: quoteReference.value.trim(),
      supplier: quoteSupplier.value.trim(),
      client: quoteClient.value.trim() || null,
      sent_at: sent.toISOString(),
      target_hours: Math.max(1, Number(quoteTargetHours.value || 24)),
      response_at: response ? response.toISOString() : null,
      owner: quoteOwner.value.trim() || null,
      notes: quoteNotes.value.trim() || null,
      updated_at: new Date().toISOString()
    };
    try {
      let result;
      if (isEditing) {
        result = await db.from('china_quotes').update(payload).eq('id', quoteId.value);
      } else {
        result = await db.from('china_quotes').insert({ ...payload, user_id: currentUser.id });
      }
      if (result.error) throw result.error;
      closeQuoteModal();
      showToast(isEditing ? 'Cotação atualizada.' : 'Cotação cadastrada.');
      await loadQuotes();
    } catch (err) {
      showMessage(quoteFormError, `Não foi possível salvar: ${err.message || err}`);
    } finally {
      saveQuoteBtn.disabled = false;
      saveQuoteBtn.textContent = 'Salvar cotação';
    }
  }

  async function markQuoteAnswered(id) {
    if (!requireEditor()) return;
    const { error } = await db.from('china_quotes')
      .update({ response_at:new Date().toISOString(), updated_at:new Date().toISOString() })
      .eq('id', id);
    if (error) { showToast(`Erro ao registrar resposta: ${error.message}`, true); return; }
    showToast('Resposta registrada.');
    await loadQuotes();
  }

  async function init() {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) {
      showMessage(authMessage, 'Configuração do Supabase ausente em config.js.');
      loginBtn.disabled = true;
      viewerBtn.disabled = true;
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      showMessage(authMessage, 'Não foi possível carregar a biblioteca do Supabase. Verifique sua conexão com a internet.');
      return;
    }

    db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

    const { data, error } = await db.auth.getSession();
    if (error) showMessage(authMessage, error.message);
    const initialUser = data?.session?.user || null;
    if (initialUser && isEditorEmail(initialUser.email)) {
      setAccessView(initialUser, 'editor');
    } else if (initialUser) {
      await db.auth.signOut();
      setAccessView(null, 'signed_out');
      showMessage(authMessage, 'Este usuário não está autorizado como editor.');
    } else if (sessionStorage.getItem('po_access_mode') === 'viewer') {
      setAccessView(null, 'viewer');
    } else {
      setAccessView(null, 'signed_out');
    }

    db.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      if (user && isEditorEmail(user.email)) {
        setAccessView(user, 'editor');
      } else if (!user && accessMode !== 'viewer') {
        setAccessView(null, 'signed_out');
      }
    });
  }

  authForm.addEventListener('submit', handleLogin);
  viewerBtn.addEventListener('click', enterViewerMode);
  logoutBtn.addEventListener('click', async () => {
    if (accessMode === 'viewer') {
      sessionStorage.removeItem('po_access_mode');
      setAccessView(null, 'signed_out');
      return;
    }
    await db.auth.signOut();
  });

  newPoBtn.addEventListener('click', () => { if (requireEditor()) openModal(); });
  importExcelBtn.addEventListener('click', () => { if (requireEditor()) excelFileInput.click(); });
  excelFileInput.addEventListener('change', async () => {
    const file = excelFileInput.files?.[0];
    if (file) await handleExcelImport(file);
  });

  closeModalBtn.addEventListener('click', closeModal);
  cancelPoBtn.addEventListener('click', closeModal);
  poModal.addEventListener('click', (event) => {
    if (event.target === poModal) closeModal();
  });
  poForm.addEventListener('submit', handleSavePO);

  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);
  situationFilter?.addEventListener('change', renderTable);

  attentionList.addEventListener('click', (event) => {
    const target = event.target.closest('[data-attention-id]');
    if (target) focusOrderInTable(target.dataset.attentionId);
  });

  [amountPo, supplierPrice].forEach((input) => {
    input?.addEventListener('blur', () => {
      const n = parsePtBrNumber(input.value);
      input.value = n === null ? '' : formatPtBrNumber(n);
    });
    input?.addEventListener('focus', () => input.select());
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && canRead()) { loadOrders(true); loadQuotes(true); }
  });


  modeTabs.forEach((btn) => btn.addEventListener('click', () => showMode(btn.dataset.mode)));
  newQuoteBtn?.addEventListener('click', () => openQuoteModal());
  refreshQuotesBtn?.addEventListener('click', () => loadQuotes());
  closeQuoteModalBtn?.addEventListener('click', closeQuoteModal);
  cancelQuoteBtn?.addEventListener('click', closeQuoteModal);
  quoteModal?.addEventListener('click', (event) => { if (event.target === quoteModal) closeQuoteModal(); });
  quoteForm?.addEventListener('submit', handleSaveQuote);
  quoteSearch?.addEventListener('input', renderQuoteTable);
  quoteStatusFilter?.addEventListener('change', renderQuoteTable);
  quoteRows?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-quote-action]');
    if (!button || !canEdit()) return;
    const id = button.dataset.id;
    const action = button.dataset.quoteAction;
    const q = quotes.find((x) => x.id === id);
    if (action === 'edit' && q) openQuoteModal(q);
    if (action === 'answered') await markQuoteAnswered(id);
  });

  ordersBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !canEdit()) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    const order = orders.find((o) => o.id === id);

    if (action === 'edit' && order) openModal(order);
    if (action === 'supplier-start') await startSupplierWait(id);
    if (action === 'supplier-confirm') await confirmSupplierReceipt(id);
    if (action === 'complete') await markCompleted(id);
  });

  init();
})();
