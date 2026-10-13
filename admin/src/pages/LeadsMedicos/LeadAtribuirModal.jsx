import { useEffect, useMemo, useState } from "react";
import { MdClose } from "react-icons/md";
import Button from "../../components/ui/Button";
import { leadsMedicosService } from "../../services/leadsMedicos";
import { usersService } from "../../services/users";

const inputClass =
  "w-full rounded-lg border border-tegra-gray-medium bg-white px-3 py-2 text-sm text-tegra-text-primary outline-none focus:border-tegra-blue-dark";

/**
 * Admin envia o lead direto para um consultor escolhido. Vira uma oferta
 * normal (o consultor aceita ou recusa dentro do prazo). Se o lead já estava
 * aceito por outra pessoa, sai da carteira dela.
 */
export default function LeadAtribuirModal({ open, lead, onClose, onSaved }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    setBusca("");
    setSelecionado("");
    usersService
      .getUsers({ all: true })
      .then((result) => {
        if (cancelled) return;
        const ativos = (Array.isArray(result?.data) ? result.data : [])
          .filter((u) => u?.id && u.statusBoolean !== false)
          .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
        setUsuarios(ativos);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.error || err?.message || "Não foi possível carregar os consultores.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape" && !saving) onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        String(u.nome || "").toLowerCase().includes(termo) ||
        String(u.email || "").toLowerCase().includes(termo),
    );
  }, [busca, usuarios]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selecionado) {
      setError("Escolha um consultor.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await leadsMedicosService.atribuirLead(lead.id, selecionado);
      onSaved?.(result.data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Não foi possível enviar o lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        aria-labelledby="atribuir-lead-titulo"
      >
        <div className="flex items-center justify-between gap-3 border-b border-tegra-gray-medium px-4 py-3 sm:px-5">
          <div>
            <h2 id="atribuir-lead-titulo" className="text-base font-semibold text-tegra-text-primary">
              Enviar para consultor
            </h2>
            <p className="text-xs text-tegra-text-secondary">
              {lead?.nome ? `${lead.nome} — ` : ""}o consultor recebe a oferta e tem o prazo normal para aceitar.
              {lead?.consultor ? ` Hoje está com ${lead.consultor}.` : ""}
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

        <div className="flex min-h-0 flex-col gap-3 px-4 py-4 sm:px-5">
          <input
            className={inputClass}
            placeholder="Buscar por nome ou e-mail"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            aria-label="Buscar consultor"
          />
          <div className="min-h-[12rem] flex-1 overflow-y-auto rounded-lg border border-tegra-gray-medium">
            {loading ? (
              <p className="py-10 text-center text-sm text-tegra-text-secondary">Carregando consultores…</p>
            ) : filtrados.length === 0 ? (
              <p className="py-10 text-center text-sm text-tegra-text-secondary">Nenhum consultor encontrado.</p>
            ) : (
              <ul role="listbox" aria-label="Consultores">
                {filtrados.map((u) => {
                  const ativo = String(u.id) === String(selecionado);
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={ativo}
                        onClick={() => setSelecionado(String(u.id))}
                        className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm transition ${
                          ativo ? "bg-tegra-blue-dark text-white" : "hover:bg-tegra-gray-light"
                        }`}
                      >
                        <span className="font-medium">{u.nome || u.email}</span>
                        {u.email && (
                          <span className={`text-xs ${ativo ? "text-white/80" : "text-tegra-text-secondary"}`}>
                            {u.email}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {error && <p className="text-sm text-tegra-error">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-tegra-gray-medium px-4 py-3 sm:px-5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !selecionado}>
            {saving ? "Enviando…" : "Enviar lead"}
          </Button>
        </div>
      </form>
    </div>
  );
}
