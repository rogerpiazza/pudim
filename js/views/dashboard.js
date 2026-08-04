import { listVendas } from '../api/vendas.js';
import { supabase } from '../supabaseClient.js';
import { fmtMoeda } from '../calc.js';
import { barChart, donutChart, rankingChart } from '../charts.js';
import { showError } from '../toast.js';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
let currentPeriod = 'all';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="view-header">
      <div><div class="mobile-brand">Pudim</div><h1>Dashboard</h1></div>
      <div class="filter-row" id="period-filter">
        <button class="chip" data-period="month">Este mês</button>
        <button class="chip" data-period="3m">3 meses</button>
        <button class="chip active" data-period="all">Tudo</button>
      </div>
    </div>
    <div id="dash-body"><div class="loading-state">Carregando…</div></div>
  `;

  container.querySelectorAll('#period-filter .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#period-filter .chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      loadAndRenderBody(container.querySelector('#dash-body'));
    });
  });

  await loadAndRenderBody(container.querySelector('#dash-body'));
}

function filterByPeriod(vendas) {
  if (currentPeriod === 'all') return vendas;
  const now = new Date();
  const cutoff = new Date(now);
  if (currentPeriod === 'month') {
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);
  } else if (currentPeriod === '3m') {
    cutoff.setMonth(cutoff.getMonth() - 3);
  }
  return vendas.filter((v) => new Date(v.data + 'T00:00:00') >= cutoff);
}

async function loadAndRenderBody(body) {
  body.innerHTML = '<div class="loading-state">Carregando…</div>';
  try {
    const [allVendas, { data: producaoDetalhe, error: prodErr }] = await Promise.all([
      listVendas('all'),
      supabase.from('vw_fornada_producao_detalhe').select('tamanho_id, qtd_produzida, custo_unitario'),
    ]);
    if (prodErr) throw prodErr;

    // custo médio ponderado por tamanho, a partir do histórico de fornadas
    const custoPorTamanho = new Map();
    const acumulado = new Map();
    for (const p of producaoDetalhe || []) {
      const atual = acumulado.get(p.tamanho_id) || { custoTotal: 0, qtd: 0 };
      atual.custoTotal += Number(p.custo_unitario) * Number(p.qtd_produzida);
      atual.qtd += Number(p.qtd_produzida);
      acumulado.set(p.tamanho_id, atual);
    }
    for (const [tamanhoId, { custoTotal, qtd }] of acumulado) {
      custoPorTamanho.set(tamanhoId, qtd > 0 ? custoTotal / qtd : 0);
    }

    const vendas = filterByPeriod(allVendas);

    let faturamento = 0, custoTotal = 0, aReceber = 0, pudinsVendidos = 0;
    const porMes = new Map();
    const porTamanho = new Map();
    const porCliente = new Map();
    const devedores = new Map();

    for (const v of vendas) {
      const total = Number(v.quantidade) * Number(v.preco_unitario);
      faturamento += total;
      pudinsVendidos += Number(v.quantidade);
      const custoUnit = custoPorTamanho.get(v.tamanho_id) || 0;
      custoTotal += custoUnit * Number(v.quantidade);
      if (!v.pago) {
        aReceber += total;
        const d = devedores.get(v.cliente_id) || { nome: v.cliente_nome, total: 0, pedidos: 0 };
        d.total += total;
        d.pedidos += 1;
        devedores.set(v.cliente_id, d);
      }

      const dt = new Date(v.data + 'T00:00:00');
      const mesKey = `${dt.getFullYear()}-${dt.getMonth()}`;
      porMes.set(mesKey, (porMes.get(mesKey) || 0) + total);

      porTamanho.set(v.tamanho_nome, (porTamanho.get(v.tamanho_nome) || 0) + Number(v.quantidade));

      const c = porCliente.get(v.cliente_id) || { nome: v.cliente_nome, total: 0 };
      c.total += total;
      porCliente.set(v.cliente_id, c);
    }

    const lucro = faturamento - custoTotal;

    // últimos 6 meses (mesmo se período = "tudo", o gráfico mensal foca nos 6 mais recentes)
    const monthlyData = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyData.push({ label: MESES[d.getMonth()], value: porMes.get(key) || 0 });
    }

    const sizeColors = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)'];
    const sizeData = [...porTamanho.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value], i) => ({ label, value, color: sizeColors[i % sizeColors.length] }));

    const rankingData = [...porCliente.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((c) => ({ name: c.nome, value: c.total }));

    const devedoresArr = [...devedores.values()].sort((a, b) => b.total - a.total);

    body.innerHTML = `
      <div class="hero-fig">
        <span class="hero-label">Faturamento total</span>
        <span class="hero-value">${fmtMoeda(faturamento)}</span>
      </div>
      <div class="stat-grid">
        <div class="stat-tile"><span class="stat-label">Custo total</span><span class="stat-value">${fmtMoeda(custoTotal)}</span></div>
        <div class="stat-tile"><span class="stat-label">Lucro estimado</span><span class="stat-value ${lucro >= 0 ? 'clr-pos' : 'clr-neg'}">${fmtMoeda(lucro)}</span></div>
        <div class="stat-tile"><span class="stat-label">A receber</span><span class="stat-value ${aReceber > 0 ? 'clr-warn' : ''}">${fmtMoeda(aReceber)}</span></div>
        <div class="stat-tile"><span class="stat-label">Pudins vendidos</span><span class="stat-value">${pudinsVendidos}</span></div>
      </div>
      <div class="chart-grid">
        <div class="chart-card"><h3>Vendas por mês</h3><div>${barChart(monthlyData)}</div></div>
        <div class="chart-card"><h3>Vendas por tamanho</h3><div>${donutChart(sizeData, 'pudins')}</div></div>
      </div>
      <div class="card">
        <div class="card-title">Ranking de clientes</div>
        ${rankingChart(rankingData)}
      </div>
      <div class="card section-gap">
        <div class="card-title" style="color:var(--negative)">A receber</div>
        ${devedoresArr.length ? devedoresArr.map((d) => `
          <div class="debtor-item">
            <div>
              <div class="debtor-name">${escapeHtml(d.nome)}</div>
              <div class="debtor-detail">${d.pedidos} pedido${d.pedidos > 1 ? 's' : ''} pendente${d.pedidos > 1 ? 's' : ''}</div>
            </div>
            <div class="debtor-amount">${fmtMoeda(d.total)}</div>
          </div>
        `).join('') : '<div class="empty-action">Nenhum valor pendente. 🎉</div>'}
      </div>
    `;
  } catch (err) {
    showError(err, 'Não foi possível carregar o dashboard');
    body.innerHTML = '<div class="empty-action">Erro ao carregar dados.</div>';
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
