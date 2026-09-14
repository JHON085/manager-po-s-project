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
  const signupBtn = $('signupBtn');
  const logoutBtn = $('logoutBtn');
  const userEmail = $('userEmail');
  const syncPill = $('syncPill');

  const newPoBtn = $('newPoBtn');
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
  const actualReadyDate = $('actualReadyDate');
  const poStatus = $('poStatus');
  const notes = $('notes');

  const ordersBody = $('ordersBody');
  const attentionList = $('attentionList');
  const searchInput = $('searchInput');
  const statusFilter = $('statusFilter');
  const metricActive = $('metricActive');
  const metricOnTime = $('metricOnTime');
  const metricNear = $('metricNear');
  const metricLate = $('metricLate');
  const toast = $('toast');

  let db = null;
  let currentUser = null;
  let orders = [];

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

  function showToast(text, error = false) {
    toast.textContent = text;
    toast.className = error ? 'toast error' : 'toast';
    setTimeout(() => { toast.className = 'toast hidden'; }, 3200);
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

  function getHealth(order) {
    if (['Pronto', 'Embarcado', 'Concluído'].includes(order.status) || order.actual_ready_date) {
      return { key: 'done', label: 'Pronto', cls: 'neutral', days: null };
    }
    const days = daysFromToday(order.estimated_ready_date);
    if (days === null) return { key: 'unknown', label: 'Sem data', cls: 'neutral', days: null };
    if (days < 0) return { key: 'late', label: `Atrasado ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`, cls: 'danger', days };
    if (days === 0) return { key: 'near', label: 'Vence hoje', cls: 'warn', days };
    if (days <= 7) return { key: 'near', label: `${days} dia${days === 1 ? '' : 's'}`, cls: 'warn', days };
    return { key: 'ontime', label: 'No prazo', cls: 'ok', days };
  }

  function openModal(order = null) {
    poForm.reset();
    hideMessage(formError);
    poId.value = '';
    orderDate.value = todayISO();
    poStatus.value = 'Aguardando produção';
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
      actualReadyDate.value = order.actual_ready_date || '';
      poStatus.value = order.status || 'Aguardando produção';
      notes.value = order.notes || '';
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

  function setAuthView(user) {
    currentUser = user || null;
    if (currentUser) {
      authPage.classList.add('hidden');
      appPage.classList.remove('hidden');
      userEmail.textContent = currentUser.email || '';
      loadOrders();
    } else {
      appPage.classList.add('hidden');
      authPage.classList.remove('hidden');
      orders = [];
      render();
    }
  }

  async function loadOrders() {
    if (!currentUser) return;
    setSync('Sincronizando...');
    const { data, error } = await db
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setSync('Erro no banco');
      showToast(`Erro ao carregar POs: ${error.message}`, true);
      orders = [];
      render();
      return;
    }

    orders = data || [];
    setSync('Sincronizado');
    render();
  }

  function renderMetrics() {
    const active = orders.filter((o) => o.status !== 'Concluído');
    const health = active.map(getHealth);
    metricActive.textContent = active.length;
    metricOnTime.textContent = health.filter((h) => h.key === 'ontime').length;
    metricNear.textContent = health.filter((h) => h.key === 'near').length;
    metricLate.textContent = health.filter((h) => h.key === 'late').length;
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
      <div class="alert-row">
        <div>
          <strong>${escapeHtml(order.po_number)} — ${escapeHtml(order.supplier)}</strong>
          <small>Estimativa: ${formatDate(order.estimated_ready_date)} • ${escapeHtml(order.client || 'Sem cliente')}</small>
        </div>
        <span class="badge ${health.cls}">${health.label}</span>
      </div>
    `).join('');
  }

  function renderTable() {
    const search = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const filtered = orders.filter((o) => {
      const text = [o.po_number, o.supplier, o.client, o.origin, o.responsible].filter(Boolean).join(' ').toLowerCase();
      return (!search || text.includes(search)) && (!status || o.status === status);
    });

    if (!filtered.length) {
      ordersBody.innerHTML = '<tr><td colspan="7" class="empty">Nenhum PO encontrado.</td></tr>';
      return;
    }

    ordersBody.innerHTML = filtered.map((o) => {
      const health = getHealth(o);
      return `
        <tr>
          <td><button class="po-link" data-action="edit" data-id="${o.id}">${escapeHtml(o.po_number)}</button></td>
          <td>${escapeHtml(o.supplier)}</td>
          <td>${escapeHtml(o.client || '—')}</td>
          <td>${formatDate(o.estimated_ready_date)}</td>
          <td>${escapeHtml(o.status)}</td>
          <td><span class="badge ${health.cls}">${health.label}</span></td>
          <td>
            <div class="actions">
              <button class="btn btn-secondary btn-small" data-action="edit" data-id="${o.id}">Editar</button>
              ${!['Pronto','Embarcado','Concluído'].includes(o.status) ? `<button class="btn btn-secondary btn-small" data-action="ready" data-id="${o.id}">Marcar pronto</button>` : ''}
              <button class="btn btn-danger btn-small" data-action="delete" data-id="${o.id}">Excluir</button>
            </div>
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
    hideMessage(authMessage);
    if (!authEmail.value || !authPassword.value) {
      showMessage(authMessage, 'Preencha e-mail e senha.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';
    const { error } = await db.auth.signInWithPassword({
      email: authEmail.value.trim(),
      password: authPassword.value
    });
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';

    if (error) showMessage(authMessage, error.message);
  }

  async function handleSignup() {
    hideMessage(authMessage);
    if (!authEmail.value || !authPassword.value) {
      showMessage(authMessage, 'Preencha e-mail e senha.');
      return;
    }
    if (authPassword.value.length < 6) {
      showMessage(authMessage, 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = 'Criando...';
    const { data, error } = await db.auth.signUp({
      email: authEmail.value.trim(),
      password: authPassword.value
    });
    signupBtn.disabled = false;
    signupBtn.textContent = 'Criar conta';

    if (error) {
      showMessage(authMessage, error.message);
      return;
    }

    if (data.session) showMessage(authMessage, 'Conta criada e login realizado.', 'success');
    else showMessage(authMessage, 'Conta criada. Confirme o e-mail e depois faça login.', 'success');
  }

  async function handleSavePO(event) {
    event.preventDefault();
    hideMessage(formError);

    if (!poNumber.value.trim() || !supplier.value.trim() || !estimatedReadyDate.value) {
      showMessage(formError, 'Preencha Número do PO, Fornecedor e Estimativa de prontidão.');
      return;
    }

    if (!currentUser) {
      showMessage(formError, 'Sua sessão expirou. Faça login novamente.');
      return;
    }

    savePoBtn.disabled = true;
    savePoBtn.textContent = 'Salvando...';

    const payload = {
      user_id: currentUser.id,
      po_number: poNumber.value.trim(),
      supplier: supplier.value.trim(),
      client: client.value.trim() || null,
      origin: poOrigin.value.trim() || null,
      incoterm: incoterm.value || null,
      responsible: responsible.value.trim() || null,
      order_date: orderDate.value || null,
      estimated_ready_date: estimatedReadyDate.value,
      actual_ready_date: actualReadyDate.value || null,
      status: poStatus.value,
      notes: notes.value.trim() || null
    };

    let result;
    try {
      if (poId.value) {
        result = await db
          .from('purchase_orders')
          .update(payload)
          .eq('id', poId.value)
          .eq('user_id', currentUser.id)
          .select()
          .single();
      } else {
        result = await db
          .from('purchase_orders')
          .insert(payload)
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
      const friendly = result.error.code === '23505'
        ? 'Já existe um PO com esse número na sua conta.'
        : result.error.message;
      showMessage(formError, `Não foi possível salvar: ${friendly}`);
      return;
    }

    closeModal();
    showToast(poId.value ? 'PO atualizado com sucesso.' : 'PO cadastrado com sucesso.');
    await loadOrders();
  }

  async function markReady(id) {
    if (!currentUser) return;
    const { error } = await db
      .from('purchase_orders')
      .update({ actual_ready_date: todayISO(), status: 'Pronto' })
      .eq('id', id)
      .eq('user_id', currentUser.id);

    if (error) {
      showToast(`Erro ao atualizar: ${error.message}`, true);
      return;
    }
    showToast('PO marcado como pronto.');
    await loadOrders();
  }

  async function deleteOrder(id) {
    const order = orders.find((o) => o.id === id);
    if (!order || !currentUser) return;
    if (!confirm(`Excluir o PO ${order.po_number}?`)) return;

    const { error } = await db
      .from('purchase_orders')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);

    if (error) {
      showToast(`Erro ao excluir: ${error.message}`, true);
      return;
    }
    showToast('PO excluído.');
    await loadOrders();
  }

  async function init() {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) {
      showMessage(authMessage, 'Configuração do Supabase ausente em config.js.');
      loginBtn.disabled = true;
      signupBtn.disabled = true;
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      showMessage(authMessage, 'Não foi possível carregar a biblioteca do Supabase. Verifique sua conexão com a internet.');
      return;
    }

    db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

    const { data, error } = await db.auth.getSession();
    if (error) showMessage(authMessage, error.message);
    setAuthView(data?.session?.user || null);

    db.auth.onAuthStateChange((_event, session) => {
      setAuthView(session?.user || null);
    });
  }

  authForm.addEventListener('submit', handleLogin);
  signupBtn.addEventListener('click', handleSignup);
  logoutBtn.addEventListener('click', async () => {
    await db.auth.signOut();
  });

  newPoBtn.addEventListener('click', () => openModal());
  closeModalBtn.addEventListener('click', closeModal);
  cancelPoBtn.addEventListener('click', closeModal);
  poModal.addEventListener('click', (event) => {
    if (event.target === poModal) closeModal();
  });
  poForm.addEventListener('submit', handleSavePO);

  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);

  ordersBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    const order = orders.find((o) => o.id === id);

    if (action === 'edit' && order) openModal(order);
    if (action === 'ready') await markReady(id);
    if (action === 'delete') await deleteOrder(id);
  });

  init();
})();
