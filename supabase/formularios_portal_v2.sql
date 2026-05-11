-- v2: ocorrência (campos detalhados), proposta (empresa), usuário/gerente, resumo de produtos.
-- Executar após formularios_portal_colunas.sql

-- compras
alter table public.compras add column if not exists cadastro_usuario_id uuid;
alter table public.compras add column if not exists cadastro_usuario_nome text;
alter table public.compras add column if not exists gerente_usuario_id uuid;
alter table public.compras add column if not exists gerente_nome text;
alter table public.compras add column if not exists produtos_linhas jsonb default '[]'::jsonb;
alter table public.compras add column if not exists valor_total numeric(14,2);
alter table public.compras add column if not exists quantidade_produtos integer;

-- recompras
alter table public.recompras add column if not exists cadastro_usuario_id uuid;
alter table public.recompras add column if not exists cadastro_usuario_nome text;
alter table public.recompras add column if not exists gerente_usuario_id uuid;
alter table public.recompras add column if not exists gerente_nome text;
alter table public.recompras add column if not exists produtos_linhas jsonb default '[]'::jsonb;
alter table public.recompras add column if not exists valor_total numeric(14,2);
alter table public.recompras add column if not exists quantidade_produtos integer;

-- propostas
alter table public.propostas add column if not exists cadastro_usuario_id uuid;
alter table public.propostas add column if not exists cadastro_usuario_nome text;
alter table public.propostas add column if not exists gerente_usuario_id uuid;
alter table public.propostas add column if not exists gerente_nome text;
alter table public.propostas add column if not exists produtos_linhas jsonb default '[]'::jsonb;
alter table public.propostas add column if not exists valor_total numeric(14,2);
alter table public.propostas add column if not exists quantidade_produtos integer;
alter table public.propostas add column if not exists tipo_cliente text;
alter table public.propostas add column if not exists nome_empresa text;
alter table public.propostas add column if not exists cnpj text;
alter table public.propostas add column if not exists email_empresa text;
alter table public.propostas add column if not exists telefone_empresa text;

-- ocorrencias
alter table public.ocorrencias add column if not exists cadastro_usuario_id uuid;
alter table public.ocorrencias add column if not exists cadastro_usuario_nome text;
alter table public.ocorrencias add column if not exists gerente_usuario_id uuid;
alter table public.ocorrencias add column if not exists gerente_nome text;
alter table public.ocorrencias add column if not exists produtos_linhas jsonb default '[]'::jsonb;
alter table public.ocorrencias add column if not exists valor_total numeric(14,2);
alter table public.ocorrencias add column if not exists quantidade_produtos integer;

alter table public.ocorrencias add column if not exists nome text;
alter table public.ocorrencias add column if not exists sobrenome text;
alter table public.ocorrencias add column if not exists nome_completo text;
alter table public.ocorrencias add column if not exists cpf text;
alter table public.ocorrencias add column if not exists celular text;
alter table public.ocorrencias add column if not exists email text;
alter table public.ocorrencias add column if not exists motivo_ocorrencia text;
alter table public.ocorrencias add column if not exists observacao text;
alter table public.ocorrencias add column if not exists nome_medico text;
alter table public.ocorrencias add column if not exists crm_medico text;
alter table public.ocorrencias add column if not exists uf_crm text;
alter table public.ocorrencias add column if not exists crm_uf text;
alter table public.ocorrencias add column if not exists celular_medico text;
alter table public.ocorrencias add column if not exists email_medico text;
alter table public.ocorrencias add column if not exists numero_pedido text;
alter table public.ocorrencias add column if not exists awb text;
alter table public.ocorrencias add column if not exists data_pedido text;
alter table public.ocorrencias add column if not exists numero_lote text;
alter table public.ocorrencias add column if not exists data_validade text;

comment on column public.compras.produtos_linhas is 'JSON: [{ produto_id, nome, quantidade, preco_unitario, subtotal }]';
comment on column public.compras.quantidade_produtos is 'Soma das quantidades informadas nas linhas.';
comment on column public.propostas.tipo_cliente is 'Pessoa Fisica | Pessoa Juridica';
