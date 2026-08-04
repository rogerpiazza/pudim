import { listFornadas, getFornadaDetalhe, createFornadaCompleta } from '../api/fornadas.js';
import { listIngredientes } from '../api/ingredientes.js';
import { listTamanhos } from '../api/tamanhos.js';
import { getConfig } from '../api/configCustos.js';
import { listReceitaPadrao } from '../api/receitaPadrao.js';
import {
  calcularReceitaPadrao, calcularIndiretos, calcularGramasProduzidas,
  calcularCustoTamanho, calcularMargem, gerarSugestoesProducao, fmtMoeda, fmtNumero,
} from '../calc.js';
import { showToast, showError } from '../toast.js';

let ingredientesCache = [];
let tamanhosCache = [];
let configCache = null;
let receitaPadraoCache = [];

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
    [ingredientesCache, tamanhosCache, configCache, receitaPadraoCache] = await Promise.all([
      listIngredientes(), listTamanhos(), getConfig(), listReceitaPadrao(),
    ]);
  } catch (err) {
    showError(err, 'Não foi possível carregar dados para o formulário');
    return;
  }

  if (!tamanhosCache.length) {
    formPanel.innerHTML = `<div class="card"><div class="empty-action">Cadastre ao menos um tamanho em Ajustes antes de lançar uma fornada.</div></div>`;
    return;
  }
  if (!receitaPadraoCache.length) {
    formPanel.innerHTML = `<div class="card"><div class="empty-action">Cadastre a receita padrão em Ajustes (os ingredientes fixos da massa e da calda) antes de lançar uma fornada.</div></div>`;
    return;
  }
  if (!configCache) {
    configCache = {
      tarifa_kwh: 0, potencia_forno_w: 0, tarifa_agua_m3: 0, preco_botijao: 0, peso_botijao_kg: 13, consumo_gas_kg_h: 0,
      tempo_forno_padrao_min: 0, tempo_fogao_padrao_min: 0, litros_agua_padrao: 0,
    };
  }

  const ingredientesById = new Map(ingredientesCache.map((i) => [i.id, i]));
  let sugestoesAtuais = { semSobra: [], comSobra: [] };

  formPanel.innerHTML = `
    <div class="card">
      <div class="card-title">Nova fornada</div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Data</label>
          <input type="date" id="f-data" value="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="form-group">
          <label class="form-label">Quantas receitas você fez?</label>
          <input type="number" id="f-num-receitas" min="1" step="1" value="1">
        </div>
        <div class="form-group">
          <label class="form-label">Tempo de forno (min)</label>
          <input type="number" id="f-tempo-forno" min="0" step="1" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Tempo de fogão (min)</label>
          <input type="number" id="f-tempo-fogao" min="0" step="1" value="0">
        </div>
        <div class="form-group">
          <label class="form-label">Água usada (L)</label>
          <input type="number" id="f-litros-agua" min="0" step="0.1" value="0">
        </div>
        <div class="form-group full">
          <label class="form-label">Observação</label>
          <input type="text" id="f-obs" placeholder="opcional">
        </div>
      </div>

      <div class="info-pills" id="receita-info-pills"></div>

      <div class="detail-section">
        <h4>Sugestões sem sobra</h4>
        <div id="sugestoes-sem-sobra"></div>
      </div>
      <div class="detail-section">
        <h4>Sugestões com sobra (melhor faturamento)</h4>
        <div id="sugestoes-com-sobra"></div>
      </div>

      <div class="detail-section">
        <h4>Produção confirmada</h4>
        <p style="font-size:12px;color:var(--text-2);margin-bottom:8px">Clique numa sugestão acima para preencher, ou ajuste manualmente.</p>
        <div id="producao-inputs"></div>
      </div>

      <div class="detail-section" id="preview-section"></div>

      <div class="form-actions" style="margin-top:20px">
        <button class="btn-primary" id="f-salvar">Salvar fornada</button>
        <button class="btn-ghost" id="f-cancelar" type="button">Cancelar</button>
      </div>
    </div>
  `;

  // pré-preenche tempo/água com o padrão × 1 receita
  formPanel.querySelector('#f-tempo-forno').value = configCache.tempo_forno_padrao_min || 0;
  formPanel.querySelector('#f-tempo-fogao').value = configCache.tempo_fogao_padrao_min || 0;
  formPanel.querySelector('#f-litros-agua').value = configCache.litros_agua_padrao || 0;

  const producaoInputsEl = formPanel.querySelector('#producao-inputs');
  producaoInputsEl.innerHTML = tamanhosCache.map((t) => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-light)">
      <span style="font-size:14px;font-weight:500">${escapeHtml(t.nome)}</span>
      <input type="number" class="prod-qtd" data-tamanho="${t.id}" min="0" step="1" value="0" style="width:80px;text-align:center">
    </div>
  `).join('');
  producaoInputsEl.querySelectorAll('.prod-qtd').forEach((el) => el.addEventListener('input', renderPreviewMargem));

  let numReceitasAnterior = null;
  function preencherTemposPadrao() {
    const n = Number(formPanel.querySelector('#f-num-receitas').value) || 1;
    // só reajusta automaticamente se o usuário ainda não mexeu manualmente
    // (evita sobrescrever um valor que ele já corrigiu à mão)
    if (numReceitasAnterior !== null) {
      const tForno = formPanel.querySelector('#f-tempo-forno');
      const tFogao = formPanel.querySelector('#f-tempo-fogao');
      const tAgua = formPanel.querySelector('#f-litros-agua');
      const eraAuto = Number(tForno.value) === (configCache.tempo_forno_padrao_min || 0) * numReceitasAnterior
        && Number(tFogao.value) === (configCache.tempo_fogao_padrao_min || 0) * numReceitasAnterior
        && Number(tAgua.value) === (configCache.litros_agua_padrao || 0) * numReceitasAnterior;
      if (eraAuto) {
        tForno.value = (configCache.tempo_forno_padrao_min || 0) * n;
        tFogao.value = (configCache.tempo_fogao_padrao_min || 0) * n;
        tAgua.value = (configCache.litros_agua_padrao || 0) * n;
      }
    }
    numReceitasAnterior = n;
  }

  function getReceitaEIndiretos() {
    const n = Math.max(1, Number(formPanel.querySelector('#f-num-receitas').value) || 1);
    const tempoForno = Number(formPanel.querySelector('#f-tempo-forno').value) || 0;
    const tempoFogao = Number(formPanel.querySelector('#f-tempo-fogao').value) || 0;
    const litrosAgua = Number(formPanel.querySelector('#f-litros-agua').value) || 0;
    const receita = calcularReceitaPadrao(receitaPadraoCache, ingredientesById, n);
    const indiretos = calcularIndiretos({ tempoFornoMin: tempoForno, tempoFogaoMin: tempoFogao, litrosAgua }, configCache);
    return { n, receita, indiretos };
  }

  function renderSugestaoCard(combo, groupId, idx) {
    const itensTxt = combo.itens.map((it) => `${it.quantidade}× ${escapeHtml(it.tamanho.nome)}`).join(' + ');
    const temSobra = combo.sobraMassa > 0.5 || combo.sobraCalda > 0.5;
    const sobraTxt = temSobra
      ? `<div class="margin-row"><span>Sobra</span><span>${fmtNumero(combo.sobraMassa, 0)}g massa, ${fmtNumero(combo.sobraCalda, 0)}g calda</span></div>`
      : '';
    return `
      <div class="margin-card positive sugestao-card" data-group="${groupId}" data-idx="${idx}" style="cursor:pointer">
        <div class="margin-head">
          <span class="margin-size">${itensTxt}</span>
          <span class="margin-detail">${combo.totalPudins} pudim${combo.totalPudins !== 1 ? 's' : ''}</span>
        </div>
        ${sobraTxt}
        <div class="margin-row"><span>Custo total</span><span>${fmtMoeda(combo.custoTotal)}</span></div>
        <div class="margin-result"><span>Faturamento</span><span class="pos">${fmtMoeda(combo.faturamento)} <small>(lucro ${fmtMoeda(combo.margem)})</small></span></div>
      </div>
    `;
  }

  function aplicarCombo(combo) {
    const qtdPorTamanho = new Map(combo.itens.map((it) => [it.tamanho_id, it.quantidade]));
    producaoInputsEl.querySelectorAll('.prod-qtd').forEach((el) => {
      el.value = qtdPorTamanho.get(el.dataset.tamanho) || 0;
    });
    renderPreviewMargem();
  }

  function renderSugestoes() {
    const { receita, indiretos } = getReceitaEIndiretos();
    const infoPills = formPanel.querySelector('#receita-info-pills');
    infoPills.innerHTML = `
      <span class="info-pill">Massa produzida: <strong>${fmtNumero(receita.massa.pesoTotal, 0)}g</strong></span>
      <span class="info-pill">Calda produzida: <strong>${fmtNumero(receita.calda.pesoTotal, 0)}g</strong></span>
      <span class="info-pill">Custo/g massa: <strong>${fmtMoeda(receita.massa.custoPorG)}</strong></span>
      <span class="info-pill">Custo/g calda: <strong>${fmtMoeda(receita.calda.custoPorG)}</strong></span>
      <span class="info-pill">Indiretos: <strong>${fmtMoeda(indiretos.total)}</strong></span>
    `;

    if (receita.massa.pesoTotal <= 0) {
      formPanel.querySelector('#sugestoes-sem-sobra').innerHTML = '<div class="empty-action">Informe quantas receitas para ver sugestões.</div>';
      formPanel.querySelector('#sugestoes-com-sobra').innerHTML = '';
      sugestoesAtuais = { semSobra: [], comSobra: [] };
      return;
    }

    sugestoesAtuais = gerarSugestoesProducao({
      pesoMassaTotal: receita.massa.pesoTotal,
      pesoCaldaTotal: receita.calda.pesoTotal,
      custoGMassa: receita.massa.custoPorG,
      custoGCalda: receita.calda.custoPorG,
      indiretoTotal: indiretos.total,
      tamanhos: tamanhosCache,
    });

    const semSobraEl = formPanel.querySelector('#sugestoes-sem-sobra');
    const comSobraEl = formPanel.querySelector('#sugestoes-com-sobra');

    semSobraEl.innerHTML = sugestoesAtuais.semSobra.length
      ? `<div class="margin-cards">${sugestoesAtuais.semSobra.map((c, i) => renderSugestaoCard(c, 'sem', i)).join('')}</div>`
      : '<div class="empty-action">Nenhuma combinação usa 100% da massa e calda com esses tamanhos. Veja as opções com sobra abaixo.</div>';

    comSobraEl.innerHTML = sugestoesAtuais.comSobra.length
      ? `<div class="margin-cards">${sugestoesAtuais.comSobra.map((c, i) => renderSugestaoCard(c, 'com', i)).join('')}</div>`
      : '<div class="empty-action">Nenhuma outra combinação encontrada.</div>';

    formPanel.querySelectorAll('.sugestao-card').forEach((cardEl) => {
      cardEl.addEventListener('click', () => {
        const grupo = cardEl.dataset.group === 'sem' ? sugestoesAtuais.semSobra : sugestoesAtuais.comSobra;
        const combo = grupo[Number(cardEl.dataset.idx)];
        if (combo) {
          formPanel.querySelectorAll('.sugestao-card').forEach((c) => c.style.outline = '');
          cardEl.style.outline = `2px solid var(--accent)`;
          aplicarCombo(combo);
        }
      });
    });
  }

  function renderPreviewMargem() {
    const { receita, indiretos } = getReceitaEIndiretos();
    const producao = [...producaoInputsEl.querySelectorAll('.prod-qtd')]
      .map((el) => ({ tamanho_id: el.dataset.tamanho, quantidade: Number(el.value) || 0 }))
      .filter((p) => p.quantidade > 0);

    const previewEl = formPanel.querySelector('#preview-section');
    if (!producao.length) {
      previewEl.innerHTML = '';
      return;
    }

    const tamanhosById = new Map(tamanhosCache.map((t) => [t.id, t]));
    const gramasProduzidas = calcularGramasProduzidas(producao, tamanhosById);
    const custoIndiretoG = gramasProduzidas > 0 ? indiretos.total / gramasProduzidas : 0;

    const cards = producao.map((p) => {
      const t = tamanhosById.get(p.tamanho_id);
      if (!t) return '';
      const custoEmbalagem = Number(t.custo_embalagem) || 0;
      const custoUnitario = calcularCustoTamanho({
        gramasMassa: Number(t.gramas_massa), gramasCalda: Number(t.gramas_calda),
        custoGMassa: receita.massa.custoPorG, custoGCalda: receita.calda.custoPorG, custoIndiretoG, custoEmbalagem,
      });
      const { margemReais, margemPct } = calcularMargem(Number(t.preco_venda), custoUnitario);
      const cls = margemReais >= 0 ? 'positive' : 'negative';
      const resultCls = margemReais >= 0 ? 'pos' : 'neg';
      return `
        <div class="margin-card ${cls}">
          <div class="margin-head">
            <span class="margin-size">${escapeHtml(t.nome)} <small style="color:var(--text-3);font-weight:400">×${p.quantidade}</small></span>
            <span class="margin-detail">${t.gramas_massa}g massa + ${t.gramas_calda}g calda</span>
          </div>
          <div class="margin-row"><span>Embalagem</span><span>${fmtMoeda(custoEmbalagem)}</span></div>
          <div class="margin-row"><span>Custo unitário</span><span>${fmtMoeda(custoUnitario)}</span></div>
          <div class="margin-row"><span>Preço de venda</span><span>${fmtMoeda(t.preco_venda)}</span></div>
          <div class="margin-result"><span>Margem</span><span class="${resultCls}">${fmtMoeda(margemReais)} <small>(${fmtNumero(margemPct, 1)}%)</small></span></div>
        </div>
      `;
    }).join('');

    previewEl.innerHTML = `<h4>Resumo da produção confirmada</h4><div class="margin-cards">${cards}</div>`;
  }

  function recompute() {
    preencherTemposPadrao();
    renderSugestoes();
    renderPreviewMargem();
  }

  formPanel.querySelector('#f-num-receitas').addEventListener('input', recompute);
  ['#f-tempo-forno', '#f-tempo-fogao', '#f-litros-agua'].forEach((sel) => {
    formPanel.querySelector(sel).addEventListener('input', () => { renderSugestoes(); renderPreviewMargem(); });
  });

  numReceitasAnterior = 1;
  renderSugestoes();

  formPanel.querySelector('#f-cancelar').addEventListener('click', () => {
    formPanel.classList.remove('show');
  });

  formPanel.querySelector('#f-salvar').addEventListener('click', async () => {
    const { n } = getReceitaEIndiretos();
    const producao = [...producaoInputsEl.querySelectorAll('.prod-qtd')]
      .map((el) => ({ tamanho_id: el.dataset.tamanho, quantidade: Number(el.value) || 0 }))
      .filter((p) => p.quantidade > 0);

    if (!producao.length) { showToast('Confirme a produção de ao menos um tamanho', 'error'); return; }

    const itens = receitaPadraoCache.map((r) => ({
      ingrediente_id: r.ingrediente_id,
      componente: r.componente,
      quantidade: Number(r.quantidade_g) * n,
      unidade_informada: 'g',
    }));

    const obsInput = formPanel.querySelector('#f-obs').value.trim();
    const receitaNota = `${n} receita${n > 1 ? 's' : ''}`;
    const observacao = obsInput ? `${obsInput} (${receitaNota})` : `(${receitaNota})`;

    const salvarBtn = formPanel.querySelector('#f-salvar');
    salvarBtn.disabled = true;
    try {
      await createFornadaCompleta({
        fornada: {
          data: formPanel.querySelector('#f-data').value,
          tempo_forno_min: Number(formPanel.querySelector('#f-tempo-forno').value) || 0,
          tempo_fogao_min: Number(formPanel.querySelector('#f-tempo-fogao').value) || 0,
          litros_agua: Number(formPanel.querySelector('#f-litros-agua').value) || 0,
          rendimento_calda_g: null,
          observacao,
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
