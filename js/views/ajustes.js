import { listIngredientes, createIngrediente, deleteIngrediente } from '../api/ingredientes.js';
import { listTamanhos, createTamanho, deleteTamanho } from '../api/tamanhos.js';
import { getConfig, upsertConfig } from '../api/configCustos.js';
import { fmtMoeda } from '../calc.js';
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
            <div class="form-group full">
              <label class="form-label">Preço de venda (R$)</label>
              <input type="number" id="tam-preco" min="0" step="0.01">
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

async function setupTarifasSection(container) {
  const formEl = container.querySelector('#tarifas-form');
  try {
    const config = await getConfig() || {
      tarifa_kwh: 0, potencia_forno_w: 0, tarifa_agua_m3: 0, litros_por_lavagem: 0,
      preco_botijao: 0, peso_botijao_kg: 13, consumo_gas_kg_h: 0,
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

    if (!nome) { showToast('Informe o nome do tamanho', 'error'); return; }
    if (!(massa > 0)) { showToast('Gramas de massa deve ser maior que zero', 'error'); return; }
    if (!(calda > 0)) { showToast('Gramas de calda deve ser maior que zero', 'error'); return; }
    if (!(preco >= 0)) { showToast('Preço de venda inválido', 'error'); return; }

    try {
      await createTamanho({ nome, gramas_massa: massa, gramas_calda: calda, preco_venda: preco });
      showToast('Tamanho salvo');
      formPanel.classList.remove('show');
      container.querySelector('#tam-nome').value = '';
      container.querySelector('#tam-massa').value = '';
      container.querySelector('#tam-calda').value = '';
      container.querySelector('#tam-preco').value = '';
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
          <div class="size-weights">${t.gramas_massa}g massa + ${t.gramas_calda}g calda</div>
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
