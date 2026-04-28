import { useEffect } from "react";
import Button from "../../ui/Button";
import { authService } from "../../../services/auth";
import { podeVerTrackingPedido } from "../../../utils/constants";
import {
  MdLocalShipping,
  MdChecklist,
  MdPerson,
} from "react-icons/md";

const UPDATE_CONTENT = {
  badge: "Release V3.4",
  date: "Atualizado em 28/04/2026",
  title: "Novidades do Portal",
  description:
    "Atualizamos o portal com melhorias práticas para o dia a dia do consultor, deixando os acessos mais claros e o envio de ocorrência mais consistente.",
};

const TRACKING_HIGHLIGHT = {
  label: "Tracking de Pedido no menu e na Home:",
  text: "Usuários autorizados agora contam com um acesso dedicado ao Tracking de Pedido, disponível tanto na barra superior quanto nos atalhos da tela inicial, abrindo em nova aba para consulta rápida.",
  icon: MdLocalShipping,
  iconClass: "bg-amber-100 text-amber-700",
};

const DEFAULT_HIGHLIGHTS = [
  {
    label: "Ocorrência com envio mais completo:",
    text: "Na aba de Ocorrência, os campos Motivo da Ocorrência e Observação passaram a ser obrigatórios para reduzir retrabalho e evitar solicitações incompletas.",
    icon: MdChecklist,
    iconClass: "bg-indigo-100 text-indigo-700",
  },
  {
    label: "Identificação do consultor na Ocorrência:",
    text: "As ocorrências enviadas passam a registrar automaticamente o nome do consultor no CRM, facilitando acompanhamento e suporte.",
    icon: MdPerson,
    iconClass: "bg-rose-100 text-rose-700",
  },
];

export default function PlatformUpdatePopup({ isOpen, onContinue }) {
  const user = authService.getUser();
  const highlights = podeVerTrackingPedido(user)
    ? [TRACKING_HIGHLIGHT, ...DEFAULT_HIGHLIGHTS]
    : DEFAULT_HIGHLIGHTS;
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-hidden p-2 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-tegra-blue-dark/35 backdrop-blur-sm" />

      <div className="relative my-1 flex h-[calc(100dvh-0.5rem)] max-h-[calc(100dvh-0.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-white/60 bg-white/92 shadow-[0_36px_120px_rgba(26,47,91,0.24)] backdrop-blur-xl sm:my-0 sm:h-auto sm:max-h-[92dvh] sm:rounded-[30px]">
        <div className="absolute -top-24 -right-16 h-48 w-48 rounded-full bg-tegra-blue/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-12 h-44 w-44 rounded-full bg-tegra-teal/10 blur-3xl" />
        <div className="h-1.5 w-full bg-gradient-to-r from-tegra-blue via-tegra-blue-green to-tegra-teal" />

        <div
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 pb-6 [touch-action:pan-y] sm:px-8 sm:py-8 lg:px-10"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="mb-6 flex flex-col gap-4 sm:mb-8">
            <span className="platform-updates-badge">
              <span className="platform-updates-badge-dot" aria-hidden="true" />
              {UPDATE_CONTENT.badge}
            </span>
            <div className="space-y-3">
              <h2 className="max-w-2xl text-xl font-bold tracking-tight text-tegra-blue-dark sm:text-3xl">
                {UPDATE_CONTENT.title}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-tegra-text-secondary sm:text-base sm:leading-7">
                {UPDATE_CONTENT.description}
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-tegra-blue-light/40 bg-gradient-to-r from-tegra-bg-accent/80 via-white to-tegra-bg-accent/70 px-4 py-3 shadow-[0_10px_30px_rgba(26,47,91,0.06)] sm:mb-8 sm:px-5">
            <p className="text-xs leading-5 text-tegra-blue-dark sm:text-sm sm:leading-6">
              Essas melhorias ajudam você a enxergar apenas o que faz sentido no seu perfil e a enviar solicitações com menos chance de erro.
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="h-full rounded-2xl border border-tegra-gray-medium/70 bg-white/90 px-4 py-4 shadow-[0_10px_28px_rgba(26,47,91,0.06)] transition-transform duration-200 hover:-translate-y-0.5 sm:px-5 sm:py-5"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl ${item.iconClass}`}>
                    <item.icon className="text-lg sm:text-[22px]" />
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm leading-5 text-tegra-text-primary sm:mb-2 sm:text-[15px] sm:leading-6">
                      <span className="font-bold label-gradient-animated">
                        {item.label}
                      </span>
                    </p>
                    <p className="text-sm leading-6 text-tegra-text-secondary sm:text-[15px] sm:leading-7">
                      {item.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative shrink-0 border-t border-tegra-gray-medium/40 bg-tegra-bg-accent/85 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_24px_rgba(143,169,193,0.14)] sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tegra-blue-dark/70 sm:text-sm">
                {UPDATE_CONTENT.date}
              </p>

              <Button
                type="button"
                variant="teal"
                size="md"
                onClick={onContinue}
                className="w-full min-w-36 self-start rounded-xl shadow-lg shadow-tegra-teal/20 sm:w-auto sm:self-auto"
              >
                Continuar
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
}