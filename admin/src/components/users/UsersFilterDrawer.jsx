import Select from "react-select";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "../ui/Button";
import { useFaqOverlay } from "../../contexts/FaqOverlayContext";
import { getTegraSelectStyles } from "../../utils/reactSelectTegraStyles";
import { TegraAnimatedMenu } from "../ui/TegraAnimatedMenu";
import { MdClose } from "react-icons/md";

registerLocale("pt-BR", ptBR);

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

const selectStyles = getTegraSelectStyles({ menuPortalZIndex: 10000 });

const datePickerPopper = "tegra-datepicker-popper";
const usersFilterDatePickerShared = {
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

export default function UsersFilterDrawer({
  open,
  onClose,
  draft,
  setDraft,
  onApply,
  onReset,
}) {
  const { suppressFaq, releaseFaq } = useFaqOverlay();

  useEffect(() => {
    if (!open) return undefined;
    const key = "users-filter-drawer";
    suppressFaq(key);
    return () => releaseFaq(key);
  }, [open, suppressFaq, releaseFaq]);

  const statusValue =
    statusOptions.find((o) => o.value === draft.status) || statusOptions[0];

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
            aria-labelledby="users-filter-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-tegra-gray-medium px-5 py-4">
              <h2
                id="users-filter-title"
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

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-tegra-text-secondary sm:text-sm">
                  Status
                </label>
                <Select
                  instanceId="users-filter-status"
                  options={statusOptions}
                  value={statusValue}
                  onChange={(opt) =>
                    setDraft((d) => ({ ...d, status: opt?.value ?? "all" }))
                  }
                  styles={selectStyles}
                  isSearchable={false}
                  components={{ Menu: TegraAnimatedMenu }}
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : null
                  }
                  menuPosition="fixed"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-tegra-text-primary">
                  Data de criação
                </p>
                <p className="mb-2 text-xs text-tegra-text-secondary">
                  Informe uma data ou um intervalo (de / até).
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-xs text-tegra-text-secondary">
                      De
                    </span>
                    <div className="tegra-datepicker-field">
                      <DatePicker
                        {...usersFilterDatePickerShared}
                        placeholderText="Data inicial"
                        selected={draft.createdFrom}
                        onChange={(date) =>
                          setDraft((d) => ({ ...d, createdFrom: date }))
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
                        {...usersFilterDatePickerShared}
                        placeholderText="Data final"
                        selected={draft.createdTo}
                        onChange={(date) =>
                          setDraft((d) => ({ ...d, createdTo: date }))
                        }
                        minDate={draft.createdFrom || undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-tegra-text-primary">
                  Data de modificação
                </p>
                <p className="mb-2 text-xs text-tegra-text-secondary">
                  Informe uma data ou um intervalo (de / até).
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-xs text-tegra-text-secondary">
                      De
                    </span>
                    <div className="tegra-datepicker-field">
                      <DatePicker
                        {...usersFilterDatePickerShared}
                        placeholderText="Data inicial"
                        selected={draft.modifiedFrom}
                        onChange={(date) =>
                          setDraft((d) => ({ ...d, modifiedFrom: date }))
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
                        {...usersFilterDatePickerShared}
                        placeholderText="Data final"
                        selected={draft.modifiedTo}
                        onChange={(date) =>
                          setDraft((d) => ({ ...d, modifiedTo: date }))
                        }
                        minDate={draft.modifiedFrom || undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-tegra-gray-medium px-5 py-4 space-y-2">
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={onApply}
              >
                Aplicar filtros
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={onReset}
              >
                Limpar filtros
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
