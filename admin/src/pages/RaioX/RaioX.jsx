import { useEffect, useState } from "react";
import { MdArticle, MdErrorOutline, MdRefresh } from "react-icons/md";
import MainLayout from "../../components/layout/MainLayout";
import { raioxService } from "../../services/raiox";

/**
 * "Raio-X do Portal" — documentação técnica completa (arquitetura, schema do
 * banco, modelos de e-mail, lacunas de segurança conhecidas). Restrito a
 * Admin Painel: a rota já é guardada por AdminRoute, e o backend confere de
 * novo via requireAdmin — o front nunca é a única barreira.
 *
 * O HTML vem via fetch autenticado (Bearer) e é renderizado num
 * <iframe srcdoc>, isolado de verdade do resto do Portal (CSS/JS não vaza
 * em nenhuma direção) — mesma técnica já usada nos modelos de e-mail dentro
 * do próprio documento.
 */
export default function RaioX() {
  const [status, setStatus] = useState("loading");
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setError("");
      try {
        const content = await raioxService.getHtml();
        if (cancelled) return;
        setHtml(content);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        const statusCode = err.response?.status;
        if (statusCode === 403) {
          setError("Acesso restrito a administradores do painel.");
        } else if (statusCode === 404) {
          setError("Documento ainda não gerado no servidor.");
        } else {
          setError("Não foi possível carregar a documentação agora.");
        }
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-tegra-blue-light/15 text-tegra-blue-dark flex-shrink-0">
            <MdArticle className="text-2xl" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-tegra-text-primary">
              Raio-X do Portal
            </h1>
            <p className="mt-0.5 text-sm text-tegra-text-secondary">
              Documentação técnica completa — arquitetura, banco de dados,
              modelos de e-mail e lacunas conhecidas. Acesso restrito a
              administradores.
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6">
        <div className="rounded-2xl border border-tegra-gray-light bg-white shadow-sm overflow-hidden h-[calc(100vh-190px)] min-h-[420px]">
          {status === "loading" && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <span className="h-10 w-10 rounded-full border-[3px] border-tegra-blue-light/30 border-t-tegra-blue-dark animate-spin" />
              <p className="text-sm text-tegra-text-secondary">
                Carregando documentação técnica…
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <MdErrorOutline className="text-2xl" />
              </span>
              <p className="text-base font-semibold text-tegra-text-primary">
                Não foi possível abrir o documento
              </p>
              <p className="max-w-md text-sm text-tegra-text-secondary">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-1 inline-flex items-center gap-2 rounded-lg bg-tegra-blue-dark px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-tegra-blue-light"
              >
                <MdRefresh className="text-lg" />
                Tentar de novo
              </button>
            </div>
          )}

          {status === "ready" && (
            <iframe
              title="Raio-X do Portal"
              srcDoc={html}
              sandbox=""
              className="h-full w-full border-0 bg-white"
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
