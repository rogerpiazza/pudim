import { listIngredientes, createIngrediente, updateIngrediente, deleteIngrediente } from '../api/ingredientes.js';
import { listTamanhos, createTamanho, updateTamanho, deleteTamanho } from '../api/tamanhos.js';
import { getConfig, upsertConfig } from '../api/configCustos.js';
import { listReceitaPadrao, addReceitaPadraoItem, updateReceitaPadraoItem, deleteReceitaPadraoItem } from '../api/receitaPadrao.js';
import { listClientes, createCliente, updateCliente, deleteCliente } from '../api/clientes.js';
import { fmtMoeda, fmtNumero } from '../calc.js';
import { showToast, showError } from '../toast.js';
import { confirmDialog } from '../confirmModal.js';
import { PENCIL_ICON, TRASH_ICON } from '../icons.js';

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

    <div class="config-section">
      <h2>Clientes</h2>
      <p style="font-size:13px;color:var(--text-2);margin-bottom:12px">Você também pode cadastrar um cliente novo direto na tela de Vendas — aqui é só pra editar ou excluir depois.</p>
      <div id="cli-list"><div class="loading-state">Carregando…</div></div>
      <div class="form-panel" id="form-cli">
        <div class="card">
          <div class="form-grid">
            <div class="form-group full">
              <label class="form-label">Nome</label>
              <input type="text" id="cli-nome" placeholder="Nome do cliente">
            </div>
            <div class="form-group full">
              <label class="form-label">Telefone (opcional)</label>
              <input type="text" id="cli-telefone" placeholder="(11) 99999-0000">
            </div>
            <div class="form-actions">
              <button class="btn-primary" id="cli-salvar">Salvar cliente</button>
              <button class="btn-ghost" id="cli-cancelar">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
      <button class="btn-primary btn-block" id="btn-novo-cli" style="margin-top:12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Novo cliente
      </button>
    </div>
  `;

  setupIngredientesSection(container);
  setupReceitaPadraoSection(container);
  setupTarifasSection(container);
  setupTamanhosSection(container);
  setupClientesSection(container);
}

function setupIngredientesSection(container) {
  const formPanel = container.querySelector('#form-ing');
  const unidadeSel = container.querySelector('#ing-unidade');
  const pesoGroup = container.querySelector('#ing-peso-medio-group');
  const nomeEl = container.querySelector('#ing-nome');
  const precoEl = container.querySelector('#ing-preco');
  const qtdEl = container.querySelector('#ing-qtd');
  const pesoMedioEl = container.querySelector('#ing-peso-medio');
  const salvarBtn = container.querySelector('#ing-salvar');
  let editingId = null;

  unidadeSel.addEventListener('change', () => {
    pesoGroup.style.display = unidadeSel.value === 'un' ? 'flex' : 'none';
  });

  function resetForm() {
    editingId = null;
    nomeEl.value = '';
    precoEl.value = '';
    qtdEl.value = '';
    unidadeSel.value = 'g';
    pesoGroup.style.display = 'none';
    pesoMedioEl.value = '';
    salvarBtn.textContent = 'Salvar ingrediente';
  }

  function preencherForm(ing) {
    editingId = ing.id;
    nomeEl.value = ing.nome;
    precoEl.value = ing.preco_pacote;
    qtdEl.value = ing.qtd_pacote;
    unidadeSel.value = ing.unidade;
    pesoGroup.style.display = ing.unidade === 'un' ? 'flex' : 'none';
    pesoMedioEl.value = ing.peso_medio_un || '';
    salvarBtn.textContent = 'Salvar alterações';
  }

  container.querySelector('#btn-novo-ing').addEventListener('click', () => {
    const opening = !formPanel.classList.contains('show');
    if (opening) resetForm();
    formPanel.classList.toggle('show');
  });
  container.querySelector('#ing-cancelar').addEventListener('click', () => {
    formPanel.classList.remove('show');
    resetForm();
  });

  salvarBtn.addEventListener('click', async () => {
    const nome = nomeEl.value.trim();
    const preco = Number(precoEl.value);
    const qtd = Number(qtdEl.value);
    const unidade = unidadeSel.value;
    const pesoMedio = unidade === 'un' ? Number(pesoMedioEl.value) : null;

    if (!nome) { showToast('Informe o nome do ingrediente', 'error'); return; }
    if (!(preco >= 0)) { showToast('Preço inválido', 'error'); return; }
    if (!(qtd > 0)) { showToast('Quantidade do pacote deve ser maior que zero', 'error'); return; }
    if (unidade === 'un' && !(pesoMedio > 0)) { showToast('Informe o peso médio por unidade', 'error'); return; }

    const payload = { nome, preco_pacote: preco, qtd_pacote: qtd, unidade, peso_medio_un: pesoMedio };
    try {
      if (editingId) {
        await updateIngrediente(editingId, payload);
        showToast('Ingrediente atualizado');
      } else {
        await createIngrediente(payload);
        showToast('Ingrediente salvo');
      }
      formPanel.classList.remove('show');
      resetForm();
      await loadList();
    } catch (err) {
      showError(err, 'Não foi possível salvar o ingrediente');
    }
  });

  async function loadList() {
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
              <button class="icon-btn ing-edit" title="Editar">${PENCIL_ICON}</button>
              <button class="icon-btn ing-del" title="Excluir">${TRASH_ICON}</button>
            </div>
          </div>
        `;
      }).join('');

      ingredientes.forEach((i) => {
        const card = listEl.querySelector(`.ing-card[data-id="${i.id}"]`);
        card.querySelector('.ing-edit').addEventListener('click', () => {
          preencherForm(i);
          formPanel.classList.add('show');
        });
        card.querySelector('.ing-del').addEventListener('click', async () => {
          const ok = await confirmDialog({ message: `Excluir o ingrediente "${i.nome}"? Essa ação não pode ser desfeita.` });
          if (!ok) return;
          try {
            await deleteIngrediente(i.id);
            showToast('Ingrediente removido');
            await loadList();
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

  loadList();
}

function setupReceitaPadraoSection(container) {
  const formPanel = container.querySelector('#form-receita');
  const ingSelect = container.querySelector('#receita-ingrediente');
  const componenteSel = container.querySelector('#receita-componente');
  const qtdEl = container.querySelector('#receita-qtd');
  const salvarBtn = container.querySelector('#receita-salvar');
  let editingId = null;

  async function popularIngredientes(selecionado) {
    const ingredientes = await listIngredientes();
    ingSelect.innerHTML = ingredientes.map((i) => `<option value="${i.id}">${escapeHtml(i.nome)}</option>`).join('');
    if (selecionado) ingSelect.value = selecionado;
  }

  function resetForm() {
    editingId = null;
    qtdEl.value = '';
    componenteSel.value = 'massa';
    salvarBtn.textContent = 'Adicionar à receita';
  }

  container.querySelector('#btn-novo-receita').addEventListener('click', async () => {
    const opening = !formPanel.classList.contains('show');
    formPanel.classList.toggle('show');
    if (opening) {
      resetForm();
      try {
        await popularIngredientes();
      } catch (err) {
        showError(err, 'Não foi possível carregar ingredientes');
      }
    }
  });
  container.querySelector('#receita-cancelar').addEventListener('click', () => {
    formPanel.classList.remove('show');
    resetForm();
  });

  salvarBtn.addEventListener('click', async () => {
    const ingredienteId = ingSelect.value;
    const componente = componenteSel.value;
    const qtd = Number(qtdEl.value);

    if (!ingredienteId) { showToast('Cadastre um ingrediente primeiro', 'error'); return; }
    if (!(qtd > 0)) { showToast('Quantidade deve ser maior que zero', 'error'); return; }

    const payload = { ingrediente_id: ingredienteId, componente, quantidade_g: qtd };
    try {
      if (editingId) {
        await updateReceitaPadraoItem(editingId, payload);
        showToast('Item atualizado');
      } else {
        await addReceitaPadraoItem(payload);
        showToast('Item adicionado à receita');
      }
      formPanel.classList.remove('show');
      resetForm();
      await loadList();
    } catch (err) {
      showError(err, 'Não foi possível salvar o item');
    }
  });

  async function loadList() {
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
              <button class="icon-btn receita-edit" title="Editar">${PENCIL_ICON}</button>
              <button class="icon-btn receita-del" title="Remover">${TRASH_ICON}</button>
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

      itens.forEach((i) => {
        const card = listEl.querySelector(`.ing-card[data-id="${i.id}"]`);
        card.querySelector('.receita-edit').addEventListener('click', async () => {
          editingId = i.id;
          try {
            await popularIngredientes(i.ingrediente_id);
          } catch (err) {
            showError(err, 'Não foi possível carregar ingredientes');
          }
          componenteSel.value = i.componente;
          qtdEl.value = i.quantidade_g;
          salvarBtn.textContent = 'Salvar alterações';
          formPanel.classList.add('show');
        });
        card.querySelector('.receita-del').addEventListener('click', async () => {
          const ok = await confirmDialog({ message: `Remover "${i.ingrediente_nome}" (${fmtNumero(i.quantidade_g, 0)}g) da receita padrão?` });
          if (!ok) return;
          try {
            await deleteReceitaPadraoItem(i.id);
            showToast('Item removido');
            await loadList();
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

  loadList();
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
  const nomeEl = container.querySelector('#tam-nome');
  const massaEl = container.querySelector('#tam-massa');
  const caldaEl = container.querySelector('#tam-calda');
  const precoEl = container.querySelector('#tam-preco');
  const embalagemEl = container.querySelector('#tam-embalagem');
  const salvarBtn = container.querySelector('#tam-salvar');
  let editingId = null;

  function resetForm() {
    editingId = null;
    nomeEl.value = '';
    massaEl.value = '';
    caldaEl.value = '';
    precoEl.value = '';
    embalagemEl.value = '0';
    salvarBtn.textContent = 'Salvar tamanho';
  }

  function preencherForm(t) {
    editingId = t.id;
    nomeEl.value = t.nome;
    massaEl.value = t.gramas_massa;
    caldaEl.value = t.gramas_calda;
    precoEl.value = t.preco_venda;
    embalagemEl.value = t.custo_embalagem;
    salvarBtn.textContent = 'Salvar alterações';
  }

  container.querySelector('#btn-novo-tam').addEventListener('click', () => {
    const opening = !formPanel.classList.contains('show');
    if (opening) resetForm();
    formPanel.classList.toggle('show');
  });
  container.querySelector('#tam-cancelar').addEventListener('click', () => {
    formPanel.classList.remove('show');
    resetForm();
  });

  salvarBtn.addEventListener('click', async () => {
    const nome = nomeEl.value.trim();
    const massa = Number(massaEl.value);
    const calda = Number(caldaEl.value);
    const preco = Number(precoEl.value);
    const embalagem = Number(embalagemEl.value) || 0;

    if (!nome) { showToast('Informe o nome do tamanho', 'error'); return; }
    if (!(massa > 0)) { showToast('Gramas de massa deve ser maior que zero', 'error'); return; }
    if (!(calda > 0)) { showToast('Gramas de calda deve ser maior que zero', 'error'); return; }
    if (!(preco >= 0)) { showToast('Preço de venda inválido', 'error'); return; }
    if (!(embalagem >= 0)) { showToast('Custo da embalagem inválido', 'error'); return; }

    const payload = { nome, gramas_massa: massa, gramas_calda: calda, preco_venda: preco, custo_embalagem: embalagem };
    try {
      if (editingId) {
        await updateTamanho(editingId, payload);
        showToast('Tamanho atualizado');
      } else {
        await createTamanho(payload);
        showToast('Tamanho salvo');
      }
      formPanel.classList.remove('show');
      resetForm();
      await loadList();
    } catch (err) {
      showError(err, 'Não foi possível salvar o tamanho');
    }
  });

  async function loadList() {
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
            <div class="card-actions-row">
              <button class="icon-btn tam-edit" title="Editar">${PENCIL_ICON}</button>
              <button class="icon-btn tam-del" title="Excluir">${TRASH_ICON}</button>
            </div>
          </div>
        </div>
      `).join('');

      tamanhos.forEach((t) => {
        const card = listEl.querySelector(`.size-card[data-id="${t.id}"]`);
        card.querySelector('.tam-edit').addEventListener('click', () => {
          preencherForm(t);
          formPanel.classList.add('show');
        });
        card.querySelector('.tam-del').addEventListener('click', async () => {
          const ok = await confirmDialog({ message: `Excluir o tamanho "${t.nome}"? Essa ação não pode ser desfeita.` });
          if (!ok) return;
          try {
            await deleteTamanho(t.id);
            showToast('Tamanho removido');
            await loadList();
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

  loadList();
}

function setupClientesSection(container) {
  const formPanel = container.querySelector('#form-cli');
  const nomeEl = container.querySelector('#cli-nome');
  const telEl = container.querySelector('#cli-telefone');
  const salvarBtn = container.querySelector('#cli-salvar');
  let editingId = null;

  function resetForm() {
    editingId = null;
    nomeEl.value = '';
    telEl.value = '';
    salvarBtn.textContent = 'Salvar cliente';
  }

  function preencherForm(c) {
    editingId = c.id;
    nomeEl.value = c.nome;
    telEl.value = c.telefone || '';
    salvarBtn.textContent = 'Salvar alterações';
  }

  container.querySelector('#btn-novo-cli').addEventListener('click', () => {
    const opening = !formPanel.classList.contains('show');
    if (opening) resetForm();
    formPanel.classList.toggle('show');
  });
  container.querySelector('#cli-cancelar').addEventListener('click', () => {
    formPanel.classList.remove('show');
    resetForm();
  });

  salvarBtn.addEventListener('click', async () => {
    const nome = nomeEl.value.trim();
    const telefone = telEl.value.trim() || null;
    if (!nome) { showToast('Informe o nome do cliente', 'error'); return; }

    try {
      if (editingId) {
        await updateCliente(editingId, { nome, telefone });
        showToast('Cliente atualizado');
      } else {
        await createCliente(nome, telefone);
        showToast('Cliente salvo');
      }
      formPanel.classList.remove('show');
      resetForm();
      await loadList();
    } catch (err) {
      showError(err, 'Não foi possível salvar o cliente');
    }
  });

  async function loadList() {
    const listEl = container.querySelector('#cli-list');
    listEl.innerHTML = '<div class="loading-state">Carregando…</div>';
    try {
      const clientes = await listClientes();
      if (!clientes.length) {
        listEl.innerHTML = '<div class="empty-action">Nenhum cliente cadastrado ainda.</div>';
        return;
      }
      listEl.innerHTML = clientes.map((c) => `
        <div class="ing-card" data-id="${c.id}">
          <div class="ing-card-info">
            <div class="ing-card-name">${escapeHtml(c.nome)}</div>
            <div class="ing-card-detail">${c.telefone ? escapeHtml(c.telefone) : 'Sem telefone'}</div>
          </div>
          <div class="ing-card-actions">
            <button class="icon-btn cli-edit" title="Editar">${PENCIL_ICON}</button>
            <button class="icon-btn cli-del" title="Excluir">${TRASH_ICON}</button>
          </div>
        </div>
      `).join('');

      clientes.forEach((c) => {
        const card = listEl.querySelector(`.ing-card[data-id="${c.id}"]`);
        card.querySelector('.cli-edit').addEventListener('click', () => {
          preencherForm(c);
          formPanel.classList.add('show');
        });
        card.querySelector('.cli-del').addEventListener('click', async () => {
          const ok = await confirmDialog({ message: `Excluir o cliente "${c.nome}"? Só é possível se ele não tiver vendas registradas.` });
          if (!ok) return;
          try {
            await deleteCliente(c.id);
            showToast('Cliente removido');
            await loadList();
          } catch (err) {
            showError(err, 'Não foi possível remover — este cliente já tem vendas registradas');
          }
        });
      });
    } catch (err) {
      showError(err, 'Não foi possível carregar clientes');
      listEl.innerHTML = '<div class="empty-action">Erro ao carregar.</div>';
    }
  }

  loadList();
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
