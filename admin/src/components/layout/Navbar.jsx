import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdShoppingCart,
  MdAssignment,
  MdReport,
  MdDescription,
  MdBookmarks,
  MdClose,
  MdBook,
  MdLocalShipping,
  MdLanguage,
  MdMedicalServices,
  MdLogout,
  MdExitToApp,
} from "react-icons/md";
import {
  EXTERNAL_LINKS,
  ROUTES,
  STORAGE_KEYS,
  podeVerCompra,
  podeVerOcorrencia,
  podeVerProposta,
  podeVerRecompra,
  podeVerTrackingPedido,
} from "../../utils/constants";
import { hasAdminPanelPermission } from "../../utils/permissions";
import { useMenu } from "../../contexts/MenuContext";
import { authService } from "../../services/auth";
import Avatar from "../ui/Avatar";
import SplashScreen from "../feedback/auth/SplashScreen";

export default function Navbar() {
  const { isMenuOpen, closeMenu } = useMenu();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = hasAdminPanelPermission();
  const user = authService.getUser();
  const prevPathnameRef = useRef(location.pathname);
  const [showSplash, setShowSplash] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const mostrarCompra = podeVerCompra(user);
  const mostrarRecompra = podeVerRecompra(user);
  const mostrarProposta = podeVerProposta(user);
  const mostrarOcorrencia = podeVerOcorrencia(user);
  const mostrarTrackingPedido = podeVerTrackingPedido(user);

  // Fecha o drawer quando a rota muda
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname && prevPathnameRef.current !== null) {
      closeMenu();
    }
    prevPathnameRef.current = location.pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Bloqueia scroll do body quando menu está aberto
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMenuOpen]);

  const handleLogout = () => {
    if (showSplash || loggingOut) return;
    setLoggingOut(true);
    closeMenu();
    setShowSplash(true);
    setTimeout(async () => {
      try {
        sessionStorage.setItem(STORAGE_KEYS.LOGOUT_SUCCESS, "true");
        await authService.logout();
        navigate(ROUTES.LOGIN, { replace: true });
      } catch {
        navigate(ROUTES.LOGIN, { replace: true });
      }
    }, 800);
  };

  const displayName =
    user?.nome || user?.Nome || user?.Name || user?.nome_completo || "Usuário";
  const emailUsuario = user?.email || user?.Email || "";

  // Mesmos grupos da Sidebar
  const groups = [
    {
      id: "principal",
      label: "Principal",
      items: [
        { path: ROUTES.DASHBOARD,     label: "Home",          Icon: MdDashboard,       show: true },
        { path: ROUTES.LEADS_MEDICOS, label: "Leads Médicos", Icon: MdMedicalServices, show: true },
        { path: ROUTES.USUARIOS,      label: "Usuários",      Icon: MdPeople,          show: isAdmin },
      ].filter((i) => i.show),
    },
    {
      id: "comercial",
      label: "Comercial",
      items: [
        { path: ROUTES.COMPRA,    label: "Compra",    Icon: MdAssignment,  show: mostrarCompra },
        { path: ROUTES.RECOMPRA,  label: "Recompra",  Icon: MdShoppingCart, show: mostrarRecompra },
        { path: ROUTES.PROPOSTA,  label: "Proposta",  Icon: MdDescription, show: mostrarProposta },
        {
          path: EXTERNAL_LINKS.CENTRAL_CONSULTOR,
          label: "Central Comercial",
          Icon: MdLanguage,
          show: true,
          external: true,
          variant: "amber",
        },
        {
          path: EXTERNAL_LINKS.TRACKING_PEDIDO,
          label: "Rastreamento",
          Icon: MdLocalShipping,
          show: mostrarTrackingPedido,
          external: true,
          variant: "teal",
        },
      ].filter((i) => i.show),
    },
    {
      id: "suporte",
      label: "Suporte",
      items: [
        { path: ROUTES.OCORRENCIA,   label: "Ocorrência",         Icon: MdReport,    show: mostrarOcorrencia },
        { path: ROUTES.SAVED_FORMS,  label: "Formulários Salvos", Icon: MdBookmarks, show: true },
        { path: ROUTES.MANUAL,       label: "Manual",             Icon: MdBook,      show: true },
      ].filter((i) => i.show),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      {showSplash && <SplashScreen message="Saindo..." />}

      {/* Overlay escurecido */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <nav
        className={`fixed top-0 left-0 h-full w-[272px] z-[60] flex flex-col bg-[#1a2f5b] shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden select-none ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="navigation"
        aria-label="Menu de navegação"
        aria-hidden={!isMenuOpen}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho: logo + fechar */}
        <div className="flex items-center justify-between h-[60px] px-4 shrink-0 border-b border-white/8">
          <img
            src="/logoCorp.png"
            alt="TegraPharma"
            className="h-8 w-auto object-contain brightness-0 invert"
          />
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <MdClose className="text-xl" aria-hidden />
          </button>
        </div>

        {/* Grupos de navegação */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) =>
                  item.external ? (
                    <li key={item.path}>
                      <a
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeMenu}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          item.variant === "teal"
                            ? "text-teal-300/80 hover:bg-teal-400/10 hover:text-teal-200"
                            : "text-amber-300/80 hover:bg-amber-400/10 hover:text-amber-200"
                        }`}
                      >
                        <item.Icon
                          className={`shrink-0 text-[1.15rem] ${
                            item.variant === "teal" ? "text-teal-400/70" : "text-amber-400/70"
                          }`}
                          aria-hidden
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        <MdExitToApp className="shrink-0 text-[0.8rem] opacity-40" aria-hidden />
                      </a>
                    </li>
                  ) : (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={closeMenu}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                            isActive
                              ? "bg-white/14 font-semibold text-white"
                              : "font-medium text-white/60 hover:bg-white/8 hover:text-white/90"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <item.Icon
                              className={`shrink-0 text-[1.15rem] ${isActive ? "text-white" : "text-white/50"}`}
                              aria-hidden
                            />
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Rodapé: usuário + logout */}
        <div className="shrink-0 border-t border-white/8 px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar user={user} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {displayName}
              </p>
              {emailUsuario && (
                <p className="truncate text-[11px] text-white/45 leading-tight mt-0.5">
                  {emailUsuario}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              aria-label="Sair"
              className="shrink-0 rounded-lg p-1.5 text-white/35 transition hover:bg-red-500/15 hover:text-red-300"
            >
              <MdLogout className="text-lg" aria-hidden />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
