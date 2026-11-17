import { describe, it, expect, vi } from "vitest";

vi.mock("./workdrive.js", () => ({
  ensureLeadWorkDriveFolder: vi.fn(() => {
    throw new Error("Invalid OAuth token.");
  }),
  uploadEvidenceFile: vi.fn(),
}));
vi.mock("./zohoLeadAttachments.js", () => ({ uploadLeadAttachmentToZoho: vi.fn() }));

const { persistLeadEvidencias } = await import("./leadEvidencias.js");
const workdrive = await import("./workdrive.js");

describe("persistLeadEvidencias sem foto", () => {
  it("não chama o WorkDrive e mantém a pasta/evidências atuais", async () => {
    const lead = {
      protocolo: "ABCDE",
      evidencias: [{ id: "1" }],
      workdriveFolderId: "pasta1",
      workdriveFolderName: "Lead ABCDE",
    };
    const out = await persistLeadEvidencias(lead, [], { acao: "sem_interesse", requireEvidence: false });
    expect(workdrive.ensureLeadWorkDriveFolder).not.toHaveBeenCalled();
    expect(out).toMatchObject({
      evidencias: [{ id: "1" }],
      workdriveFolderId: "pasta1",
      protocolo: "ABCDE",
      uploaded: [],
    });
  });
});
