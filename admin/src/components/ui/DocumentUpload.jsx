/**
 * DocumentUpload
 *
 * Componente de upload de documentos com seleção de tipo por arquivo.
 * Renomeia cada arquivo automaticamente seguindo o padrão:
 *   1_Receita_Medica-Nome_Sobrenome.pdf
 *   2_RG_CPF_CIN_CRM-Certidao_de_Nascimento-Nome_Sobrenome.pdf
 *   3_Comprovante_de_Endereco-Nome_Sobrenome.pdf
 *   4_Comprovante_de_Pagamento_PIX_Itau-Nome_Sobrenome.pdf
 *   012345.67891012_2026-Autorizacao_Importacao_Anvisa-Nome_Sobrenome.pdf
 *
 * Props:
 *   value            — Array<{ file: File, tipoDocumento: string, detalhe: string }>
 *   onChange         — (newValue) => void
 *   nomePaciente     — string
 *   sobrenomePaciente— string
 *   maxFiles         — number (default 10)
 *   showToast        — função para exibir toast
 */

import { useRef } from "react";
import { MdCloudUpload, MdClose, MdInsertDriveFile } from "react-icons/md";
import {
  TIPOS_DOCUMENTO,
  gerarNomeArquivo,
  normalizarParaArquivo,
} from "../../utils/fileNaming";

/** Extrai a extensão do nome do arquivo (sem o ponto). */
function extensaoArquivo(fileName) {
  const parts = String(fileName || "").split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "bin";
}

/** Placeholder do campo "Detalhe" conforme o tipo selecionado. */
function placeholderDetalhe(tipo) {
  if (tipo === "pagamento") return "ex: PIX Itaú, TED Itaú, Depósito Itaú, Conta Internacional";
  if (tipo === "anvisa")   return "ex: 012345.67891012_2026";
  return "";
}

/** Label do campo "Detalhe" conforme o tipo selecionado. */
function labelDetalhe(tipo) {
  if (tipo === "pagamento") return "Forma de pagamento (para o nome do arquivo)";
  if (tipo === "anvisa")   return "Número da autorização ANVISA";
  return "";
}

export default function DocumentUpload({
  value = [],
  onChange,
  nomePaciente = "",
  sobrenomePaciente = "",
  maxFiles = 10,
  showToast,
}) {
  const inputRef = useRef(null);

  const handleAddFiles = (e) => {
    const novosArquivos = Array.from(e.target.files || []);
    if (!novosArquivos.length) return;

    if (value.length + novosArquivos.length > maxFiles) {
      showToast?.(`⚠️ Máximo de ${maxFiles} arquivos permitidos`, "warning");
      e.target.value = "";
      return;
    }

    const novosItens = novosArquivos.map((file) => ({
      file,
      tipoDocumento: "",
      detalhe: "",
    }));

    onChange([...value, ...novosItens]);
    e.target.value = "";
  };

  const handleRemove = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleTipoChange = (index, tipo) => {
    const updated = value.map((item, i) =>
      i === index ? { ...item, tipoDocumento: tipo, detalhe: "" } : item,
    );
    onChange(updated);
  };

  const handleDetalheChange = (index, detalhe) => {
    const updated = value.map((item, i) =>
      i === index ? { ...item, detalhe } : item,
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Campo de seleção de arquivo */}
      <input
        ref={inputRef}
        type="file"
        id="doc-upload"
        multiple
        disabled={value.length >= maxFiles}
        onChange={handleAddFiles}
        className="hidden"
      />
      <label
        htmlFor="doc-upload"
        className={`flex items-center justify-between px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          value.length >= maxFiles
            ? "bg-tegra-gray-light border-tegra-gray-medium cursor-not-allowed opacity-60"
            : "bg-blue-50 border-tegra-blue hover:bg-blue-100"
        }`}
      >
        <span className="text-tegra-blue-dark font-medium">
          {value.length >= maxFiles
            ? `Limite de ${maxFiles} arquivos atingido`
            : "Escolher arquivo(s)"}
        </span>
        <MdCloudUpload className="text-tegra-blue-dark text-xl" />
      </label>

      <p className="text-sm text-tegra-text-secondary">
        Selecione o tipo de cada documento após adicioná-lo. O nome será gerado
        automaticamente. Máximo {maxFiles} arquivos.
      </p>

      {/* Lista de arquivos com controles por item */}
      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((item, index) => {
            const ext = extensaoArquivo(item.file.name);
            const nomeGerado = gerarNomeArquivo({
              tipoDocumento: item.tipoDocumento,
              extensao: ext,
              nomePaciente,
              sobrenomePaciente,
              detalhe: item.detalhe,
            });

            const precisaDetalhe =
              item.tipoDocumento === "pagamento" ||
              item.tipoDocumento === "anvisa";

            return (
              <div
                key={index}
                className="rounded-lg border border-tegra-gray-medium bg-tegra-gray-light p-3 space-y-2"
              >
                {/* Linha superior: ícone + nome original + remover */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MdInsertDriveFile className="shrink-0 text-tegra-blue text-lg" />
                    <span className="text-sm text-tegra-text-secondary truncate">
                      {item.file.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="shrink-0 text-tegra-error hover:text-red-700 transition-colors"
                    aria-label="Remover arquivo"
                  >
                    <MdClose className="text-lg" />
                  </button>
                </div>

                {/* Seletor de tipo */}
                <div>
                  <label className="block text-xs font-medium text-tegra-text-secondary mb-1">
                    Tipo de documento <span className="text-tegra-error">*</span>
                  </label>
                  <select
                    value={item.tipoDocumento}
                    onChange={(e) => handleTipoChange(index, e.target.value)}
                    className="w-full rounded border border-tegra-gray-medium bg-white px-3 py-2 text-sm text-tegra-text-primary focus:outline-none focus:ring-2 focus:ring-tegra-blue"
                  >
                    {TIPOS_DOCUMENTO.map((opt) => (
                      <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo de detalhe (só aparece para pagamento/anvisa) */}
                {precisaDetalhe && (
                  <div>
                    <label className="block text-xs font-medium text-tegra-text-secondary mb-1">
                      {labelDetalhe(item.tipoDocumento)}{" "}
                      <span className="text-tegra-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.detalhe}
                      onChange={(e) => handleDetalheChange(index, e.target.value)}
                      placeholder={placeholderDetalhe(item.tipoDocumento)}
                      className="w-full rounded border border-tegra-gray-medium bg-white px-3 py-2 text-sm text-tegra-text-primary focus:outline-none focus:ring-2 focus:ring-tegra-blue"
                    />
                  </div>
                )}

                {/* Preview do nome gerado */}
                {nomeGerado ? (
                  <div className="rounded bg-green-50 border border-green-200 px-3 py-1.5">
                    <p className="text-[11px] font-medium text-green-700 uppercase tracking-wide mb-0.5">
                      Nome do arquivo
                    </p>
                    <p className="text-xs font-mono text-green-800 break-all">
                      {nomeGerado}
                    </p>
                  </div>
                ) : item.tipoDocumento === "" ? (
                  <div className="rounded bg-amber-50 border border-amber-200 px-3 py-1.5">
                    <p className="text-xs text-amber-700">
                      ⚠️ Selecione o tipo para gerar o nome automaticamente.
                    </p>
                  </div>
                ) : (precisaDetalhe && !item.detalhe) ? (
                  <div className="rounded bg-amber-50 border border-amber-200 px-3 py-1.5">
                    <p className="text-xs text-amber-700">
                      ⚠️ Preencha o detalhe para gerar o nome.
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
