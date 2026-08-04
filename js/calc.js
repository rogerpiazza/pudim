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

export function fmtMoeda(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtNumero(n, casas = 2) {
  return (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
