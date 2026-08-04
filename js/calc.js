// Funções puras de cálculo — espelham exatamente a lógica das views do
// banco (supabase/schema.sql), usadas aqui só para dar uma prévia instantânea
// no formulário de "Nova Fornada" antes de salvar. A fonte da verdade
// definitiva é sempre o banco.

export function custoPorGrama(ingrediente) {
  const { preco_pacote, qtd_pacote, unidade, peso_medio_un } = ingrediente;
  if (unidade === 'un') {
    return preco_pacote / (qtd_pacote * peso_medio_un);
  }
  return preco_pacote / qtd_pacote;
}

export function quantidadeEmGramas(item, ingrediente) {
  if (item.unidade_informada === 'un') {
    return item.quantidade * ingrediente.peso_medio_un;
  }
  return item.quantidade;
}

export function custoItem(item, ingrediente) {
  return quantidadeEmGramas(item, ingrediente) * custoPorGrama(ingrediente);
}

// itens: [{ ingrediente_id, componente, quantidade, unidade_informada }]
// ingredientesById: Map(id -> ingrediente)
export function calcularComponente(itens, ingredientesById, componente, rendimentoOverride) {
  const doComponente = itens.filter((i) => i.componente === componente);
  let custoTotal = 0;
  let pesoTotal = 0;
  for (const item of doComponente) {
    const ing = ingredientesById.get(item.ingrediente_id);
    if (!ing) continue;
    custoTotal += custoItem(item, ing);
    pesoTotal += quantidadeEmGramas(item, ing);
  }
  const peso = rendimentoOverride && rendimentoOverride > 0 ? rendimentoOverride : pesoTotal;
  const custoPorG = peso > 0 ? custoTotal / peso : 0;
  return { custoTotal, pesoTotal: peso, custoPorG };
}

export function calcularIndiretos({ tempoFornoMin, tempoFogaoMin, litrosAgua }, config) {
  const energia = ((config.potencia_forno_w || 0) / 1000) * ((tempoFornoMin || 0) / 60) * (config.tarifa_kwh || 0);
  const gas = (config.consumo_gas_kg_h || 0) * ((tempoFogaoMin || 0) / 60) * ((config.preco_botijao || 0) / (config.peso_botijao_kg || 1));
  const agua = ((litrosAgua || 0) / 1000) * (config.tarifa_agua_m3 || 0);
  return { energia, gas, agua, total: energia + gas + agua };
}

// producao: [{ tamanho_id, quantidade }], tamanhosById: Map(id -> tamanho)
export function calcularGramasProduzidas(producao, tamanhosById) {
  let total = 0;
  for (const p of producao) {
    const t = tamanhosById.get(p.tamanho_id);
    if (!t) continue;
    total += (Number(t.gramas_massa) + Number(t.gramas_calda)) * Number(p.quantidade);
  }
  return total;
}

export function calcularCustoTamanho({ gramasMassa, gramasCalda, custoGMassa, custoGCalda, custoIndiretoG, custoEmbalagem = 0 }) {
  return (gramasMassa * custoGMassa) + (gramasCalda * custoGCalda) + ((gramasMassa + gramasCalda) * custoIndiretoG) + Number(custoEmbalagem || 0);
}

export function calcularMargem(precoVenda, custoUnitario) {
  const margemReais = precoVenda - custoUnitario;
  const margemPct = precoVenda > 0 ? (margemReais / precoVenda) * 100 : 0;
  return { margemReais, margemPct };
}

// itensReceita: [{ ingrediente_id, componente, quantidade_g }] (a receita padrão)
// ingredientesById: Map(id -> ingrediente), numReceitas: quantas vezes multiplicar
export function calcularReceitaPadrao(itensReceita, ingredientesById, numReceitas) {
  function doComponente(componente) {
    let custoTotal = 0, pesoTotal = 0;
    for (const item of itensReceita) {
      if (item.componente !== componente) continue;
      const ing = ingredientesById.get(item.ingrediente_id);
      if (!ing) continue;
      const peso = Number(item.quantidade_g) * numReceitas;
      pesoTotal += peso;
      custoTotal += peso * custoPorGrama(ing);
    }
    return { custoTotal, pesoTotal, custoPorG: pesoTotal > 0 ? custoTotal / pesoTotal : 0 };
  }
  return { massa: doComponente('massa'), calda: doComponente('calda') };
}

const MAX_COMBINACOES_EXPLORADAS = 20000;

// Gera combinações viáveis de produção (quantos pudins de cada tamanho) que
// cabem dentro da massa/calda disponível, e calcula faturamento/custo/margem
// de cada uma. Retorna duas listas: sem sobra (usa tudo) e com sobra (mais
// faturamento, mesmo com resto de massa/calda).
export function gerarSugestoesProducao({ pesoMassaTotal, pesoCaldaTotal, custoGMassa, custoGCalda, indiretoTotal, tamanhos }) {
  const ordenados = [...tamanhos].sort((a, b) => Number(b.gramas_massa) - Number(a.gramas_massa));
  const combos = [];
  let contador = 0;

  function recurse(idx, massaRestante, caldaRestante, atual) {
    if (contador > MAX_COMBINACOES_EXPLORADAS) return;
    if (idx === ordenados.length) {
      if (atual.some((a) => a.quantidade > 0)) combos.push(atual);
      return;
    }
    const t = ordenados[idx];
    const massaOk = Number(t.gramas_massa) > 0 ? Math.floor(massaRestante / Number(t.gramas_massa)) : Infinity;
    const caldaOk = Number(t.gramas_calda) > 0 ? Math.floor(caldaRestante / Number(t.gramas_calda)) : Infinity;
    const maxQtd = Math.max(0, Math.min(massaOk, caldaOk));
    for (let q = 0; q <= maxQtd; q++) {
      contador++;
      if (contador > MAX_COMBINACOES_EXPLORADAS) break;
      recurse(
        idx + 1,
        massaRestante - q * Number(t.gramas_massa),
        caldaRestante - q * Number(t.gramas_calda),
        [...atual, { tamanho: t, quantidade: q }],
      );
    }
  }

  recurse(0, pesoMassaTotal, pesoCaldaTotal, []);

  const avaliados = combos.map((combo) => {
    const massaUsada = combo.reduce((s, c) => s + c.quantidade * Number(c.tamanho.gramas_massa), 0);
    const caldaUsada = combo.reduce((s, c) => s + c.quantidade * Number(c.tamanho.gramas_calda), 0);
    const gramasProduzidas = massaUsada + caldaUsada;
    const custoIndiretoG = gramasProduzidas > 0 ? indiretoTotal / gramasProduzidas : 0;

    let faturamento = 0, custoTotal = 0;
    combo.forEach((c) => {
      const custoUnit = calcularCustoTamanho({
        gramasMassa: Number(c.tamanho.gramas_massa),
        gramasCalda: Number(c.tamanho.gramas_calda),
        custoGMassa, custoGCalda, custoIndiretoG,
        custoEmbalagem: Number(c.tamanho.custo_embalagem) || 0,
      });
      faturamento += c.quantidade * Number(c.tamanho.preco_venda);
      custoTotal += c.quantidade * custoUnit;
    });

    return {
      itens: combo.filter((c) => c.quantidade > 0).map((c) => ({ tamanho_id: c.tamanho.id, tamanho: c.tamanho, quantidade: c.quantidade })),
      massaUsada, caldaUsada,
      sobraMassa: pesoMassaTotal - massaUsada,
      sobraCalda: pesoCaldaTotal - caldaUsada,
      totalPudins: combo.reduce((s, c) => s + c.quantidade, 0),
      faturamento, custoTotal,
      margem: faturamento - custoTotal,
    };
  });

  const semSobra = avaliados
    .filter((c) => c.sobraMassa < 0.01 && c.sobraCalda < 0.01)
    .sort((a, b) => b.faturamento - a.faturamento)
    .slice(0, 5);

  const comSobra = avaliados
    .filter((c) => c.sobraMassa >= 0.01 || c.sobraCalda >= 0.01)
    .sort((a, b) => b.faturamento - a.faturamento)
    .slice(0, 5);

  return { semSobra, comSobra, truncado: contador > MAX_COMBINACOES_EXPLORADAS };
}

export function fmtMoeda(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtNumero(n, casas = 2) {
  return (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
