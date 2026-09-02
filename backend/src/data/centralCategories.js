/**
 * Catálogo da aplicação — IDs estáveis nossos.
 * O SharePoint entra só via sharepointFolderId (preenchido no bootstrap).
 * matchNames é usado uma única vez, na vinculação inicial.
 */

export const CENTRAL_SECTIONS = [
  { id: "dia-a-dia", label: "Materiais do dia a dia", asGrid: true, sort: 10 },
  { id: "tecnico", label: "Conteúdo técnico", asGrid: false, sort: 20 },
  { id: "treino", label: "Treinamento e operação", asGrid: false, sort: 30 },
];

export const CENTRAL_CATEGORIES = [
  {
    id: "lp",
    name: "Lâminas de produtos",
    desc: "UsaLine, LatamLine e ProLine",
    icon: "droplet",
    sectionId: "dia-a-dia",
    sort: 10,
    matchNames: ["laminas de produtos"],
  },
  {
    id: "la",
    name: "Lâminas de patologia",
    desc: "Dor, sono, oncologia e mais",
    icon: "heart",
    sectionId: "dia-a-dia",
    sort: 20,
    matchNames: ["laminas de patologia"],
  },
  {
    id: "et",
    name: "Estratégia terapêutica",
    desc: "Escolha por patologia ou por produto",
    icon: "target",
    sectionId: "dia-a-dia",
    sort: 30,
    matchNames: ["estrategia terapeutica"],
  },
  {
    id: "mc",
    name: "Materiais comerciais",
    desc: "Portfólio, guias e apresentações",
    icon: "briefcase",
    sectionId: "dia-a-dia",
    sort: 40,
    matchNames: ["materiais comerciais"],
  },
  {
    id: "ar",
    name: "Artigos científicos",
    desc: "Organizados por assunto",
    icon: "micro",
    sectionId: "tecnico",
    sort: 10,
    matchNames: ["artigos cientificos"],
  },
  {
    id: "co",
    name: "COAs — Certificados de análise",
    desc: "Por linha de produto",
    icon: "check",
    sectionId: "tecnico",
    sort: 20,
    matchNames: ["coas", "certificados de analise", "coa"],
  },
  {
    id: "eb",
    name: "Ebooks",
    desc: "CBG, CBN, THC e canabinoides menores",
    icon: "book",
    sectionId: "tecnico",
    sort: 30,
    matchNames: ["ebooks", "e-books"],
  },
  {
    id: "apostila",
    name: "Apostila — Guia prático de relacionamento com profissionais técnicos",
    desc: "",
    icon: "book",
    sectionId: "tecnico",
    sort: 40,
    matchNames: [
      "apostila - guia pratico de relacionamento com profissionais tecnicos",
      "guia pratico de relacionamento",
    ],
  },
  {
    id: "aula",
    name: "Aula técnica de produtos",
    desc: "Treinamento completo — Consultor 2026",
    icon: "grad",
    sectionId: "treino",
    sort: 10,
    matchNames: [
      "aula tecnica de produtos",
      "aula produtos - consultor 2026",
      "aula produtos",
    ],
  },
  {
    id: "lk",
    name: "Links úteis",
    desc: "Trilha, Anvisa, RDV, e-mail",
    icon: "link",
    sectionId: "treino",
    sort: 20,
    matchNames: ["links uteis"],
  },
  {
    id: "ev",
    name: "Eventos",
    desc: "Verba e relatório padrão",
    icon: "cal",
    sectionId: "treino",
    sort: 30,
    matchNames: ["eventos"],
  },
];

export function normalizeCatalogName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Só no bootstrap: nome do SharePoint → categoria nossa. */
export function matchCategoryBySharePointName(sharePointName, categories = CENTRAL_CATEGORIES) {
  const n = normalizeCatalogName(sharePointName);
  if (!n) return null;
  return (
    categories.find((category) =>
      (category.matchNames || [normalizeCatalogName(category.name)]).some(
        (alias) => n === alias,
      ),
    ) ||
    categories.find((category) =>
      (category.matchNames || []).some(
        (alias) => alias.length >= 8 && (n.includes(alias) || alias.includes(n)),
      ),
    ) ||
    null
  );
}
