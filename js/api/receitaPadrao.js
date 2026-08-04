import { supabase } from '../supabaseClient.js';

export async function listReceitaPadrao() {
  const { data, error } = await supabase.from('vw_receita_padrao_custo').select('*').order('componente');
  if (error) throw error;
  return data;
}

export async function addReceitaPadraoItem(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('receita_padrao_itens').insert({ ...payload, user_id: user.id });
  if (error) throw error;
}

export async function updateReceitaPadraoItem(id, payload) {
  const { error } = await supabase.from('receita_padrao_itens').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteReceitaPadraoItem(id) {
  const { error } = await supabase.from('receita_padrao_itens').delete().eq('id', id);
  if (error) throw error;
}
