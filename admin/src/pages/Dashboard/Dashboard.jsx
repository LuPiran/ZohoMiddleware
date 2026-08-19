import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdLocalShipping,
  MdLanguage,
  MdMedicalServices,
  MdShoppingCart,
  MdAssignment,
  MdDescription,
  MdReport,
  MdBookmarks,
  MdChevronRight,
  MdOpenInNew,
  MdWarningAmber,
} from "react-icons/md";
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

/* ── Saudação contextual ── */
function getSaudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getDataFormatada() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ── Card de atalho ── */
function ActionCard({ icon: Icon, label, description, onClick, variant, badge, external }) {
  const isAmber = variant === "amber";
  const isTeal = variant === "teal";

  const iconBg = isAmber
    ? "bg-amber-100 text-amber-700"
    : isTeal
      ? "bg-teal-100 text-teal-700"
      : "bg-[#1a2f5b]/8 text-[#1a2f5b]";

  const chevronColor = isAmber
    ? "text-amber-300 group-hover:text-amber-600"
    : isTeal
      ? "text-teal-300 group-hover:text-teal-600"
      : "text-slate-300 group-hover:text-[#1a2f5b]";

  const borderHover = isAmber
    ? "hover:border-amber-300"
    : isTeal
      ? "hover:border-teal-300"
      : "hover:border-[#1a2f5b]/25";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={external ? `Abrir ${label} em nova aba` : `Ir para ${label}`}
      className={`group relative flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${borderHover} focus:outline-none focus:ring-2 focus:ring-[#1a2f5b]/30`}
    >
      {/* Badge */}
      {badge > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}

      {/* Ícone */}
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className="text-xl" aria-hidden />
      </span>

      {/* Texto */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 leading-tight truncate">{label}</p>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500 leading-snug truncate">{description}</p>
        )}
      </div>

      {/* Seta / externo */}
      {external ? (
        <MdOpenInNew className={`shrink-0 text-lg transition-colors ${chevronColor}`} aria-hidden />
      ) : (
        <MdChevronRight className={`shrink-0 text-xl transition-colors ${chevronColor}`} aria-hidden />
      )}
    </button>
  );
}

/* ── Seção de cards ── */
function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {children}
      </div>
    </section>
  );
}

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

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/login");
      return;
    }
    const carregar = async () => {
      try {
        const count = await obterContagemFormulariosSalvos();
        setSavedFormsCount(count);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [navigate, setLoading]);

  const nomeUsuario =
    user?.nome ||
    user?.Nome ||
    user?.Name ||
    user?.nome_completo ||
    user?.Nome_Completo ||
    "Usuário";

  const primeiroNome = nomeUsuario.split(" ")[0];
  const emailUsuario = user?.email || user?.Email || "";

  const saudacao = getSaudacao();
  const dataHoje = getDataFormatada();

  const goTo = (route) => navigate(route);
  const openExternal = (url) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">

        {/* ── Saudação ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">
              {saudacao}, {primeiroNome}! 👋
            </p>
            {emailUsuario && (
              <p className="mt-1 text-sm text-slate-500">{emailUsuario}</p>
            )}
          </div>
          <p className="text-sm text-slate-400 capitalize">{dataHoje}</p>
        </div>

        {/* ── Alerta formulários pendentes ── */}
        {savedFormsCount > 0 && (
          <button
            type="button"
            onClick={() => goTo(ROUTES.SAVED_FORMS)}
            className="w-full flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <MdWarningAmber className="shrink-0 text-xl text-amber-600" aria-hidden />
            <p className="flex-1 text-sm font-medium text-amber-800">
              Você tem{" "}
              <span className="font-bold">
                {savedFormsCount} formulário{savedFormsCount > 1 ? "s" : ""}
              </span>{" "}
              salvo{savedFormsCount > 1 ? "s" : ""} aguardando envio.
            </p>
            <MdChevronRight className="shrink-0 text-amber-400" aria-hidden />
          </button>
        )}

        {/* ── Principal ── */}
        <Section title="Principal">
          <ActionCard
            icon={MdMedicalServices}
            label="Leads Médicos"
            description="Gerencie e acompanhe seus leads"
            onClick={() => goTo(ROUTES.LEADS_MEDICOS)}
          />
        </Section>

        {/* ── Comercial ── */}
        {(mostrarCompra || mostrarRecompra || mostrarProposta) && (
          <Section title="Comercial">
            {mostrarCompra && (
              <ActionCard
                icon={MdAssignment}
                label="Compra"
                description="Registrar nova compra"
                onClick={() => goTo(ROUTES.COMPRA)}
              />
            )}
            {mostrarRecompra && (
              <ActionCard
                icon={MdShoppingCart}
                label="Recompra"
                description="Registrar recompra de produto"
                onClick={() => goTo(ROUTES.RECOMPRA)}
              />
            )}
            {mostrarProposta && (
              <ActionCard
                icon={MdDescription}
                label="Proposta"
                description="Criar e enviar proposta"
                onClick={() => goTo(ROUTES.PROPOSTA)}
              />
            )}
          </Section>
        )}

        {/* ── Externo ── */}
        {(mostrarTrackingPedido || true) && (
          <Section title="Plataformas externas">
            <ActionCard
              icon={MdLanguage}
              label="Central Comercial"
              description="Acesse o portal de vendas"
              onClick={() => openExternal(EXTERNAL_LINKS.CENTRAL_CONSULTOR)}
              variant="amber"
              external
            />
            {mostrarTrackingPedido && (
              <ActionCard
                icon={MdLocalShipping}
                label="Rastreamento de Pedido"
                description="Rastreie pedidos enviados"
                onClick={() => openExternal(EXTERNAL_LINKS.TRACKING_PEDIDO)}
                variant="teal"
                external
              />
            )}
          </Section>
        )}

        {/* ── Suporte ── */}
        <Section title="Suporte">
          {mostrarOcorrencia && (
            <ActionCard
              icon={MdReport}
              label="Ocorrência"
              description="Registrar ou acompanhar ocorrências"
              onClick={() => goTo(ROUTES.OCORRENCIA)}
            />
          )}
          <ActionCard
            icon={MdBookmarks}
            label="Formulários Salvos"
            description={
              savedFormsCount > 0
                ? `${savedFormsCount} formulário${savedFormsCount > 1 ? "s" : ""} pendente${savedFormsCount > 1 ? "s" : ""}`
                : "Formulários salvos localmente"
            }
            onClick={() => goTo(ROUTES.SAVED_FORMS)}
            badge={savedFormsCount}
          />
        </Section>

      </div>
    </MainLayout>
  );
}
