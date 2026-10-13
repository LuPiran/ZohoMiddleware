import { useEffect, useRef, useState } from "react";
import { MdDelete, MdEdit, MdLockOpen, MdMoreVert, MdSend } from "react-icons/md";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { leadsMedicosService } from "../../services/leadsMedicos";
import { hasAdminPanelPermission } from "../../utils/permissions";
import LeadAtribuirModal from "./LeadAtribuirModal";
import LeadEditModal from "./LeadEditModal";

const ENCERRADOS = ["convert", "sem interesse", "rejeitado", "sem tratativa"];

function leadEncerrado(lead) {
  const status = String(lead?.status || "").toLowerCase();
  return ENCERRADOS.some((termo) => status.includes(termo));
}

export default function LeadRowMenu({ lead, onUpdated, onDeleted }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [devolverAoZoho, setDevolverAoZoho] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!hasAdminPanelPermission()) return null;

  const retido = lead.slaStatus === "aguardando_evento";
  const podeEnviar = !leadEncerrado(lead);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await leadsMedicosService.excluirLead(lead.id, { devolverAoZoho });
      showToast("Lead excluído do Portal.", "success", 2500);
      setConfirmDelete(false);
      onDeleted?.(lead.id);
    } catch (err) {
      showToast(
        err?.response?.data?.error || err?.message || "Não foi possível excluir o lead.",
        "error",
        3500,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async () => {
    setBusy(true);
    try {
      const result = await leadsMedicosService.liberarLead(lead.id);
      showToast("Distribuição liberada.", "success", 2500);
      setConfirmRelease(false);
      onUpdated?.(result.data);
    } catch (err) {
      showToast(
        err?.response?.data?.error || err?.message || "Não foi possível liberar o lead.",
        "error",
        3500,
      );
    } finally {
      setBusy(false);
    }
  };

  const itemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tegra-text-primary hover:bg-tegra-gray-light";

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) {
            setMenuPos({
              top: rect.bottom + 4,
              left: Math.max(8, rect.right - 208),
            });
          }
          setOpen(true);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-tegra-gray-medium text-tegra-blue-dark hover:bg-tegra-gray-light"
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MdMoreVert className="text-xl" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="fixed z-40 w-52 rounded-lg border border-tegra-gray-medium bg-white py-1 shadow-lg"
          style={{ top: menuPos?.top ?? 0, left: menuPos?.left ?? 0 }}
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
          >
            <MdEdit className="text-lg text-tegra-blue-dark" aria-hidden />
            Editar
          </button>
          {podeEnviar && (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false);
                setAssigning(true);
              }}
            >
              <MdSend className="text-lg text-tegra-blue-dark" aria-hidden />
              Enviar para consultor
            </button>
          )}
          {retido && (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false);
                setConfirmRelease(true);
              }}
            >
              <MdLockOpen className="text-lg text-tegra-blue-dark" aria-hidden />
              Liberar distribuição
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tegra-error hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              setDevolverAoZoho(true);
              setConfirmDelete(true);
            }}
          >
            <MdDelete className="text-lg" aria-hidden />
            Excluir
          </button>
        </div>
      )}

      <LeadEditModal
        open={editing}
        leadId={lead.id}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setEditing(false);
          onUpdated?.(updated);
          showToast("Lead atualizado.", "success", 2500);
        }}
      />

      <LeadAtribuirModal
        open={assigning}
        lead={lead}
        onClose={() => setAssigning(false)}
        onSaved={(updated) => {
          setAssigning(false);
          onUpdated?.(updated);
          showToast(`Lead enviado para ${updated?.consultor || "o consultor"}.`, "success", 2800);
        }}
      />

      <ConfirmModal
        open={confirmRelease}
        title="Liberar a distribuição agora?"
        description={`Este lead está esperando a data do evento${
          lead.dataEvento ? ` (${new Date(lead.dataEvento).toLocaleDateString("pt-BR")})` : ""
        }. Liberando, ele entra na fila normal e vai para um consultor.`}
        confirmLabel={busy ? "Liberando…" : "Liberar"}
        cancelLabel="Cancelar"
        icon={<MdLockOpen className="text-lg" />}
        onConfirm={busy ? undefined : handleRelease}
        onCancel={() => !busy && setConfirmRelease(false)}
      />

      <ConfirmModal
        open={confirmDelete}
        title="Excluir este lead?"
        description="Apaga o lead definitivamente do Portal. Ele some de todas as telas, inclusive do card do consultor, e sai da carteira de quem aceitou. Não pode ser desfeito."
        confirmLabel={busy ? "Excluindo…" : "Excluir definitivamente"}
        cancelLabel="Cancelar"
        variant="danger"
        icon={<MdDelete className="text-lg" />}
        onConfirm={busy ? undefined : handleDelete}
        onCancel={() => !busy && setConfirmDelete(false)}
      >
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={devolverAoZoho}
            onChange={(event) => setDevolverAoZoho(event.target.checked)}
          />
          <span>Voltar a ficha no Zoho para <strong>Novo Lead</strong> (pode ser reenviada depois).</span>
        </label>
      </ConfirmModal>
    </div>
  );
}
