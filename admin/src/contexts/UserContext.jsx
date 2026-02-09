import { createContext, useContext, useState } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <UserContext.Provider value={{ showUserDropdown, setShowUserDropdown }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserDropdown() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserDropdown must be used within UserProvider");
  }
  return context;
}
