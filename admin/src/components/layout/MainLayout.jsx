import { NavLink, useLocation } from "react-router-dom";
import { MdHelpOutline } from "react-icons/md";
import { ROUTES } from "../../utils/constants";
import Header from "./Header";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SlaOfferModal from "./SlaOfferModal";
import { SlaOfferProvider } from "../../contexts/SlaOfferContext";
import MessagesBell from "./MessagesBell";
import NotificationBell from "./NotificationBell";

/**
 * Layout principal da aplicação.
 * Desktop (lg+): sidebar fixa à esquerda + mini topbar com bells.
 * Mobile/tablet: Header + drawer (Navbar).
 */
export default function MainLayout({ children }) {
  const location = useLocation();
  const isFaqRoute = location.pathname === ROUTES.FAQ;

  return (
    <SlaOfferProvider>
      <div className="min-h-screen bg-tegra-bg-secondary">
        {/* ── Desktop: sidebar fixa ── */}
        <Sidebar />

        {/* ── Mobile/tablet: header + drawer ── */}
        <Header />
        <Navbar />

        {/* ── Área de conteúdo (empurra para direita no desktop) ── */}
        <div className="lg:ml-[220px] flex flex-col min-h-screen">
          {/* Mini topbar — bells, só desktop */}
          <div className="hidden lg:flex items-center justify-end gap-1 h-[60px] px-5 shrink-0 border-b border-tegra-gray-medium bg-tegra-bg-primary">
            <MessagesBell />
            <NotificationBell />
          </div>

          <main className="flex-1">{children}</main>
        </div>

        {/* ── Botão FAQ flutuante ── */}
        {!isFaqRoute && (
          <NavLink
            to={ROUTES.FAQ}
            aria-label="FAQ e Ajuda"
            title="FAQ e Ajuda"
            className="fixed bottom-5 right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-tegra-blue-dark shadow-sm transition-all duration-150 hover:border-tegra-blue/40 hover:shadow-md hover:text-tegra-blue active:scale-95 focus:outline-none focus:ring-2 focus:ring-tegra-blue-light focus:ring-offset-2 sm:bottom-6 sm:right-6 sm:h-11 sm:w-11"
          >
            <MdHelpOutline className="text-[22px]" aria-hidden />
          </NavLink>
        )}

        <SlaOfferModal />
      </div>
    </SlaOfferProvider>
  );
}
