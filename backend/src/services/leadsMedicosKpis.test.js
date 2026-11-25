import { describe, expect, it, vi } from "vitest";

// Caso do chamado #14632: equipe da Marcelli (Bruno + ela), com leads da
// gerência dela que foram parar com a Karizi (outra gerência) e um lead com o
// nome do consultor gravado diferente ("Marcelo Silva") mas o id da Marcelli.
const marcelli = {
  id: "c-marcelli",
  nome: "Marcelli Silva",
  email: "marcelli@tegra.test",
  gerencia: "Marcelli Silva",
  perfil: "Gerencia",
};
const bruno = { id: "c-bruno", nome: "Bruno Netto", email: "bruno@tegra.test", gerencia: "Marcelli Silva" };

const leadsDaGerencia = [
  { id: "L1", consultorId: "c-bruno", consultor: "Bruno Netto", status: "Lead Em Qualificação", historico: [] },
  { id: "L2", consultorId: "c-bruno", consultor: "Bruno Netto", status: "Lead Convertido", dataConversao: "2026-11-10T12:00:00Z", historico: [] },
  { id: "L3", consultorId: "c-marcelli", consultor: "Marcelo Silva", status: "Lead Em Oferta", historico: [] },
  {
    // Está com a Karizi hoje, mas o Bruno recusou antes: a recusa conta pra ele.
    id: "L4",
    consultorId: "c-karizi",
    consultor: "Karizi Pedroso",
    status: "Lead Em Qualificação",
    historico: [
      { action: "lead_rejeitado_recusa", consultorId: "c-bruno", motivoRejeicao: "recusa", at: "2026-11-01T10:00:00Z" },
    ],
  },
  { id: "L5", consultorId: "c-karizi", consultor: "Karizi Pedroso", status: "Lead Em Oferta", historico: [] },
];

vi.mock("./consultores.js", () => ({
  findConsultorByEmail: async (email) => (email === marcelli.email ? marcelli : null),
  getConsultorDisplayName: (c) => c?.nome,
  getConsultorGerencia: (c) => c?.gerencia,
}));
vi.mock("./leadsMedicos.js", () => ({
  listLeadsForGerencia: async () => ({ equipe: [bruno, marcelli], leads: leadsDaGerencia }),
  resolveViewerRole: (perfil) => (String(perfil).toLowerCase().includes("gerenc") ? "gerente" : "consultor"),
  toLeadDetail: (lead) => ({ id: lead.id }),
}));

const { buildEquipeKpis } = await import("./leadsMedicosKpis.js");

describe("KPIs da equipe", () => {
  it("só a equipe cadastrada + a gerente viram linha (sem Karizi, sem 'Marcelo Silva')", async () => {
    const kpis = await buildEquipeKpis({ perfil: "Gerencia", email: marcelli.email });
    const nomes = kpis.porConsultor.map((c) => c.nome).sort();
    expect(nomes).toEqual(["Bruno Netto", "Marcelli Silva"]);
    expect(kpis.resumo.consultores).toBe(2);
  });

  it("os leads da própria gerente entram na linha dela, mesmo com o nome gravado diferente", async () => {
    const kpis = await buildEquipeKpis({ perfil: "Gerencia", email: marcelli.email });
    const linhaMarcelli = kpis.porConsultor.find((c) => c.nome === "Marcelli Silva");
    expect(linhaMarcelli.totalLeads).toBe(1);
  });

  it("totais contam só os leads da equipe; leads de fora não aparecem na lista", async () => {
    const kpis = await buildEquipeKpis({ perfil: "Gerencia", email: marcelli.email });
    const linhaBruno = kpis.porConsultor.find((c) => c.nome === "Bruno Netto");
    expect(linhaBruno.totalLeads).toBe(2);
    expect(linhaBruno.convertidos).toBe(1);
    expect(kpis.resumo.totalLeads).toBe(3);
    expect(kpis.leads.map((l) => l.id).sort()).toEqual(["L1", "L2", "L3"]);
  });

  it("recusa de um membro conta mesmo se o lead hoje está com alguém de fora", async () => {
    const kpis = await buildEquipeKpis({ perfil: "Gerencia", email: marcelli.email });
    const linhaBruno = kpis.porConsultor.find((c) => c.nome === "Bruno Netto");
    expect(linhaBruno.recusados).toBe(1);
  });

  it("quem não é gerente continua barrado", async () => {
    await expect(buildEquipeKpis({ perfil: "Consultor", email: bruno.email })).rejects.toMatchObject({ status: 403 });
  });
});
