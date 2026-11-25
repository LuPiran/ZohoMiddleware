import { beforeEach, describe, expect, it, vi } from "vitest";

// Banco em memória no lugar do MySQL.
const banco = new Map();
const update = vi.fn(async (id, updates) => {
  const next = { ...banco.get(id), ...updates };
  banco.set(id, next);
  return structuredClone(next);
});
vi.mock("../db/leadsRepo.js", () => ({
  getById: async (id) => (banco.has(id) ? structuredClone(banco.get(id)) : null),
  findByZohoId: async (idZoho) => {
    const lead = [...banco.values()].find((l) => String(l.idZoho) === String(idZoho));
    return lead ? structuredClone(lead) : null;
  },
  findByRegistroUf: async () => null,
  update: (...args) => update(...args),
}));

const fulana = { id: "c-fulana", nome: "Fulana Silva", email: "fulana@tegra.test", gerencia: "Marcelli Silva" };
vi.mock("./consultores.js", async (importOriginal) => ({
  ...(await importOriginal()),
  findConsultorByEmail: async (email) => (email === fulana.email ? fulana : null),
  updateConsultorUltimaAtribuicao: async () => {},
}));
vi.mock("./emailService.js", async (importOriginal) => ({
  ...(await importOriginal()),
  notifyLeadOffer: vi.fn(async () => ({})),
}));
const chamarZohoApi = vi.fn(async () => ({}));
vi.mock("./zohoApi.js", () => ({ chamarZohoApi: (...args) => chamarZohoApi(...args) }));

const { ZOHO_LEAD_STATUS } = await import("../domain/leadStatus.js");
const { createLeadFromZoho, mapZohoPayloadToLead } = await import("./leadsMedicos.js");

describe("região vinda do Dist_Regiao da ficha", () => {
  it('"Não Identificada" (gravada pelo Portal) não vira região: usa a UF', () => {
    const lead = mapZohoPayloadToLead({ idZoho: "1", Nome: "X", Dist_Regiao: "Não Identificada", "uf do crm": "SP" });
    expect(lead.regiao).toBe("SUDESTE");
  });

  it("região válida continua valendo", () => {
    const lead = mapZohoPayloadToLead({ idZoho: "1", Nome: "X", Dist_Regiao: "Centro-Oeste", "uf do crm": "SP" });
    expect(lead.regiao).toBe("CENTRO-OESTE");
  });

  it("sem região válida e sem UF fica sem região (vai pela geolocalização)", () => {
    const lead = mapZohoPayloadToLead({ idZoho: "1", Nome: "X", Dist_Regiao: "Não Identificada" });
    expect(lead.regiao).toBeNull();
  });
});

describe("reenvio para o mesmo consultor", () => {
  beforeEach(() => {
    banco.clear();
    update.mockClear();
  });

  it("lead aceito com o mesmo consultor: não reinicia a oferta", async () => {
    banco.set("L1", {
      id: "L1",
      idZoho: "Z1",
      nome: "Dra. Teste",
      consultorId: "c-fulana",
      consultor: "Fulana Silva",
      status: ZOHO_LEAD_STATUS.QUALIFICACAO,
      slaStatus: "aceito",
      historico: [],
    });
    const r = await createLeadFromZoho({
      idZoho: "Z1",
      Nome: "Dra. Teste",
      Consultor_Tegra: "Fulana Silva",
      E_mail_Consultor: fulana.email,
    });
    expect(r.alreadyExists).toBe(true);
    expect(r.lead.status).toBe(ZOHO_LEAD_STATUS.QUALIFICACAO);
    expect(update).not.toHaveBeenCalled();
    expect(banco.get("L1").slaStatus).toBe("aceito");
  });

  it("lead com outro consultor indicado continua sendo reatribuído (como hoje)", async () => {
    banco.set("L2", {
      id: "L2",
      idZoho: "Z2",
      nome: "Dr. Outro",
      consultorId: "c-outro",
      consultor: "Outro",
      status: ZOHO_LEAD_STATUS.EM_OFERTA,
      slaStatus: "ofertado",
      historico: [],
    });
    const r = await createLeadFromZoho({
      idZoho: "Z2",
      Nome: "Dr. Outro",
      Consultor_Tegra: "Fulana Silva",
      E_mail_Consultor: fulana.email,
    });
    expect(r.reassigned).toBe(true);
    expect(banco.get("L2").consultorId).toBe("c-fulana");
  });
});
