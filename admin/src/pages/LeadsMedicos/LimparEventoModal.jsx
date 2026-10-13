import { useEffect, useMemo, useState } from "react";
import { MdClose } from "react-icons/md";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import { leadsMedicosService } from "../../services/leadsMedicos";

const ACAO_LABEL = {
  excluir: "Excluir lead",
  remover_evento: "Tirar só o evento",
};

function nomesDeEventos(leads) {
  const nomes = new Map();
  for (const lead of leads) {
    const eventos = Array.isArray(lead.eventos) && lead.eventos.length
      ? lead.eventos
      : lead.origem
        ? [{ nome: lead.origem }]
        : [];
    for (const ev of eventos) {
      const nome = String(ev?.nome || "").trim();
      if (!nome) continue;
      const chave = nome.toLowerCase();
      if (!nomes.has(chave)) nomes.set(chave, nome);
    }
  }
  return [...nomes.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Admin tira um evento inteiro do Portal (ex.: o Marketing distribuiu antes
 * da hora). Primeiro mostra a simulação lead a lead; só aplica no
 * "Confirmar". Lead que só tem esse evento é excluído; médico que já estava
 * no Portal por outro evento perde só esse evento.
 */
export default function LimparEventoModal({ open, leads, onClose, onDone }) {
  const eventos = useMemo(() => nomesDeEventos(leads || []), [leads]);
  const [evento, setEvento] = useState("");
  const [devolverAoZoho, setDevolverAoZoho] = useState(true);
  const [plano, setPlano] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEvento("");
    setPlano(null);
    setError("");
    setDevolverAoZoho(true);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape" && !loading) onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const simular = async (nome) => {
    setEvento(nome);
    setPlano(null);
    setError("");
    if (!nome) return;
    setLoading(true);
    try {
      const result = await leadsMedicosService.limparEvento({ evento: nome });
      setPlano(result.data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Não foi possível simular.");
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await leadsMedicosService.limparEvento({
        evento,
        confirmar: true,
        devolverAoZoho,
      });
      onDone?.(result.data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Não foi possível tirar o evento.");
    } finally {
      setLoading(false);
    }
  };

  const itens = plano?.itens || [];
  const excluir = itens.filter((i) => i.acao === "excluir").length;
  const soEvento = itens.length - excluir;
  const aceitos = itens.filter((i) => i.aceito).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="limpar-evento-titulo"
      >
        <div className="flex items-center justify-between gap-3 border-b border-tegra-gray-medium px-4 py-3 sm:px-5">
          <div>
            <h2 id="limpar-evento-titulo" className="text-base font-semibold text-tegra-text-primary">
              Tirar evento do Portal
            </h2>
            <p className="text-xs text-tegra-text-secondary">
              Some de todas as telas, inclusive do card dos consultores. Nada muda antes de você confirmar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-tegra-text-secondary hover:bg-tegra-gray-light"
            aria-label="Fechar"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5">
          <Select
            label="Evento"
            value={evento}
            onChange={(event) => simular(event.target.value)}
            options={eventos}
            placeholder="Escolha o evento"
            disabled={loading}
          />

          {loading && !plano && (
            <p className="py-6 text-center text-sm text-tegra-text-secondary">Calculando…</p>
          )}

          {plano && (
            itens.length === 0 ? (
              <p className="py-6 text-center text-sm text-tegra-text-secondary">
                Nenhum lead com esse evento no Portal.
              </p>
            ) : (
              <>
                <p className="text-sm text-tegra-text-primary">
                  <strong>{itens.length}</strong> lead(s): <strong>{excluir}</strong> serão excluídos
                  {soEvento > 0 && (
                    <>
                      {" "}e <strong>{soEvento}</strong> perdem só esse evento (o médico já estava no
                      Portal por outro evento e o atendimento continua)
                    </>
                  )}
                  .{aceitos > 0 && <> {aceitos} já tinham sido aceitos por consultores.</>}
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-tegra-gray-medium">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-tegra-gray-light text-tegra-text-secondary">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Lead</th>
                        <th className="px-3 py-2 font-semibold">Consultor</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">O que acontece</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item) => (
                        <tr key={item.id} className="border-t border-tegra-gray-medium">
                          <td className="px-3 py-2">{item.nome || item.protocolo || item.id}</td>
                          <td className="px-3 py-2">{item.consultor || "—"}</td>
                          <td className="px-3 py-2">{item.status || "—"}</td>
                          <td
                            className={`px-3 py-2 font-medium ${
                              item.acao === "excluir" ? "text-tegra-error" : "text-tegra-blue-dark"
                            }`}
                          >
                            {ACAO_LABEL[item.acao] || item.acao}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <label className="flex items-start gap-2 text-sm text-tegra-text-primary">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={devolverAoZoho}
                    onChange={(event) => setDevolverAoZoho(event.target.checked)}
                  />
                  <span>
                    Voltar as fichas no Zoho para <strong>Novo Lead</strong>, para o Marketing reenviar depois
                    do evento (sem disparar as regras do Zoho).
                  </span>
                </label>
              </>
            )
          )}

          {error && <p className="text-sm text-tegra-error">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-tegra-gray-medium px-4 py-3 sm:px-5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={confirmar}
            disabled={loading || !itens.length}
          >
            {loading && plano ? "Aplicando…" : `Tirar ${itens.length || ""} lead(s) do evento`}
          </Button>
        </div>
      </div>
    </div>
  );
}
