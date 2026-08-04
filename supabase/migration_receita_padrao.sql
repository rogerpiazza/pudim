-- ============================================================================
-- migration_receita_padrao.sql — receita fixa + sugestão de produção por fornada
-- ============================================================================
-- Rode isto no SQL Editor do seu projeto Supabase já em produção, depois de
-- ter rodado migration_embalagem.sql.
-- ============================================================================

-- 1. Tempo padrão de forno/fogão/água "por 1 receita" (pré-preenche a Nova
--    Fornada quando você informa quantas receitas fez — dá pra ajustar depois)
alter table public.config_custos
  add column if not exists tempo_forno_padrao_min numeric(10,2) not null default 0 check (tempo_forno_padrao_min >= 0),
  add column if not exists tempo_fogao_padrao_min numeric(10,2) not null default 0 check (tempo_fogao_padrao_min >= 0),
  add column if not exists litros_agua_padrao numeric(10,2) not null default 0 check (litros_agua_padrao >= 0);

-- 2. Tabela da receita padrão (a receita fixa: 395g leite condensado,
--    240g leite, 80g ovo — massa; 100g açúcar — calda)
create table if not exists public.receita_padrao_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  ingrediente_id uuid not null references public.ingredientes(id),
  componente text not null check (componente in ('massa','calda')),
  quantidade_g numeric(10,3) not null check (quantidade_g > 0)
);

alter table public.receita_padrao_itens enable row level security;

drop policy if exists "receita_padrao_itens_select" on public.receita_padrao_itens;
drop policy if exists "receita_padrao_itens_insert" on public.receita_padrao_itens;
drop policy if exists "receita_padrao_itens_update" on public.receita_padrao_itens;
drop policy if exists "receita_padrao_itens_delete" on public.receita_padrao_itens;

create policy "receita_padrao_itens_select" on public.receita_padrao_itens
  for select using (auth.uid() = user_id);
create policy "receita_padrao_itens_insert" on public.receita_padrao_itens
  for insert with check (auth.uid() = user_id);
create policy "receita_padrao_itens_update" on public.receita_padrao_itens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "receita_padrao_itens_delete" on public.receita_padrao_itens
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.receita_padrao_itens to authenticated;

-- 3. View de custo de cada item da receita padrão
create or replace view public.vw_receita_padrao_custo
with (security_invoker = true) as
select
  rp.id,
  rp.user_id,
  rp.ingrediente_id,
  ic.nome as ingrediente_nome,
  rp.componente,
  rp.quantidade_g,
  ic.custo_por_g,
  rp.quantidade_g * ic.custo_por_g as custo_item
from public.receita_padrao_itens rp
join public.vw_ingredientes_custo ic on ic.id = rp.ingrediente_id;

grant select on public.vw_receita_padrao_custo to authenticated;

-- 4. (Opcional) já cadastra a receita fixa pra você — troque SEU_USER_ID_AQUI
--    pelo seu User UID (Authentication > Users no painel do Supabase) e pelos
--    IDs reais dos seus ingredientes (Table Editor > ingredientes, copie o "id"
--    de cada linha). Se preferir, ignore isso e cadastre pela tela de Ajustes.
--
-- insert into public.receita_padrao_itens (user_id, ingrediente_id, componente, quantidade_g) values
--   ('SEU_USER_ID_AQUI', 'ID_DO_LEITE_CONDENSADO', 'massa', 395),
--   ('SEU_USER_ID_AQUI', 'ID_DO_LEITE',             'massa', 240),
--   ('SEU_USER_ID_AQUI', 'ID_DO_OVO',                'massa', 80),
--   ('SEU_USER_ID_AQUI', 'ID_DO_ACUCAR',             'calda', 100);
