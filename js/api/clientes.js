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
