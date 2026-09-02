import { describe, expect, it } from "vitest";
import { isItemUnderRoot } from "./sharepointPath.js";

const root = {
  id: "ROOT",
  name: "Central comercial TegraPharma",
  parentReference: {
    driveId: "DRIVE",
    path: "/drives/DRIVE/root:/Projeto Eld",
  },
};

describe("isItemUnderRoot", () => {
  it("aceita a própria raiz", () => {
    expect(isItemUnderRoot(root, root, "Projeto Eld/Central comercial TegraPharma")).toBe(
      true,
    );
  });

  it("aceita filho direto", () => {
    expect(
      isItemUnderRoot(
        {
          id: "CHILD",
          name: "Lâminas",
          parentReference: { id: "ROOT", driveId: "DRIVE" },
        },
        root,
      ),
    ).toBe(true);
  });

  it("aceita neto pelo path", () => {
    expect(
      isItemUnderRoot(
        {
          id: "FILE",
          name: "lamina.pdf",
          parentReference: {
            driveId: "DRIVE",
            path: "/drives/DRIVE/root:/Projeto Eld/Central comercial TegraPharma/Lâminas de produtos",
          },
        },
        root,
        "Projeto Eld/Central comercial TegraPharma",
      ),
    ).toBe(true);
  });

  it("rejeita outro drive", () => {
    expect(
      isItemUnderRoot(
        {
          id: "X",
          parentReference: {
            id: "ROOT",
            driveId: "OTHER",
            path: "/drives/OTHER/root:/Projeto Eld/Central comercial TegraPharma",
          },
        },
        root,
      ),
    ).toBe(false);
  });

  it("rejeita pasta fora da Central", () => {
    expect(
      isItemUnderRoot(
        {
          id: "OUT",
          parentReference: {
            driveId: "DRIVE",
            path: "/drives/DRIVE/root:/Outro projeto/Segredo",
          },
        },
        root,
        "Projeto Eld/Central comercial TegraPharma",
      ),
    ).toBe(false);
  });
});
