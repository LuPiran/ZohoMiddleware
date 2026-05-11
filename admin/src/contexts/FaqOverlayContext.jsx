import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const FaqOverlayContext = createContext(null);

/**
 * Controla quando o botão flutuante FAQ deve ficar oculto (filtros, modais, etc.).
 */
export function FaqOverlayProvider({ children }) {
  const [keys, setKeys] = useState(() => new Set());

  const suppressFaq = useCallback((key) => {
    setKeys((prev) => new Set(prev).add(key));
  }, []);

  const releaseFaq = useCallback((key) => {
    setKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      suppressFaq,
      releaseFaq,
      isFaqBlocked: keys.size > 0,
    }),
    [keys, suppressFaq, releaseFaq]
  );

  return (
    <FaqOverlayContext.Provider value={value}>
      {children}
    </FaqOverlayContext.Provider>
  );
}

export function useFaqOverlay() {
  const ctx = useContext(FaqOverlayContext);
  if (!ctx) {
    throw new Error("useFaqOverlay deve ser usado dentro de FaqOverlayProvider");
  }
  return ctx;
}
