import { supabase } from '../supabaseClient.js';

export async function getConfig() {
  const { data, error } = await supabase.from('config_custos').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertConfig(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('config_custos').upsert({ ...payload, user_id: user.id });
  if (error) throw error;
}
