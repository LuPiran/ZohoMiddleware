import { useEffect, useMemo, useState } from "react";
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
  MdTrendingUp,
  MdCalendarToday,
  MdPeople,
} from "react-icons/md";
import { authService } from "../../services/auth";
import { useLoading } from "../../contexts/LoadingContext";
import MainLayout from "../../components/layout/MainLayout";
import { obterContagemFormulariosSalvos } from "../../services/savedForms";
import { leadsMedicosService } from "../../services/leadsMedicos";
import { computeConversionRate } from "../LeadsMedicos/mockLeads";
import { isConvertedLeadStatus } from "../LeadsMedicos/leadStatus";
import {
  EXTERNAL_LINKS,
  ROUTES,
  podeVerCompra,
  podeVerOcorrencia,
  podeVerProposta,
  podeVerRecompra,
  podeVerTrackingPedido,
} from "../../utils/constants";

/* ── Helpers ── */
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

/* ── KPI card ── */
function KpiCard({ icon: Icon, label, value, sub, iconBg, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500 leading-snug">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="text-lg" aria-hidden />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-slate-100" />
      ) : (
        <p className="mt-3 text-3xl font-bold text-slate-800 tabular-nums leading-none">
          {value}
        </p>
      )}
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
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
      className={`group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${borderHover} focus:outline-none focus:ring-2 focus:ring-[#1a2f5b]/30`}
    >
      {badge > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="text-[1.1rem]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">{description}</p>
        )}
      </div>
      {external ? (
        <MdOpenInNew className={`shrink-0 text-base transition-colors ${chevronColor}`} aria-hidden />
      ) : (
        <MdChevronRight className={`shrink-0 text-lg transition-colors ${chevronColor}`} aria-hidden />
      )}
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getUser();
  const { setLoading } = useLoading();

  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
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

    // Busca paralela: leads + formulários salvos
    Promise.all([
      leadsMedicosService.list().then((r) => setLeads(r.data || [])).catch(() => {}),
      obterContagemFormulariosSalvos().then(setSavedFormsCount).catch(() => {}),
    ]).finally(() => {
      setLeadsLoading(false);
      setLoading(false);
    });
  }, [navigate, setLoading]);

  /* Dados derivados */
  const conversionRate = useMemo(() => computeConversionRate(leads), [leads]);
  const convertedCount = useMemo(
    () => leads.filter((l) => isConvertedLeadStatus(l.status)).length,
    [leads],
  );
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return leads.filter((l) => {
      const d = new Date(l.criadoEm);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [leads]);

  /* Identidade do usuário */
  const nomeUsuario =
    user?.nome || user?.Nome || user?.Name || user?.nome_completo || "Usuário";
  const primeiroNome = nomeUsuario.split(" ")[0];
  const emailUsuario = user?.email || user?.Email || "";

  const goTo = (r) => navigate(r);
  const openExt = (url) => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* ── Saudação ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-800">
              {getSaudacao()}, {primeiroNome}! 👋
            </p>
            {emailUsuario && (
              <p className="mt-1 text-sm text-slate-500">{emailUsuario}</p>
            )}
          </div>
          <p className="text-sm text-slate-400 capitalize shrink-0">{getDataFormatada()}</p>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={MdPeople}
            label="Total de leads"
            value={leadsLoading ? "—" : leads.length}
            sub="na sua carteira"
            iconBg="bg-[#1a2f5b]/8 text-[#1a2f5b]"
            loading={leadsLoading}
          />
          <KpiCard
            icon={MdTrendingUp}
            label="Taxa de conversão"
            value={leadsLoading ? "—" : `${conversionRate}%`}
            sub={leadsLoading ? "" : `${convertedCount} convertido${convertedCount !== 1 ? "s" : ""}`}
            iconBg="bg-emerald-100 text-emerald-700"
            loading={leadsLoading}
          />
          <KpiCard
            icon={MdCalendarToday}
            label="Criados este mês"
            value={leadsLoading ? "—" : thisMonthCount}
            sub="novos leads"
            iconBg="bg-blue-100 text-blue-700"
            loading={leadsLoading}
          />
          <KpiCard
            icon={MdBookmarks}
            label="Form. pendentes"
            value={savedFormsCount}
            sub="aguardando envio"
            iconBg={savedFormsCount > 0 ? "bg-amber-100 text-amber-800" : "bg-tegra-blue-dark/8 text-tegra-blue-dark"}
          />
        </div>

        {/* ── Acesso rápido ── */}
        <div>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Acesso rápido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

            {/* Principal */}
            <ActionCard
              icon={MdMedicalServices}
              label="Leads Médicos"
              description="Gerencie e acompanhe seus leads"
              onClick={() => goTo(ROUTES.LEADS_MEDICOS)}
            />

            {/* Comercial */}
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

            <ActionCard
              icon={MdLanguage}
              label="Central Comercial"
              description="Materiais, lâminas e recursos técnicos"
              onClick={() => goTo(ROUTES.CENTRAL_COMERCIAL)}
            />
            {mostrarTrackingPedido && (
              <ActionCard
                icon={MdLocalShipping}
                label="Rastreamento"
                description="Rastreie pedidos enviados"
                onClick={() => openExt(EXTERNAL_LINKS.TRACKING_PEDIDO)}
                variant="teal"
                external
              />
            )}

            {/* Suporte */}
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
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
