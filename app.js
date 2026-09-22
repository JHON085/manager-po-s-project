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
  const actualReadyDate = $('actualReadyDate');
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
  const followUpFilter = $('followUpFilter');
  const metricActive = $('metricActive');
  const metricOnTime = $('metricOnTime');
  const metricNear = $('metricNear');
  const metricLate = $('metricLate');
  const metricWaiting = $('metricWaiting');
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

  function showToast(text, error = false, duration = 3600) {
    toast.textContent = text;
    toast.className = error ? 'toast error' : 'toast';
    setTimeout(() => { toast.className = 'toast hidden'; }, duration);
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
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  }

  function getOriginFollowUp(order) {
    if (order.origin_response_received) {
      return { key: 'replied', label: 'Resposta recebida', cls: 'ok', detail: formatDateTime(order.origin_response_received_at) };
    }
    if (order.origin_follow_up_sent) {
      let detail = '';
      if (order.origin_follow_up_sent_at) {
        const sent = new Date(order.origin_follow_up_sent_at);
        const now = new Date();
        const days = Math.max(0, Math.floor((now - sent) / 86400000));
        detail = days === 0 ? 'Cobrado hoje' : `Aguardando há ${days} dia${days === 1 ? '' : 's'}`;
      } else {
        detail = 'Data da cobrança não registrada';
      }
      return { key: 'waiting', label: 'Aguardando resposta', cls: 'warn', detail };
    }
    return { key: 'not_sent', label: 'Não cobrado', cls: 'neutral', detail: '' };
  }

  function getHealth(order) {
    if (order.status === 'Cancelado') {
      return { key: 'done', label: 'Cancelado', cls: 'neutral', days: null };
    }
    if (['Pronto', 'Embarcado', 'Concluído'].includes(order.status) || order.actual_ready_date) {
      return { key: 'done', label: order.status === 'Concluído' ? 'Concluído' : 'Pronto', cls: 'neutral', days: null };
    }
    const days = daysFromToday(order.estimated_ready_date);
    if (days === null) return { key: 'unknown', label: 'Sem data', cls: 'neutral', days: null };
    if (days < 0) return { key: 'late', label: `Atrasado ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`, cls: 'danger', days };
    if (days === 0) return { key: 'near', label: 'Vence hoje', cls: 'warn', days };
    if (days <= 7) return { key: 'near', label: `${days} dia${days === 1 ? '' : 's'}`, cls: 'warn', days };
    return { key: 'ontime', label: 'No prazo', cls: 'ok', days };
  }

  function valueOrEmpty(value) {
    return value === null || value === undefined ? '' : String(value);
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

      currency.value = order.currency || '';
      transportation.value = order.transportation || '';
      amountPo.value = valueOrEmpty(order.amount_po);
      supplierQuotationNo.value = order.supplier_quotation_no || '';
      supplierPrice.value = valueOrEmpty(order.supplier_price);
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
      showToast(`Erro ao carregar POs: ${error.message}`, true, 6000);
      orders = [];
      render();
      return;
    }

    orders = data || [];
    setSync('Sincronizado');
    render();
  }

  function renderMetrics() {
    const active = orders.filter((o) => !['Concluído', 'Cancelado'].includes(o.status));
    const health = active.map(getHealth);
    metricActive.textContent = active.length;
    metricOnTime.textContent = health.filter((h) => h.key === 'ontime').length;
    metricNear.textContent = health.filter((h) => h.key === 'near').length;
    metricLate.textContent = health.filter((h) => h.key === 'late').length;
    metricWaiting.textContent = active.filter((o) => getOriginFollowUp(o).key === 'waiting').length;
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
          ${getOriginFollowUp(order).key === 'waiting' ? `<small class="followup-note">📨 ${escapeHtml(getOriginFollowUp(order).detail)}</small>` : ''}
        </div>
        <div class="alert-badges">
          <span class="badge ${health.cls}">${health.label}</span>
          ${getOriginFollowUp(order).key === 'waiting' ? '<span class="badge warn">Aguardando origem</span>' : ''}
        </div>
      </div>
    `).join('');
  }

  function renderTable() {
    const search = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const followUp = followUpFilter.value;
    const filtered = orders.filter((o) => {
      const text = [
        o.po_number, o.supplier, o.client, o.origin, o.responsible,
        o.quotation_no, o.work_order, o.supplier_quotation_no, o.follow_up_status
      ].filter(Boolean).join(' ').toLowerCase();
      const followState = getOriginFollowUp(o).key;
      return (!search || text.includes(search)) && (!status || o.status === status) && (!followUp || followState === followUp);
    });

    if (!filtered.length) {
      ordersBody.innerHTML = '<tr><td colspan="8" class="empty">Nenhum PO encontrado.</td></tr>';
      return;
    }

    ordersBody.innerHTML = filtered.map((o) => {
      const health = getHealth(o);
      const follow = getOriginFollowUp(o);
      return `
        <tr>
          <td><button class="po-link" data-action="edit" data-id="${o.id}">${escapeHtml(o.po_number)}</button></td>
          <td>${escapeHtml(o.supplier)}</td>
          <td>${escapeHtml(o.client || '—')}</td>
          <td>${formatDate(o.estimated_ready_date)}</td>
          <td>${escapeHtml(o.status)}</td>
          <td>
            <div class="followup-cell">
              <label class="followup-check" title="Marque quando a cobrança for enviada para a origem">
                <input type="checkbox" data-followup-toggle data-id="${o.id}" ${o.origin_follow_up_sent ? 'checked' : ''}>
                <span>Cobrado</span>
              </label>
              <span class="badge ${follow.cls}">${follow.label}</span>
              ${follow.detail ? `<small>${escapeHtml(follow.detail)}</small>` : ''}
              ${follow.key === 'waiting' ? `<button class="mini-link" data-action="response" data-id="${o.id}">Resposta recebida</button>` : ''}
              ${follow.key === 'replied' ? `<button class="mini-link" data-action="followup-again" data-id="${o.id}">Cobrar novamente</button>` : ''}
            </div>
          </td>
          <td><span class="badge ${health.cls}">${health.label}</span></td>
          <td>
            <div class="actions">
              <button class="btn btn-secondary btn-small" data-action="edit" data-id="${o.id}">Editar</button>
              ${!['Pronto','Embarcado','Concluído','Cancelado'].includes(o.status) ? `<button class="btn btn-secondary btn-small" data-action="ready" data-id="${o.id}">Marcar pronto</button>` : ''}
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

  function optionalNumber(input) {
    if (input.value === '') return null;
    const n = Number(input.value);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSavePO(event) {
    event.preventDefault();
    hideMessage(formError);

    const isEditing = Boolean(poId.value);
    if (!poNumber.value.trim() || !supplier.value.trim() || (!isEditing && !estimatedReadyDate.value)) {
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
      estimated_ready_date: estimatedReadyDate.value || null,
      actual_ready_date: actualReadyDate.value || null,
      status: poStatus.value,
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

    let result;
    try {
      if (isEditing) {
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
      showMessage(formError, `Não foi possível salvar: ${result.error.message}`);
      return;
    }

    closeModal();
    showToast(isEditing ? 'PO atualizado com sucesso.' : 'PO cadastrado com sucesso.');
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

  async function setOriginFollowUp(id, checked) {
    if (!currentUser) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;

    if (!checked && order.origin_follow_up_sent) {
      const ok = confirm('Remover a marcação de cobrança deste PO?');
      if (!ok) { renderTable(); return; }
    }

    const payload = checked ? {
      origin_follow_up_sent: true,
      origin_follow_up_sent_at: new Date().toISOString(),
      origin_response_received: false,
      origin_response_received_at: null,
      origin_follow_up_count: Number(order.origin_follow_up_count || 0) + 1
    } : {
      origin_follow_up_sent: false,
      origin_follow_up_sent_at: null,
      origin_response_received: false,
      origin_response_received_at: null
    };

    const { error } = await db.from('purchase_orders').update(payload).eq('id', id).eq('user_id', currentUser.id);
    if (error) {
      showToast(`Erro ao registrar cobrança: ${error.message}. Rode migration_cobranca_origem.sql no Supabase.`, true, 7000);
      await loadOrders();
      return;
    }
    showToast(checked ? 'Cobrança registrada. Agora está aguardando resposta da origem.' : 'Marcação de cobrança removida.');
    await loadOrders();
  }

  async function markOriginResponse(id) {
    if (!currentUser) return;
    const { error } = await db.from('purchase_orders').update({
      origin_follow_up_sent: true,
      origin_response_received: true,
      origin_response_received_at: new Date().toISOString()
    }).eq('id', id).eq('user_id', currentUser.id);
    if (error) { showToast(`Erro ao registrar resposta: ${error.message}`, true); return; }
    showToast('Resposta da origem registrada.');
    await loadOrders();
  }

  async function followUpAgain(id) {
    if (!currentUser) return;
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const { error } = await db.from('purchase_orders').update({
      origin_follow_up_sent: true,
      origin_follow_up_sent_at: new Date().toISOString(),
      origin_response_received: false,
      origin_response_received_at: null,
      origin_follow_up_count: Number(order.origin_follow_up_count || 0) + 1
    }).eq('id', id).eq('user_id', currentUser.id);
    if (error) { showToast(`Erro ao registrar nova cobrança: ${error.message}`, true); return; }
    showToast('Nova cobrança registrada. Aguardando resposta da origem.');
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
    if (status === 'docs recebidos e enviado ao cliente') return 'Concluído';
    if (status === 'pendência documental' || status === 'pendencia documental') return 'Pronto';
    if (status.includes('produção') || status.includes('producao') || status.includes('cobrança') || status.includes('cobranca')) return 'Em produção';
    return 'Aguardando produção';
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
    const followStatusNormalized = String(followStatus || '').toLowerCase();
    const importedAsCharged = followStatusNormalized.includes('cobrança realizada') || followStatusNormalized.includes('cobranca realizada');

    const rawFingerprint = [sourceNo ?? '', purchaseOrder, supplierValue, supplierQuote || '', amount ?? ''].join('|');
    const fingerprint = `followup:${sourceNo ?? 'x'}:${purchaseOrder}:${hashText(rawFingerprint)}`;

    return {
      user_id: currentUser.id,
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
      origin_follow_up_sent: importedAsCharged,
      origin_follow_up_sent_at: null,
      origin_response_received: false,
      origin_response_received_at: null,
      origin_follow_up_count: importedAsCharged ? 1 : 0,
      import_source: fileName,
      import_fingerprint: fingerprint,
      source_data: row
    };
  }

  async function handleExcelImport(file) {
    if (!currentUser) {
      showToast('Faça login antes de importar.', true);
      return;
    }
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
      const uniqueMap = new Map();
      for (const record of mapped) uniqueMap.set(record.import_fingerprint, record);
      const records = [...uniqueMap.values()];

      if (!records.length) throw new Error('Nenhum PO válido foi encontrado na planilha.');

      const withoutEstimate = records.filter((r) => !r.estimated_ready_date).length;
      const message = `Encontrei ${records.length} registros válidos na aba ${sheetName}.` +
        (withoutEstimate ? ` ${withoutEstimate} estão sem uma data de prontidão reconhecível.` : '') +
        `\n\nDeseja importar para o PO Control?`;
      if (!confirm(message)) return;

      const batchSize = 80;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        importExcelBtn.textContent = `Importando ${Math.min(i + batch.length, records.length)}/${records.length}...`;
        setSync(`Importando ${Math.min(i + batch.length, records.length)}/${records.length}`);

        const { error } = await db
          .from('purchase_orders')
          .upsert(batch, {
            onConflict: 'user_id,import_fingerprint',
            ignoreDuplicates: true
          });

        if (error) {
          const migrationHint = /column|constraint|estimated_ready_date|import_fingerprint/i.test(error.message)
            ? ' Rode primeiro o arquivo migration_excel_import.sql no SQL Editor do Supabase.'
            : '';
          throw new Error(`${error.message}.${migrationHint}`);
        }
      }

      showToast(`${records.length} registros processados. Importação concluída.`, false, 6000);
      await loadOrders();
    } catch (err) {
      console.error(err);
      showToast(`Erro na importação: ${err.message || err}`, true, 9000);
      setSync('Erro na importação');
    } finally {
      importExcelBtn.disabled = false;
      importExcelBtn.textContent = 'Importar Excel';
      excelFileInput.value = '';
    }
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
  importExcelBtn.addEventListener('click', () => excelFileInput.click());
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
  followUpFilter.addEventListener('change', renderTable);

  ordersBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    const order = orders.find((o) => o.id === id);

    if (action === 'edit' && order) openModal(order);
    if (action === 'ready') await markReady(id);
    if (action === 'delete') await deleteOrder(id);
    if (action === 'response') await markOriginResponse(id);
    if (action === 'followup-again') await followUpAgain(id);
  });

  ordersBody.addEventListener('change', async (event) => {
    const checkbox = event.target.closest('[data-followup-toggle]');
    if (!checkbox) return;
    checkbox.disabled = true;
    await setOriginFollowUp(checkbox.dataset.id, checkbox.checked);
  });

  init();
})();
