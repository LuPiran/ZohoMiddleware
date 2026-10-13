import { beforeEach, describe, expect, it, vi } from "vitest";

// Banco em memória no lugar do MySQL.
const banco = new Map();
vi.mock("../db/leadsRepo.js", () => ({
  getById: async (id) => (banco.has(id) ? structuredClone(banco.get(id)) : null),
  listAll: async () => [...banco.values()].map((lead) => structuredClone(lead)),
  remove: async (id) => {
    banco.delete(id);
  },
  update: async (id, updates) => {
    const next = { ...banco.get(id), ...updates };
    banco.set(id, next);
    return structuredClone(next);
  },
}));

const decrementCargaAceita = vi.fn(async () => {});
vi.mock("./consultores.js", async (importOriginal) => ({
  ...(await importOriginal()),
  decrementCargaAceita: (...args) => decrementCargaAceita(...args),
}));

const chamarZohoApi = vi.fn(async () => ({}));
vi.mock("./zohoApi.js", () => ({ chamarZohoApi: (...args) => chamarZohoApi(...args) }));

const { ENV } = await import("../config/env.js");
const { deletarLead, limparEvento, removerEventoDoLead } = await import("./leadsMedicos.js");

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const admin = { email: "admin@tegra.com" };

function putsPorId() {
  const porId = {};
  for (const [, , body] of chamarZohoApi.mock.calls) {
    const { id, ...campos } = body.data[0];
    porId[id] = { campos, trigger: body.trigger };
  }
  return porId;
}

function semear() {
  banco.clear();
  // Só veio pelo Tegra Talks e já foi aceito.
  banco.set("a", {
    id: "a",
    nome: "Dra. A",
    idZoho: "z-a",
    evento: "Tegra Talks",
    slaStatus: "aceito",
    consultorId: "c1",
    status: "Lead Em Qualificação",
    historico: [],
    eventos: [{ id: "ev-a", nome: "Tegra Talks", idZoho: "z-a" }],
  });
  // Já estava no Portal pelo Jantar e voltou pelo Tegra Talks.
  banco.set("b", {
    id: "b",
    nome: "Dr. B",
    idZoho: "z-b1",
    evento: "Jantar",
    slaStatus: "aceito",
    consultorId: "c2",
    status: "Lead Em Qualificação",
    historico: [],
    eventos: [
      { id: "ev-b1", nome: "Jantar", idZoho: "z-b1" },
      { id: "ev-b2", nome: "tegra talks", idZoho: "z-b2" },
    ],
  });
  // Outro evento, não pode ser tocado.
  banco.set("c", {
    id: "c",
    nome: "Dr. C",
    idZoho: "z-c",
    evento: "Press Odonto",
    slaStatus: "ofertado",
    consultorId: "c3",
    historico: [],
    eventos: [{ id: "ev-c", nome: "Press Odonto", idZoho: "z-c" }],
  });
}

beforeEach(() => {
  semear();
  decrementCargaAceita.mockClear();
  chamarZohoApi.mockClear();
});

describe("limparEvento", () => {
  it("simulação não altera nada e diz o que acontece com cada lead", async () => {
    const result = await limparEvento(admin, { evento: "Tegra Talks" });
    expect(result.simulacao).toBe(true);
    expect(result.itens.map((i) => [i.id, i.acao])).toEqual([
      ["a", "excluir"],
      ["b", "remover_evento"],
    ]);
    expect(banco.size).toBe(3);
    await flush();
    expect(chamarZohoApi).not.toHaveBeenCalled();
  });

  it("confirmado: exclui quem só tem o evento e tira o evento de quem tem outros", async () => {
    await limparEvento(admin, { evento: "tegra talks", confirmar: true });
    await flush();

    expect(banco.has("a")).toBe(false);
    expect(banco.get("b").eventos.map((ev) => ev.id)).toEqual(["ev-b1"]);
    expect(banco.has("c")).toBe(true);

    // Só o lead excluído devolve carteira; o B continua com o consultor.
    expect(decrementCargaAceita).toHaveBeenCalledTimes(1);
    expect(decrementCargaAceita).toHaveBeenCalledWith("c1");

    const porId = putsPorId();
    expect(Object.keys(porId).sort()).toEqual(["z-a", "z-b2"]);
    expect(porId["z-a"].trigger).toEqual([]);
    expect(porId["z-a"].campos[ENV.ZOHO_LEAD_STATUS_FIELD]).toBe("Novo Lead");
    expect(porId["z-a"].campos[ENV.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD]).toBeNull();
  });

  it("sem devolver ao Zoho, não grava nada no CRM", async () => {
    await limparEvento(admin, { evento: "Tegra Talks", confirmar: true, devolverAoZoho: false });
    await flush();
    expect(chamarZohoApi).not.toHaveBeenCalled();
    expect(banco.has("a")).toBe(false);
  });
});

describe("deletarLead", () => {
  it("lead só ofertado não mexe na carteira, mas some e volta ao Zoho", async () => {
    await deletarLead("c", admin);
    await flush();
    expect(banco.has("c")).toBe(false);
    expect(decrementCargaAceita).not.toHaveBeenCalled();
    expect(Object.keys(putsPorId())).toEqual(["z-c"]);
  });

  it("mantém o Consultor Tegra quando foi o Marketing que escolheu", async () => {
    banco.get("c").distribuidoPorMarketing = true;
    await deletarLead("c", admin);
    await flush();
    const campos = putsPorId()["z-c"].campos;
    expect(campos).not.toHaveProperty(ENV.ZOHO_LEAD_CONSULTOR_FIELD);
  });
});

describe("removerEventoDoLead", () => {
  it("tirar o evento da ficha principal promove a próxima ficha", async () => {
    const lead = await removerEventoDoLead("b", "ev-b1", admin);
    expect(banco.get("b").idZoho).toBe("z-b2");
    expect(banco.get("b").evento).toBe("tegra talks");
    expect(lead.eventos.map((ev) => ev.id)).toEqual(["ev-b2"]);
  });

  it("não deixa tirar o único evento (aí é excluir)", async () => {
    await expect(removerEventoDoLead("a", "ev-a", admin)).rejects.toThrow(/único evento/);
  });
});
