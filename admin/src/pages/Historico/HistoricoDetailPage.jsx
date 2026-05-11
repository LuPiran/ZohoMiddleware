import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import {
  MdArrowBack,
  MdChevronLeft,
  MdChevronRight,
  MdDescription,
  MdImage,
  MdInsertDriveFile,
  MdInventory2,
  MdPictureAsPdf,
  MdTableChart,
} from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import Button from "../../components/ui/Button";
import { ROUTES } from "../../utils/constants";
import { authService } from "../../services/auth";
import { historicoService } from "../../services/historico";
import { useLoading } from "../../contexts/LoadingContext";
import { useToast } from "../../components/feedback/auth/ToastContainer";

const TITLES = {
  compra: "Detalhes — Compra",
  recompra: "Detalhes — Recompra",
  proposta: "Detalhes — Proposta",
  ocorrencia: "Detalhes — Ocorrência",
};

const LIST_ROUTES = {
  compra: ROUTES.HISTORICO_COMPRA,
  recompra: ROUTES.HISTORICO_RECOMPRA,
  proposta: ROUTES.HISTORICO_PROPOSTA,
  ocorrencia: ROUTES.HISTORICO_OCORRENCIA,
};

const LABELS = {
  protocolo_portal: "Protocolo",
  created_at: "Data de registro",
  status: "Status",
  quantidade_produtos: "Quantidade de produtos",
  consultor: "Consultor",
  gerente: "Gerente",
  tipo_cliente: "Tipo de cliente",
  nome_empresa: "Razão social / Nome empresa",
  cnpj: "CNPJ",
  email_empresa: "E-mail (empresa)",
  telefone_empresa: "Telefone (empresa)",
  nome: "Nome",
  sobrenome: "Sobrenome",
  nome_completo: "Nome completo",
  cpf: "CPF",
  rg: "RG",
  celular: "Celular",
  telefone: "Telefone",
  email: "E-mail",
  data_nascimento: "Data de nascimento",
  nome_representante: "Nome do representante",
  rg_representante: "RG do representante",
  cpf_representante: "CPF do representante",
  email_representante: "E-mail do representante",
  celular_representante: "Celular do representante",
  data_nascimento_representante: "Nascimento do representante",
  nome_medico: "Nome do médico",
  crm_medico: "CRM",
  uf_crm: "UF (CRM)",
  crm_uf: "CRM / UF",
  email_medico: "E-mail do médico",
  especialidade_medico: "Especialidade",
  celular_medico: "Celular do médico",
  rua: "Logradouro",
  numero_endereco: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cep: "CEP",
  cidade: "Cidade",
  estado: "Estado",
  pais: "País",
  link_pagamento: "Solicitar link de pagamento",
  tipo_link: "Tipo de link",
  forma_pagamento: "Forma de pagamento",
  termos_condicoes: "Termos e condições",
  observacao: "Observação",
  motivo_ocorrencia: "Motivo da ocorrência",
  numero_pedido: "Nº pedido",
  awb: "AWB",
  data_pedido: "Data do pedido",
  numero_lote: "Nº lote",
  data_validade: "Data de validade",
};

const KEYS_RESUMO_COMUM = [
  "protocolo_portal",
  "created_at",
  "consultor",
  "gerente",
  "quantidade_produtos",
];

const KEYS_RESUMO_PROPOSTA_EXTRA = ["tipo_cliente"];

const KEYS_RESUMO_OCORRENCIA = [
  "protocolo_portal",
  "created_at",
  "status",
  "consultor",
  "gerente",
  "quantidade_produtos",
];

const KEYS_PACIENTE_PF = [
  "nome_completo",
  "nome",
  "sobrenome",
  "cpf",
  "rg",
  "celular",
  "telefone",
  "email",
  "data_nascimento",
];

const KEYS_EMPRESA_PJ = [
  "nome_empresa",
  "cnpj",
  "email_empresa",
  "telefone_empresa",
];

const KEYS_REPRESENTANTE = [
  "nome_representante",
  "rg_representante",
  "cpf_representante",
  "email_representante",
  "celular_representante",
  "data_nascimento_representante",
];

const KEYS_MEDICO = [
  "nome_medico",
  "crm_medico",
  "uf_crm",
  "crm_uf",
  "email_medico",
  "especialidade_medico",
];

const KEYS_ENDERECO = [
  "rua",
  "numero_endereco",
  "complemento",
  "bairro",
  "cep",
  "cidade",
  "estado",
  "pais",
];

const KEYS_NEGOCIACAO = ["link_pagamento", "tipo_link"];

const KEYS_PAGAMENTO = ["forma_pagamento", "termos_condicoes"];

const KEYS_OC_CLIENTE = [
  "nome_completo",
  "nome",
  "sobrenome",
  "cpf",
  "celular",
  "email",
];

const KEYS_OC_PEDIDO = [
  "numero_pedido",
  "awb",
  "data_pedido",
  "numero_lote",
  "data_validade",
];

const KEYS_OC_MEDICO = [
  "nome_medico",
  "crm_medico",
  "uf_crm",
  "crm_uf",
  "celular_medico",
  "email_medico",
];

const CPF_KEYS = new Set(["cpf", "cpf_representante"]);
const CNPJ_KEYS = new Set(["cnpj"]);
const RG_KEYS = new Set(["rg", "rg_representante"]);
const PHONE_KEYS = new Set([
  "telefone",
  "celular",
  "telefone_empresa",
  "celular_representante",
  "celular_medico",
]);
const CEP_KEYS = new Set(["cep"]);
const DATE_ONLY_KEYS = new Set([
  "data_nascimento",
  "data_nascimento_representante",
  "data_pedido",
  "data_validade",
]);

function onlyDigits(v) {
  return String(v ?? "").replace(/\D/g, "");
}

function formatCpf(v) {
  const d = onlyDigits(v);
  if (d.length !== 11) return String(v);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatCnpj(v) {
  const d = onlyDigits(v);
  if (d.length !== 14) return String(v);
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatRg(v) {
  const d = onlyDigits(v);
  if (d.length === 9) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, "$1.$2.$3-$4");
  }
  if (d.length === 8) {
    return d.replace(/(\d{1})(\d{3})(\d{3})(\d{1})/, "$1.$2.$3-$4");
  }
  return String(v);
}

function formatPhoneBR(v) {
  const d = onlyDigits(v);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return String(v);
}

function formatCep(v) {
  const d = onlyDigits(v);
  if (d.length !== 8) return String(v);
  return d.replace(/(\d{5})(\d{3})/, "$1-$2");
}

function formatDateOnly(v) {
  if (!v) return "—";
  const raw = String(v).trim();
  if (!raw) return "—";
  const digits = onlyDigits(raw);
  if (digits.length === 8) {
    if (raw.includes("-")) {
      const y = digits.slice(0, 4);
      const m = digits.slice(4, 6);
      const d = digits.slice(6, 8);
      return `${d}/${m}/${y}`;
    }
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function formatFieldValue(key, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (key === "created_at") return formatDateTime(value);
  if (DATE_ONLY_KEYS.has(key)) return formatDateOnly(value);
  if (CPF_KEYS.has(key)) return formatCpf(value);
  if (CNPJ_KEYS.has(key)) return formatCnpj(value);
  if (RG_KEYS.has(key)) return formatRg(value);
  if (PHONE_KEYS.has(key)) return formatPhoneBR(value);
  if (CEP_KEYS.has(key)) return formatCep(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanizeKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function isTruthyFlag(v) {
  return v === true || v === "true" || v === "Sim" || v === "sim";
}

function isPessoaJuridica(row) {
  const t = String(row?.tipo_cliente || "")
    .trim()
    .toLowerCase();
  return t.includes("juridica");
}

function hasFilledValue(row, key) {
  return formatFieldValue(key, row[key]) !== "—";
}

function hasAnyFilled(row, keys) {
  return keys.some((k) => hasFilledValue(row, k));
}

function entriesFromKeys(row, keys) {
  const out = [];
  for (const key of keys) {
    if (!(key in row)) continue;
    const str = formatFieldValue(key, row[key]);
    if (str === "—") continue;
    out.push({
      key,
      label: LABELS[key] || humanizeKey(key),
      value: str,
    });
  }
  return out;
}

function DetailGrid({ entries }) {
  if (!entries.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(({ key, label, value }) => (
        <div
          key={key}
          className="rounded-lg border border-tegra-gray-medium bg-white/80 px-3 py-2 sm:px-4 sm:py-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-tegra-text-secondary">
            {label}
          </p>
          <p className="mt-1 break-words text-sm text-tegra-text-primary">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, children }) {
  if (children == null) return null;
  return (
    <section className="overflow-hidden rounded-lg bg-tegra-bg-primary shadow-md">
      <div className="border-b border-tegra-gray-medium bg-tegra-blue-dark px-4 py-3 md:px-6">
        <h2 className="text-base font-bold text-tegra-text-inverse md:text-lg">
          {title}
        </h2>
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </section>
  );
}

function SectionEntries({ title, entries }) {
  if (!entries?.length) return null;
  return (
    <SectionCard title={title}>
      <DetailGrid entries={entries} />
    </SectionCard>
  );
}

/**
 * Tabela de produtos no estilo resumo de pedido (cabeçalho cinza, vazio com ícone).
 * @param {{ linhas: unknown[] }} props
 */
function ProdutosTable({ linhas }) {
  const rows = Array.isArray(linhas) ? linhas : [];
  const colGrid = "grid min-w-[320px] grid-cols-[minmax(0,2fr)_88px] gap-3 px-4 py-3 md:gap-6 md:px-6";

  return (
    <div className="overflow-hidden rounded-xl border border-tegra-gray-medium bg-white">
      <div className="rounded-t-xl bg-tegra-gray-light px-0 py-0">
        <div className={colGrid}>
          <span className="text-left text-[11px] font-semibold uppercase tracking-wide text-tegra-text-secondary md:text-xs">
            Produto
          </span>
          <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-tegra-text-secondary md:text-xs">
            Qtd.
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center px-6 py-14">
            <MdInventory2
              className="h-16 w-16 text-tegra-gray-medium opacity-80"
              aria-hidden
            />
            <p className="mt-5 text-sm font-medium text-tegra-text-secondary">
              Sem dados
            </p>
          </div>
        ) : (
          <div className="min-w-[320px] divide-y divide-tegra-gray-medium">
            {rows.map((line, idx) => (
              <div key={`${line?.produto_id ?? idx}-${idx}`} className={colGrid}>
                <span className="text-sm text-tegra-text-primary">
                  {line?.nome ?? "—"}
                </span>
                <span className="text-center text-sm tabular-nums text-tegra-text-primary">
                  {line?.quantidade ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function inferFileKind(fileName, contentType) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("pdf")) return "pdf";
  if (ct.startsWith("image/")) return "image";
  const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "heic"].includes(ext))
    return "image";
  if (["doc", "docx", "odt"].includes(ext)) return "word";
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "sheet";
  return "file";
}

function FileTypeIcon({ kind, className = "" }) {
  const base = `h-12 w-12 ${className}`;
  switch (kind) {
    case "pdf":
      return (
        <MdPictureAsPdf className={`${base} text-red-600`} aria-hidden />
      );
    case "image":
      return <MdImage className={`${base} text-tegra-teal`} aria-hidden />;
    case "word":
      return (
        <MdDescription className={`${base} text-blue-600`} aria-hidden />
      );
    case "sheet":
      return (
        <MdTableChart className={`${base} text-emerald-700`} aria-hidden />
      );
    default:
      return (
        <MdInsertDriveFile className={`${base} text-tegra-text-secondary`} aria-hidden />
      );
  }
}

function FileCarousel({ items, renderItem }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: 3,
    dragFree: false,
    breakpoints: {
      "(max-width: 639px)": { slidesToScroll: 1 },
      "(min-width: 640px) and (max-width: 1023px)": { slidesToScroll: 2 },
    },
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return undefined;
    const updateButtons = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-3 flex touch-pan-y">
          {items.map((item, index) => (
            <div
              key={item.key}
              className="min-w-0 flex-[0_0_100%] pl-3 sm:flex-[0_0_50%] lg:flex-[0_0_calc(100%/3)]"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
      {canPrev || canNext ? (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            className="rounded-lg border border-tegra-gray-medium p-2 text-tegra-text-primary transition hover:bg-tegra-gray-light disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Arquivos anteriores"
          >
            <MdChevronLeft className="text-lg" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            className="rounded-lg border border-tegra-gray-medium p-2 text-tegra-text-primary transition hover:bg-tegra-gray-light disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Próximos arquivos"
          >
            <MdChevronRight className="text-lg" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ArquivosGrid({ storageList, metaList, downloadingIdx, onOpenFile }) {
  const hasStorage = Array.isArray(storageList) && storageList.length > 0;
  const hasMeta = Array.isArray(metaList) && metaList.length > 0;
  if (!hasStorage && !hasMeta) {
    return (
      <p className="text-sm text-tegra-text-secondary">
        Nenhum arquivo anexado a este registro.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hasStorage ? (
        <FileCarousel
          items={storageList.map((item, index) => ({
            key: `st-${item?.path ?? index}-${index}`,
            item,
            index,
          }))}
          renderItem={({ item, index }) => {
            const name = item?.fileName || `Arquivo ${index + 1}`;
            const kind = inferFileKind(name, item?.contentType);
            const busy = downloadingIdx === index;
            return (
              <button
                type="button"
                disabled={busy}
                onClick={() => onOpenFile(index)}
                className="flex h-48 w-full flex-col items-center justify-center rounded-xl border border-tegra-gray-medium bg-white p-4 text-center shadow-sm transition hover:border-tegra-teal hover:shadow-md focus:outline-none focus:ring-2 focus:ring-tegra-teal disabled:cursor-wait disabled:opacity-70"
                title={`Abrir ${name}`}
              >
                <FileTypeIcon kind={kind} />
                <p
                  className="mt-3 line-clamp-3 w-full break-words text-xs font-medium text-tegra-text-primary"
                  title={name}
                >
                  {name}
                </p>
                {busy ? (
                  <span className="mt-1 text-[10px] text-tegra-text-secondary">
                    Abrindo…
                  </span>
                ) : null}
              </button>
            );
          }}
        />
      ) : null}

      {hasMeta ? (
        <FileCarousel
          items={metaList.map((meta, index) => ({
            key: `meta-${index}`,
            item: meta,
            index,
          }))}
          renderItem={({ item, index }) => {
            const name = item?.fileName || item?.name || `Arquivo ${index + 1}`;
            const kind = inferFileKind(name, item?.contentType);
            return (
              <div className="flex h-48 w-full flex-col items-center justify-center rounded-xl border border-dashed border-tegra-gray-medium bg-tegra-gray-light/40 p-4 text-center">
                <FileTypeIcon kind={kind} />
                <p
                  className="mt-3 line-clamp-3 w-full break-words text-xs font-medium text-tegra-text-primary"
                  title={name}
                >
                  {name}
                </p>
                <p className="mt-2 text-[11px] text-tegra-text-secondary">
                  Download indisponível
                </p>
              </div>
            );
          }}
        />
      ) : null}
    </div>
  );
}

function CompraLikeSections({ row, tipo }) {
  const pj = tipo === "proposta" && isPessoaJuridica(row);
  const negociacao = isTruthyFlag(row.negociacao_consultor);

  const resumoKeys =
    tipo === "proposta"
      ? [...KEYS_RESUMO_COMUM, ...KEYS_RESUMO_PROPOSTA_EXTRA]
      : KEYS_RESUMO_COMUM;
  const resumoEntries = entriesFromKeys(row, resumoKeys);

  const pacienteOuEmpresaTitle = pj
    ? "Informações da empresa"
    : "Informações do paciente";
  const pacienteOuEmpresaEntries = pj
    ? entriesFromKeys(row, KEYS_EMPRESA_PJ)
    : entriesFromKeys(row, KEYS_PACIENTE_PF);

  const showRepresentante = isTruthyFlag(row.representante_legal);
  const representanteEntries = entriesFromKeys(row, KEYS_REPRESENTANTE);

  const showMedico = isTruthyFlag(row.dados_medico_prescritor);
  const medicoEntries = entriesFromKeys(row, KEYS_MEDICO);

  const showCampanha = isTruthyFlag(row.campanha_diretoria);

  const showEndereco = hasAnyFilled(row, KEYS_ENDERECO);
  const enderecoEntries = entriesFromKeys(row, KEYS_ENDERECO);

  const showNegociacao = negociacao;
  const negociacaoEntries = entriesFromKeys(row, KEYS_NEGOCIACAO);

  const pagamentoKeys = [...KEYS_PAGAMENTO];
  if (!negociacao) {
    pagamentoKeys.push("link_pagamento", "tipo_link");
  }
  const pagamentoEntries = entriesFromKeys(row, pagamentoKeys);

  const observacaoStr = formatFieldValue("observacao", row.observacao);
  const showObservacao = observacaoStr !== "—";

  return (
    <>
      <SectionEntries title="Resumo do registro" entries={resumoEntries} />

      {pacienteOuEmpresaEntries.length > 0 ? (
        <SectionEntries
          title={pacienteOuEmpresaTitle}
          entries={pacienteOuEmpresaEntries}
        />
      ) : null}

      {showRepresentante ? (
        representanteEntries.length > 0 ? (
          <SectionEntries
            title="Representante legal"
            entries={representanteEntries}
          />
        ) : (
          <SectionCard title="Representante legal">
            <p className="text-sm text-tegra-text-secondary">
              Representante legal indicado; não há campos preenchidos no registro
              espelhado.
            </p>
          </SectionCard>
        )
      ) : null}

      {showMedico ? (
        medicoEntries.length > 0 ? (
          <SectionEntries
            title="Informações do médico prescritor"
            entries={medicoEntries}
          />
        ) : (
          <SectionCard title="Informações do médico prescritor">
            <p className="text-sm text-tegra-text-secondary">
              Dados de novo médico prescritor indicados; não há campos preenchidos
              no registro espelhado.
            </p>
          </SectionCard>
        )
      ) : null}

      {showCampanha ? (
        <SectionCard title="Campanha diretoria">
          <p className="text-sm leading-relaxed text-tegra-text-primary">
            Este cadastro está vinculado à <strong>campanha da diretoria</strong>
            .
          </p>
        </SectionCard>
      ) : null}

      {showEndereco ? (
        <SectionEntries title="Endereço" entries={enderecoEntries} />
      ) : null}

      {showNegociacao ? (
        negociacaoEntries.length > 0 ? (
          <SectionEntries
            title="Negociação feita pelo consultor"
            entries={negociacaoEntries}
          />
        ) : (
          <SectionCard title="Negociação feita pelo consultor">
            <p className="text-sm text-tegra-text-secondary">
              Negociação pelo consultor indicada; link e tipo de link não
              constam no registro espelhado.
            </p>
          </SectionCard>
        )
      ) : null}

      <SectionCard title="Produtos">
        <ProdutosTable linhas={row.produtos_linhas} />
      </SectionCard>

      {pagamentoEntries.length > 0 ? (
        <SectionEntries
          title="Forma de pagamento"
          entries={pagamentoEntries}
        />
      ) : null}

      {showObservacao ? (
        <SectionCard title="Observação">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-tegra-text-primary">
            {row.observacao}
          </p>
        </SectionCard>
      ) : null}
    </>
  );
}

function OcorrenciaSections({ row }) {
  const resumoEntries = entriesFromKeys(row, KEYS_RESUMO_OCORRENCIA);
  const clienteEntries = entriesFromKeys(row, KEYS_OC_CLIENTE);
  const pedidoEntries = entriesFromKeys(row, KEYS_OC_PEDIDO);
  const medicoEntries = entriesFromKeys(row, KEYS_OC_MEDICO);
  const motivoEntries = entriesFromKeys(row, ["motivo_ocorrencia"]);
  const observacaoStr = formatFieldValue("observacao", row.observacao);
  const showObservacao = observacaoStr !== "—";

  const showMedico = hasAnyFilled(row, KEYS_OC_MEDICO);

  return (
    <>
      <SectionEntries title="Resumo do registro" entries={resumoEntries} />

      {clienteEntries.length > 0 ? (
        <SectionEntries title="Informações do cliente" entries={clienteEntries} />
      ) : null}

      {pedidoEntries.length > 0 ? (
        <SectionEntries
          title="Pedido e logística"
          entries={pedidoEntries}
        />
      ) : null}

      {showMedico && medicoEntries.length > 0 ? (
        <SectionEntries
          title="Informações do médico"
          entries={medicoEntries}
        />
      ) : null}

      {motivoEntries.length > 0 ? (
        <SectionEntries title="Motivo da ocorrência" entries={motivoEntries} />
      ) : null}

      <SectionCard title="Produtos">
        <ProdutosTable linhas={row.produtos_linhas} />
      </SectionCard>

      {showObservacao ? (
        <SectionCard title="Observação">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-tegra-text-primary">
            {row.observacao}
          </p>
        </SectionCard>
      ) : null}
    </>
  );
}

/**
 * @param {{ tipo: 'compra' | 'recompra' | 'proposta' | 'ocorrencia' }} props
 */
export default function HistoricoDetailPage({ tipo }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setLoading } = useLoading();
  const { showToast } = useToast();
  const [row, setRow] = useState(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [downloadingIdx, setDownloadingIdx] = useState(
    /** @type {number | null} */ (null),
  );

  const listRoute = LIST_ROUTES[tipo] || ROUTES.DASHBOARD;
  const title = TITLES[tipo] || "Detalhes";

  const load = useCallback(async () => {
    if (!id) return;
    setLocalLoading(true);
    setLoading(true);
    try {
      let res;
      if (tipo === "compra") res = await historicoService.getCompraById(id);
      else if (tipo === "recompra") res = await historicoService.getRecompraById(id);
      else if (tipo === "proposta") res = await historicoService.getPropostaById(id);
      else res = await historicoService.getOcorrenciaById(id);

      if (res?.success) {
        setRow(res.data || null);
      } else {
        showToast(res?.error || "Não foi possível carregar o registro", "error");
        navigate(listRoute);
      }
    } catch (e) {
      showToast(
        e.response?.data?.error || e.message || "Erro ao carregar registro",
        "error",
      );
      navigate(listRoute);
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  }, [id, tipo, navigate, listRoute, setLoading, showToast]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN);
      return;
    }
    load();
  }, [load, navigate]);

  const storageFiles = useMemo(() => {
    const a = row?.anexos_storage;
    return Array.isArray(a) ? a : [];
  }, [row]);

  const metaOnlyFiles = useMemo(() => {
    const raw = row?.formulario?.arquivos;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const storageNames = new Set(
      storageFiles
        .map((s) => String(s?.fileName || "").trim().toLowerCase())
        .filter(Boolean),
    );
    return raw.filter((m) => {
      const n = String(m?.fileName || m?.name || "")
        .trim()
        .toLowerCase();
      return n && !storageNames.has(n);
    });
  }, [row, storageFiles]);

  const handleOpenFile = useCallback(
    async (fileIndex) => {
      if (!id) return;
      try {
        setDownloadingIdx(fileIndex);
        const res = await historicoService.getArquivoSignedUrl(
          tipo,
          id,
          fileIndex,
        );
        if (res?.success && res.url) {
          window.open(res.url, "_blank", "noopener,noreferrer");
        } else {
          showToast(res?.error || "Não foi possível abrir o arquivo", "error");
        }
      } catch (e) {
        showToast(
          e.response?.data?.error || e.message || "Erro ao abrir arquivo",
          "error",
        );
      } finally {
        setDownloadingIdx(null);
      }
    },
    [id, tipo, showToast],
  );

  return (
    <MainLayout>
      <div className="w-full px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-tegra-text-primary sm:text-2xl">
                {title}
              </h1>
              {row?.protocolo_portal && (
                <p className="text-sm text-tegra-text-secondary">
                  Protocolo{" "}
                  <span className="font-semibold text-tegra-text-primary">
                    {row.protocolo_portal}
                  </span>
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(listRoute)}
              className="shrink-0 self-start"
            >
              <span className="inline-flex items-center gap-1">
                <MdArrowBack className="text-lg" aria-hidden />
                Voltar ao histórico
              </span>
            </Button>
          </div>

          {localLoading ? (
            <div className="rounded-lg bg-tegra-bg-primary p-8 text-center text-tegra-text-secondary shadow-md">
              Carregando detalhes…
            </div>
          ) : !row ? (
            <div className="rounded-lg bg-tegra-bg-primary p-8 text-center text-tegra-text-secondary shadow-md">
              Registro não encontrado.
            </div>
          ) : (
            <div className="space-y-6">
              {tipo === "ocorrencia" ? (
                <OcorrenciaSections row={row} />
              ) : (
                <CompraLikeSections row={row} tipo={tipo} />
              )}

              <SectionCard title="Arquivos">
                <ArquivosGrid
                  storageList={storageFiles}
                  metaList={metaOnlyFiles}
                  downloadingIdx={downloadingIdx}
                  onOpenFile={handleOpenFile}
                />
              </SectionCard>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
