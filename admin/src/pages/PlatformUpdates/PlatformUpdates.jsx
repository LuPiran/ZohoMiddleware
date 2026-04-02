import { useNavigate } from "react-router-dom";
import { PlatformUpdatePopup } from "../../components/feedback/auth";
import { ROUTES } from "../../utils/constants";

export default function PlatformUpdates() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(61,142,190,0.18),_transparent_28%),linear-gradient(180deg,_#f5fbff_0%,_#eaf4fb_42%,_#dfeef8_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.72)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.72)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute left-6 top-6 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-tegra-blue-dark/70 shadow-[0_12px_30px_rgba(26,47,91,0.1)] backdrop-blur-sm">
          Preview de atualizacoes
        </div>
      </div>
      <PlatformUpdatePopup
        isOpen
        onContinue={() => navigate(ROUTES.LOGIN)}
      />
    </div>
  );
}