import { MdClose, MdShoppingCart, MdCampaign } from "react-icons/md";

export default function ContinuarCompraModal({
  open,
  onClose,
  onVenda,
  onQualificarMkt,
  submitting,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0B2340]/55 backdrop-blur-[2px] p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="continuar-compra-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-tegra-gray-medium px-5 py-4">
          <div>
            <h2 id="continuar-compra-title" className="text-lg font-bold text-tegra-blue-dark">
              O que acontece agora com esse lead?
            </h2>
            <p className="mt-0.5 text-sm text-tegra-text-secondary">
              Escolha um caminho antes de continuar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="shrink-0 rounded-lg p-1.5 text-tegra-text-secondary transition hover:bg-tegra-gray-light disabled:opacity-40"
            aria-label="Fechar"
          >
            <MdClose className="text-xl" />
          </button>
        </header>

        <div className="p-5 space-y-3">
          <button
            type="button"
            onClick={onVenda}
            disabled={submitting}
            className="w-full flex items-start gap-3 rounded-xl border-2 border-tegra-teal/40 bg-tegra-teal/5 p-4 text-left transition hover:border-tegra-teal hover:bg-tegra-teal/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tegra-teal/15 text-tegra-teal">
              <MdShoppingCart className="text-xl" aria-hidden />
            </span>
            <span>
              <span className="block font-bold text-tegra-blue-dark">
                Vou fazer a primeira venda
              </span>
              <span className="mt-0.5 block text-sm text-tegra-text-secondary">
                Continua pra Compra, com os dados do médico já preenchidos.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onQualificarMkt}
            disabled={submitting}
            className="w-full flex items-start gap-3 rounded-xl border-2 border-violet-300 bg-violet-50 p-4 text-left transition hover:border-violet-500 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-700 border-t-transparent" />
              ) : (
                <MdCampaign className="text-xl" aria-hidden />
              )}
            </span>
            <span>
              <span className="block font-bold text-tegra-blue-dark">
                Apenas qualificar para o Marketing
              </span>
              <span className="mt-0.5 block text-sm text-tegra-text-secondary">
                Registra a tentativa e encerra sua atuação aqui — sem criar nenhuma compra.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
