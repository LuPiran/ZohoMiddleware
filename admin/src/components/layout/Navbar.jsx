import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdInventory2,
  MdGroups,
  MdShoppingCart,
  MdAssignment,
  MdReport,
  MdDescription,
  MdBookmarks,
  MdHelpOutline,
  MdClose,
  MdPerson,
  MdBook,
} from "react-icons/md";
import { ROUTES } from "../../utils/constants";
import SpringHover from "../animation/SpringHover";
import { hasAdminPanelPermission, isGerente } from "../../utils/permissions";
import { useMenu } from "../../contexts/MenuContext";
import { useUserDropdown } from "../../contexts/UserContext";

/**
 * Componente de Navegação
 */
export default function Navbar() {
  const { isMenuOpen, closeMenu } = useMenu();
  const { showUserDropdown, setShowUserDropdown } = useUserDropdown();
  const location = useLocation();
  const isAdmin = hasAdminPanelPermission();
  const canSeeTeams = isAdmin || isGerente();
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

  const navEntries = [
    {
      kind: "link",
      path: ROUTES.DASHBOARD,
      label: "Home",
      icon: <MdDashboard className="text-xl" />,
      show: true,
    },
    {
      kind: "link",
      path: ROUTES.USUARIOS,
      label: "Usuários",
      icon: <MdPeople className="text-xl" />,
      show: isAdmin,
    },
    {
      kind: "link",
      path: ROUTES.PRODUTOS,
      label: "Produtos",
      icon: <MdInventory2 className="text-xl" />,
      show: isAdmin,
    },
    {
      kind: "link",
      path: ROUTES.EQUIPES,
      label: "Equipes",
      icon: <MdGroups className="text-xl" />,
      show: canSeeTeams,
    },
    {
      kind: "submenu",
      key: "compra",
      label: "Compra",
      icon: <MdAssignment className="text-xl" />,
      show: true,
      isActive: (path) =>
        path === ROUTES.COMPRA || path.startsWith("/historico/compra"),
      items: [
        { to: ROUTES.COMPRA, label: "Adicionar Compra" },
        { to: ROUTES.HISTORICO_COMPRA, label: "Histórico de Compra" },
      ],
    },
    {
      kind: "submenu",
      key: "recompra",
      label: "Recompra",
      icon: <MdShoppingCart className="text-xl" />,
      show: true,
      isActive: (path) =>
        path === ROUTES.RECOMPRA || path.startsWith("/historico/recompra"),
      items: [
        { to: ROUTES.RECOMPRA, label: "Adicionar Recompra" },
        { to: ROUTES.HISTORICO_RECOMPRA, label: "Histórico de Recompra" },
      ],
    },
    {
      kind: "submenu",
      key: "proposta",
      label: "Proposta",
      icon: <MdDescription className="text-xl" />,
      show: true,
      isActive: (path) =>
        path === ROUTES.PROPOSTA || path.startsWith("/historico/proposta"),
      items: [
        { to: ROUTES.PROPOSTA, label: "Adicionar Proposta" },
        { to: ROUTES.HISTORICO_PROPOSTA, label: "Histórico de Proposta" },
      ],
    },
    {
      kind: "submenu",
      key: "ocorrencia",
      label: "Ocorrência",
      icon: <MdReport className="text-xl" />,
      show: true,
      isActive: (path) =>
        path === ROUTES.OCORRENCIA || path.startsWith("/historico/ocorrencia"),
      items: [
        { to: ROUTES.OCORRENCIA, label: "Adicionar Ocorrência" },
        { to: ROUTES.HISTORICO_OCORRENCIA, label: "Histórico de Ocorrência" },
      ],
    },
    {
      kind: "link",
      path: ROUTES.SAVED_FORMS,
      label: "Formulários Salvos",
      icon: <MdBookmarks className="text-xl" />,
      show: true,
    },
    {
      kind: "link",
      path: ROUTES.MANUAL,
      label: "Manual",
      icon: <MdBook className="text-xl" />,
      show: true,
    },
  ].filter((item) => item.show);

  return (
    <>
      {/* Menu desktop (sempre visível em lg+) */}
      <nav className="hidden lg:block bg-tegra-bg-primary border-b border-tegra-gray-medium relative z-20">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-center space-x-1 flex-wrap">
            {navEntries.map((entry) => {
              if (entry.kind === "link") {
                return (
                  <SpringHover key={entry.path} className="inline-flex">
                    <NavLink
                      to={entry.path}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                          isActive
                            ? "text-tegra-blue-dark border-tegra-blue-dark"
                            : "text-tegra-text-secondary border-transparent hover:text-tegra-blue-dark hover:border-tegra-blue-dark"
                        }`
                      }
                    >
                      {entry.icon}
                      {entry.label}
                    </NavLink>
                  </SpringHover>
                );
              }

              const parentActive = entry.isActive(location.pathname);
              return (
                <SpringHover
                  key={entry.key}
                  className="relative group inline-flex"
                >
                  <div
                    className={`flex items-center gap-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 cursor-default ${
                      parentActive
                        ? "text-tegra-blue-dark border-tegra-blue-dark"
                        : "text-tegra-text-secondary border-transparent group-hover:text-tegra-blue-dark group-hover:border-tegra-blue-dark"
                    }`}
                  >
                    {entry.icon}
                    {entry.label}
                    <span className="text-[10px] opacity-70 ml-0.5" aria-hidden>
                      ▼
                    </span>
                  </div>
                  <div className="absolute left-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible z-[100] min-w-[220px] rounded-lg border border-tegra-gray-medium bg-tegra-bg-primary shadow-lg py-1">
                    {entry.items.map((sub) => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={({ isActive }) =>
                          `block px-4 py-2.5 text-sm transition-colors ${
                            isActive
                              ? "bg-tegra-gray-light text-tegra-blue-dark font-medium"
                              : "text-tegra-text-secondary hover:bg-tegra-gray-light hover:text-tegra-blue-dark"
                          }`
                        }
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                </SpringHover>
              );
            })}
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
        className={`mobile-menu-drawer fixed top-0 left-0 h-full w-64 sm:w-80 shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
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
        <div className="mobile-menu-header flex items-center justify-between p-4 border-b border-tegra-gray-medium flex-shrink-0">
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
        <div className="flex flex-col py-2 flex-1 overflow-y-auto">
          {navEntries.map((entry) => {
            if (entry.kind === "link") {
              return (
                <NavLink
                  key={entry.path}
                  to={entry.path}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `mobile-menu-item flex items-center gap-3 px-4 py-3 mx-2 my-1 text-sm font-medium transition-colors rounded-lg ${
                      isActive
                        ? "mobile-menu-item--active"
                        : "text-tegra-text-secondary hover:text-tegra-blue-dark hover:bg-tegra-gray-light"
                    }`
                  }
                >
                  {entry.icon}
                  {entry.label}
                </NavLink>
              );
            }

            return (
              <div key={entry.key} className="mx-2 my-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-tegra-text-secondary">
                  {entry.icon}
                  {entry.label}
                </div>
                {entry.items.map((sub) => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `mobile-menu-item flex items-center gap-2 pl-6 pr-4 py-2.5 my-0.5 text-sm font-medium transition-colors rounded-lg ${
                        isActive
                          ? "mobile-menu-item--active"
                          : "text-tegra-text-secondary hover:text-tegra-blue-dark hover:bg-tegra-gray-light"
                      }`
                    }
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>

        {/* Separador */}
        <div className="h-px bg-tegra-gray-medium flex-shrink-0" />

        {/* Botão de Perfil - no rodapé */}
        <div className="flex-shrink-0 px-4 py-4">
          <button
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              closeMenu();
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium bg-gradient-to-r from-tegra-blue to-tegra-blue-light text-white rounded-lg hover:shadow-lg transition-shadow"
            type="button"
            aria-label="Abrir perfil do usuário"
          >
            <MdPerson className="text-lg" />
            Meu Perfil
          </button>
        </div>
      </nav>
    </>
  );
}
