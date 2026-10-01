import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import Button from "../../components/ui/Button";
import { leadsMedicosService } from "../../services/leadsMedicos";
import { LEAD_STATUS } from "./leadStatus";

const STATUS_OPTIONS = [
  ...Object.values(LEAD_STATUS),
  "Lead Encaminhado à Gestão",
  "Lead Já Atribuído",
];

const AQUECIMENTO_OPTIONS = [
  "Últimos 6 meses",
  "6 meses a 1 ano",
  "Mais de 1 ano",
];

function toDateInput(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

const EMPTY_FORM = {
  nome: "",
  email: "",
  telefone: "",
  celular: "",
  numeroRegistro: "",
  ufCrm: "",
  tipoLead: "",
  evento: "",
  status: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  medicoPrescritor: false,
  dataUltimaPrescricao: "",
  statusAquecimento: "",
  prescritorConsultorNome: "",
};

function leadToForm(lead) {
  return {
    nome: lead?.nome || "",
    email: lead?.email || "",
    telefone: lead?.telefone || "",
    celular: lead?.celular || "",
    numeroRegistro: lead?.numeroRegistro || "",
    ufCrm: lead?.ufCrm || "",
    tipoLead: lead?.tipoLead || lead?.especialidade || "",
    evento: lead?.evento || lead?.origem || "",
    status: lead?.status || "",
    rua: lead?.rua || "",
    numero: lead?.numero || "",
    complemento: lead?.complemento || "",
    bairro: lead?.bairro || "",
    cidade: lead?.cidade || "",
    estado: lead?.estado || "",
    cep: lead?.cep || "",
    medicoPrescritor: Boolean(lead?.medicoPrescritor),
    dataUltimaPrescricao: toDateInput(lead?.dataUltimaPrescricao),
    statusAquecimento: lead?.statusAquecimento || "",
    prescritorConsultorNome: lead?.prescritorConsultorNome || "",
  };
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-tegra-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-tegra-gray-medium bg-white px-3 py-2 text-sm text-tegra-text-primary outline-none focus:border-tegra-blue-dark";

export default function LeadEditModal({ open, leadId, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !leadId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    leadsMedicosService
      .getById(leadId)
      .then((result) => {
        if (!cancelled) setForm(leadToForm(result.data));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Não foi possível carregar o lead.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape" && !saving) onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const statusOptions = STATUS_OPTIONS.includes(form.status)
    ? STATUS_OPTIONS
    : [form.status, ...STATUS_OPTIONS].filter(Boolean);
  const aquecimentoOptions = AQUECIMENTO_OPTIONS.includes(form.statusAquecimento)
    ? AQUECIMENTO_OPTIONS
    : [form.statusAquecimento, ...AQUECIMENTO_OPTIONS].filter(Boolean);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      setError("O nome do lead é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await leadsMedicosService.editarLead(leadId, form);
      onSaved?.(result.data);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Não foi possível salvar o lead.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        aria-labelledby="editar-lead-titulo"
      >
        <div className="flex items-center justify-between gap-3 border-b border-tegra-gray-medium px-4 py-3 sm:px-5">
          <div>
            <h2 id="editar-lead-titulo" className="text-base font-semibold text-tegra-text-primary">
              Editar lead
            </h2>
            <p className="text-xs text-tegra-text-secondary">
              A alteração fica no Portal e entra no histórico do lead.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-tegra-text-secondary hover:bg-tegra-gray-light"
            aria-label="Fechar"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <p className="py-10 text-center text-sm text-tegra-text-secondary">
              Carregando dados do lead…
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <input
                  className={inputClass}
                  value={form.nome}
                  onChange={(event) => setField("nome", event.target.value)}
                  required
                />
              </Field>
              <Field label="Status">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(event) => setField("status", event.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2 rounded-lg border border-tegra-gray-medium bg-tegra-gray-light/40 p-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-tegra-text-primary">
                  <input
                    type="checkbox"
                    checked={form.medicoPrescritor}
                    onChange={(event) => setField("medicoPrescritor", event.target.checked)}
                  />
                  Este lead é um médico prescritor
                </label>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Dono do médico">
                    <input
                      className={inputClass}
                      value={form.prescritorConsultorNome}
                      onChange={(event) => setField("prescritorConsultorNome", event.target.value)}
                    />
                  </Field>
                  <Field label="Última prescrição">
                    <input
                      className={inputClass}
                      type="date"
                      value={form.dataUltimaPrescricao}
                      onChange={(event) => setField("dataUltimaPrescricao", event.target.value)}
                    />
                  </Field>
                  <Field label="Status de aquecimento">
                    <select
                      className={inputClass}
                      value={form.statusAquecimento}
                      onChange={(event) => setField("statusAquecimento", event.target.value)}
                    >
                      <option value="">Não informado</option>
                      {aquecimentoOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
              <Field label="E-mail">
                <input
                  className={inputClass}
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </Field>
              <Field label="Celular">
                <input
                  className={inputClass}
                  value={form.celular}
                  onChange={(event) => setField("celular", event.target.value)}
                />
              </Field>
              <Field label="Telefone">
                <input
                  className={inputClass}
                  value={form.telefone}
                  onChange={(event) => setField("telefone", event.target.value)}
                />
              </Field>
              <Field label="Especialidade">
                <input
                  className={inputClass}
                  value={form.tipoLead}
                  onChange={(event) => setField("tipoLead", event.target.value)}
                />
              </Field>
              <Field label="CRM / CRO">
                <input
                  className={inputClass}
                  value={form.numeroRegistro}
                  onChange={(event) => setField("numeroRegistro", event.target.value)}
                />
              </Field>
              <Field label="UF do registro">
                <input
                  className={inputClass}
                  value={form.ufCrm}
                  maxLength={2}
                  onChange={(event) => setField("ufCrm", event.target.value.toUpperCase())}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Evento / origem">
                  <input
                    className={inputClass}
                    value={form.evento}
                    onChange={(event) => setField("evento", event.target.value)}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Rua">
                  <input
                    className={inputClass}
                    value={form.rua}
                    onChange={(event) => setField("rua", event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Número">
                <input
                  className={inputClass}
                  value={form.numero}
                  onChange={(event) => setField("numero", event.target.value)}
                />
              </Field>
              <Field label="Complemento">
                <input
                  className={inputClass}
                  value={form.complemento}
                  onChange={(event) => setField("complemento", event.target.value)}
                />
              </Field>
              <Field label="Bairro">
                <input
                  className={inputClass}
                  value={form.bairro}
                  onChange={(event) => setField("bairro", event.target.value)}
                />
              </Field>
              <Field label="Cidade">
                <input
                  className={inputClass}
                  value={form.cidade}
                  onChange={(event) => setField("cidade", event.target.value)}
                />
              </Field>
              <Field label="Estado">
                <input
                  className={inputClass}
                  value={form.estado}
                  maxLength={2}
                  onChange={(event) => setField("estado", event.target.value.toUpperCase())}
                />
              </Field>
              <Field label="CEP">
                <input
                  className={inputClass}
                  value={form.cep}
                  onChange={(event) => setField("cep", event.target.value)}
                />
              </Field>
            </div>
          )}
          {error && (
            <p className="mt-3 text-sm font-medium text-tegra-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-tegra-gray-medium px-4 py-3 sm:px-5">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
