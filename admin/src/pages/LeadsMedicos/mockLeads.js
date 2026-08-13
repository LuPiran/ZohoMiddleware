/**
 * Dados sintéticos de Leads Médicos — substituir pela API quando disponível.
 * Rótulo: SYNTHETIC
 */

export const LEAD_STATUSES = [
  "Novo",
  "Em contato",
  "Qualificado",
  "Convertido",
  "Perdido",
];

export const LEAD_SPECIALTIES = [
  "Cardiologia",
  "Dermatologia",
  "Endocrinologia",
  "Ginecologia",
  "Neurologia",
  "Ortopedia",
  "Pediatria",
  "Psiquiatria",
];

export const LEAD_UFS = [
  "SP",
  "RJ",
  "MG",
  "PR",
  "RS",
  "BA",
  "SC",
  "DF",
  "GO",
  "PE",
];

export const LEAD_ORIGINS = [
  "Indicação",
  "Site",
  "Evento",
  "LinkedIn",
  "Parceiro",
  "Cold call",
];

export const LEAD_PRIORITIES = ["Alta", "Média", "Baixa"];

export const DATE_PRESETS = [
  { id: "7d", label: "Últimos 7 dias", days: 7 },
  { id: "30d", label: "Últimos 30 dias", days: 30 },
  { id: "90d", label: "Últimos 90 dias", days: 90 },
  { id: "year", label: "Este ano", days: null },
];

const FIRST_NAMES = [
  "Ana",
  "Bruno",
  "Carla",
  "Diego",
  "Elisa",
  "Fábio",
  "Gabriela",
  "Henrique",
  "Isabela",
  "João",
  "Karen",
  "Lucas",
  "Marina",
  "Nathan",
  "Olivia",
  "Paulo",
  "Renata",
  "Sérgio",
  "Tatiana",
  "Vitor",
];

const LAST_NAMES = [
  "Almeida",
  "Barbosa",
  "Carvalho",
  "Dias",
  "Esteves",
  "Fernandes",
  "Gomes",
  "Hahn",
  "Ibrahim",
  "Junqueira",
  "Klein",
  "Lopes",
  "Mendes",
  "Nogueira",
  "Oliveira",
  "Pereira",
  "Queiroz",
  "Ribeiro",
  "Santos",
  "Teixeira",
];

const CITIES_BY_UF = {
  SP: ["São Paulo", "Campinas", "Santos"],
  RJ: ["Rio de Janeiro", "Niterói", "Petrópolis"],
  MG: ["Belo Horizonte", "Uberlândia", "Juiz de Fora"],
  PR: ["Curitiba", "Londrina", "Maringá"],
  RS: ["Porto Alegre", "Caxias do Sul", "Pelotas"],
  BA: ["Salvador", "Feira de Santana", "Ilhéus"],
  SC: ["Florianópolis", "Joinville", "Blumenau"],
  DF: ["Brasília", "Taguatinga", "Ceilândia"],
  GO: ["Goiânia", "Anápolis", "Aparecida de Goiânia"],
  PE: ["Recife", "Olinda", "Caruaru"],
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function isoDaysAgo(days, hour = 10) {
  const d = new Date();
  d.setHours(hour, 15, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildLeads(count = 48) {
  const leads = [];

  for (let i = 0; i < count; i += 1) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const createdOffset = 20 + (i % 200);
    const entryOffset = Math.max(0, createdOffset - (i % 12));
    const status = LEAD_STATUSES[i % LEAD_STATUSES.length];
    const especialidade = LEAD_SPECIALTIES[i % LEAD_SPECIALTIES.length];
    const uf = LEAD_UFS[i % LEAD_UFS.length];
    const cities = CITIES_BY_UF[uf] || ["—"];
    const origem = LEAD_ORIGINS[i % LEAD_ORIGINS.length];
    const prioridade = LEAD_PRIORITIES[i % LEAD_PRIORITIES.length];

    leads.push({
      id: `LM-${pad(1000 + i)}`,
      nome: `Dr(a). ${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@exemplo.med.br`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
      criadoEm: isoDaysAgo(createdOffset, 9 + (i % 8)),
      entradaEm: isoDaysAgo(entryOffset, 11 + (i % 6)),
      status,
      especialidade,
      uf,
      cidade: cities[i % cities.length],
      origem,
      prioridade,
      importado: i % 4 === 0,
      _synthetic: true,
    });
  }

  return leads.sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
  );
}

export const MOCK_LEADS = buildLeads(48);

export function aggregateLeadsByMonth(leads) {
  const map = new Map();

  leads.forEach((lead) => {
    const date = new Date(lead.criadoEm);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
    const label = date.toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
    const current = map.get(key) || { key, label, total: 0 };
    current.total += 1;
    map.set(key, current);
  });

  return [...map.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-8);
}

export function aggregateLeadsByStatus(leads) {
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
  leads.forEach((lead) => {
    if (counts[lead.status] !== undefined) counts[lead.status] += 1;
  });
  return LEAD_STATUSES.map((status) => ({
    name: status,
    value: counts[status],
  })).filter((item) => item.value > 0);
}

export function computeConversionRate(leads) {
  if (!leads.length) return 0;
  const converted = leads.filter((l) => l.status === "Convertido").length;
  return Math.round((converted / leads.length) * 1000) / 10;
}

export function toIsoDateLocal(date) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

export function getPresetDateRange(presetId) {
  const preset = DATE_PRESETS.find((item) => item.id === presetId);
  if (!preset) return { de: "", ate: "" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ate = toIsoDateLocal(today);

  if (preset.id === "year") {
    return { de: `${today.getFullYear()}-01-01`, ate };
  }

  const from = new Date(today);
  from.setDate(from.getDate() - (preset.days - 1));
  return { de: toIsoDateLocal(from), ate };
}
