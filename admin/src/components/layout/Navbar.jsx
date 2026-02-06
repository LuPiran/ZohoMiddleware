import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdShoppingCart,
  MdAssignment,
  MdReport,
  MdClose,
} from "react-icons/md";
import { ROUTES } from "../../utils/constants";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { useMenu } from "../../contexts/MenuContext";

/**
 * Componente de Navegação
 */
export default function Navbar() {
  const { isMenuOpen, closeMenu } = useMenu();
  const location = useLocation();
  const isAdmin = hasAdminPanelPermission();
  const prevPathnameRef = useRef(location.pathname);

  // Fecha o menu apenas quando a rota realmente muda (não na primeira renderização)
  useEffect(() => {
    // Só fecha se a rota realmente mudou (não na primeira renderização)
    if (prevPathnameRef.current !== location.pathname && prevPathnameRef.current !== null) {
      closeMenu();
    }
    prevPathnameRef.current = location.pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Bloqueia scroll do body quando menu está aberto (mobile/tablet)
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    // Limpa o estilo quando componente desmonta
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const navItems = [
    {
      path: ROUTES.DASHBOARD,
      label: "Dashboard",
      icon: <MdDashboard className="text-xl" />,
      show: true, // Sempre visível
    },
    {
      path: ROUTES.USUARIOS,
      label: "Usuários",
      icon: <MdPeople className="text-xl" />,
      show: isAdmin, // Apenas para Admin Painel
    },
    {
      path: ROUTES.RECOMPRA,
      label: "Recompra",
      icon: <MdShoppingCart className="text-xl" />,
      show: true, // Sempre visível
    },
    {
      path: ROUTES.COMPRA,
      label: "Compra",
      icon: <MdAssignment className="text-xl" />,
      show: true, // Sempre visível
    },
    {
      path: ROUTES.OCORRENCIA,
      label: "Ocorrência",
      icon: <MdReport className="text-xl" />,
      show: true, // Sempre visível
    },
  ].filter((item) => item.show); // Filtra apenas itens visíveis

  return (
    <nav className="bg-tegra-bg-primary border-b border-tegra-gray-medium">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto no-scrollbar whitespace-nowrap py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMenu}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                `flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? "text-tegra-blue-dark bg-tegra-blue-light"
                    : "text-tegra-text-secondary hover:text-tegra-blue-dark hover:bg-tegra-gray-light"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
  );
}
