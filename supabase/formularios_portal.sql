-- Snapshots dos formulários do portal (espelho dos dados enviados; integração Zoho continua no backend).
-- O campo `formulario` guarda o corpo da requisição (sem base64 dos anexos — só metadados de arquivo).
-- Executar no SQL Editor do Supabase após `produtos.sql`.
-- Em seguida executar `formularios_portal_colunas.sql` (colunas detalhadas + anexos_storage no bucket).
-- Depois `formularios_portal_v2.sql` (usuário/gerente, produtos_linhas, ocorrência detalhada, empresa na proposta).

create table if not exists public.compras (
  id uuid primary key default gen_random_uuid(),
  protocolo_portal text not null,
  zoho_record_id text,
  formulario jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists compras_protocolo_portal_uidx on public.compras (protocolo_portal);

comment on table public.compras is '1ª Compra — cópia local do formulário após sucesso no Zoho.';

create table if not exists public.recompras (
  id uuid primary key default gen_random_uuid(),
  protocolo_portal text not null,
  zoho_record_id text,
  formulario jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists recompras_protocolo_portal_uidx on public.recompras (protocolo_portal);

comment on table public.recompras is 'Recompra — cópia local do formulário após sucesso no Zoho.';

create table if not exists public.propostas (
  id uuid primary key default gen_random_uuid(),
  protocolo_portal text not null,
  zoho_record_id text,
  formulario jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists propostas_protocolo_portal_uidx on public.propostas (protocolo_portal);

comment on table public.propostas is 'Proposta — cópia local do formulário após sucesso no Zoho.';

create table if not exists public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  protocolo_portal text not null,
  zoho_record_id text,
  status text not null default 'Criado',
  formulario jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists ocorrencias_protocolo_portal_uidx on public.ocorrencias (protocolo_portal);

comment on table public.ocorrencias is 'Ocorrência — cópia local; status inicial Criado.';

alter table public.compras enable row level security;
alter table public.recompras enable row level security;
alter table public.propostas enable row level security;
alter table public.ocorrencias enable row level security;
