-- ============================================================================
-- Sistema de Custos e Vendas de Pudim — schema.sql
-- Rode este arquivo inteiro no SQL Editor do Supabase (projeto novo, vazio).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Allowlist de e-mails (uso pessoal — restringe quem pode criar conta)
-- ----------------------------------------------------------------------------
create table public.allowlist (
  email text primary key
);

alter table public.allowlist enable row level security;
-- Nenhuma policy é criada de propósito: ninguém (anon/authenticated) consegue
-- ler ou escrever nesta tabela pela API. Só é acessível via SQL Editor
-- (conectado como postgres) ou pela função abaixo, que roda como SECURITY DEFINER.

-- Adicione seu e-mail antes do primeiro login:
--   insert into public.allowlist (email) values ('seu-email@gmail.com');

create or replace function public.check_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.allowlist where email = new.email) then
    raise exception 'Email não autorizado a criar conta: %', new.email;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_allowlist on auth.users;
create trigger trg_check_allowlist
before insert on auth.users
for each row execute function public.check_allowlist();

-- ----------------------------------------------------------------------------
-- 1. Ingredientes
-- ----------------------------------------------------------------------------
create table public.ingredientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  nome text not null,
  preco_pacote numeric(10,2) not null check (preco_pacote >= 0),
  qtd_pacote numeric(10,3) not null check (qtd_pacote > 0),
  unidade text not null check (unidade in ('g','ml','un')),
  peso_medio_un numeric(10,3) check (peso_medio_un is null or peso_medio_un > 0),
  created_at timestamptz not null default now(),
  constraint chk_peso_medio_un_obrigatorio check (
    (unidade <> 'un') or (peso_medio_un is not null and peso_medio_un > 0)
  )
);

alter table public.ingredientes enable row level security;

create policy "ingredientes_select" on public.ingredientes
  for select using (auth.uid() = user_id);
create policy "ingredientes_insert" on public.ingredientes
  for insert with check (auth.uid() = user_id);
create policy "ingredientes_update" on public.ingredientes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ingredientes_delete" on public.ingredientes
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. Config de custos (uma linha por usuário)
-- ----------------------------------------------------------------------------
create table public.config_custos (
  user_id uuid primary key references auth.users(id) default auth.uid(),
  tarifa_kwh numeric(10,4) not null default 0 check (tarifa_kwh >= 0),
  potencia_forno_w numeric(10,2) not null default 0 check (potencia_forno_w >= 0),
  tarifa_agua_m3 numeric(10,4) not null default 0 check (tarifa_agua_m3 >= 0),
  litros_por_lavagem numeric(10,2) not null default 0 check (litros_por_lavagem >= 0),
  preco_botijao numeric(10,2) not null default 0 check (preco_botijao >= 0),
  peso_botijao_kg numeric(10,2) not null default 13 check (peso_botijao_kg > 0),
  consumo_gas_kg_h numeric(10,3) not null default 0 check (consumo_gas_kg_h >= 0),
  updated_at timestamptz not null default now()
);

alter table public.config_custos enable row level security;

create policy "config_custos_select" on public.config_custos
  for select using (auth.uid() = user_id);
create policy "config_custos_insert" on public.config_custos
  for insert with check (auth.uid() = user_id);
create policy "config_custos_update" on public.config_custos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "config_custos_delete" on public.config_custos
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Tamanhos
-- ----------------------------------------------------------------------------
create table public.tamanhos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  nome text not null,
  gramas_massa numeric(10,2) not null check (gramas_massa > 0),
  gramas_calda numeric(10,2) not null check (gramas_calda > 0),
  preco_venda numeric(10,2) not null check (preco_venda >= 0),
  custo_embalagem numeric(10,2) not null default 0 check (custo_embalagem >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);

alter table public.tamanhos enable row level security;

create policy "tamanhos_select" on public.tamanhos
  for select using (auth.uid() = user_id);
create policy "tamanhos_insert" on public.tamanhos
  for insert with check (auth.uid() = user_id);
create policy "tamanhos_update" on public.tamanhos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tamanhos_delete" on public.tamanhos
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Fornadas
-- ----------------------------------------------------------------------------
create table public.fornadas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  data date not null default current_date,
  tempo_forno_min numeric(10,2) not null default 0 check (tempo_forno_min >= 0),
  tempo_fogao_min numeric(10,2) not null default 0 check (tempo_fogao_min >= 0),
  litros_agua numeric(10,2) not null default 0 check (litros_agua >= 0),
  rendimento_calda_g numeric(10,2) check (rendimento_calda_g is null or rendimento_calda_g > 0),
  observacao text,
  created_at timestamptz not null default now()
);

alter table public.fornadas enable row level security;

create policy "fornadas_select" on public.fornadas
  for select using (auth.uid() = user_id);
create policy "fornadas_insert" on public.fornadas
  for insert with check (auth.uid() = user_id);
create policy "fornadas_update" on public.fornadas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fornadas_delete" on public.fornadas
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. Itens da fornada (ingredientes consumidos por componente)
-- ----------------------------------------------------------------------------
create table public.fornada_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  fornada_id uuid not null references public.fornadas(id) on delete cascade,
  ingrediente_id uuid not null references public.ingredientes(id),
  componente text not null check (componente in ('massa','calda')),
  quantidade numeric(10,3) not null check (quantidade > 0),
  unidade_informada text not null check (unidade_informada in ('g','ml','un'))
);

alter table public.fornada_itens enable row level security;

create policy "fornada_itens_select" on public.fornada_itens
  for select using (auth.uid() = user_id);
create policy "fornada_itens_insert" on public.fornada_itens
  for insert with check (auth.uid() = user_id);
create policy "fornada_itens_update" on public.fornada_itens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fornada_itens_delete" on public.fornada_itens
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. Produção da fornada (quantos pudins de cada tamanho saíram)
-- ----------------------------------------------------------------------------
create table public.fornada_producao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  fornada_id uuid not null references public.fornadas(id) on delete cascade,
  tamanho_id uuid not null references public.tamanhos(id),
  quantidade integer not null check (quantidade > 0),
  unique (fornada_id, tamanho_id)
);

alter table public.fornada_producao enable row level security;

create policy "fornada_producao_select" on public.fornada_producao
  for select using (auth.uid() = user_id);
create policy "fornada_producao_insert" on public.fornada_producao
  for insert with check (auth.uid() = user_id);
create policy "fornada_producao_update" on public.fornada_producao
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fornada_producao_delete" on public.fornada_producao
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. Clientes
-- ----------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  nome text not null,
  telefone text,
  created_at timestamptz not null default now()
);

alter table public.clientes enable row level security;

create policy "clientes_select" on public.clientes
  for select using (auth.uid() = user_id);
create policy "clientes_insert" on public.clientes
  for insert with check (auth.uid() = user_id);
create policy "clientes_update" on public.clientes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clientes_delete" on public.clientes
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 8. Vendas
-- ----------------------------------------------------------------------------
create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  cliente_id uuid not null references public.clientes(id),
  data date not null default current_date,
  tamanho_id uuid not null references public.tamanhos(id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  pago boolean not null default false,
  data_pagamento date,
  created_at timestamptz not null default now()
);

alter table public.vendas enable row level security;

create policy "vendas_select" on public.vendas
  for select using (auth.uid() = user_id);
create policy "vendas_insert" on public.vendas
  for insert with check (auth.uid() = user_id);
create policy "vendas_update" on public.vendas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vendas_delete" on public.vendas
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- VIEWS DE CÁLCULO
-- Todas usam security_invoker = true, ou seja: rodam com o RLS do usuário que
-- está consultando (não do dono da view). Isso é essencial para a segurança —
-- sem isso, a view poderia vazar dados de outros usuários.
-- ============================================================================

-- 9.1 Custo por grama de cada ingrediente
create or replace view public.vw_ingredientes_custo
with (security_invoker = true) as
select
  i.*,
  case
    when i.unidade = 'un' then i.preco_pacote / (i.qtd_pacote * i.peso_medio_un)
    else i.preco_pacote / i.qtd_pacote
  end as custo_por_g
from public.ingredientes i;

-- 9.2 Custo de cada item lançado numa fornada (já convertendo un -> g)
create or replace view public.vw_fornada_itens_custo
with (security_invoker = true) as
select
  fi.id,
  fi.user_id,
  fi.fornada_id,
  fi.ingrediente_id,
  ic.nome as ingrediente_nome,
  fi.componente,
  fi.quantidade,
  fi.unidade_informada,
  ic.custo_por_g,
  case
    when fi.unidade_informada = 'un' then fi.quantidade * ic.peso_medio_un
    else fi.quantidade
  end as quantidade_g,
  case
    when fi.unidade_informada = 'un' then fi.quantidade * ic.peso_medio_un * ic.custo_por_g
    else fi.quantidade * ic.custo_por_g
  end as custo_item
from public.fornada_itens fi
join public.vw_ingredientes_custo ic on ic.id = fi.ingrediente_id;

-- 9.3 Totais por componente (massa / calda) de cada fornada
create or replace view public.vw_fornada_componentes
with (security_invoker = true) as
select
  fornada_id,
  user_id,
  componente,
  sum(quantidade_g) as peso_g,
  sum(custo_item) as custo_total
from public.vw_fornada_itens_custo
group by fornada_id, user_id, componente;

-- 9.4 Custos diretos (massa/calda) + indiretos (energia/gás/água) por fornada
create or replace view public.vw_fornada_custos
with (security_invoker = true) as
select
  f.id as fornada_id,
  f.user_id,
  f.data,
  f.tempo_forno_min,
  f.tempo_fogao_min,
  f.litros_agua,
  f.rendimento_calda_g,
  coalesce(cm.custo_total, 0) as custo_massa,
  coalesce(cm.peso_g, 0) as peso_massa,
  case when coalesce(cm.peso_g, 0) > 0 then cm.custo_total / cm.peso_g else 0 end as custo_g_massa,
  coalesce(cc.custo_total, 0) as custo_calda,
  coalesce(f.rendimento_calda_g, cc.peso_g, 0) as peso_calda,
  case when coalesce(f.rendimento_calda_g, cc.peso_g, 0) > 0
    then cc.custo_total / coalesce(f.rendimento_calda_g, cc.peso_g)
    else 0 end as custo_g_calda,
  coalesce((cfg.potencia_forno_w / 1000.0) * (f.tempo_forno_min / 60.0) * cfg.tarifa_kwh, 0) as energia,
  coalesce(cfg.consumo_gas_kg_h * (f.tempo_fogao_min / 60.0) * (cfg.preco_botijao / nullif(cfg.peso_botijao_kg, 0)), 0) as gas,
  coalesce((f.litros_agua / 1000.0) * cfg.tarifa_agua_m3, 0) as agua
from public.fornadas f
left join public.vw_fornada_componentes cm on cm.fornada_id = f.id and cm.componente = 'massa'
left join public.vw_fornada_componentes cc on cc.fornada_id = f.id and cc.componente = 'calda'
left join public.config_custos cfg on cfg.user_id = f.user_id;

-- 9.5 Custo unitário e margem por tamanho produzido em cada fornada
create or replace view public.vw_fornada_producao_detalhe
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

-- 9.6 Vendas com nome do cliente e do tamanho (evita joins repetidos no front)
create or replace view public.vw_vendas_detalhe
with (security_invoker = true) as
select
  v.*,
  c.nome as cliente_nome,
  t.nome as tamanho_nome
from public.vendas v
join public.clientes c on c.id = v.cliente_id
join public.tamanhos t on t.id = v.tamanho_id;

-- ============================================================================
-- GRANTS
-- Garante que o role "authenticated" (usuário logado via Supabase Auth)
-- consegue de fato ler/escrever nas tabelas e views acima. O "anon" não
-- recebe nenhum grant sobre estas tabelas — só usuários logados acessam dados.
-- ============================================================================
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.ingredientes,
  public.config_custos,
  public.tamanhos,
  public.fornadas,
  public.fornada_itens,
  public.fornada_producao,
  public.clientes,
  public.vendas
to authenticated;

grant select on
  public.vw_ingredientes_custo,
  public.vw_fornada_itens_custo,
  public.vw_fornada_componentes,
  public.vw_fornada_custos,
  public.vw_fornada_producao_detalhe,
  public.vw_vendas_detalhe
to authenticated;

-- Fim do schema.sql
