/**
 * DocumentUpload — 5 slots fixos, um por tipo de documento.
 *
 * Clica no card do tipo → abre o seletor de arquivo → arquivo categorizado.
 * Nomes gerados automaticamente: 1_Receita_Medica-Neli_Barbosa.pdf, etc.
 */

import { useRef } from "react";
import {
  MdClose,
  MdCheckCircle,
  MdAddCircleOutline,
  MdLocalPharmacy,
  MdBadge,
  MdHome,
  MdCreditCard,
  MdFolderOpen,
  MdInsertDriveFile,
} from "react-icons/md";
import { gerarNomeArquivo } from "../../utils/fileNaming";

/* ─── 5 tipos de documento ─────────────────────────────────────── */
const SLOTS = [
  {
    value: "receita",
    num: "1",
    label: "Receita\nMédica",
    Icon: MdLocalPharmacy,
    gradientFrom: "#21b8a3",
    gradientTo: "#16a085",
    borderColor: "#21b8a3",
    bgLight: "#e8faf8",
    textColor: "#0d6e63",
    needsDetalhe: false,
  },
  {
    value: "rg_cpf",
    num: "2",
    label: "RG / CPF / CIN\nCRM + Certidão",
    Icon: MdBadge,
    gradientFrom: "#4a90d9",
    gradientTo: "#2471a3",
    borderColor: "#4a90d9",
    bgLight: "#eaf4fb",
    textColor: "#1a5276",
    needsDetalhe: false,
  },
  {
    value: "endereco",
    num: "3",
    label: "Comprovante\nde Endereço",
    Icon: MdHome,
    gradientFrom: "#f39c12",
    gradientTo: "#d68910",
    borderColor: "#f39c12",
    bgLight: "#fef9e7",
    textColor: "#7d6608",
    needsDetalhe: false,
  },
  {
    value: "pagamento",
    num: "4",
    label: "Comprovante\nde Pagamento",
    Icon: MdCreditCard,
    gradientFrom: "#8e44ad",
    gradientTo: "#6c3483",
    borderColor: "#8e44ad",
    bgLight: "#f5eef8",
    textColor: "#6c3483",
    needsDetalhe: true,
    detalhePlaceholder: "ex: PIX Itaú, TED Itaú, Conta Internacional",
    detalheLabel: "Forma de pagamento",
  },
  {
    value: "outros",
    num: "",
    label: "Outros\nDocumentos",
    Icon: MdFolderOpen,
    gradientFrom: "#6d28d9",
    gradientTo: "#4c1d95",
    borderColor: "#6d28d9",
    bgLight: "#f5f3ff",
    textColor: "#4c1d95",
    needsDetalhe: true,
    detalhePlaceholder: "ex: Autorização ANVISA, Declaração, Laudo...",
    detalheLabel: "Tipo do documento",
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
    onChange([...value, ...files.map((file) => ({ file, tipoDocumento: slot.value, detalhe: "" }))]);
    e.target.value = "";
  };

  const handleRemove = (index) => onChange(value.filter((_, i) => i !== index));

  const handleDetalhe = (index, detalhe) =>
    onChange(value.map((item, i) => (i === index ? { ...item, detalhe } : item)));

  return (
    <div className="space-y-4">

      {/* ══ MOBILE: lista de linhas ══════════════════════════════════ */}
      <div className="sm:hidden flex flex-col divide-y divide-gray-100 rounded-2xl border border-gray-200 overflow-hidden bg-white">
        {SLOTS.map((slot, slotIndex) => {
          const count = value.filter((v) => v.tipoDocumento === slot.value).length;
          const hasFile = count > 0;
          const { Icon } = slot;

          return (
            <div key={slot.value}>
              <input
                ref={(el) => { inputRefs.current[slotIndex] = el; }}
                type="file"
                multiple
                onChange={(e) => handleFileChange(e, slot)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => handleSlotClick(slotIndex)}
                className="w-full flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity text-left"
                style={{ backgroundColor: hasFile ? slot.bgLight : "transparent" }}
              >
                {/* Círculo com ícone */}
                <div
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: hasFile
                      ? `linear-gradient(135deg, ${slot.gradientFrom}, ${slot.gradientTo})`
                      : "linear-gradient(135deg, #e5e7eb, #d1d5db)",
                  }}
                >
                  <Icon style={{ color: hasFile ? "#fff" : "#9ca3af", fontSize: 20 }} />
                </div>

                {/* Texto */}
                <div className="flex-1 min-w-0">
                  {slot.num && (
                    <span
                      className="text-[10px] font-black mr-1"
                      style={{ color: hasFile ? slot.gradientFrom : "#9ca3af" }}
                    >
                      {slot.num}.
                    </span>
                  )}
                  <span
                    className="text-sm font-semibold"
                    style={{ color: hasFile ? slot.textColor : "#374151" }}
                  >
                    {slot.label.replace("\n", " ")}
                  </span>
                  {hasFile && (
                    <p className="text-xs mt-0.5" style={{ color: slot.gradientFrom }}>
                      {count} arquivo{count > 1 ? "s" : ""} adicionado{count > 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Badge direita */}
                <div className="shrink-0">
                  {hasFile ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${slot.gradientFrom}, ${slot.gradientTo})` }}
                    >
                      <MdCheckCircle style={{ fontSize: 12 }} />
                      {count}
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <MdAddCircleOutline className="text-gray-400" style={{ fontSize: 16 }} />
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* ══ DESKTOP: grade de 5 quadrados ═══════════════════════════ */}
      <div className="hidden sm:grid grid-cols-5 gap-3">
        {SLOTS.map((slot, slotIndex) => {
          const count = value.filter((v) => v.tipoDocumento === slot.value).length;
          const hasFile = count > 0;
          const { Icon } = slot;

          return (
            <div key={slot.value} className="flex flex-col items-center gap-2">
              <input
                ref={(el) => { inputRefs.current[slotIndex] = el; }}
                type="file"
                multiple
                onChange={(e) => handleFileChange(e, slot)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => handleSlotClick(slotIndex)}
                title={slot.label.replace("\n", " ")}
                style={{
                  borderColor: hasFile ? slot.borderColor : "#d1d5db",
                  backgroundColor: hasFile ? slot.bgLight : "#fafafa",
                }}
                className={`
                  relative w-full aspect-square flex flex-col items-center justify-center gap-1.5
                  rounded-2xl border-2 transition-all duration-200 cursor-pointer group
                  ${hasFile ? "shadow-md" : "border-dashed hover:border-current"}
                  active:scale-95
                `}
              >
                {slot.num && (
                  <span
                    className="absolute top-1.5 left-1.5 text-[9px] font-black text-white rounded-full w-[18px] h-[18px] flex items-center justify-center shadow-sm"
                    style={{ background: hasFile ? slot.gradientFrom : "#9ca3af" }}
                  >
                    {slot.num}
                  </span>
                )}
                {hasFile && (
                  <span
                    className="absolute top-1.5 right-1.5 text-[9px] font-black text-white rounded-full w-[18px] h-[18px] flex items-center justify-center shadow-sm"
                    style={{ background: slot.gradientTo }}
                  >
                    {count}
                  </span>
                )}
                <div
                  className="flex items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    width: "clamp(36px, 40%, 52px)",
                    height: "clamp(36px, 40%, 52px)",
                    background: hasFile
                      ? `linear-gradient(135deg, ${slot.gradientFrom}, ${slot.gradientTo})`
                      : "linear-gradient(135deg, #e5e7eb, #d1d5db)",
                  }}
                >
                  <Icon
                    style={{
                      color: hasFile ? "#ffffff" : "#9ca3af",
                      fontSize: "clamp(16px, 45%, 26px)",
                    }}
                  />
                </div>
                {hasFile ? (
                  <MdCheckCircle style={{ color: slot.gradientFrom, fontSize: "13px" }} />
                ) : (
                  <MdAddCircleOutline
                    className="text-gray-300 group-hover:text-gray-400 transition-colors"
                    style={{ fontSize: "13px" }}
                  />
                )}
              </button>
              <p
                className="text-center leading-tight font-semibold"
                style={{
                  fontSize: "clamp(8px, 1.5vw, 11px)",
                  color: hasFile ? slot.textColor : "#6b7280",
                  whiteSpace: "pre-line",
                }}
              >
                {slot.label}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-tegra-text-secondary">
        Toque no documento para adicionar o arquivo correspondente.
      </p>

      {/* ── Lista de arquivos adicionados ─────────────────────────── */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => {
            const slot = SLOTS.find((s) => s.value === item.tipoDocumento);
            const { Icon: SlotIcon } = slot || { Icon: MdInsertDriveFile };
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
                className="rounded-xl border p-3 space-y-2"
                style={{
                  background: slot ? slot.bgLight : "#f9fafb",
                  borderColor: slot ? slot.borderColor + "55" : "#e5e7eb",
                }}
              >
                {/* Linha superior */}
                <div className="flex items-center gap-2.5">
                  {/* Mini ícone */}
                  <div
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: slot
                        ? `linear-gradient(135deg, ${slot.gradientFrom}, ${slot.gradientTo})`
                        : "#e5e7eb",
                    }}
                  >
                    <SlotIcon className="text-white" style={{ fontSize: "16px" }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                      style={{ color: slot?.textColor ?? "#374151" }}
                    >
                      {slot?.label.replace("\n", " ") ?? "Documento"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{item.file.name}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Remover"
                  >
                    <MdClose style={{ fontSize: "14px" }} />
                  </button>
                </div>

                {/* Campo detalhe (pagamento / anvisa) */}
                {slot?.needsDetalhe && (
                  <input
                    type="text"
                    value={item.detalhe}
                    onChange={(e) => handleDetalhe(index, e.target.value)}
                    placeholder={slot.detalhePlaceholder}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-tegra-text-primary focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ "--tw-ring-color": slot.gradientFrom + "55" }}
                  />
                )}

                {/* Preview do nome gerado */}
                {nomeGerado ? (
                  <div
                    className="rounded-lg px-2.5 py-2 flex items-start gap-2"
                    style={{ background: slot?.gradientFrom + "12", border: `1px solid ${slot?.gradientFrom}30` }}
                  >
                    <MdCheckCircle
                      className="shrink-0 mt-0.5"
                      style={{ color: slot?.gradientFrom, fontSize: "13px" }}
                    />
                    <div className="min-w-0">
                      <p
                        className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
                        style={{ color: slot?.textColor }}
                      >
                        Nome do arquivo
                      </p>
                      <p
                        className="text-[11px] font-mono break-all"
                        style={{ color: slot?.textColor }}
                      >
                        {nomeGerado}
                      </p>
                    </div>
                  </div>
                ) : slot?.needsDetalhe && !item.detalhe ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5">
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
