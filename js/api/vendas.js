import { supabase } from '../supabaseClient.js';

export async function listVendas(filter = 'all') {
  let query = supabase.from('vw_vendas_detalhe').select('*').order('data', { ascending: false });
  if (filter === 'paid') query = query.eq('pago', true);
  if (filter === 'pending') query = query.eq('pago', false);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createVenda(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('vendas').insert({ ...payload, user_id: user.id });
  if (error) throw error;
}

export async function marcarPago(id) {
  const hoje = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('vendas').update({ pago: true, data_pagamento: hoje }).eq('id', id);
  if (error) throw error;
}
