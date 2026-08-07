import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdShoppingCart,
  MdAssignment,
  MdReport,
  MdDescription,
  MdBookmarks,
  MdHelpOutline,
  MdClose,
  MdPerson,
  MdBook,
  MdLocalShipping,
  MdLanguage,
} from "react-icons/md";
import {
  EXTERNAL_LINKS,
  ROUTES,
  podeVerCompra,
  podeVerOcorrencia,
  podeVerProposta,
  podeVerRecompra,
  podeVerTrackingPedido,
} from "../../utils/constants";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { useMenu } from "../../contexts/MenuContext";
import { useUserDropdown } from "../../contexts/UserContext";
import { authService } from "../../services/auth";

/**
 * Componente de Navegação
 */
export default function Navbar() {
  const { isMenuOpen, closeMenu } = useMenu();
  const { showUserDropdown, setShowUserDropdown } = useUserDropdown();
  const location = useLocation();
  const isAdmin = hasAdminPanelPermission();
  const user = authService.getUser();
  const mostrarCompra = podeVerCompra(user);
  const mostrarRecompra = podeVerRecompra(user);
  const mostrarProposta = podeVerProposta(user);
  const mostrarOcorrencia = podeVerOcorrencia(user);
  const mostrarTrackingPedido = podeVerTrackingPedido(user);
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
      label: "Home",
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
      path: ROUTES.COMPRA,
      label: "Compra",
      icon: <MdAssignment className="text-xl" />,
      show: mostrarCompra,
    },
    {
      path: ROUTES.RECOMPRA,
      label: "Recompra",
      icon: <MdShoppingCart className="text-xl" />,
      show: mostrarRecompra,
    },
    {
      path: ROUTES.PROPOSTA,
      label: "Proposta",
      icon: <MdDescription className="text-xl" />,
      show: mostrarProposta,
    },
    {
      path: EXTERNAL_LINKS.CENTRAL_CONSULTOR,
      label: "Central Comercial",
      icon: <MdLanguage className="text-xl" />,
      show: true,
      external: true,
      variant: "amber",
    },
    {
      path: EXTERNAL_LINKS.TRACKING_PEDIDO,
      label: "Rastreamento de Pedido",
      icon: <MdLocalShipping className="text-xl" />,
      show: mostrarTrackingPedido,
      external: true,
      variant: "teal",
    },
    {
      path: ROUTES.OCORRENCIA,
      label: "Ocorrência",
      icon: <MdReport className="text-xl" />,
      show: mostrarOcorrencia,
    },
    {
      path: ROUTES.SAVED_FORMS,
      label: "Formulários Salvos",
      icon: <MdBookmarks className="text-xl" />,
      show: true,
    },
    {
      path: ROUTES.MANUAL,
      label: "Manual",
      icon: <MdBook className="text-xl" />,
      show: true,
    },
  ].filter((item) => item.show); // Filtra apenas itens visíveis

  return (
    <>
      {/* Menu desktop (sempre visível em lg+) */}
      <nav className="hidden lg:block bg-tegra-bg-primary border-b border-tegra-gray-medium relative z-20">
        <div className="w-full px-4">
          <div className="flex justify-center space-x-0">
            {navItems.map((item) => (
              item.external ? (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center gap-1.5 px-3 py-3 text-sm font-semibold transition-all duration-200 border-b-2 whitespace-nowrap ${
                    item.variant === "teal"
                      ? "text-teal-600 border-teal-300/80 drop-shadow-[0_0_10px_rgba(20,184,166,0.18)] hover:text-teal-700 hover:border-teal-500 hover:drop-shadow-[0_0_14px_rgba(20,184,166,0.28)]"
                      : "text-amber-700 border-amber-300/80 drop-shadow-[0_0_10px_rgba(245,158,11,0.18)] hover:text-amber-800 hover:border-amber-400 hover:drop-shadow-[0_0_14px_rgba(245,158,11,0.28)]"
                  }`}
                >
                  <span className={`text-[1.1rem] transition-transform duration-200 group-hover:translate-x-0.5 ${item.variant === "teal" ? "text-teal-500" : "text-amber-600"}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                      isActive
                        ? "text-tegra-blue-dark border-tegra-blue-dark"
                        : "text-tegra-text-secondary border-transparent hover:text-tegra-blue-dark hover:border-tegra-blue-dark"
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              )
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
        <div className="flex flex-col py-2 flex-1">
          {navItems.map((item) => (
            item.external ? (
              <a
                key={item.path}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className={`mobile-menu-item mx-2 my-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold ring-1 transition-colors ${
                  item.variant === "teal"
                    ? "text-teal-600 ring-teal-200/80 hover:bg-teal-50 hover:text-teal-700"
                    : "text-amber-700 ring-amber-200/80 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                <span className={item.variant === "teal" ? "text-teal-500" : "text-amber-600"}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
              </a>
            ) : (
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
            )
          ))}
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
