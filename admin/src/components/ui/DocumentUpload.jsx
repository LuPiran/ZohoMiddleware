/**
 * DocumentUpload — 5 botões de ícone, um por tipo de documento.
 *
 * O consultor clica no ícone do tipo desejado → seleciona o arquivo →
 * o nome é gerado automaticamente com o padrão:
 *   1_Receita_Medica-Nome_Sobrenome.ext
 *   2_RG_CPF_CIN_CRM-Certidao_de_Nascimento-Nome_Sobrenome.ext
 *   3_Comprovante_de_Endereco-Nome_Sobrenome.ext
 *   4_Comprovante_de_Pagamento_PIX_Itau-Nome_Sobrenome.ext
 *   012345.67891012_2026-Autorizacao_Importacao_Anvisa-Nome_Sobrenome.ext
 *
 * Props:
 *   value              — Array<{ file: File, tipoDocumento: string, detalhe: string }>
 *   onChange           — (newValue) => void
 *   nomePaciente       — string
 *   sobrenomePaciente  — string
 *   maxFiles           — number (default 10)
 *   showToast          — (msg, type) => void
 */

import { useRef } from "react";
import { MdClose } from "react-icons/md";
import { gerarNomeArquivo } from "../../utils/fileNaming";

/* ─── Definição dos 5 slots de documento ─────────────────────── */
const SLOTS = [
  {
    value:      "receita",
    num:        "1",
    label:      "Receita Médica",
    emoji:      "💊",
    bg:         "bg-emerald-50",
    border:     "border-emerald-300",
    text:       "text-emerald-700",
    hover:      "hover:bg-emerald-100",
    badgeBg:    "bg-emerald-600",
    needsDetalhe: false,
  },
  {
    value:      "rg_cpf",
    num:        "2",
    label:      "RG / CPF / CIN\nCRM + Certidão",
    emoji:      "🪪",
    bg:         "bg-blue-50",
    border:     "border-blue-300",
    text:       "text-blue-700",
    hover:      "hover:bg-blue-100",
    badgeBg:    "bg-blue-600",
    needsDetalhe: false,
  },
  {
    value:      "endereco",
    num:        "3",
    label:      "Comprovante\nde Endereço",
    emoji:      "🏠",
    bg:         "bg-amber-50",
    border:     "border-amber-300",
    text:       "text-amber-700",
    hover:      "hover:bg-amber-100",
    badgeBg:    "bg-amber-500",
    needsDetalhe: false,
  },
  {
    value:      "pagamento",
    num:        "4",
    label:      "Comprovante\nde Pagamento",
    emoji:      "💳",
    bg:         "bg-purple-50",
    border:     "border-purple-300",
    text:       "text-purple-700",
    hover:      "hover:bg-purple-100",
    badgeBg:    "bg-purple-600",
    needsDetalhe: true,
    detalhePlaceholder: "ex: PIX Itaú, TED Itaú, Depósito Itaú, Conta Internacional",
    detalheLabel: "Forma de pagamento",
  },
  {
    value:      "anvisa",
    num:        "",
    label:      "Autorização\nImportação ANVISA",
    emoji:      "📋",
    bg:         "bg-rose-50",
    border:     "border-rose-300",
    text:       "text-rose-700",
    hover:      "hover:bg-rose-100",
    badgeBg:    "bg-rose-600",
    needsDetalhe: true,
    detalhePlaceholder: "ex: 012345.67891012_2026",
    detalheLabel: "Número da autorização ANVISA",
  },
];

function extensaoArquivo(fileName) {
  const parts = String(fileName || "").split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "bin";
}

export default function DocumentUpload({
  value = [],
  onChange,
  nomePaciente = "",
  sobrenomePaciente = "",
  maxFiles = 10,
  showToast,
}) {
  // Uma ref de input por slot
  const inputRefs = useRef(SLOTS.map(() => null));

  const handleSlotClick = (slotIndex) => {
    if (value.length >= maxFiles) {
      showToast?.(`⚠️ Máximo de ${maxFiles} arquivos permitidos`, "warning");
      return;
    }
    inputRefs.current[slotIndex]?.click();
  };

  const handleFileChange = (e, slot) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (value.length + files.length > maxFiles) {
      showToast?.(`⚠️ Máximo de ${maxFiles} arquivos permitidos`, "warning");
      e.target.value = "";
      return;
    }

    const novos = files.map((file) => ({
      file,
      tipoDocumento: slot.value,
      detalhe: "",
    }));

    onChange([...value, ...novos]);
    e.target.value = "";
  };

  const handleRemove = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleDetalheChange = (index, detalhe) => {
    onChange(value.map((item, i) => (i === index ? { ...item, detalhe } : item)));
  };

  return (
    <div className="space-y-4">

      {/* ── 5 botões de ícone ─────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {SLOTS.map((slot, slotIndex) => {
          // Conta quantos arquivos já foram adicionados para este tipo
          const count = value.filter((v) => v.tipoDocumento === slot.value).length;

          return (
            <div key={slot.value} className="flex flex-col items-center gap-1.5">
              {/* Input oculto */}
              <input
                ref={(el) => { inputRefs.current[slotIndex] = el; }}
                type="file"
                multiple
                onChange={(e) => handleFileChange(e, slot)}
                className="hidden"
              />

              {/* Botão ícone */}
              <button
                type="button"
                onClick={() => handleSlotClick(slotIndex)}
                title={slot.label.replace("\n", " ")}
                className={`
                  relative w-full aspect-square flex flex-col items-center justify-center
                  rounded-xl border-2 transition-all duration-150 cursor-pointer
                  ${slot.bg} ${slot.border} ${slot.hover}
                  active:scale-95
                `}
              >
                {/* Número badge */}
                {slot.num && (
                  <span
                    className={`
                      absolute top-1 left-1 text-[10px] font-bold text-white
                      rounded-full w-4 h-4 flex items-center justify-center
                      ${slot.badgeBg}
                    `}
                  >
                    {slot.num}
                  </span>
                )}

                {/* Badge de quantidade (se já tem arquivos) */}
                {count > 0 && (
                  <span
                    className="
                      absolute top-1 right-1 text-[10px] font-bold text-white
                      bg-gray-700 rounded-full w-4 h-4 flex items-center justify-center
                    "
                  >
                    {count}
                  </span>
                )}

                {/* Emoji / ícone */}
                <span className="text-2xl sm:text-3xl leading-none select-none">
                  {slot.emoji}
                </span>
              </button>

              {/* Label abaixo do botão */}
              <p
                className={`text-center text-[9px] sm:text-[10px] font-semibold leading-tight ${slot.text}`}
                style={{ whiteSpace: "pre-line" }}
              >
                {slot.label}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-tegra-text-secondary">
        Clique no ícone do tipo de documento para adicionar o arquivo.
        O nome será gerado automaticamente. Máximo {maxFiles} arquivos.
      </p>

      {/* ── Lista de arquivos adicionados ─────────────────────── */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => {
            const slot = SLOTS.find((s) => s.value === item.tipoDocumento);
            const ext = extensaoArquivo(item.file.name);
            const nomeGerado = gerarNomeArquivo({
              tipoDocumento: item.tipoDocumento,
              extensao: ext,
              nomePaciente,
              sobrenomePaciente,
              detalhe: item.detalhe,
            });

            return (
              <div
                key={index}
                className={`
                  rounded-lg border p-3 space-y-2
                  ${slot ? slot.bg : "bg-gray-50"}
                  ${slot ? slot.border : "border-gray-200"}
                `}
              >
                {/* Linha superior: emoji + nome original + remover */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{slot?.emoji ?? "📄"}</span>
                    <span className="text-xs text-tegra-text-secondary truncate">
                      {item.file.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="shrink-0 text-tegra-error hover:text-red-700 transition-colors"
                    aria-label="Remover arquivo"
                  >
                    <MdClose className="text-base" />
                  </button>
                </div>

                {/* Campo detalhe (pagamento / anvisa) */}
                {slot?.needsDetalhe && (
                  <input
                    type="text"
                    value={item.detalhe}
                    onChange={(e) => handleDetalheChange(index, e.target.value)}
                    placeholder={slot.detalhePlaceholder}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-tegra-text-primary focus:outline-none focus:ring-2 focus:ring-tegra-blue"
                  />
                )}

                {/* Preview do nome gerado */}
                {nomeGerado ? (
                  <div className="rounded bg-white/70 border border-green-200 px-2.5 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-green-700 mb-0.5">
                      Nome do arquivo
                    </p>
                    <p className="text-[11px] font-mono text-green-800 break-all">
                      {nomeGerado}
                    </p>
                  </div>
                ) : slot?.needsDetalhe && !item.detalhe ? (
                  <div className="rounded bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                    <p className="text-xs text-amber-700">
                      ⚠️ Preencha o campo acima para gerar o nome do arquivo.
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
