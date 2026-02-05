import { createContext, useContext, useState } from "react";

const LoadingContext = createContext(null);

/**
 * Provider de Loading
 * Gerencia o estado de loading global da aplicação
 */
export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);

  const setLoading = (loading) => {
    setIsLoading(loading);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

/**
 * Hook para usar o Loading
 */
export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading deve ser usado dentro de LoadingProvider");
  }
  return context;
}
