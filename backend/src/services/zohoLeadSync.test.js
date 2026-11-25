import { beforeEach, describe, expect, it, vi } from "vitest";

const chamarZohoApi = vi.fn(async () => ({}));
vi.mock("./zohoApi.js", () => ({ chamarZohoApi: (...args) => chamarZohoApi(...args) }));

const { ENV } = await import("../config/env.js");
const {
  ZOHO_LEAD_STATUS,
  syncZohoLeadAccepted,
  syncZohoLeadDistribuicao,
  syncZohoLeadDuplicado,
  syncZohoLeadRejected,
  syncZohoLeadSemInteresse,
} = await import("./zohoLeadSync.js");

// Os syncs são fire-and-forget: espera a fila de microtasks esvaziar.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function putsPorId() {
  const porId = {};
  for (const [, , body] of chamarZohoApi.mock.calls) {
    const { id, ...campos } = body.data[0];
    porId[id] = { ...(porId[id] || {}), ...campos, semGatilhos: Array.isArray(body.trigger) };
  }
  return porId;
}

const leadComDuasFichas = {
  idZoho: "111",
  consultor: "Fulana Silva",
  emailConsultor: "fulana@tegra.com",
  status: ZOHO_LEAD_STATUS.QUALIFICACAO,
  historico: [],
  eventos: [
    { nome: "Evento A", idZoho: "111" },
    { nome: "Evento B", idZoho: "222" },
    { nome: "Evento B de novo", idZoho: "222" },
  ],
};

describe("espelhamento da tabulação nas fichas extras", () => {
  beforeEach(() => chamarZohoApi.mockClear());

  it("tabulação vai para a ficha principal e para a extra, uma vez cada", async () => {
    syncZohoLeadSemInteresse(leadComDuasFichas, { at: "2026-10-07T13:00:00.000Z" });
    await flush();
    const porId = putsPorId();
    expect(Object.keys(porId).sort()).toEqual(["111", "222"]);
    expect(chamarZohoApi).toHaveBeenCalledTimes(2);
    expect(porId["222"][ENV.ZOHO_LEAD_STATUS_FIELD]).toBe(ZOHO_LEAD_STATUS.SEM_INTERESSE);
    expect(porId["222"][ENV.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD]).toBe("Fulana Silva");
  });

  it("aceite mostra o consultor na ficha extra, sem gatilhos (evita reenvio pela regra manual)", async () => {
    syncZohoLeadAccepted(leadComDuasFichas);
    await flush();
    const porId = putsPorId();
    expect(porId["111"][ENV.ZOHO_LEAD_CONSULTOR_FIELD]).toBe("Fulana Silva");
    expect(porId["111"].semGatilhos).toBe(false);
    expect(porId["222"][ENV.ZOHO_LEAD_CONSULTOR_FIELD]).toBe("Fulana Silva");
    expect(porId["222"][ENV.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD]).toBe("fulana@tegra.com");
    expect(porId["222"].semGatilhos).toBe(true);
    expect(porId["222"][ENV.ZOHO_LEAD_STATUS_FIELD]).toBe(ZOHO_LEAD_STATUS.QUALIFICACAO);
    expect(porId["222"][ENV.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD]).toBe("Fulana Silva");
  });

  it("recusa vale para todas as fichas, sem o consultor que recusou", async () => {
    syncZohoLeadRejected(
      { ...leadComDuasFichas, status: ZOHO_LEAD_STATUS.ENCAMINHADO_GESTAO, motivoRejeicao: "recusado" },
      { at: "2026-10-13T13:00:00.000Z" },
    );
    await flush();
    const porId = putsPorId();
    expect(porId["111"][ENV.ZOHO_LEAD_STATUS_FIELD]).toBe(ZOHO_LEAD_STATUS.ENCAMINHADO_GESTAO);
    expect(porId["222"][ENV.ZOHO_LEAD_STATUS_FIELD]).toBe(ZOHO_LEAD_STATUS.ENCAMINHADO_GESTAO);
    expect(porId["222"][ENV.ZOHO_LEAD_CONSULTOR_FIELD]).toBeUndefined();
    expect(porId["222"].semGatilhos).toBe(true);
  });

  it("lead sem fichas extras grava só na principal", async () => {
    syncZohoLeadSemInteresse({ ...leadComDuasFichas, eventos: [{ idZoho: "111" }] }, {});
    await flush();
    expect(Object.keys(putsPorId())).toEqual(["111"]);
  });
});

describe("ficha nova de médico que já está no Portal", () => {
  beforeEach(() => chamarZohoApi.mockClear());

  it("já nasce com a tabulação atual do consultor", async () => {
    syncZohoLeadDuplicado("333", leadComDuasFichas, { evento: "Evento C" });
    await flush();
    const ficha = putsPorId()["333"];
    expect(ficha[ENV.ZOHO_LEAD_STATUS_FIELD]).toBe(ZOHO_LEAD_STATUS.QUALIFICACAO);
    expect(ficha[ENV.ZOHO_LEAD_EVENTO_TRATADO_FIELD]).toBe(true);
    expect(ficha[ENV.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD]).toBe("Fulana Silva");
    expect(ficha[ENV.ZOHO_LEAD_CONSULTOR_FIELD]).toBe("Fulana Silva");
    expect(ficha.semGatilhos).toBe(true);
  });

  it("indicada para outro consultor: fica com o atual e o log registra o bloqueio", async () => {
    syncZohoLeadDuplicado("333", leadComDuasFichas, { evento: "Evento C", consultorTentado: "Beltrano" });
    await flush();
    const ficha = putsPorId()["333"];
    expect(ficha[ENV.ZOHO_LEAD_CONSULTOR_FIELD]).toBe("Fulana Silva");
    expect(ficha[ENV.ZOHO_LEAD_DIST_ERRO_SYNC_FIELD]).toContain("Envio bloqueado");
    expect(ficha[ENV.ZOHO_LEAD_DIST_ERRO_SYNC_FIELD]).toContain("Beltrano");
  });

  it("acompanha o status da ficha principal mesmo em oferta", async () => {
    syncZohoLeadDuplicado(
      "333",
      { ...leadComDuasFichas, status: ZOHO_LEAD_STATUS.EM_OFERTA },
      { evento: "Evento C" },
    );
    await flush();
    expect(putsPorId()["333"][ENV.ZOHO_LEAD_STATUS_FIELD]).toBe(ZOHO_LEAD_STATUS.EM_OFERTA);
  });
});

describe("redistribuição chega nas fichas extras", () => {
  beforeEach(() => chamarZohoApi.mockClear());

  it("nova oferta do médico atualiza status e consultor da 2ª ficha", async () => {
    syncZohoLeadDistribuicao({
      ...leadComDuasFichas,
      status: ZOHO_LEAD_STATUS.EM_OFERTA,
      consultor: "Beltrano Souza",
      emailConsultor: "beltrano@tegra.com",
      slaStatus: "ofertado",
    });
    await flush();
    const extra = putsPorId()["222"];
    expect(extra[ENV.ZOHO_LEAD_STATUS_FIELD]).toBe(ZOHO_LEAD_STATUS.EM_OFERTA);
    expect(extra[ENV.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD]).toBe("Beltrano Souza");
    expect(extra[ENV.ZOHO_LEAD_NOME_EVENTO_FIELD]).toBeUndefined();
  });
});

describe("syncZohoLead: nova tentativa em erro temporário", () => {
  const erro = (status) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  it("tenta de novo em 429 e para quando grava", async () => {
    const { syncZohoLead } = await import("./zohoLeadSync.js");
    let n = 0;
    const gravar = vi.fn(async () => {
      n += 1;
      if (n === 1) throw erro(429);
      return { synced: true };
    });
    syncZohoLead("123", { Status: "x" }, undefined, { delays: [1, 1, 1], gravar });
    await esperar(30);
    expect(gravar).toHaveBeenCalledTimes(2);
  });

  it("não repete erro de dado (400)", async () => {
    const { syncZohoLead } = await import("./zohoLeadSync.js");
    const gravar = vi.fn(async () => {
      throw erro(400);
    });
    syncZohoLead("123", { Status: "x" }, undefined, { delays: [1, 1, 1], gravar });
    await esperar(30);
    expect(gravar).toHaveBeenCalledTimes(1);
  });

  it("desiste depois de 3 novas tentativas", async () => {
    const { syncZohoLead } = await import("./zohoLeadSync.js");
    const gravar = vi.fn(async () => {
      throw erro(502);
    });
    syncZohoLead("123", { Status: "x" }, undefined, { delays: [1, 1, 1], gravar });
    await esperar(50);
    expect(gravar).toHaveBeenCalledTimes(4);
  });

  it("registro recusado pelo Zoho (200 com erro) não conta como sync ok", async () => {
    const { updateZohoLeadRecord } = await import("./zohoLeadSync.js");
    chamarZohoApi.mockResolvedValueOnce({ data: [{ status: "error", code: "INVALID_DATA", message: "x" }] });
    const r = await updateZohoLeadRecord("123", { Status: "x" });
    expect(r.synced).toBe(false);
    expect(r.reason).toBe("INVALID_DATA");
  });
});
