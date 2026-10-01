import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Checkbox from "../../components/ui/Checkbox";
import { usersService } from "../../services/users";

export const PERFIS = ["Consultor", "Gerencia", "Admin Painel", "Gestão"];
export const FORMULARIOS = [
  "Compra",
  "Recompra",
  "Proposta",
  "Tracking de Pedidos",
  "Ocorrencia",
  "Central Comercial",
  "Leads Medicos",
];
export const PARCEIROS = [
  "Cannabis em Foco",
  "Equilibra",
  "TonTon",
  "Gravial",
  "Natural Science",
  "CFJR Medical",
  "TegraPharma Distribuidora",
  "Onixcann",
  "Vip Pharma",
];
export const GERENCIAS = ["Marcelli Silva", "Luis Otavio", "Ricardo", "Digital"];
export const REGIOES = ["SUDESTE", "SUL", "NORDESTE", "CENTRO-OESTE", "NORTE"];

const EMPTY = {
  nome: "",
  email: "",
  senha: "",
  confirmarSenha: "",
  recebeLeads: true,
  perfil: "Consultor",
  permissoesFormularios: [],
  parceria: false,
  parceiros: [],
  gerencia: "",
  regiao: "",
  rua: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  ativo: true,
};

function cadastroParaForm(usuario) {
  const cadastro = usuario?.cadastro || {};
  return {
    ...EMPTY,
    nome: cadastro.nome || usuario?.nome || "",
    email: cadastro.email || usuario?.email || "",
    recebeLeads: cadastro.recebeLeads !== false,
    perfil: PERFIS.includes(cadastro.perfil) ? cadastro.perfil : "Consultor",
    permissoesFormularios: Array.isArray(cadastro.permissoesFormularios)
      ? cadastro.permissoesFormularios.filter((item) => FORMULARIOS.includes(item))
      : [],
    parceria: Boolean(cadastro.parceria),
    parceiros: Array.isArray(cadastro.parceiros)
      ? cadastro.parceiros.filter((item) => PARCEIROS.includes(item))
      : [],
    gerencia: GERENCIAS.includes(cadastro.gerencia) ? cadastro.gerencia : "",
    regiao: REGIOES.includes(cadastro.regiao) ? cadastro.regiao : "",
    rua: cadastro.rua || "",
    bairro: cadastro.bairro || "",
    cidade: cadastro.cidade || "",
    estado: cadastro.estado || "",
    cep: cadastro.cep || "",
    ativo: cadastro.ativo !== false && usuario?.status !== "inativo",
    senha: "",
    confirmarSenha: "",
  };
}

function toggleItem(lista, item) {
  return lista.includes(item) ? lista.filter((atual) => atual !== item) : [...lista, item];
}

const selectClass =
  "w-full rounded-lg border border-tegra-gray-medium bg-white px-3 py-2 text-sm text-tegra-text-primary outline-none focus:border-tegra-blue-dark";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs sm:text-sm font-medium text-tegra-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function UserFormModal({ open, usuario, onClose, onSaved }) {
  const editando = Boolean(usuario?.id);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(editando ? cadastroParaForm(usuario) : EMPTY);
  }, [open, usuario, editando]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape" && !saving) onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  function setCampo(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.senha !== form.confirmarSenha) {
      setError("A confirmação da senha não confere.");
      return;
    }
    if (!editando && form.senha.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      recebeLeads: form.recebeLeads,
      perfil: form.perfil,
      permissoesFormularios: form.permissoesFormularios,
      parceria: form.parceria,
      parceiros: form.parceria ? form.parceiros : [],
      gerencia: form.gerencia,
      regiao: form.regiao,
      rua: form.rua.trim(),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim(),
      cep: form.cep.trim(),
      ativo: form.ativo,
    };
    if (form.senha) payload.senha = form.senha;

    setSaving(true);
    try {
      const response = editando
        ? await usersService.updateUser(usuario.id, payload)
        : await usersService.createUser(payload);
      onSaved?.(response);
    } catch (err) {
      setError(err?.error || err?.message || "Não foi possível salvar o usuário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tegra-blue-dark/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="usuario-form-titulo"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-tegra-gray-medium px-4 py-4 sm:px-6">
          <div>
            <h2 id="usuario-form-titulo" className="text-lg font-semibold text-tegra-text-primary">
              {editando ? "Editar usuário" : "Adicionar usuário"}
            </h2>
            <p className="mt-1 text-xs text-tegra-text-secondary">
              Os dados vão para o Zoho e para o banco. A senha fica somente no Zoho.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1 text-tegra-text-secondary hover:bg-tegra-gray-light"
            aria-label="Fechar"
          >
            <MdClose className="text-2xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Nome"
                value={form.nome}
                onChange={(e) => setCampo("nome", e.target.value)}
                required
              />
              <Input
                label="E-mail"
                type="email"
                value={form.email}
                onChange={(e) => setCampo("email", e.target.value)}
                required
              />
              <Input
                label={editando ? "Nova senha" : "Senha"}
                type="password"
                value={form.senha}
                onChange={(e) => setCampo("senha", e.target.value)}
                placeholder={editando ? "Em branco mantém a senha atual" : ""}
                required={!editando}
                autoComplete="new-password"
              />
              <Input
                label="Confirmar senha"
                type="password"
                value={form.confirmarSenha}
                onChange={(e) => setCampo("confirmarSenha", e.target.value)}
                required={!editando || Boolean(form.senha)}
                autoComplete="new-password"
              />
              <Field label="Perfil">
                <select
                  className={selectClass}
                  value={form.perfil}
                  onChange={(e) => setCampo("perfil", e.target.value)}
                  required
                >
                  {PERFIS.map((perfil) => (
                    <option key={perfil} value={perfil}>
                      {perfil}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Gerência">
                <select
                  className={selectClass}
                  value={form.gerencia}
                  onChange={(e) => setCampo("gerencia", e.target.value)}
                >
                  <option value="">Sem gerência</option>
                  {GERENCIAS.map((gerencia) => (
                    <option key={gerencia} value={gerencia}>
                      {gerencia}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Região">
                <select
                  className={selectClass}
                  value={form.regiao}
                  onChange={(e) => setCampo("regiao", e.target.value)}
                >
                  <option value="">Sem região</option>
                  {REGIOES.map((regiao) => (
                    <option key={regiao} value={regiao}>
                      {regiao}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap gap-4">
              <Checkbox
                id="usuario-recebe-leads"
                label="Recebe leads"
                checked={form.recebeLeads}
                onChange={(e) => setCampo("recebeLeads", e.target.checked)}
              />
              <Checkbox
                id="usuario-parceria"
                label="Parceria"
                checked={form.parceria}
                onChange={(e) => setCampo("parceria", e.target.checked)}
              />
              <Checkbox
                id="usuario-ativo"
                label="Ativo"
                checked={form.ativo}
                onChange={(e) => setCampo("ativo", e.target.checked)}
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-xs sm:text-sm font-medium text-tegra-text-secondary">
                Permissão de formulários
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FORMULARIOS.map((item) => (
                  <Checkbox
                    key={item}
                    id={`form-${item}`}
                    label={item}
                    checked={form.permissoesFormularios.includes(item)}
                    onChange={() =>
                      setCampo("permissoesFormularios", toggleItem(form.permissoesFormularios, item))
                    }
                  />
                ))}
              </div>
            </fieldset>

            {form.parceria && (
              <fieldset>
                <legend className="mb-2 text-xs sm:text-sm font-medium text-tegra-text-secondary">
                  Parceiros
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PARCEIROS.map((item) => (
                    <Checkbox
                      key={item}
                      id={`parceiro-${item}`}
                      label={item}
                      checked={form.parceiros.includes(item)}
                      onChange={() => setCampo("parceiros", toggleItem(form.parceiros, item))}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold text-tegra-text-primary">Endereço</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input label="Rua" value={form.rua} onChange={(e) => setCampo("rua", e.target.value)} />
                </div>
                <Input label="Bairro" value={form.bairro} onChange={(e) => setCampo("bairro", e.target.value)} />
                <Input label="Cidade" value={form.cidade} onChange={(e) => setCampo("cidade", e.target.value)} />
                <Input label="Estado" value={form.estado} onChange={(e) => setCampo("estado", e.target.value)} />
                <Input label="CEP" value={form.cep} onChange={(e) => setCampo("cep", e.target.value)} />
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-tegra-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-tegra-gray-medium px-4 py-3 sm:px-6">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editando ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
