import { supabase } from '../supabaseClient.js';

export async function listIngredientes() {
  const { data, error } = await supabase.from('vw_ingredientes_custo').select('*').order('nome');
  if (error) throw error;
  return data;
}

export async function createIngrediente(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('ingredientes').insert({ ...payload, user_id: user.id });
  if (error) throw error;
}

export async function updateIngrediente(id, payload) {
  const { error } = await supabase.from('ingredientes').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteIngrediente(id) {
  const { error } = await supabase.from('ingredientes').delete().eq('id', id);
  if (error) throw error;
}
