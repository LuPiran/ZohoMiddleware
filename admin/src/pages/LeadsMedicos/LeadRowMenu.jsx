import { useEffect, useRef, useState } from "react";
import { MdDelete, MdEdit, MdMoreVert } from "react-icons/md";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { useToast } from "../../components/feedback/auth/ToastContainer";
import { leadsMedicosService } from "../../services/leadsMedicos";
import { hasAdminPanelPermission } from "../../utils/permissions";
import LeadEditModal from "./LeadEditModal";

export default function LeadRowMenu({ lead, onUpdated, onDeleted }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await leadsMedicosService.excluirLead(lead.id);
      showToast("Lead excluído.", "success", 2500);
      setConfirmDelete(false);
      onDeleted?.(lead.id);
    } catch (err) {
      showToast(
        err?.response?.data?.error || err?.message || "Não foi possível excluir o lead.",
        "error",
        3500,
      );
    } finally {
      setDeleting(false);
    }
  };

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
              left: Math.max(8, rect.right - 144),
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
          className="fixed z-40 w-36 rounded-lg border border-tegra-gray-medium bg-white py-1 shadow-lg"
          style={{ top: menuPos?.top ?? 0, left: menuPos?.left ?? 0 }}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tegra-text-primary hover:bg-tegra-gray-light"
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
          >
            <MdEdit className="text-lg text-tegra-blue-dark" aria-hidden />
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tegra-error hover:bg-red-50"
            onClick={() => {
              setOpen(false);
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

      <ConfirmModal
        open={confirmDelete}
        title="Excluir este lead?"
        description="Isso apaga o lead definitivamente da base do Portal. Não afeta o registro no Zoho, e não pode ser desfeito por aqui."
        confirmLabel={deleting ? "Excluindo…" : "Excluir definitivamente"}
        cancelLabel="Cancelar"
        variant="danger"
        icon={<MdDelete className="text-lg" />}
        onConfirm={deleting ? undefined : handleDelete}
        onCancel={() => !deleting && setConfirmDelete(false)}
      />
    </div>
  );
}
