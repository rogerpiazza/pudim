import { listIngredientes, createIngrediente, deleteIngrediente } from '../api/ingredientes.js';
import { listTamanhos, createTamanho, deleteTamanho } from '../api/tamanhos.js';
import { getConfig, upsertConfig } from '../api/configCustos.js';
import { listReceitaPadrao, addReceitaPadraoItem, deleteReceitaPadraoItem } from '../api/receitaPadrao.js';
import { fmtMoeda, fmtNumero } from '../calc.js';
import { showToast, showError } from '../toast.js';

export async function renderAjustes(container) {
  container.innerHTML = `
    <div class="view-header"><h1>Ajustes</h1></div>

    <div class="config-section">
      <h2>Ingredientes</h2>
      <div id="ing-list"><div class="loading-state">Carregando…</div></div>
      <div class="form-panel" id="form-ing">
        <div class="card">
          <div class="form-grid">
            <div class="form-group full">
              <label class="form-label">Nome</label>
              <input type="text" id="ing-nome" placeholder="ex: Leite condensado">
            </div>
            <div class="form-group">
              <label class="form-label">Preço do pacote (R$)</label>
              <input type="number" id="ing-preco" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">Qtd. do pacote</label>
              <input type="number" id="ing-qtd" min="0" step="0.001">
            </div>
            <div class="form-group">
              <label class="form-label">Unidade</label>
              <select id="ing-unidade">
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="un">un</option>
              </select>
            </div>
            <div class="form-group" id="ing-peso-medio-group" style="display:none">
              <label class="form-label">Peso médio por unidade (g)</label>
              <input type="number" id="ing-peso-medio" min="0" step="0.1">
            </div>
            <div class="form-actions">
              <button class="btn-primary" id="ing-salvar">Salvar ingrediente</button>
              <button class="btn-ghost" id="ing-cancelar">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
      <button class="btn-primary btn-block" id="btn-novo-ing" style="margin-top:12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Novo ingrediente
      </button>
    </div>

    <div class="config-section">
      <h2>Receita padrão</h2>
      <p style="font-size:13px;color:var(--text-2);margin-bottom:12px">A receita fixa usada em toda fornada. Na tela de Fornadas você só informa quantas vezes fez essa receita, e o custo é multiplicado automaticamente.</p>
      <div id="receita-list"><div class="loading-state">Carregando…</div></div>
      <div class="form-panel" id="form-receita">
        <div class="card">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Ingrediente</label>
              <select id="receita-ingrediente"></select>
            </div>
            <div class="form-group">
              <label class="form-label">Componente</label>
              <select id="receita-componente">
                <option value="massa">Massa</option>
                <option value="calda">Calda</option>
              </select>
            </div>
            <div class="form-group full">
              <label class="form-label">Quantidade (g)</label>
              <input type="number" id="receita-qtd" min="0" step="0.1">
            </div>
            <div class="form-actions">
              <button class="btn-primary" id="receita-salvar">Adicionar à receita</button>
              <button class="btn-ghost" id="receita-cancelar">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
      <button class="btn-primary btn-block" id="btn-novo-receita" style="margin-top:12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Adicionar item à receita
      </button>
    </div>

    <div class="config-section">
      <h2>Tarifas e custos</h2>
      <div class="card">
        <div class="form-grid" id="tarifas-form">
          <div class="loading-state" style="grid-column:1/-1">Carregando…</div>
        </div>
      </div>
    </div>

    <div class="config-section">
      <h2>Tamanhos</h2>
      <div id="tam-list"><div class="loading-state">Carregando…</div></div>
      <div class="form-panel" id="form-tam">
        <div class="card">
          <div class="form-grid">
            <div class="form-group full">
              <label class="form-label">Nome</label>
              <input type="text" id="tam-nome" placeholder="ex: 150g">
            </div>
            <div class="form-group">
              <label class="form-label">Gramas de massa</label>
              <input type="number" id="tam-massa" min="0" step="1">
            </div>
            <div class="form-group">
              <label class="form-label">Gramas de calda</label>
              <input type="number" id="tam-calda" min="0" step="1">
            </div>
            <div class="form-group">
              <label class="form-label">Preço de venda (R$)</label>
              <input type="number" id="tam-preco" min="0" step="0.01">
            </div>
            <div class="form-group">
              <label class="form-label">Custo da embalagem (R$)</label>
              <input type="number" id="tam-embalagem" min="0" step="0.01" value="0">
            </div>
            <div class="form-actions">
              <button class="btn-primary" id="tam-salvar">Salvar tamanho</button>
              <button class="btn-ghost" id="tam-cancelar">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
      <button class="btn-primary btn-block" id="btn-novo-tam" style="margin-top:12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Novo tamanho
      </button>
    </div>
  `;

  setupIngredientesSection(container);
  setupReceitaPadraoSection(container);
  setupTarifasSection(container);
  setupTamanhosSection(container);
}

function setupIngredientesSection(container) {
  const formPanel = container.querySelector('#form-ing');
  const unidadeSel = container.querySelector('#ing-unidade');
  const pesoGroup = container.querySelector('#ing-peso-medio-group');

  unidadeSel.addEventListener('change', () => {
    pesoGroup.style.display = unidadeSel.value === 'un' ? 'flex' : 'none';
  });

  container.querySelector('#btn-novo-ing').addEventListener('click', () => formPanel.classList.toggle('show'));
  container.querySelector('#ing-cancelar').addEventListener('click', () => formPanel.classList.remove('show'));

  container.querySelector('#ing-salvar').addEventListener('click', async () => {
    const nome = container.querySelector('#ing-nome').value.trim();
    const preco = Number(container.querySelector('#ing-preco').value);
    const qtd = Number(container.querySelector('#ing-qtd').value);
    const unidade = unidadeSel.value;
    const pesoMedio = unidade === 'un' ? Number(container.querySelector('#ing-peso-medio').value) : null;

    if (!nome) { showToast('Informe o nome do ingrediente', 'error'); return; }
    if (!(preco >= 0)) { showToast('Preço inválido', 'error'); return; }
    if (!(qtd > 0)) { showToast('Quantidade do pacote deve ser maior que zero', 'error'); return; }
    if (unidade === 'un' && !(pesoMedio > 0)) { showToast('Informe o peso médio por unidade', 'error'); return; }

    try {
      await createIngrediente({ nome, preco_pacote: preco, qtd_pacote: qtd, unidade, peso_medio_un: pesoMedio });
      showToast('Ingrediente salvo');
      formPanel.classList.remove('show');
      container.querySelector('#ing-nome').value = '';
      container.querySelector('#ing-preco').value = '';
      container.querySelector('#ing-qtd').value = '';
      container.querySelector('#ing-peso-medio').value = '';
      await loadIngredientes(container);
    } catch (err) {
      showError(err, 'Não foi possível salvar o ingrediente');
    }
  });

  loadIngredientes(container);
}

async function loadIngredientes(container) {
  const listEl = container.querySelector('#ing-list');
  listEl.innerHTML = '<div class="loading-state">Carregando…</div>';
  try {
    const ingredientes = await listIngredientes();
    if (!ingredientes.length) {
      listEl.innerHTML = '<div class="empty-action">Nenhum ingrediente cadastrado ainda.</div>';
      return;
    }
    listEl.innerHTML = ingredientes.map((i) => {
      const detalhe = i.unidade === 'un'
        ? `${fmtMoeda(i.preco_pacote)} / un · peso méd. ${i.peso_medio_un}g`
        : `${fmtMoeda(i.preco_pacote)} / ${i.qtd_pacote}${i.unidade}`;
      return `
        <div class="ing-card" data-id="${i.id}">
          <div class="ing-card-info">
            <div class="ing-card-name">${escapeHtml(i.nome)}</div>
            <div class="ing-card-detail">${detalhe}</div>
          </div>
          <div class="ing-card-cost">
            <div class="cost-val">${fmtMoeda(i.custo_por_g)}</div>
            <div class="cost-unit">por grama</div>
          </div>
          <div class="ing-card-actions">
            <button class="icon-btn ing-del" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.ing-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.ing-card');
        try {
          await deleteIngrediente(card.dataset.id);
          showToast('Ingrediente removido');
          await loadIngredientes(container);
        } catch (err) {
          showError(err, 'Não foi possível remover — verifique se ele não está sendo usado numa fornada');
        }
      });
    });
  } catch (err) {
    showError(err, 'Não foi possível carregar ingredientes');
    listEl.innerHTML = '<div class="empty-action">Erro ao carregar.</div>';
  }
}

async function setupReceitaPadraoSection(container) {
  const formPanel = container.querySelector('#form-receita');
  const ingSelect = container.querySelector('#receita-ingrediente');

  container.querySelector('#btn-novo-receita').addEventListener('click', async () => {
    const opening = !formPanel.classList.contains('show');
    formPanel.classList.toggle('show');
    if (opening) {
      try {
        const ingredientes = await listIngredientes();
        ingSelect.innerHTML = ingredientes.map((i) => `<option value="${i.id}">${escapeHtml(i.nome)}</option>`).join('');
      } catch (err) {
        showError(err, 'Não foi possível carregar ingredientes');
      }
    }
  });
  container.querySelector('#receita-cancelar').addEventListener('click', () => formPanel.classList.remove('show'));

  container.querySelector('#receita-salvar').addEventListener('click', async () => {
    const ingredienteId = ingSelect.value;
    const componente = container.querySelector('#receita-componente').value;
    const qtd = Number(container.querySelector('#receita-qtd').value);

    if (!ingredienteId) { showToast('Cadastre um ingrediente primeiro', 'error'); return; }
    if (!(qtd > 0)) { showToast('Quantidade deve ser maior que zero', 'error'); return; }

    try {
      await addReceitaPadraoItem({ ingrediente_id: ingredienteId, componente, quantidade_g: qtd });
      showToast('Item adicionado à receita');
      formPanel.classList.remove('show');
      container.querySelector('#receita-qtd').value = '';
      await loadReceitaPadrao(container);
    } catch (err) {
      showError(err, 'Não foi possível adicionar o item');
    }
  });

  loadReceitaPadrao(container);
}

async function loadReceitaPadrao(container) {
  const listEl = container.querySelector('#receita-list');
  listEl.innerHTML = '<div class="loading-state">Carregando…</div>';
  try {
    const itens = await listReceitaPadrao();
    if (!itens.length) {
      listEl.innerHTML = '<div class="empty-action">Nenhum item cadastrado. Adicione os ingredientes fixos da massa e da calda.</div>';
      return;
    }
    const massa = itens.filter((i) => i.componente === 'massa');
    const calda = itens.filter((i) => i.componente === 'calda');
    const totalMassa = massa.reduce((s, i) => s + Number(i.quantidade_g), 0);
    const totalCalda = calda.reduce((s, i) => s + Number(i.quantidade_g), 0);

    function itemRow(i) {
      return `
        <div class="ing-card" data-id="${i.id}">
          <div class="ing-card-info">
            <div class="ing-card-name">${escapeHtml(i.ingrediente_nome)}</div>
            <div class="ing-card-detail">${fmtNumero(i.quantidade_g, 0)}g &middot; ${fmtMoeda(i.custo_item)}</div>
          </div>
          <div class="ing-card-actions">
            <button class="icon-btn receita-del" title="Remover">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      `;
    }

    listEl.innerHTML = `
      <div class="detail-section" style="margin-top:0">
        <h4>Massa (${fmtNumero(totalMassa, 0)}g por receita)</h4>
        ${massa.map(itemRow).join('') || '<div class="empty-action">Nenhum item.</div>'}
      </div>
      <div class="detail-section">
        <h4>Calda (${fmtNumero(totalCalda, 0)}g por receita)</h4>
        ${calda.map(itemRow).join('') || '<div class="empty-action">Nenhum item.</div>'}
      </div>
    `;

    listEl.querySelectorAll('.receita-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.ing-card');
        try {
          await deleteReceitaPadraoItem(card.dataset.id);
          showToast('Item removido');
          await loadReceitaPadrao(container);
        } catch (err) {
          showError(err, 'Não foi possível remover o item');
        }
      });
    });
  } catch (err) {
    showError(err, 'Não foi possível carregar a receita padrão');
    listEl.innerHTML = '<div class="empty-action">Erro ao carregar.</div>';
  }
}

async function setupTarifasSection(container) {
  const formEl = container.querySelector('#tarifas-form');
  try {
    const config = await getConfig() || {
      tarifa_kwh: 0, potencia_forno_w: 0, tarifa_agua_m3: 0, litros_por_lavagem: 0,
      preco_botijao: 0, peso_botijao_kg: 13, consumo_gas_kg_h: 0,
      tempo_forno_padrao_min: 0, tempo_fogao_padrao_min: 0, litros_agua_padrao: 0,
    };
    formEl.innerHTML = `
      <div class="form-group">
        <label class="form-label">Tarifa kWh (R$)</label>
        <input type="number" id="cfg-kwh" min="0" step="0.0001" value="${config.tarifa_kwh}">
      </div>
      <div class="form-group">
        <label class="form-label">Potência forno (W)</label>
        <input type="number" id="cfg-potencia" min="0" step="1" value="${config.potencia_forno_w}">
      </div>
      <div class="form-group">
        <label class="form-label">Tarifa água/m³ (R$)</label>
        <input type="number" id="cfg-agua" min="0" step="0.01" value="${config.tarifa_agua_m3}">
      </div>
      <div class="form-group">
        <label class="form-label">Litros por lavagem</label>
        <input type="number" id="cfg-litros" min="0" step="0.1" value="${config.litros_por_lavagem}">
      </div>
      <div class="form-group">
        <label class="form-label">Preço botijão (R$)</label>
        <input type="number" id="cfg-botijao" min="0" step="0.01" value="${config.preco_botijao}">
      </div>
      <div class="form-group">
        <label class="form-label">Peso botijão (kg)</label>
        <input type="number" id="cfg-peso-botijao" min="0.1" step="0.1" value="${config.peso_botijao_kg}">
      </div>
      <div class="form-group full">
        <label class="form-label">Consumo gás (kg/h)</label>
        <input type="number" id="cfg-consumo-gas" min="0" step="0.001" value="${config.consumo_gas_kg_h}">
      </div>
      <div class="form-group full" style="border-top:1px solid var(--border-light);padding-top:12px;margin-top:4px">
        <label class="form-label" style="font-weight:600">Tempo padrão por 1 receita (pré-preenche a Nova Fornada)</label>
      </div>
      <div class="form-group">
        <label class="form-label">Forno (min)</label>
        <input type="number" id="cfg-tempo-forno-padrao" min="0" step="1" value="${config.tempo_forno_padrao_min}">
      </div>
      <div class="form-group">
        <label class="form-label">Fogão (min)</label>
        <input type="number" id="cfg-tempo-fogao-padrao" min="0" step="1" value="${config.tempo_fogao_padrao_min}">
      </div>
      <div class="form-group full">
        <label class="form-label">Água (L)</label>
        <input type="number" id="cfg-litros-agua-padrao" min="0" step="0.1" value="${config.litros_agua_padrao}">
      </div>
      <div class="form-group full">
        <button class="btn-primary btn-block" id="cfg-salvar">Salvar tarifas</button>
      </div>
    `;

    formEl.querySelector('#cfg-salvar').addEventListener('click', async () => {
      const payload = {
        tarifa_kwh: Number(formEl.querySelector('#cfg-kwh').value) || 0,
        potencia_forno_w: Number(formEl.querySelector('#cfg-potencia').value) || 0,
        tarifa_agua_m3: Number(formEl.querySelector('#cfg-agua').value) || 0,
        litros_por_lavagem: Number(formEl.querySelector('#cfg-litros').value) || 0,
        preco_botijao: Number(formEl.querySelector('#cfg-botijao').value) || 0,
        peso_botijao_kg: Number(formEl.querySelector('#cfg-peso-botijao').value) || 13,
        consumo_gas_kg_h: Number(formEl.querySelector('#cfg-consumo-gas').value) || 0,
        tempo_forno_padrao_min: Number(formEl.querySelector('#cfg-tempo-forno-padrao').value) || 0,
        tempo_fogao_padrao_min: Number(formEl.querySelector('#cfg-tempo-fogao-padrao').value) || 0,
        litros_agua_padrao: Number(formEl.querySelector('#cfg-litros-agua-padrao').value) || 0,
      };
      try {
        await upsertConfig(payload);
        showToast('Tarifas salvas com sucesso');
      } catch (err) {
        showError(err, 'Não foi possível salvar as tarifas');
      }
    });
  } catch (err) {
    showError(err, 'Não foi possível carregar as tarifas');
    formEl.innerHTML = '<div class="empty-action" style="grid-column:1/-1">Erro ao carregar.</div>';
  }
}

function setupTamanhosSection(container) {
  const formPanel = container.querySelector('#form-tam');
  container.querySelector('#btn-novo-tam').addEventListener('click', () => formPanel.classList.toggle('show'));
  container.querySelector('#tam-cancelar').addEventListener('click', () => formPanel.classList.remove('show'));

  container.querySelector('#tam-salvar').addEventListener('click', async () => {
    const nome = container.querySelector('#tam-nome').value.trim();
    const massa = Number(container.querySelector('#tam-massa').value);
    const calda = Number(container.querySelector('#tam-calda').value);
    const preco = Number(container.querySelector('#tam-preco').value);
    const embalagem = Number(container.querySelector('#tam-embalagem').value) || 0;

    if (!nome) { showToast('Informe o nome do tamanho', 'error'); return; }
    if (!(massa > 0)) { showToast('Gramas de massa deve ser maior que zero', 'error'); return; }
    if (!(calda > 0)) { showToast('Gramas de calda deve ser maior que zero', 'error'); return; }
    if (!(preco >= 0)) { showToast('Preço de venda inválido', 'error'); return; }
    if (!(embalagem >= 0)) { showToast('Custo da embalagem inválido', 'error'); return; }

    try {
      await createTamanho({ nome, gramas_massa: massa, gramas_calda: calda, preco_venda: preco, custo_embalagem: embalagem });
      showToast('Tamanho salvo');
      formPanel.classList.remove('show');
      container.querySelector('#tam-nome').value = '';
      container.querySelector('#tam-massa').value = '';
      container.querySelector('#tam-calda').value = '';
      container.querySelector('#tam-preco').value = '';
      container.querySelector('#tam-embalagem').value = '0';
      await loadTamanhos(container);
    } catch (err) {
      showError(err, 'Não foi possível salvar o tamanho');
    }
  });

  loadTamanhos(container);
}

async function loadTamanhos(container) {
  const listEl = container.querySelector('#tam-list');
  listEl.innerHTML = '<div class="loading-state">Carregando…</div>';
  try {
    const tamanhos = await listTamanhos();
    if (!tamanhos.length) {
      listEl.innerHTML = '<div class="empty-action">Nenhum tamanho cadastrado ainda.</div>';
      return;
    }
    listEl.innerHTML = tamanhos.map((t) => `
      <div class="size-card" data-id="${t.id}">
        <div>
          <div class="size-name">${escapeHtml(t.nome)}</div>
          <div class="size-weights">${t.gramas_massa}g massa + ${t.gramas_calda}g calda &middot; embalagem ${fmtMoeda(t.custo_embalagem)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="size-price">${fmtMoeda(t.preco_venda)}</div>
          <button class="icon-btn tam-del" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.tam-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.size-card');
        try {
          await deleteTamanho(card.dataset.id);
          showToast('Tamanho removido');
          await loadTamanhos(container);
        } catch (err) {
          showError(err, 'Não foi possível remover — verifique se ele não está sendo usado numa fornada/venda');
        }
      });
    });
  } catch (err) {
    showError(err, 'Não foi possível carregar tamanhos');
    listEl.innerHTML = '<div class="empty-action">Erro ao carregar.</div>';
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
