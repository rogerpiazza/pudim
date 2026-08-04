import { listFornadas, getFornadaDetalhe, createFornadaCompleta } from '../api/fornadas.js';
import { listIngredientes } from '../api/ingredientes.js';
import { listTamanhos } from '../api/tamanhos.js';
import { getConfig } from '../api/configCustos.js';
import {
  calcularComponente, calcularIndiretos, calcularGramasProduzidas,
  calcularCustoTamanho, calcularMargem, fmtMoeda, fmtNumero,
} from '../calc.js';
import { showToast, showError } from '../toast.js';

let ingredientesCache = [];
let tamanhosCache = [];
let configCache = null;
let rowCounter = 0;
let itensMassa = [];
let itensCalda = [];
let producaoRows = [];

export async function renderFornadas(container) {
  container.innerHTML = `
    <div class="view-header">
      <h1>Fornadas</h1>
      <button class="btn-primary" id="btn-nova-fornada">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nova Fornada
      </button>
    </div>
    <div class="form-panel" id="form-nova-fornada"></div>
    <div id="fornadas-list"><div class="loading-state">Carregando…</div></div>
  `;

  const formPanel = container.querySelector('#form-nova-fornada');
  container.querySelector('#btn-nova-fornada').addEventListener('click', async () => {
    const opening = !formPanel.classList.contains('show');
    formPanel.classList.toggle('show');
    if (opening) await openForm(container, formPanel);
  });

  await loadFornadasList(container);
}

async function openForm(container, formPanel) {
  formPanel.innerHTML = '<div class="loading-state">Carregando…</div>';
  try {
    [ingredientesCache, tamanhosCache, configCache] = await Promise.all([
      listIngredientes(), listTamanhos(), getConfig(),
    ]);
  } catch (err) {
    showError(err, 'Não foi possível carregar dados para o formulário');
    return;
  }

  if (!ingredientesCache.length || !tamanhosCache.length) {
    formPanel.innerHTML = `<div class="card"><div class="empty-action">Cadastre ao menos um ingrediente e um tamanho em Ajustes antes de lançar uma fornada.</div></div>`;
    return;
  }
  if (!configCache) {
    configCache = { tarifa_kwh: 0, potencia_forno_w: 0, tarifa_agua_m3: 0, preco_botijao: 0, peso_botijao_kg: 13, consumo_gas_kg_h: 0 };
  }

  itensMassa = [];
  itensCalda = [];
  producaoRows = [];

  formPanel.innerHTML = `
    <div class="card">
      <div class="card-title">Nova fornada</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Data</label>
          <input type="date" id="f-data" value="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="form-group">
          <label class="form-label">Rendimento real da calda (g) — opcional</label>
          <input type="number" id="f-rendimento" min="0" step="0.1" placeholder="ex: 90">
        </div>
        <div class="form-group">
          <label class="form-label">Tempo de forno (min)</label>
          <input type="number" id="f-tempo-forno" min="0" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Tempo de fogão (min)</label>
          <input type="number" id="f-tempo-fogao" min="0" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Água usada (L)</label>
          <input type="number" id="f-litros-agua" min="0" value="0">
        </div>
        <div class="form-group full">
          <label class="form-label">Observação</label>
          <input type="text" id="f-obs" placeholder="opcional">
        </div>
      </div>

      <div class="detail-section">
        <h4>Massa</h4>
        <div id="rows-massa"></div>
        <button class="btn-secondary" id="add-massa" type="button">+ ingrediente</button>
      </div>

      <div class="detail-section">
        <h4>Calda</h4>
        <div id="rows-calda"></div>
        <button class="btn-secondary" id="add-calda" type="button">+ ingrediente</button>
      </div>

      <div class="detail-section">
        <h4>Produção (quantos pudins saíram de cada tamanho)</h4>
        <div id="rows-producao"></div>
        <button class="btn-secondary" id="add-producao" type="button">+ tamanho</button>
      </div>

      <div class="detail-section" id="preview-section"></div>

      <div class="form-actions" style="margin-top:20px">
        <button class="btn-primary" id="f-salvar">Salvar fornada</button>
        <button class="btn-ghost" id="f-cancelar" type="button">Cancelar</button>
      </div>
    </div>
  `;

  const ingOptions = ingredientesCache.map((i) => `<option value="${i.id}" data-unidade="${i.unidade}">${escapeHtml(i.nome)}</option>`).join('');
  const tamOptions = tamanhosCache.map((t) => `<option value="${t.id}">${escapeHtml(t.nome)}</option>`).join('');

  function itemRowHtml(rowId, componente) {
    return `
      <div class="item-row-form" data-row="${rowId}">
        <div class="form-group">
          <label class="form-label">Ingrediente</label>
          <select class="row-ing">${ingOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Qtd</label>
          <input type="number" class="row-qtd" min="0" step="0.01" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Unid.</label>
          <select class="row-unidade">
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="un">un</option>
          </select>
        </div>
        <button class="icon-btn row-remove" type="button" title="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }

  function producaoRowHtml(rowId) {
    return `
      <div class="item-row-form" data-row="${rowId}" style="grid-template-columns:2fr 1fr auto">
        <div class="form-group">
          <label class="form-label">Tamanho</label>
          <select class="row-tamanho">${tamOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Qtd produzida</label>
          <input type="number" class="row-qtd-prod" min="0" step="1" value="0">
        </div>
        <button class="icon-btn row-remove" type="button" title="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }

  const rowsMassaEl = formPanel.querySelector('#rows-massa');
  const rowsCaldaEl = formPanel.querySelector('#rows-calda');
  const rowsProducaoEl = formPanel.querySelector('#rows-producao');

  function addRow(container, html) {
    const id = ++rowCounter;
    const div = document.createElement('div');
    div.innerHTML = html(id);
    const rowEl = div.firstElementChild;
    container.appendChild(rowEl);
    rowEl.querySelector('.row-remove').addEventListener('click', () => {
      rowEl.remove();
      updatePreview();
    });
    rowEl.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', updatePreview));
    return rowEl;
  }

  formPanel.querySelector('#add-massa').addEventListener('click', () => addRow(rowsMassaEl, itemRowHtml));
  formPanel.querySelector('#add-calda').addEventListener('click', () => addRow(rowsCaldaEl, itemRowHtml));
  formPanel.querySelector('#add-producao').addEventListener('click', () => addRow(rowsProducaoEl, producaoRowHtml));

  addRow(rowsMassaEl, itemRowHtml);
  addRow(rowsCaldaEl, itemRowHtml);
  addRow(rowsProducaoEl, producaoRowHtml);

  ['#f-tempo-forno', '#f-tempo-fogao', '#f-litros-agua', '#f-rendimento'].forEach((sel) => {
    formPanel.querySelector(sel).addEventListener('input', updatePreview);
  });

  function readItens(rowsEl, componente) {
    return [...rowsEl.querySelectorAll('.item-row-form')].map((row) => ({
      ingrediente_id: row.querySelector('.row-ing').value,
      componente,
      quantidade: Number(row.querySelector('.row-qtd').value) || 0,
      unidade_informada: row.querySelector('.row-unidade').value,
    })).filter((i) => i.quantidade > 0);
  }

  function readProducao(rowsEl) {
    return [...rowsEl.querySelectorAll('.item-row-form')].map((row) => ({
      tamanho_id: row.querySelector('.row-tamanho').value,
      quantidade: Number(row.querySelector('.row-qtd-prod').value) || 0,
    })).filter((p) => p.quantidade > 0);
  }

  function updatePreview() {
    const itens = [...readItens(rowsMassaEl, 'massa'), ...readItens(rowsCaldaEl, 'calda')];
    const producao = readProducao(rowsProducaoEl);
    const rendimentoOverride = Number(formPanel.querySelector('#f-rendimento').value) || 0;
    const tempoForno = Number(formPanel.querySelector('#f-tempo-forno').value) || 0;
    const tempoFogao = Number(formPanel.querySelector('#f-tempo-fogao').value) || 0;
    const litrosAgua = Number(formPanel.querySelector('#f-litros-agua').value) || 0;

    const previewEl = formPanel.querySelector('#preview-section');
    if (!producao.length) {
      previewEl.innerHTML = '';
      return;
    }

    const ingredientesById = new Map(ingredientesCache.map((i) => [i.id, i]));
    const tamanhosById = new Map(tamanhosCache.map((t) => [t.id, t]));

    const massa = calcularComponente(itens, ingredientesById, 'massa');
    const calda = calcularComponente(itens, ingredientesById, 'calda', rendimentoOverride);
    const indiretos = calcularIndiretos({ tempoFornoMin: tempoForno, tempoFogaoMin: tempoFogao, litrosAgua }, configCache);
    const gramasProduzidas = calcularGramasProduzidas(producao, tamanhosById);
    const custoIndiretoG = gramasProduzidas > 0 ? indiretos.total / gramasProduzidas : 0;

    const cards = producao.map((p) => {
      const t = tamanhosById.get(p.tamanho_id);
      if (!t) return '';
      const custoEmbalagem = Number(t.custo_embalagem) || 0;
      const custoUnitario = calcularCustoTamanho({
        gramasMassa: Number(t.gramas_massa), gramasCalda: Number(t.gramas_calda),
        custoGMassa: massa.custoPorG, custoGCalda: calda.custoPorG, custoIndiretoG, custoEmbalagem,
      });
      const { margemReais, margemPct } = calcularMargem(Number(t.preco_venda), custoUnitario);
      const cls = margemReais >= 0 ? 'positive' : 'negative';
      const resultCls = margemReais >= 0 ? 'pos' : 'neg';
      return `
        <div class="margin-card ${cls}">
          <div class="margin-head">
            <span class="margin-size">${escapeHtml(t.nome)}</span>
            <span class="margin-detail">${t.gramas_massa}g massa + ${t.gramas_calda}g calda</span>
          </div>
          <div class="margin-row"><span>Embalagem</span><span>${fmtMoeda(custoEmbalagem)}</span></div>
          <div class="margin-row"><span>Custo unitário</span><span>${fmtMoeda(custoUnitario)}</span></div>
          <div class="margin-row"><span>Preço de venda</span><span>${fmtMoeda(t.preco_venda)}</span></div>
          <div class="margin-result"><span>Margem</span><span class="${resultCls}">${fmtMoeda(margemReais)} <small>(${fmtNumero(margemPct, 1)}%)</small></span></div>
        </div>
      `;
    }).join('');

    previewEl.innerHTML = `
      <h4>Prévia de custo &amp; margem</h4>
      <div class="info-pills">
        <span class="info-pill">Custo/g massa: <strong>${fmtMoeda(massa.custoPorG)}</strong></span>
        <span class="info-pill">Custo/g calda: <strong>${fmtMoeda(calda.custoPorG)}</strong></span>
        <span class="info-pill">Indiretos: <strong>${fmtMoeda(indiretos.total)}</strong></span>
      </div>
      <div class="margin-cards">${cards}</div>
    `;
  }

  formPanel.querySelector('#f-cancelar').addEventListener('click', () => {
    formPanel.classList.remove('show');
  });

  formPanel.querySelector('#f-salvar').addEventListener('click', async () => {
    const itens = [...readItens(rowsMassaEl, 'massa'), ...readItens(rowsCaldaEl, 'calda')];
    const producao = readProducao(rowsProducaoEl);

    if (!itens.length) { showToast('Adicione ao menos um ingrediente', 'error'); return; }
    if (!producao.length) { showToast('Informe a produção de ao menos um tamanho', 'error'); return; }

    const rendimento = Number(formPanel.querySelector('#f-rendimento').value) || null;

    const salvarBtn = formPanel.querySelector('#f-salvar');
    salvarBtn.disabled = true;
    try {
      await createFornadaCompleta({
        fornada: {
          data: formPanel.querySelector('#f-data').value,
          tempo_forno_min: Number(formPanel.querySelector('#f-tempo-forno').value) || 0,
          tempo_fogao_min: Number(formPanel.querySelector('#f-tempo-fogao').value) || 0,
          litros_agua: Number(formPanel.querySelector('#f-litros-agua').value) || 0,
          rendimento_calda_g: rendimento,
          observacao: formPanel.querySelector('#f-obs').value || null,
        },
        itens,
        producao,
      });
      showToast('Fornada salva com sucesso');
      formPanel.classList.remove('show');
      await loadFornadasList(document.getElementById('v-forn'));
    } catch (err) {
      showError(err, 'Não foi possível salvar a fornada');
    } finally {
      salvarBtn.disabled = false;
    }
  });
}

async function loadFornadasList(container) {
  const listEl = container.querySelector('#fornadas-list');
  listEl.innerHTML = '<div class="loading-state">Carregando…</div>';
  try {
    const fornadas = await listFornadas();
    if (!fornadas.length) {
      listEl.innerHTML = '<div class="empty-action">Nenhuma fornada registrada ainda. Toque em "Nova Fornada" para começar.</div>';
      return;
    }
    listEl.innerHTML = fornadas.map((f, idx) => {
      const num = String(fornadas.length - idx).padStart(3, '0');
      const dataFmt = new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
      return `
        <div class="fornada-card" data-id="${f.id}">
          <div class="fornada-header">
            <div><span class="fornada-id">#${num}</span><span class="fornada-date">${dataFmt}</span></div>
            <div style="display:flex;align-items:center;gap:12px">
              <span class="fornada-summary" data-summary></span>
              <span class="fornada-chevron">▾</span>
            </div>
          </div>
          <div class="fornada-body"><div class="loading-state">Carregando detalhes…</div></div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.fornada-card').forEach((card) => {
      const header = card.querySelector('.fornada-header');
      let loaded = false;
      header.addEventListener('click', async () => {
        card.classList.toggle('open');
        if (card.classList.contains('open') && !loaded) {
          loaded = true;
          await loadFornadaDetail(card);
        }
      });
    });
  } catch (err) {
    showError(err, 'Não foi possível carregar as fornadas');
    listEl.innerHTML = '<div class="empty-action">Erro ao carregar fornadas.</div>';
  }
}

async function loadFornadaDetail(card) {
  const body = card.querySelector('.fornada-body');
  const summaryEl = card.querySelector('[data-summary]');
  try {
    const { itens, producao, custos } = await getFornadaDetalhe(card.dataset.id);

    const totalPudins = producao.reduce((s, p) => s + Number(p.qtd_produzida), 0);
    summaryEl.textContent = `${totalPudins} pudim${totalPudins !== 1 ? 's' : ''}`;

    const massaItens = itens.filter((i) => i.componente === 'massa');
    const caldaItens = itens.filter((i) => i.componente === 'calda');
    const indiretoTotal = Number(custos.energia) + Number(custos.gas) + Number(custos.agua);

    body.innerHTML = `
      <div class="detail-section">
        <h4>Massa</h4>
        ${massaItens.map((i) => `<div class="ing-row"><span class="name">${escapeHtml(i.ingrediente_nome)}</span><span class="qty">${fmtNumero(i.quantidade_g, 0)}g</span><span class="cost">${fmtMoeda(i.custo_item)}</span></div>`).join('')}
        <div class="ing-row total"><span class="name">Total massa</span><span class="qty">${fmtNumero(custos.peso_massa, 0)}g</span><span class="cost">${fmtMoeda(custos.custo_massa)}</span></div>
      </div>
      <div class="detail-section">
        <h4>Calda</h4>
        ${caldaItens.map((i) => `<div class="ing-row"><span class="name">${escapeHtml(i.ingrediente_nome)}</span><span class="qty">${fmtNumero(i.quantidade_g, 0)}g</span><span class="cost">${fmtMoeda(i.custo_item)}</span></div>`).join('')}
        <div class="ing-row total"><span class="name">Total calda</span><span class="qty">${fmtNumero(custos.peso_calda, 0)}g</span><span class="cost">${fmtMoeda(custos.custo_calda)}</span></div>
      </div>
      <div class="detail-section">
        <h4>Custos indiretos</h4>
        <div class="ing-row"><span class="name">Energia elétrica</span><span class="qty"></span><span class="cost">${fmtMoeda(custos.energia)}</span></div>
        <div class="ing-row"><span class="name">Gás</span><span class="qty"></span><span class="cost">${fmtMoeda(custos.gas)}</span></div>
        <div class="ing-row"><span class="name">Água</span><span class="qty"></span><span class="cost">${fmtMoeda(custos.agua)}</span></div>
        <div class="ing-row total"><span class="name">Total indireto</span><span class="qty"></span><span class="cost">${fmtMoeda(indiretoTotal)}</span></div>
      </div>
      <div class="info-pills">
        <span class="info-pill"><strong>${fmtNumero(custos.tempo_forno_min, 0)} min</strong> forno</span>
        <span class="info-pill"><strong>${fmtNumero(custos.tempo_fogao_min, 0)} min</strong> fogão</span>
        <span class="info-pill"><strong>${fmtNumero(custos.litros_agua, 1)} L</strong> água</span>
      </div>
      <div class="detail-section">
        <h4>Custo &amp; margem por tamanho</h4>
      </div>
      <div class="margin-cards">
        ${producao.map((p) => {
          const cls = p.margem_reais >= 0 ? 'positive' : 'negative';
          const resultCls = p.margem_reais >= 0 ? 'pos' : 'neg';
          return `
            <div class="margin-card ${cls}">
              <div class="margin-head">
                <span class="margin-size">${escapeHtml(p.tamanho_nome)} <small style="color:var(--text-3);font-weight:400">×${p.qtd_produzida}</small></span>
                <span class="margin-detail">${p.gramas_massa}g massa + ${p.gramas_calda}g calda</span>
              </div>
              <div class="margin-row"><span>Embalagem</span><span>${fmtMoeda(p.custo_embalagem)}</span></div>
              <div class="margin-row"><span>Custo unitário</span><span>${fmtMoeda(p.custo_unitario)}</span></div>
              <div class="margin-row"><span>Preço de venda</span><span>${fmtMoeda(p.preco_venda)}</span></div>
              <div class="margin-result"><span>Margem</span><span class="${resultCls}">${fmtMoeda(p.margem_reais)} <small>(${fmtNumero(p.margem_pct, 1)}%)</small></span></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    showError(err, 'Não foi possível carregar o detalhe da fornada');
    body.innerHTML = '<div class="empty-action">Erro ao carregar detalhes.</div>';
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
