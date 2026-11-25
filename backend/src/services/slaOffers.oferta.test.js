import { beforeEach, describe, expect, it, vi } from "vitest";

// Consultores de mentira: Karizi é da gerência Ricardo; a ficha do Zoho chega
// com a gerência velha (Marcelli) — caso do chamado #14632.
const karizi = {
  id: "c-karizi",
  nome: "Karizi Pedroso",
  email: "karizi@tegra.test",
  gerencia: "Ricardo de Paula",
  perfil: "Consultor",
  regiao: "SUL",
};

const updateConsultorUltimaAtribuicao = vi.fn(async () => {});
const notifyLeadOffer = vi.fn(async () => ({ sent: true }));

vi.mock("../db/leadsRepo.js", () => ({}));
vi.mock("./geocoding.js", () => ({ haversineDistance: () => 0 }));
vi.mock("./zohoLeadSync.js", () => ({
  syncZohoLeadRejected: vi.fn(),
  syncZohoLeadDistribuicao: vi.fn(),
}));
vi.mock("./emailService.js", () => ({
  notifyLeadOffer: (...args) => notifyLeadOffer(...args),
  notifyLeadRecusado: vi.fn(),
  formatMinutes: (m) => `${m} min`,
}));
vi.mock("./consultores.js", () => ({
  findConsultorByEmail: vi.fn(async (email) => (email === karizi.email ? karizi : null)),
  findConsultoresByRegiao: vi.fn(async () => [karizi]),
  findConsultoresGestao: vi.fn(async () => []),
  getConsultorCargaAceita: () => 0,
  getConsultorDisplayName: (c) => c?.nome,
  getConsultorGerencia: (c) => c?.gerencia,
  isPerfilConsultorFila: (c) => c?.perfil === "Consultor",
  isPerfilGerencia: () => false,
  isPerfilGestao: () => false,
  listActiveConsultores: vi.fn(async () => [karizi]),
  updateConsultorUltimaAtribuicao: (...args) => updateConsultorUltimaAtribuicao(...args),
}));

const { applyOfferToLead, confirmarOfertaCriada, offerLeadOnCreate } = await import(
  "./slaOffers.js"
);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("gerência do lead na oferta", () => {
  it("usa a gerência de quem recebe, não a da ficha do Zoho", () => {
    const lead = applyOfferToLead({ gerencia: "Marcelli Silva", historico: [] }, karizi);
    expect(lead.gerencia).toBe("Ricardo de Paula");
  });

  it("consultor sem gerência mantém a da ficha", () => {
    const lead = applyOfferToLead(
      { gerencia: "Marcelli Silva", historico: [] },
      { ...karizi, gerencia: undefined },
    );
    expect(lead.gerencia).toBe("Marcelli Silva");
  });
});

describe("oferta na criação só notifica depois de gravar", () => {
  beforeEach(() => {
    notifyLeadOffer.mockClear();
    updateConsultorUltimaAtribuicao.mockClear();
  });

  it("fila: monta a oferta sem mandar e-mail; confirmarOfertaCriada manda uma vez", async () => {
    const lead = await offerLeadOnCreate({ regiao: "SUL", historico: [], gerencia: "Marcelli Silva" });
    expect(lead.slaStatus).toBe("ofertado");
    expect(lead.consultorId).toBe("c-karizi");
    expect(lead.gerencia).toBe("Ricardo de Paula");
    expect(notifyLeadOffer).not.toHaveBeenCalled();
    expect(updateConsultorUltimaAtribuicao).not.toHaveBeenCalled();

    await confirmarOfertaCriada(lead);
    await flush();
    expect(updateConsultorUltimaAtribuicao).toHaveBeenCalledWith("c-karizi", expect.any(String));
    expect(notifyLeadOffer).toHaveBeenCalledTimes(1);

    await confirmarOfertaCriada(lead); // segunda chamada não repete o e-mail
    await flush();
    expect(notifyLeadOffer).toHaveBeenCalledTimes(1);
  });

  it("consultor indicado: mesmo esquema (sem e-mail antes de gravar)", async () => {
    const lead = await offerLeadOnCreate({
      prescritorConsultorEmail: karizi.email,
      historico: [],
    });
    expect(lead.consultorId).toBe("c-karizi");
    expect(notifyLeadOffer).not.toHaveBeenCalled();
    await confirmarOfertaCriada(lead);
    await flush();
    expect(notifyLeadOffer).toHaveBeenCalledTimes(1);
  });

  it("lead que nunca foi gravado não gera e-mail", async () => {
    await offerLeadOnCreate({ regiao: "SUL", historico: [] });
    await flush();
    expect(notifyLeadOffer).not.toHaveBeenCalled();
  });
});
