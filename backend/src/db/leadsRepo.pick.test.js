import { describe, expect, it, vi } from "vitest";

vi.mock("./mysql.js", () => ({ query: vi.fn(), getPool: vi.fn() }));
const { pickLeadAtualDoMedico } = await import("./leadsRepo.js");

describe("lead atual do médico (mais de um lead pelo mesmo CRM)", () => {
  const antigoSemInteresse = {
    id: "a", status: "Lead Sem Interesse", dataSemInteresse: "2026-09-01", createdAt: "2026-08-01T10:00:00Z",
  };
  const novoEmAtendimento = {
    id: "b", status: "Lead Em Qualificação", createdAt: "2026-11-10T10:00:00Z",
  };

  it("prefere o lead em atendimento ao encerrado", () => {
    expect(pickLeadAtualDoMedico([antigoSemInteresse, novoEmAtendimento]).id).toBe("b");
  });

  it("só encerrados: devolve o mais recente", () => {
    const outro = { ...antigoSemInteresse, id: "c", createdAt: "2026-10-01T10:00:00Z" };
    expect(pickLeadAtualDoMedico([antigoSemInteresse, outro]).id).toBe("c");
  });

  it("nenhum lead: null", () => {
    expect(pickLeadAtualDoMedico([])).toBeNull();
  });
});
