import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdLocalShipping, MdLanguage } from "react-icons/md";
import { authService } from "../../services/auth";
import { useLoading } from "../../contexts/LoadingContext";
import MainLayout from "../../components/layout/MainLayout";
import { obterContagemFormulariosSalvos } from "../../services/savedForms";
import {
  EXTERNAL_LINKS,
  ROUTES,
  podeVerCompra,
  podeVerOcorrencia,
  podeVerProposta,
  podeVerRecompra,
  podeVerTrackingPedido,
} from "../../utils/constants";

export default function Dashboard() {

  const navigate = useNavigate();
  const user = authService.getUser();
  const { setLoading } = useLoading();
  const [savedFormsCount, setSavedFormsCount] = useState(0);
  const mostrarCompra = podeVerCompra(user);
  const mostrarRecompra = podeVerRecompra(user);
  const mostrarProposta = podeVerProposta(user);
  const mostrarOcorrencia = podeVerOcorrencia(user);
  const mostrarTrackingPedido = podeVerTrackingPedido(user);

  // Atalhos principais do sistema
  const shortcutCards = [
    ...(mostrarCompra
      ? [
          {
            id: "compra",
            label: "Compra",
            icon: <span className="text-3xl md:text-4xl"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7.16 16l.94-2h7.45a2 2 0 0 0 1.92-1.45l2.13-7.11A1 1 0 0 0 18.65 4H6.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44A2 2 0 0 0 5 17a2 2 0 0 0 2.16-1z" fill="currentColor"/></svg></span>,
            route: ROUTES.COMPRA,
          },
        ]
      : []),
    ...(mostrarRecompra
      ? [
          {
            id: "recompra",
            label: "Recompra",
            icon: <span className="text-3xl md:text-4xl"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.3-.42 2.5-1.13 3.47l1.46 1.46A7.932 7.932 0 0 0 20 12c0-4.42-3.58-8-8-8zm-6.87 2.53L3.67 7.99A7.932 7.932 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6 0-1.3.42-2.5 1.13-3.47z" fill="currentColor"/></svg></span>,
            route: ROUTES.RECOMPRA,
          },
        ]
      : []),
    ...(mostrarProposta
      ? [
          {
            id: "proposta",
            label: "Proposta",
            icon: <span className="text-3xl md:text-4xl"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M19 2H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6l-5-4zm0 18H8V4h7v5h5v11c0 1.1-.9 2-2 2zm-7-7h2v2h-2v-2zm0-4h2v2h-2V9z" fill="currentColor"/></svg></span>,
            route: ROUTES.PROPOSTA,
          },
        ]
      : []),
    ...(mostrarTrackingPedido
      ? [
          {
            id: "tracking-pedido",
            label: "Rastreamento de Pedido",
            icon: <MdLocalShipping className="text-3xl md:text-4xl" />,
            route: EXTERNAL_LINKS.TRACKING_PEDIDO,
            external: true,
            variant: "teal",
          },
        ]
      : []),
    {
      id: "central-comercial",
      label: "Central Comercial",
      icon: <MdLanguage className="text-3xl md:text-4xl" />,
      route: EXTERNAL_LINKS.CENTRAL_CONSULTOR,
      external: true,
    },
    ...(mostrarOcorrencia
      ? [
          {
            id: "ocorrencia",
            label: "Ocorrência",
            icon: <span className="text-3xl md:text-4xl"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z" fill="currentColor"/></svg></span>,
            route: ROUTES.OCORRENCIA,
          },
        ]
      : []),
    {
      id: "saved-forms",
      label: "Formulários Salvos",
      icon: <span className="text-3xl md:text-4xl"><svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V4h3v5h-3z" fill="currentColor"/></svg></span>,
      route: ROUTES.SAVED_FORMS,
      badge: savedFormsCount > 0 ? savedFormsCount : null,
    },
  ];

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/login");
      return;
    }
    
    const carregarContagem = async () => {
      try {
        const count = await obterContagemFormulariosSalvos();
        setSavedFormsCount(count);
      } catch (error) {
        console.error("Erro ao carregar contagem de formulários:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarContagem();
  }, [navigate, setLoading]);

  const nomeUsuario =
    user?.nome || user?.Nome || user?.Name || user?.nome_completo || user?.Nome_Completo || "Admin";

  return (
    <MainLayout>
      <div className="dashboard-page max-w-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 sm:py-14 md:py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white/80 rounded-2xl shadow-lg p-8 sm:p-10 flex flex-col items-center w-full">
          <div className="flex justify-center items-center w-full mb-6">
            <img 
              src="/LogoTegra3.png" 
              alt="TegraPharma Logo" 
              className="h-16 sm:h-20 md:h-24 object-contain drop-shadow-none bg-transparent rounded-none"
              style={{ maxWidth: '180px', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.04))' }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tegra-text-primary mb-2 text-center">
            Bem-vindo(a) ao Painel Administrativo TegraPharma
          </h1>
          <p className="text-base sm:text-lg text-tegra-text-secondary text-center mb-4">
            Olá, {nomeUsuario}!<br />
            Este é o seu ambiente de gestão centralizada.<br />
            Utilize o menu acima ou os atalhos abaixo para acessar as funcionalidades do sistema.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg my-4">
            {shortcutCards.map((card) => (
              <button
                key={card.id}
                onClick={() => {
                  if (card.external) {
                    window.open(card.route, "_blank", "noopener,noreferrer");
                    return;
                  }
                  navigate(card.route);
                }}
                className={`flex flex-col items-center justify-center p-5 rounded-xl shadow transition-all border focus:outline-none focus:ring-2 relative ${
                  card.external && card.variant === "teal"
                    ? "bg-teal-50/90 hover:bg-teal-100 border-teal-200 text-teal-800 shadow-[0_0_14px_rgba(20,184,166,0.12)] focus:ring-teal-400"
                    : card.external
                    ? "bg-amber-50/90 hover:bg-amber-100 border-amber-200 text-amber-800 shadow-[0_0_14px_rgba(245,158,11,0.12)] focus:ring-amber-400"
                    : "bg-tegra-blue-light/10 hover:bg-tegra-blue-light/20 border-tegra-blue-light/30 focus:ring-tegra-blue-dark"
                }`}
                type="button"
                aria-label={card.external ? `Abrir ${card.label} em nova aba` : `Ir para ${card.label}`}
              >
                {card.badge && (
                  <span className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 bg-tegra-error text-white text-xs font-bold rounded-full">
                    {card.badge}
                  </span>
                )}
                <div className={`mb-2 ${card.external && card.variant === "teal" ? "text-teal-600" : card.external ? "text-amber-700" : "text-tegra-blue-dark"}`}>{card.icon}</div>
                <span className={`font-semibold text-base text-center ${card.external && card.variant === "teal" ? "text-teal-900" : card.external ? "text-amber-900" : "text-tegra-text-primary"}`}>{card.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-tegra-text-tertiary text-center">
            Sistema desenvolvido para facilitar o controle de compras, propostas, recompras e ocorrências.<br />
            Caso precise de suporte, entre em contato com a equipe TegraPharma.
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
