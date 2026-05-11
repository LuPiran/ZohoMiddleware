-- Tabela de produtos (catálogo admin) — executar no SQL Editor do Supabase
-- O backend lista via service role; sem políticas RLS para authenticated/anon = apenas servidor acessa.

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(14, 2) not null default 0,
  fabricante text,
  descricao text,
  -- Código interno único gerado automaticamente se não informado no INSERT
  codigo_produto text not null default (
    'PRD-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  marca text,
  peso numeric(12, 4),
  sku text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint produtos_nome_unique unique (nome),
  constraint produtos_codigo_produto_unique unique (codigo_produto),
  constraint produtos_sku_unique unique (sku)
);

create index if not exists produtos_created_at_idx on public.produtos (created_at desc);

comment on table public.produtos is 'Catálogo de produtos; leitura via API /v1/products/catalog (admin).';

alter table public.produtos enable row level security;

-- Opcional: permitir leitura só para service role (já implícito). Não crie política permissiva para anon.

create or replace function public.set_produtos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_produtos_updated_at on public.produtos;
create trigger trg_produtos_updated_at
  before update on public.produtos
  for each row
  execute procedure public.set_produtos_updated_at();
