import { listVendas, createVenda, updateVenda, deleteVenda, marcarPago } from '../api/vendas.js';
import { listClientes, createCliente } from '../api/clientes.js';
import { listTamanhos } from '../api/tamanhos.js';
import { fmtMoeda } from '../calc.js';
import { showToast, showError } from '../toast.js';
import { confirmDialog } from '../confirmModal.js';
import { PENCIL_ICON, TRASH_ICON } from '../icons.js';

export async function renderVendas(container) {
  container.innerHTML = `
    <div class="view-header">
      <h1>Vendas</h1>
      <button class="btn-primary" id="btn-nova-venda">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nova Venda
      </button>
    </div>

    <div class="form-panel" id="form-nova-venda">
      <div class="card">
        <div class="card-title" id="venda-form-title">Registrar venda</div>
        <div class="form-grid">
          <div class="form-group full autocomplete-wrap">
            <label class="form-label">Cliente</label>
            <input type="text" id="v-cliente-input" placeholder="Digite o nome do cliente" autocomplete="off">
            <div class="autocomplete-list" id="v-cliente-list"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Tamanho</label>
            <select id="v-tamanho"><option value="">Selecione…</option></select>
          </div>
          <div class="form-group">
            <label class="form-label">Quantidade</label>
            <input type="number" id="v-quantidade" min="1" value="1">
          </div>
          <div class="form-group">
            <label class="form-label">Valor unitário (R$)</label>
            <input type="number" id="v-preco" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">Data</label>
            <input type="date" id="v-data">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="v-pago">
              <option value="true">Pago</option>
              <option value="false" selected>Não pago</option>
            </select>
          </div>
          <div class="form-actions">
            <button class="btn-primary" id="v-salvar">Salvar venda</button>
            <button class="btn-ghost" id="v-cancelar">Cancelar</button>
          </div>
        </div>
      </div>
    </div>

    <div class="venda-summary" id="venda-summary">
      <div class="stat-tile"><span class="stat-label">Total vendido</span><span class="stat-value">—</span></div>
      <div class="stat-tile"><span class="stat-label">A receber</span><span class="stat-value clr-warn">—</span></div>
    </div>

    <div class="filter-row" style="margin-bottom:16px" id="vendas-filter">
      <button class="chip active" data-filter="all">Todos</button>
      <button class="chip" data-filter="paid">Pagos</button>
      <button class="chip" data-filter="pending">Pendentes</button>
    </div>

    <div class="card" style="padding:0">
      <div id="sales-list"><div class="loading-state">Carregando…</div></div>
    </div>
  `;

  let clientesCache = [];
  let tamanhosCache = [];
  let selectedClienteId = null;
  let editingId = null;
  let editingVenda = null;
  let currentFilter = 'all';

  const formPanel = container.querySelector('#form-nova-venda');
  const formTitle = container.querySelector('#venda-form-title');
  const salvarBtn = container.querySelector('#v-salvar');
  const input = container.querySelector('#v-cliente-input');
  const list = container.querySelector('#v-cliente-list');
  const tamanhoSel = container.querySelector('#v-tamanho');
  const qtdEl = container.querySelector('#v-quantidade');
  const precoEl = container.querySelector('#v-preco');
  const dataEl = container.querySelector('#v-data');
  const pagoSel = container.querySelector('#v-pago');

  function resetForm() {
    editingId = null;
    editingVenda = null;
    formTitle.textContent = 'Registrar venda';
    salvarBtn.textContent = 'Salvar venda';
    input.value = '';
    selectedClienteId = null;
    tamanhoSel.value = '';
    qtdEl.value = 1;
    precoEl.value = '';
    dataEl.value = new Date().toISOString().slice(0, 10);
    pagoSel.value = 'false';
  }

  function preencherForm(v) {
    editingId = v.id;
    editingVenda = v;
    formTitle.textContent = 'Editar venda';
    salvarBtn.textContent = 'Salvar alterações';
    selectedClienteId = v.cliente_id;
    input.value = v.cliente_nome;
    tamanhoSel.value = v.tamanho_id;
    qtdEl.value = v.quantidade;
    precoEl.value = v.preco_unitario;
    dataEl.value = v.data;
    pagoSel.value = String(v.pago);
  }

  container.querySelector('#btn-nova-venda').addEventListener('click', () => {
    const opening = !formPanel.classList.contains('show');
    if (opening) resetForm();
    formPanel.classList.toggle('show');
  });
  container.querySelector('#v-cancelar').addEventListener('click', () => {
    formPanel.classList.remove('show');
    resetForm();
  });

  container.querySelectorAll('#vendas-filter .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#vendas-filter .chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadSales();
    });
  });

  try {
    [clientesCache, tamanhosCache] = await Promise.all([listClientes(), listTamanhos()]);
  } catch (err) {
    showError(err, 'Não foi possível carregar clientes/tamanhos');
  }

  tamanhoSel.innerHTML = '<option value="">Selecione…</option>' +
    tamanhosCache.map((t) => `<option value="${t.id}" data-preco="${t.preco_venda}">${escapeHtml(t.nome)}</option>`).join('');
  tamanhoSel.addEventListener('change', () => {
    if (editingId) return; // não sobrescreve o valor já registrado ao editar
    const opt = tamanhoSel.selectedOptions[0];
    const preco = opt ? opt.dataset.preco : '';
    precoEl.value = preco ? Number(preco).toFixed(2) : '';
  });

  function renderClienteList(term) {
    const termLower = term.trim().toLowerCase();
    const matches = termLower
      ? clientesCache.filter((c) => c.nome.toLowerCase().includes(termLower))
      : clientesCache;
    let html = matches.slice(0, 8).map((c) => `<div class="autocomplete-item" data-id="${c.id}" data-nome="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}</div>`).join('');
    if (termLower && !clientesCache.some((c) => c.nome.toLowerCase() === termLower)) {
      html += `<div class="autocomplete-item create-new" data-create="${escapeHtml(term.trim())}">+ Criar cliente "${escapeHtml(term.trim())}"</div>`;
    }
    list.innerHTML = html;
    list.classList.toggle('show', html.length > 0);
  }

  input.addEventListener('focus', () => renderClienteList(input.value));
  input.addEventListener('input', () => {
    selectedClienteId = null;
    renderClienteList(input.value);
  });
  input.addEventListener('blur', () => setTimeout(() => list.classList.remove('show'), 150));

  list.addEventListener('mousedown', async (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (!item) return;
    if (item.dataset.create) {
      try {
        const novo = await createCliente(item.dataset.create);
        clientesCache.push(novo);
        selectedClienteId = novo.id;
        input.value = novo.nome;
        showToast('Cliente criado');
      } catch (err) {
        showError(err, 'Não foi possível criar o cliente');
      }
    } else {
      selectedClienteId = item.dataset.id;
      input.value = item.dataset.nome;
    }
    list.classList.remove('show');
  });

  salvarBtn.addEventListener('click', async () => {
    const tamanhoId = tamanhoSel.value;
    const quantidade = Number(qtdEl.value);
    const preco = Number(precoEl.value);
    const pago = pagoSel.value === 'true';
    const data = dataEl.value;

    if (!selectedClienteId) { showToast('Selecione ou crie um cliente', 'error'); return; }
    if (!tamanhoId) { showToast('Selecione um tamanho', 'error'); return; }
    if (!quantidade || quantidade <= 0) { showToast('Quantidade inválida', 'error'); return; }
    if (preco === null || preco < 0 || Number.isNaN(preco)) { showToast('Valor unitário inválido', 'error'); return; }
    if (!data) { showToast('Informe a data', 'error'); return; }

    const hoje = new Date().toISOString().slice(0, 10);
    let dataPagamento = null;
    if (pago) {
      dataPagamento = (editingVenda && editingVenda.pago && editingVenda.data_pagamento) ? editingVenda.data_pagamento : hoje;
    }

    const payload = {
      cliente_id: selectedClienteId,
      tamanho_id: tamanhoId,
      quantidade,
      preco_unitario: preco,
      pago,
      data,
      data_pagamento: dataPagamento,
    };

    try {
      if (editingId) {
        await updateVenda(editingId, payload);
        showToast('Venda atualizada');
      } else {
        await createVenda(payload);
        showToast('Venda registrada');
      }
      formPanel.classList.remove('show');
      resetForm();
      await loadSales();
    } catch (err) {
      showError(err, 'Não foi possível salvar a venda');
    }
  });

  async function loadSales() {
    const listEl = container.querySelector('#sales-list');
    const summaryEl = container.querySelector('#venda-summary');
    listEl.innerHTML = '<div class="loading-state">Carregando…</div>';
    try {
      const vendas = await listVendas(currentFilter);

      const totalVendido = vendas.reduce((s, v) => s + Number(v.quantidade) * Number(v.preco_unitario), 0);
      const aReceber = vendas.filter((v) => !v.pago).reduce((s, v) => s + Number(v.quantidade) * Number(v.preco_unitario), 0);
      summaryEl.innerHTML = `
        <div class="stat-tile"><span class="stat-label">Total vendido</span><span class="stat-value">${fmtMoeda(totalVendido)}</span></div>
        <div class="stat-tile"><span class="stat-label">A receber</span><span class="stat-value ${aReceber > 0 ? 'clr-warn' : ''}">${fmtMoeda(aReceber)}</span></div>
      `;

      if (!vendas.length) {
        listEl.innerHTML = '<div class="empty-action">Nenhuma venda encontrada. Toque em "Nova Venda" para registrar a primeira.</div>';
        return;
      }

      listEl.innerHTML = vendas.map((v) => {
        const total = Number(v.quantidade) * Number(v.preco_unitario);
        const dataFmt = new Date(v.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
        return `
          <div class="sale-item" style="padding:14px 20px" data-id="${v.id}">
            <span class="sale-date">${dataFmt}</span>
            <div class="sale-info">
              <div class="sale-client">${escapeHtml(v.cliente_nome)}</div>
              <div class="sale-desc">${v.quantidade}× ${escapeHtml(v.tamanho_nome)}</div>
            </div>
            <span class="sale-amount">${fmtMoeda(total)}</span>
            <span class="sale-status">
              ${v.pago
                ? '<span class="badge badge-paid">Pago</span>'
                : `<span class="badge badge-pending" data-id="${v.id}" title="Marcar como pago">Pendente</span>`}
            </span>
            <div class="card-actions-row">
              <button class="icon-btn venda-edit" title="Editar">${PENCIL_ICON}</button>
              <button class="icon-btn venda-del" title="Excluir">${TRASH_ICON}</button>
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.badge-pending').forEach((badge) => {
        badge.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await marcarPago(badge.dataset.id);
            showToast('Marcado como pago');
            await loadSales();
          } catch (err) {
            showError(err, 'Não foi possível marcar como pago');
          }
        });
      });

      vendas.forEach((v) => {
        const row = listEl.querySelector(`.sale-item[data-id="${v.id}"]`);
        row.querySelector('.venda-edit').addEventListener('click', () => {
          preencherForm(v);
          formPanel.classList.add('show');
        });
        row.querySelector('.venda-del').addEventListener('click', async () => {
          const ok = await confirmDialog({ message: `Excluir a venda de ${v.quantidade}× ${v.tamanho_nome} para ${v.cliente_nome}? Essa ação não pode ser desfeita.` });
          if (!ok) return;
          try {
            await deleteVenda(v.id);
            showToast('Venda excluída');
            await loadSales();
          } catch (err) {
            showError(err, 'Não foi possível excluir a venda');
          }
        });
      });
    } catch (err) {
      showError(err, 'Não foi possível carregar as vendas');
      listEl.innerHTML = '<div class="empty-action">Erro ao carregar vendas.</div>';
    }
  }

  resetForm();
  await loadSales();
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
