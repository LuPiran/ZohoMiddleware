import { useEffect, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFaqOverlay } from "../../contexts/FaqOverlayContext";

/**
 * Modal com backdrop e painel animados (Framer Motion).
 */
export default function AnimatedModal({
  open,
  onClose,
  children,
  className = "",
  panelClassName = "",
  zClass = "z-[60]",
}) {
  const modalInstanceId = useId();
  const { suppressFaq, releaseFaq } = useFaqOverlay();

  useEffect(() => {
    if (!open) return undefined;
    const key = `animated-modal-${modalInstanceId}`;
    suppressFaq(key);
    return () => releaseFaq(key);
  }, [open, modalInstanceId, suppressFaq, releaseFaq]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 ${zClass} flex items-center justify-center px-4`}
        >
          <motion.button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 z-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`relative z-10 w-full max-w-xl rounded-xl bg-white shadow-2xl border border-tegra-gray-medium ${panelClassName} ${className}`}
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
