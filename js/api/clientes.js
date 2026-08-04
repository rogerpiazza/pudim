import { supabase } from '../supabaseClient.js';

export async function listClientes() {
  const { data, error } = await supabase.from('clientes').select('*').order('nome');
  if (error) throw error;
  return data;
}

export async function createCliente(nome, telefone = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('clientes')
    .insert({ nome, telefone, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCliente(id, payload) {
  const { error } = await supabase.from('clientes').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}
