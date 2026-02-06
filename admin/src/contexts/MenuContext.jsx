import { createContext, useContext, useState, useCallback } from "react";

const MenuContext = createContext();

export function MenuProvider({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);
  
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);
  
  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  return (
    <MenuContext.Provider
      value={{ isMenuOpen, toggleMenu, closeMenu, openMenu }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error("useMenu must be used within MenuProvider");
  }
  return context;
}
