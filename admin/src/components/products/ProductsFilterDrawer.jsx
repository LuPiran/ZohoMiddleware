import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { MdClose } from "react-icons/md";
import { useFaqOverlay } from "../../contexts/FaqOverlayContext";

export default function ProductsFilterDrawer({
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
    const key = "products-filter-drawer";
    suppressFaq(key);
    return () => releaseFaq(key);
  }, [open, suppressFaq, releaseFaq]);

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
            aria-labelledby="products-filter-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-tegra-gray-medium px-5 py-4">
              <h2
                id="products-filter-title"
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
              <Input
                label="Fabricante"
                value={draft.fabricante}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, fabricante: e.target.value }))
                }
                placeholder="Contém…"
              />
              <Input
                label="Marca"
                value={draft.marca}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, marca: e.target.value }))
                }
                placeholder="Contém…"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Preço mínimo (R$)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.precoMin}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, precoMin: e.target.value }))
                  }
                  placeholder="0,00"
                />
                <Input
                  label="Preço máximo (R$)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.precoMax}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, precoMax: e.target.value }))
                  }
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-tegra-gray-medium px-5 py-4">
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
