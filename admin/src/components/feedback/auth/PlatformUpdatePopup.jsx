import { useEffect } from "react";
import Button from "../../ui/Button";

const UPDATE_CONTENT = {
  badge: "Release V2: O Portal do Consultor foi atualizado!",
  date: "Atualizado em 11/03/2026",
  description:
    "Seu portal ganhou novidades! Veja abaixo o que melhoramos para facilitar o seu atendimento:",
  highlights: [
    {
      label: "Mais Velocidade:",
      text: "Otimizamos os motores do sistema! O portal está carregando mais rápido para garantir uma navegação fluida e sem travamentos.",
    },
    {
      label: "Ocorrências via Número do Pedido:",
      text: "Agilize seus registros buscando os dados diretamente pelo número do pedido. Muito mais prático.",
    },
  ],
};

export default function PlatformUpdatePopup({ isOpen, onContinue }) {
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-tegra-blue-dark/35 backdrop-blur-sm" />

      <div className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/60 bg-white/88 shadow-[0_32px_120px_rgba(26,47,91,0.28)] backdrop-blur-xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-tegra-blue via-tegra-blue-green to-tegra-teal" />

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div className="mb-6 flex flex-col gap-3 sm:mb-7">
            <span className="platform-updates-badge">
              <span className="platform-updates-badge-dot" aria-hidden="true" />
              {UPDATE_CONTENT.badge}
            </span>
            <div>
              <p className="max-w-2xl text-[15px] leading-7 text-tegra-text-secondary sm:text-base">
                {UPDATE_CONTENT.description}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {UPDATE_CONTENT.highlights.map((item) => (
              <div
                key={item.label}
                className="h-full rounded-2xl border border-tegra-gray-medium/80 bg-white/80 px-5 py-5 shadow-[0_10px_28px_rgba(26,47,91,0.08)]"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-tegra-blue-green" />
                  <p className="text-sm leading-7 text-tegra-text-primary sm:text-[15px]">
                    <span className="font-bold label-gradient-animated">
                      {item.label}
                    </span>{" "}
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/70 bg-tegra-bg-accent/80 px-4 py-4 shadow-[0_12px_30px_rgba(143,169,193,0.14)] sm:mt-8 sm:px-5 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tegra-blue-dark/70 sm:text-sm">
                {UPDATE_CONTENT.date}
              </p>

              <Button
                type="button"
                variant="teal"
                size="md"
                onClick={onContinue}
                className="min-w-32 self-start shadow-lg shadow-tegra-teal/20 sm:self-auto"
              >
                Continuar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}