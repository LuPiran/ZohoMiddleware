import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import Button from "../ui/Button";
import { MdClose } from "react-icons/md";
import { useFaqOverlay } from "../../contexts/FaqOverlayContext";

registerLocale("pt-BR", ptBR);

const selectClass =
  "w-full rounded-lg border border-tegra-gray-medium bg-white px-3 py-2.5 text-sm text-tegra-text-primary focus:outline-none focus:ring-2 focus:ring-tegra-teal";

const datePickerPopper = "tegra-datepicker-popper";
const historicoDatePickerShared = {
  locale: "pt-BR",
  dateFormat: "dd/MM/yyyy",
  isClearable: true,
  showPopperArrow: false,
  popperClassName: datePickerPopper,
  className: "w-full",
  popperPlacement: "bottom-start",
  popperProps: {
    strategy: "fixed",
  },
  popperModifiers: [
    {
      name: "offset",
      options: { offset: [0, 8] },
    },
    {
      name: "preventOverflow",
      options: {
        rootBoundary: "viewport",
        padding: 8,
      },
    },
    {
      name: "flip",
      options: {
        fallbackPlacements: ["top-start"],
      },
    },
  ],
};

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   showConsultorFiltro: boolean;
 *   userId: string | null;
 *   consultores: { id: string; nome: string }[];
 *   draft: { consultorFiltro: null | 'equipe' | string; createdFrom: string; createdTo: string };
 *   setDraft: React.Dispatch<React.SetStateAction<{ consultorFiltro: null | 'equipe' | string; createdFrom: string; createdTo: string }>>;
 *   onApply: () => void;
 *   onReset: () => void;
 * }} props
 */
export default function HistoricoFilterDrawer({
  open,
  onClose,
  showConsultorFiltro,
  userId,
  consultores,
  draft,
  setDraft,
  onApply,
  onReset,
}) {
  const { suppressFaq, releaseFaq } = useFaqOverlay();

  useEffect(() => {
    if (!open) return undefined;
    const key = "historico-filter-drawer";
    suppressFaq(key);
    return () => releaseFaq(key);
  }, [open, suppressFaq, releaseFaq]);

  const selectValue =
    draft.consultorFiltro === "equipe"
      ? "equipe"
      : draft.consultorFiltro ?? userId ?? "";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[55] bg-black/35 backdrop-blur-[1px]"
            aria-label="Fechar filtros"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.aside
            className="fixed right-0 top-0 z-[56] flex h-full w-full max-w-md flex-col border-l border-tegra-gray-medium bg-tegra-bg-primary shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="historico-filter-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-tegra-gray-medium px-5 py-4">
              <h2
                id="historico-filter-title"
                className="text-lg font-bold text-tegra-text-primary"
              >
                Filtros
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-tegra-text-secondary transition hover:bg-tegra-gray-light hover:text-tegra-text-primary"
                aria-label="Fechar"
              >
                <MdClose className="text-2xl" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {showConsultorFiltro && userId && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-tegra-text-secondary sm:text-sm">
                    Consultor
                  </label>
                  {consultores.length === 0 ? (
                    <p className="text-sm text-tegra-text-secondary">
                      Carregando consultores da equipe…
                    </p>
                  ) : (
                    <select
                      className={selectClass}
                      value={selectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "equipe") {
                          setDraft((prev) => ({ ...prev, consultorFiltro: "equipe" }));
                        } else {
                          setDraft((prev) => ({ ...prev, consultorFiltro: v || userId }));
                        }
                      }}
                    >
                      <option value={userId}>Meu histórico</option>
                      <option value="equipe">Toda a equipe</option>
                      {consultores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome || "—"}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-2 text-xs text-tegra-text-secondary">
                    Por padrão são listadas primeiro as suas atividades. Escolha
                    outro consultor ou toda a equipe para ampliar a lista.
                  </p>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold text-tegra-text-primary">
                  Data de registro
                </p>
                <p className="mb-2 text-xs text-tegra-text-secondary">
                  Informe uma data ou intervalo (de / até).
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-xs text-tegra-text-secondary">
                      De
                    </span>
                    <div className="tegra-datepicker-field">
                      <DatePicker
                        {...historicoDatePickerShared}
                        placeholderText="Data inicial"
                        selected={
                          draft.createdFrom ? new Date(`${draft.createdFrom}T00:00:00`) : null
                        }
                        onChange={(date) =>
                          setDraft((prev) => ({
                            ...prev,
                            createdFrom: date
                              ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                              : "",
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-tegra-text-secondary">
                      Até
                    </span>
                    <div className="tegra-datepicker-field">
                      <DatePicker
                        {...historicoDatePickerShared}
                        placeholderText="Data final"
                        minDate={
                          draft.createdFrom ? new Date(`${draft.createdFrom}T00:00:00`) : undefined
                        }
                        selected={
                          draft.createdTo ? new Date(`${draft.createdTo}T00:00:00`) : null
                        }
                        onChange={(date) =>
                          setDraft((prev) => ({
                            ...prev,
                            createdTo: date
                              ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                              : "",
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-tegra-gray-medium px-5 py-4">
              <Button type="button" variant="secondary" onClick={onReset}>
                Limpar
              </Button>
              <Button type="button" variant="primary" onClick={onApply}>
                Aplicar
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
