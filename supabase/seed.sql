-- ============================================================================
-- seed.sql — dados de teste para validar os cálculos
-- ============================================================================
-- Rode DEPOIS do schema.sql e DEPOIS de fazer login uma vez no app com sua
-- conta Google (isso cria seu usuário em auth.users).
--
-- 1. No painel do Supabase: Authentication > Users, copie o seu "User UID".
-- 2. Substitua TODAS as ocorrências de 'SEU_USER_ID_AQUI' abaixo por esse UID.
-- 3. Rode este arquivo inteiro no SQL Editor.
--
-- Os custos por grama dos ingredientes batem com a seção 4 do requisito
-- original; a receita e a fornada de exemplo já refletem a receita fixa
-- atual (só a gema do ovo, por peso, e calda sem desconto de rendimento):
--   Leite condensado: R$ 5,00 / 395g  -> 0,012658 R$/g
--   Leite:             R$ 6,00 / 1000g -> 0,006 R$/g
--   Ovo (gema):         R$ 0,65/un, 50g -> 0,013 R$/g
--   Açúcar:             R$ 4,00 / 1000g -> 0,004 R$/g
-- ============================================================================

-- ---- Config de custos (tarifas + tempo padrão por "1 receita") -------------
insert into public.config_custos
  (user_id, tarifa_kwh, potencia_forno_w, tarifa_agua_m3, litros_por_lavagem, preco_botijao, peso_botijao_kg, consumo_gas_kg_h,
   tempo_forno_padrao_min, tempo_fogao_padrao_min, litros_agua_padrao)
values
  ('SEU_USER_ID_AQUI', 0.85, 1500, 12.50, 15, 110.00, 13, 0.8, 60, 20, 5)
on conflict (user_id) do update set
  tarifa_kwh = excluded.tarifa_kwh,
  potencia_forno_w = excluded.potencia_forno_w,
  tarifa_agua_m3 = excluded.tarifa_agua_m3,
  litros_por_lavagem = excluded.litros_por_lavagem,
  preco_botijao = excluded.preco_botijao,
  peso_botijao_kg = excluded.peso_botijao_kg,
  consumo_gas_kg_h = excluded.consumo_gas_kg_h,
  tempo_forno_padrao_min = excluded.tempo_forno_padrao_min,
  tempo_fogao_padrao_min = excluded.tempo_fogao_padrao_min,
  litros_agua_padrao = excluded.litros_agua_padrao;

-- ---- Ingredientes -----------------------------------------------------------
insert into public.ingredientes (id, user_id, nome, preco_pacote, qtd_pacote, unidade, peso_medio_un) values
  ('00000000-0000-0000-0000-000000000001', 'SEU_USER_ID_AQUI', 'Leite condensado', 5.00, 395, 'g', null),
  ('00000000-0000-0000-0000-000000000002', 'SEU_USER_ID_AQUI', 'Leite integral', 6.00, 1000, 'ml', null),
  ('00000000-0000-0000-0000-000000000003', 'SEU_USER_ID_AQUI', 'Ovo', 0.65, 1, 'un', 50),
  ('00000000-0000-0000-0000-000000000004', 'SEU_USER_ID_AQUI', 'Açúcar', 4.00, 1000, 'g', null);

-- ---- Receita padrão (fixa: 395g leite condensado + 240g leite + 80g de gema
-- de ovo na massa; 100g de açúcar na calda, sem desconto de rendimento) -----
insert into public.receita_padrao_itens (user_id, ingrediente_id, componente, quantidade_g) values
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000001', 'massa', 395),
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000002', 'massa', 240),
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000003', 'massa', 80),
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000004', 'calda', 100);

-- ---- Tamanhos -----------------------------------------------------------------
-- custo_embalagem: valor fixo da embalagem daquele tamanho (não é rateado por peso)
insert into public.tamanhos (id, user_id, nome, gramas_massa, gramas_calda, preco_venda, custo_embalagem) values
  ('00000000-0000-0000-0000-000000000011', 'SEU_USER_ID_AQUI', '150g', 130, 20, 8.00, 1.50),
  ('00000000-0000-0000-0000-000000000012', 'SEU_USER_ID_AQUI', '550g', 480, 70, 25.00, 2.50),
  ('00000000-0000-0000-0000-000000000013', 'SEU_USER_ID_AQUI', '1100g', 960, 140, 45.00, 4.00);

-- ---- Fornada de teste (1 receita, sem override de rendimento da calda) ----
insert into public.fornadas (id, user_id, data, tempo_forno_min, tempo_fogao_min, litros_agua, rendimento_calda_g, observacao) values
  ('00000000-0000-0000-0000-000000000021', 'SEU_USER_ID_AQUI', current_date, 60, 20, 5, null, '1 receita — fornada de validação dos cálculos');

-- ---- Itens da fornada (= receita padrão × 1) -------------------------------
-- Massa: leite condensado 395g, leite 240g, ovo (gema) 80g = 715g
insert into public.fornada_itens (user_id, fornada_id, ingrediente_id, componente, quantidade, unidade_informada) values
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'massa', 395, 'g'),
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'massa', 240, 'g'),
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000003', 'massa', 80, 'g');

-- Calda: açúcar 100g (sem desconto de rendimento)
insert into public.fornada_itens (user_id, fornada_id, ingrediente_id, componente, quantidade, unidade_informada) values
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000004', 'calda', 100, 'g');

-- ---- Produção: 5x 150g (usa 650g de 715g de massa e os 100g de calda) -----
insert into public.fornada_producao (user_id, fornada_id, tamanho_id, quantidade) values
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 5);

-- ---- Cliente de teste + venda -----------------------------------------------
insert into public.clientes (id, user_id, nome, telefone) values
  ('00000000-0000-0000-0000-000000000031', 'SEU_USER_ID_AQUI', 'Maria Silva', '11999990000');

insert into public.vendas (user_id, cliente_id, data, tamanho_id, quantidade, preco_unitario, pago) values
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000031', current_date, '00000000-0000-0000-0000-000000000011', 2, 8.00, true);

-- ---- Conferir o resultado ----------------------------------------------------
-- Depois de rodar, confira com:
--   select * from public.vw_ingredientes_custo;
--   select * from public.vw_receita_padrao_custo;
--   select * from public.vw_fornada_custos;
--   select * from public.vw_fornada_producao_detalhe;
--
-- Esperado (aprox., para 1 receita):
--   custo_g_massa ≈ 0,010462   (715g custando R$ 7,48)
--   custo_g_calda ≈ 0,004000   (100g custando R$ 0,40)
--   custo_unitario do tamanho 150g ≈ R$ 2,16 (direto) + embalagem R$ 1,50 + rateio indireto da fornada
