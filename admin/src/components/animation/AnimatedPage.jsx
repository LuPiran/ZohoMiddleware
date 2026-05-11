import { motion } from "framer-motion";
import { pageVariants, pageTransition } from "./tegraMotion";

/**
 * Invólucro de página para AnimatePresence (transição entre rotas).
 */
export default function AnimatedPage({ children, className = "" }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className={`flex min-h-0 w-full flex-1 flex-col will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}
