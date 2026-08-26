import { useState } from "react";
import {
  MdEmail,
  MdPhone,
  MdSmartphone,
  MdBadge,
  MdPerson,
  MdBusiness,
  MdLocationOn,
  MdCategory,
  MdEvent,
  MdExpandMore,
  MdExpandLess,
  MdTag,
  MdHome,
  MdDirections,
} from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { MdOutlineMailOutline } from "react-icons/md";
import { canonicalizeLeadStatus, getLeadStatusMeta } from "./leadStatus";

/* ─────────────────────────────────────────
   Helpers de atalho
───────────────────────────────────────── */
function buildWhatsAppUrl(celular) {
  if (!celular) return null;
  const digits = celular.replace(/\D/g, "");
  const number =
    digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}

function buildMapsUrl(address) {
  if (!address) return null;
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

/* ─────────────────────────────────────────
   Botão de ação rápida (ícone)
───────────────────────────────────────── */
function QuickActionBtn({ href, Icon, label, colorClass, size = "sm" }) {
  if (!href) return null;
  const dim = size === "lg" ? "h-9 w-9 text-lg" : "h-7 w-7 text-sm";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={`shrink-0 flex items-center justify-center rounded-lg transition ${dim} ${colorClass}`}
    >
      <Icon aria-hidden />
    </a>
  );
}

/* ─────────────────────────────────────────
   Componente de status
───────────────────────────────────────── */
function LeadStatusChip({ status }) {
  const label = canonicalizeLeadStatus(status) || status || "—";
  const meta = getLeadStatusMeta(label);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        color: meta.color,
        backgroundColor: meta.soft,
        boxShadow: `inset 0 0 0 1px ${meta.color}33`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.chart || meta.color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────
   Item de detalhe — desktop
───────────────────────────────────────── */
function DetailItem({ icon: Icon, label, value, action }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-tegra-teal">
        <Icon className="text-base" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-tegra-text-secondary mb-0.5">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-tegra-blue-dark break-words flex-1">
            {value}
          </p>
          {action && (
            <QuickActionBtn
              href={action.href}
              Icon={action.Icon}
              label={action.label}
              colorClass={action.colorClass}
              size="sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Item de detalhe — mobile
───────────────────────────────────────── */
function MobileInfoRow({ icon: Icon, label, value, highlight, action }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          highlight ? "bg-teal-50 text-teal-600" : "bg-slate-50 text-slate-400"
        }`}
      >
        <Icon className="text-base" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p
          className={`text-sm font-semibold break-all ${
            highlight ? "text-teal-700" : "text-slate-700"
          }`}
        >
          {value}
        </p>
      </div>
      {action && (
        <QuickActionBtn
          href={action.href}
          Icon={action.Icon}
          label={action.label}
          colorClass={action.colorClass}
          size="lg"
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Formata endereço numa linha legível
───────────────────────────────────────── */
function formatEndereco(lead) {
  const parts = [
    lead.rua && lead.numero
      ? `${lead.rua}, ${lead.numero}`
      : lead.rua,
    lead.complemento,
    lead.bairro,
    lead.cidade && lead.estado
      ? `${lead.cidade} — ${lead.estado}`
      : lead.cidade || lead.estado,
    lead.cep
      ? `CEP ${String(lead.cep)
          .replace(/\D/g, "")
          .replace(/(\d{5})(\d{3})/, "$1-$2")}`
      : null,
  ].filter(Boolean);
  return parts.join(", ");
}

/* ─────────────────────────────────────────
   Mapa embutido — preto e branco
───────────────────────────────────────── */
function LeadMapEmbed({ lead, address }) {
  const lat = lead?.geoLat ?? lead?.lat ?? lead?.latitude ?? null;
  const lng = lead?.geoLng ?? lead?.lng ?? lead?.longitude ?? null;

  if (!address && !lat) return null;

  // Coordenadas → OpenStreetMap (grátis, sem API key)
  // Só endereço → Google Maps legacy embed
  const src =
    lat && lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.007},${lat - 0.007},${lng + 0.007},${lat + 0.007}&layer=mapnik&marker=${lat},${lng}`
      : `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=15`;

  return (
    <div className="mt-3">
      <div
        className="rounded-xl overflow-hidden border border-tegra-gray-medium/30 shadow-sm"
        style={{ filter: "grayscale(1) contrast(1.08) brightness(1.02)" }}
      >
        <iframe
          title="Localização do cliente"
          src={src}
          width="100%"
          height="200"
          style={{ border: 0, display: "block" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Componente principal
───────────────────────────────────────── */
export default function LeadDetailsCard({ lead }) {
  if (!lead) return null;

  const [showEndereco, setShowEndereco] = useState(false);

  const eventos = Array.isArray(lead.eventos) ? lead.eventos : [];
  const enderecoCompleto = formatEndereco(lead);
  const evento = eventos[0]?.nome || lead.evento || lead.origem;
  const crm = lead.numeroRegistro
    ? `${lead.numeroRegistro}${lead.ufCrm ? ` (${lead.ufCrm})` : ""}`
    : null;

  /* ── Ações rápidas ── */
  const emailAction = lead.email
    ? {
        href: `mailto:${lead.email}`,
        Icon: MdOutlineMailOutline,
        label: "Enviar e-mail",
        colorClass:
          "text-blue-400 hover:bg-blue-50 hover:text-blue-600",
      }
    : null;

  const whatsappAction = lead.celular
    ? {
        href: buildWhatsAppUrl(lead.celular),
        Icon: FaWhatsapp,
        label: "Abrir WhatsApp",
        colorClass:
          "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700",
      }
    : null;

  const mapsAction = enderecoCompleto
    ? {
        href: buildMapsUrl(enderecoCompleto),
        Icon: MdDirections,
        label: "Abrir no Google Maps",
        colorClass:
          "text-blue-400 hover:bg-blue-50 hover:text-blue-600",
      }
    : null;

  return (
    <section
      aria-label="Detalhes do lead"
      className="bg-tegra-bg-primary rounded-xl border border-tegra-gray-medium/80 shadow-sm overflow-hidden"
    >
      {/* ── Cabeçalho: nome + protocolo + status ── */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-tegra-gray-medium/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-tegra-blue-dark leading-snug">
              {lead.nome || "Lead sem nome"}
            </h2>
            {lead.protocolo && (
              <p className="mt-0.5 text-xs font-semibold text-tegra-text-secondary tracking-widest uppercase">
                <MdTag className="inline -mt-0.5 mr-0.5" aria-hidden />
                {lead.protocolo}
              </p>
            )}
          </div>
          <LeadStatusChip status={lead.status} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MOBILE (< sm)
      ══════════════════════════════════════════════ */}
      <div className="sm:hidden">
        {/* Contato */}
        <div className="px-4 pt-3 pb-1">
          <p className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Contato
          </p>
          <MobileInfoRow
            icon={MdSmartphone}
            label="Celular"
            value={lead.celular}
            highlight
            action={whatsappAction}
          />
          <MobileInfoRow
            icon={MdPhone}
            label="Telefone"
            value={lead.telefone}
            highlight
          />
          <MobileInfoRow
            icon={MdEmail}
            label="E-mail"
            value={lead.email}
            action={emailAction}
          />
        </div>

        {/* Dados profissionais */}
        <div className="px-4 pt-3 pb-1 border-t border-slate-100">
          <p className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Dados profissionais
          </p>
          <MobileInfoRow icon={MdBadge}    label="CRM / CRO"      value={crm} />
          <MobileInfoRow icon={MdCategory} label="Especialidade"   value={lead.tipoLead || lead.especialidade} />
          <MobileInfoRow icon={MdEvent}    label="Evento / origem" value={evento} />
        </div>

        {/* Atribuição */}
        <div className="px-4 pt-3 pb-1 border-t border-slate-100">
          <p className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Atribuição
          </p>
          <MobileInfoRow icon={MdPerson}   label="Consultor" value={lead.consultor} />
          <MobileInfoRow icon={MdBusiness} label="Gerência"  value={lead.gerencia} />
        </div>

        {/* Endereço — colapsável no mobile */}
        {enderecoCompleto && (
          <div className="border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEndereco((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50 transition"
            >
              <span className="flex items-center gap-2">
                <MdLocationOn className="text-slate-400" />
                Endereço
              </span>
              {showEndereco
                ? <MdExpandLess className="text-slate-400" />
                : <MdExpandMore className="text-slate-400" />}
            </button>
            {showEndereco && (
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-start gap-3">
                  <p className="text-sm text-slate-600 leading-relaxed flex-1">
                    {enderecoCompleto}
                  </p>
                  <QuickActionBtn
                    href={mapsAction?.href}
                    Icon={MdDirections}
                    label="Abrir no Google Maps"
                    colorClass="text-blue-400 hover:bg-blue-50 hover:text-blue-600"
                    size="lg"
                  />
                </div>
                <LeadMapEmbed lead={lead} address={enderecoCompleto} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP (sm+): grade com 3 colunas
      ══════════════════════════════════════════════ */}
      <div className="hidden sm:block px-6 py-5 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <DetailItem
            icon={MdEmail}
            label="E-mail"
            value={lead.email}
            action={emailAction}
          />
          <DetailItem
            icon={MdPhone}
            label="Telefone"
            value={lead.telefone}
          />
          <DetailItem
            icon={MdSmartphone}
            label="Celular"
            value={lead.celular}
            action={whatsappAction}
          />
          <DetailItem icon={MdBadge}      label="CRM / CRO"       value={crm} />
          <DetailItem icon={MdCategory}   label="Tipo de lead"     value={lead.tipoLead} />
          <DetailItem icon={MdEvent}      label="Evento / origem"  value={evento} />
          <DetailItem icon={MdPerson}     label="Consultor"        value={lead.consultor} />
          <DetailItem icon={MdBusiness}   label="Gerência"         value={lead.gerencia} />
        </div>

        {/* Endereço + Mapa */}
        {enderecoCompleto && (
          <div className="border-t border-tegra-gray-medium/40 pt-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-tegra-teal">
                <MdHome className="text-base" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-tegra-text-secondary mb-0.5">
                  Endereço
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-tegra-blue-dark flex-1">
                    {enderecoCompleto}
                  </p>
                  <QuickActionBtn
                    href={mapsAction?.href}
                    Icon={MdDirections}
                    label="Abrir no Google Maps"
                    colorClass="text-blue-400 hover:bg-blue-50 hover:text-blue-600"
                    size="sm"
                  />
                </div>
                <LeadMapEmbed lead={lead} address={enderecoCompleto} />
              </div>
            </div>
          </div>
        )}

        {/* Outros eventos */}
        {eventos.length > 1 && (
          <div className="border-t border-tegra-gray-medium/40 pt-4">
            <p className="text-xs font-medium text-tegra-text-secondary mb-2">
              Outros eventos
            </p>
            <div className="flex flex-wrap gap-2">
              {eventos.slice(1).map((ev) => (
                <span
                  key={ev.id}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  <MdEvent className="text-slate-400 text-xs" />
                  {ev.nome}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
