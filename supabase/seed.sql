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
-- Os números batem com a seção 4 do requisito:
--   Leite condensado: R$ 5,00 / 395g  -> 0,012658 R$/g
--   Leite:             R$ 6,00 / 1000g -> 0,006 R$/g
--   Ovo:                R$ 0,65/un, 50g -> 0,013 R$/g
--   Açúcar:             R$ 4,00 / 1000g -> 0,004 R$/g
--   Massa: 935g custando R$ 10,34 (0,011059 R$/g)
--   Calda: 100g de açúcar rende 90g -> 0,004444 R$/g
--   Tamanho 150g (130g massa + 20g calda) -> custo direto R$ 1,53 + rateio indireto
-- ============================================================================

-- ---- Config de custos (tarifas de exemplo) ---------------------------------
insert into public.config_custos
  (user_id, tarifa_kwh, potencia_forno_w, tarifa_agua_m3, litros_por_lavagem, preco_botijao, peso_botijao_kg, consumo_gas_kg_h)
values
  ('SEU_USER_ID_AQUI', 0.85, 1500, 12.50, 15, 110.00, 13, 0.8)
on conflict (user_id) do update set
  tarifa_kwh = excluded.tarifa_kwh,
  potencia_forno_w = excluded.potencia_forno_w,
  tarifa_agua_m3 = excluded.tarifa_agua_m3,
  litros_por_lavagem = excluded.litros_por_lavagem,
  preco_botijao = excluded.preco_botijao,
  peso_botijao_kg = excluded.peso_botijao_kg,
  consumo_gas_kg_h = excluded.consumo_gas_kg_h;

-- ---- Ingredientes -----------------------------------------------------------
insert into public.ingredientes (id, user_id, nome, preco_pacote, qtd_pacote, unidade, peso_medio_un) values
  ('00000000-0000-0000-0000-000000000001', 'SEU_USER_ID_AQUI', 'Leite condensado', 5.00, 395, 'g', null),
  ('00000000-0000-0000-0000-000000000002', 'SEU_USER_ID_AQUI', 'Leite integral', 6.00, 1000, 'ml', null),
  ('00000000-0000-0000-0000-000000000003', 'SEU_USER_ID_AQUI', 'Ovo', 0.65, 1, 'un', 50),
  ('00000000-0000-0000-0000-000000000004', 'SEU_USER_ID_AQUI', 'Açúcar', 4.00, 1000, 'g', null);

-- ---- Tamanhos -----------------------------------------------------------------
insert into public.tamanhos (id, user_id, nome, gramas_massa, gramas_calda, preco_venda) values
  ('00000000-0000-0000-0000-000000000011', 'SEU_USER_ID_AQUI', '150g', 130, 20, 8.00),
  ('00000000-0000-0000-0000-000000000012', 'SEU_USER_ID_AQUI', '550g', 480, 70, 25.00),
  ('00000000-0000-0000-0000-000000000013', 'SEU_USER_ID_AQUI', '1100g', 960, 140, 45.00);

-- ---- Fornada de teste -----------------------------------------------------
insert into public.fornadas (id, user_id, data, tempo_forno_min, tempo_fogao_min, litros_agua, rendimento_calda_g, observacao) values
  ('00000000-0000-0000-0000-000000000021', 'SEU_USER_ID_AQUI', current_date, 60, 20, 5, 90, 'Fornada de validação dos cálculos (caso de teste do requisito)');

-- ---- Itens da fornada ------------------------------------------------------
-- Massa: leite condensado 395g, leite 240g, ovos 6un (300g) = 935g / R$ 10,34
insert into public.fornada_itens (user_id, fornada_id, ingrediente_id, componente, quantidade, unidade_informada) values
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'massa', 395, 'g'),
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'massa', 240, 'ml'),
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000003', 'massa', 6, 'un');

-- Calda: açúcar 100g (rendimento real 90g, informado no cabeçalho da fornada)
insert into public.fornada_itens (user_id, fornada_id, ingrediente_id, componente, quantidade, unidade_informada) values
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000004', 'calda', 100, 'g');

-- ---- Produção: 4x 150g + 1x 550g -------------------------------------------
insert into public.fornada_producao (user_id, fornada_id, tamanho_id, quantidade) values
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 4),
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000012', 1);

-- ---- Cliente de teste + venda -----------------------------------------------
insert into public.clientes (id, user_id, nome, telefone) values
  ('00000000-0000-0000-0000-000000000031', 'SEU_USER_ID_AQUI', 'Maria Silva', '11999990000');

insert into public.vendas (user_id, cliente_id, data, tamanho_id, quantidade, preco_unitario, pago) values
  ('SEU_USER_ID_AQUI', '00000000-0000-0000-0000-000000000031', current_date, '00000000-0000-0000-0000-000000000011', 2, 8.00, true);

-- ---- Conferir o resultado ----------------------------------------------------
-- Depois de rodar, confira com:
--   select * from public.vw_ingredientes_custo;
--   select * from public.vw_fornada_custos;
--   select * from public.vw_fornada_producao_detalhe;
--
-- Esperado (aprox.):
--   custo_g_massa  ≈ 0.011059   (935g / R$10,34)
--   custo_g_calda  ≈ 0.004444   (90g / R$0,40)
--   custo_unitario do tamanho 150g ≈ R$ 1,53 + rateio indireto da fornada
