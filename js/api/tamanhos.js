import { supabase } from '../supabaseClient.js';

export async function listTamanhos() {
  const { data, error } = await supabase.from('tamanhos').select('*').order('gramas_massa');
  if (error) throw error;
  return data;
}

export async function createTamanho(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('tamanhos').insert({ ...payload, user_id: user.id });
  if (error) throw error;
}

export async function updateTamanho(id, payload) {
  const { error } = await supabase.from('tamanhos').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteTamanho(id) {
  const { error } = await supabase.from('tamanhos').delete().eq('id', id);
  if (error) throw error;
}
