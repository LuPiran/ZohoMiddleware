import { describe, expect, it } from "vitest";
import { addBusinessMinutes, aguardandoDataEvento } from "./slaOffers.js";

// Horários em UTC que correspondem a horário de Brasília (UTC-3, sem DST
// desde 2019) — ex.: "10:00 BR" = "13:00Z" no mesmo dia.

describe("addBusinessMinutes", () => {
  it("não cruza fim de semana: soma corrida normal (seg 10h + 48h úteis = qua 10h)", () => {
    const start = "2026-09-21T13:00:00.000Z"; // segunda 10:00 BR
    const result = addBusinessMinutes(start, 48 * 60);
    expect(result.toISOString()).toBe("2026-09-23T13:00:00.000Z"); // quarta 10:00 BR
  });

  it("pula sábado e domingo inteiros (sex 14h + 48h úteis = ter 14h)", () => {
    const start = "2026-09-25T17:00:00.000Z"; // sexta 14:00 BR
    const result = addBusinessMinutes(start, 48 * 60);
    expect(result.toISOString()).toBe("2026-09-29T17:00:00.000Z"); // terça 14:00 BR
  });

  it("início já em fim de semana pula pra segunda antes de contar", () => {
    const start = "2026-09-26T11:00:00.000Z"; // sábado 08:00 BR
    const result = addBusinessMinutes(start, 60);
    expect(result.toISOString()).toBe("2026-09-28T04:00:00.000Z"); // segunda 01:00 BR
  });
});

describe("aguardandoDataEvento", () => {
  it("true quando dataEvento está no futuro", () => {
    const futuro = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(aguardandoDataEvento({ dataEvento: futuro })).toBe(true);
  });

  it("false quando dataEvento já passou", () => {
    const passado = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(aguardandoDataEvento({ dataEvento: passado })).toBe(false);
  });

  it("false quando não tem dataEvento", () => {
    expect(aguardandoDataEvento({})).toBe(false);
    expect(aguardandoDataEvento({ dataEvento: null })).toBe(false);
  });
});
