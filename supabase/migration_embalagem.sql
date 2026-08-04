-- ============================================================================
-- migration_embalagem.sql — adiciona o custo de embalagem por tamanho
-- ============================================================================
-- Rode isto no SQL Editor do seu projeto Supabase (que já está em produção).
-- Não precisa rodar o schema.sql inteiro de novo — ele daria erro de "já existe".
-- ============================================================================

-- 1. Nova coluna em tamanhos: custo fixo da embalagem daquele tamanho
alter table public.tamanhos
  add column if not exists custo_embalagem numeric(10,2) not null default 0 check (custo_embalagem >= 0);

-- 2. Recria a view de custo/margem por tamanho, agora somando a embalagem
--    (custo fixo por unidade, não rateado por peso — cada pudim leva 1 embalagem)
-- Precisa dropar e recriar (não dá pra usar CREATE OR REPLACE) porque a nova
-- coluna entra no meio da lista, e o Postgres só aceita OR REPLACE quando a
-- coluna nova é adicionada no final.
drop view if exists public.vw_fornada_producao_detalhe;

create view public.vw_fornada_producao_detalhe
with (security_invoker = true) as
with gramas as (
  select fp.fornada_id,
         sum((t.gramas_massa + t.gramas_calda) * fp.quantidade) as gramas_produzidas
  from public.fornada_producao fp
  join public.tamanhos t on t.id = fp.tamanho_id
  group by fp.fornada_id
),
base as (
  select
    fp.id,
    fp.user_id,
    fp.fornada_id,
    fp.tamanho_id,
    fp.quantidade as qtd_produzida,
    t.nome as tamanho_nome,
    t.gramas_massa,
    t.gramas_calda,
    t.preco_venda,
    t.custo_embalagem,
    fc.custo_g_massa,
    fc.custo_g_calda,
    (fc.energia + fc.gas + fc.agua) as indireto_total,
    g.gramas_produzidas,
    case when g.gramas_produzidas > 0
      then (fc.energia + fc.gas + fc.agua) / g.gramas_produzidas
      else 0
    end as custo_indireto_g
  from public.fornada_producao fp
  join public.tamanhos t on t.id = fp.tamanho_id
  join public.vw_fornada_custos fc on fc.fornada_id = fp.fornada_id
  join gramas g on g.fornada_id = fp.fornada_id
)
select
  *,
  (gramas_massa * custo_g_massa)
    + (gramas_calda * custo_g_calda)
    + ((gramas_massa + gramas_calda) * custo_indireto_g)
    + custo_embalagem as custo_unitario,
  preco_venda - (
    (gramas_massa * custo_g_massa)
    + (gramas_calda * custo_g_calda)
    + ((gramas_massa + gramas_calda) * custo_indireto_g)
    + custo_embalagem
  ) as margem_reais,
  case when preco_venda > 0 then
    (preco_venda - (
      (gramas_massa * custo_g_massa)
      + (gramas_calda * custo_g_calda)
      + ((gramas_massa + gramas_calda) * custo_indireto_g)
      + custo_embalagem
    )) / preco_venda * 100
  else 0 end as margem_pct
from base;

-- 3. O DROP VIEW acima apaga o grant também — recoloca a permissão de leitura
grant select on public.vw_fornada_producao_detalhe to authenticated;

-- 4. (Opcional) já deixa cadastrado o valor que você mencionou para o 150g
-- update public.tamanhos set custo_embalagem = 1.50 where nome = '150g' and user_id = auth.uid();
