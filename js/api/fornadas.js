import { supabase } from '../supabaseClient.js';

export async function listFornadas() {
  const { data, error } = await supabase.from('fornadas').select('*').order('data', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getFornadaDetalhe(fornadaId) {
  const [itensRes, producaoRes, custosRes] = await Promise.all([
    supabase.from('vw_fornada_itens_custo').select('*').eq('fornada_id', fornadaId),
    supabase.from('vw_fornada_producao_detalhe').select('*').eq('fornada_id', fornadaId),
    supabase.from('vw_fornada_custos').select('*').eq('fornada_id', fornadaId).single(),
  ]);
  if (itensRes.error) throw itensRes.error;
  if (producaoRes.error) throw producaoRes.error;
  if (custosRes.error) throw custosRes.error;
  return { itens: itensRes.data, producao: producaoRes.data, custos: custosRes.data };
}

// { fornada: {...}, itens: [{ingrediente_id, componente, quantidade, unidade_informada}],
//   producao: [{tamanho_id, quantidade}] }
export async function createFornadaCompleta({ fornada, itens, producao }) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: fornadaRow, error: errFornada } = await supabase
    .from('fornadas')
    .insert({ ...fornada, user_id: user.id })
    .select()
    .single();
  if (errFornada) throw errFornada;

  try {
    if (itens.length) {
      const itensPayload = itens.map((i) => ({ ...i, user_id: user.id, fornada_id: fornadaRow.id }));
      const { error } = await supabase.from('fornada_itens').insert(itensPayload);
      if (error) throw error;
    }
    if (producao.length) {
      const producaoPayload = producao.map((p) => ({ ...p, user_id: user.id, fornada_id: fornadaRow.id }));
      const { error } = await supabase.from('fornada_producao').insert(producaoPayload);
      if (error) throw error;
    }
  } catch (err) {
    // limpa a fornada parcialmente criada para não deixar lixo órfão
    await supabase.from('fornadas').delete().eq('id', fornadaRow.id);
    throw err;
  }

  return fornadaRow;
}
