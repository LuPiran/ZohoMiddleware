import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdShoppingCart,
  MdAssignment,
  MdReport,
  MdDescription,
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
    {
      path: ROUTES.PROPOSTA,
      label: "Proposta",
      icon: <MdDescription className="text-xl" />,
      show: true, // Sempre visível
    },
  ].filter((item) => item.show); // Filtra apenas itens visíveis

  return (
    <>
      {/* Menu desktop (sempre visível em lg+) */}
      <nav className="hidden lg:block bg-tegra-bg-primary border-b border-tegra-gray-medium relative z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? "text-tegra-blue-dark border-tegra-blue-dark"
                      : "text-tegra-text-secondary border-transparent hover:text-tegra-blue-dark hover:border-tegra-blue-dark"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Overlay transparente com blur quando menu está aberto (mobile/tablet) */}
      {isMenuOpen && (
        <div
          className="mobile-menu-overlay fixed inset-0 z-[55] lg:hidden transition-opacity duration-300"
          onClick={(e) => {
            // Só fecha se clicar diretamente no overlay, não em elementos filhos
            if (e.target === e.currentTarget) {
              closeMenu();
            }
          }}
          aria-hidden="true"
        />
      )}

      {/* Menu mobile/tablet (drawer da esquerda) - sempre renderizado */}
      <nav
        className={`mobile-menu-drawer fixed top-0 left-0 h-full w-64 sm:w-80 shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="navigation"
        aria-label="Menu de navegação"
        aria-hidden={!isMenuOpen}
        onClick={(e) => {
          // Previne que cliques dentro do drawer propaguem para o overlay
          e.stopPropagation();
        }}
      >
        {/* Cabeçalho do drawer */}
        <div className="mobile-menu-header flex items-center justify-between p-4 border-b border-tegra-gray-medium">
          <h2 className="text-lg font-semibold text-tegra-text-primary">
            Menu
          </h2>
          <button
            onClick={closeMenu}
            className="p-2 text-tegra-text-secondary hover:text-tegra-text-primary hover:bg-tegra-gray-light rounded-lg transition"
            aria-label="Fechar menu"
          >
            <MdClose className="text-2xl" />
          </button>
        </div>

        {/* Itens do menu */}
        <div className="flex flex-col py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMenu}
              className={({ isActive }) =>
                `mobile-menu-item flex items-center gap-3 px-4 py-3 mx-2 my-1 text-sm font-medium transition-colors rounded-lg ${
                  isActive
                    ? "mobile-menu-item--active"
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
    </>
  );
}
