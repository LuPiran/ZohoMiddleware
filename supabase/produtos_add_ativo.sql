-- Execute no SQL Editor se a tabela produtos já existir sem a coluna `ativo`
alter table public.produtos
  add column if not exists ativo boolean not null default true;

comment on column public.produtos.ativo is 'true = ativo à venda; false = inativo';
