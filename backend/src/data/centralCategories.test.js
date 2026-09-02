import { describe, expect, it } from "vitest";
import { matchCategoryBySharePointName } from "../data/centralCategories.js";

describe("matchCategoryBySharePointName", () => {
  it("vincula pelo alias estável, não pelo texto da UI", () => {
    const hit = matchCategoryBySharePointName("Lâminas de Produtos");
    expect(hit?.id).toBe("lp");
  });

  it("não usa o nome da categoria como chave solta demais", () => {
    expect(matchCategoryBySharePointName("Relatório interno")).toBeNull();
  });
});
