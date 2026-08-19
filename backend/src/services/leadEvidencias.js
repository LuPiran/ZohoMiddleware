import { randomUUID } from "crypto";
import {
  assertEvidenceFiles,
  extensionForMime,
  nextEvidenceIndex,
} from "../domain/leadEvidencias.js";
import { evidenceFileBaseName, generateProtocolo } from "../domain/leadProtocol.js";
import {
  ensureLeadWorkDriveFolder,
  uploadEvidenceFile,
} from "./workdrive.js";
import { uploadLeadAttachmentToZoho } from "./zohoLeadAttachments.js";

export async function persistLeadEvidencias(lead, files, { acao, round, user } = {}) {
  const validated = assertEvidenceFiles(files);
  const protocolo = lead.protocolo || generateProtocolo();
  const folderLead = { ...lead, protocolo };
  const { folderId, folderName } = await ensureLeadWorkDriveFolder(folderLead);
  let index = nextEvidenceIndex(lead);
  const uploaded = [];
  const now = new Date().toISOString();
  const actor = user?.email || user?.id || "usuario";

  for (const file of validated) {
    const ext = extensionForMime(file.mimeType);
    const fileName = `${evidenceFileBaseName(lead.nome, protocolo, index)}.${ext}`;
    const remote = await uploadEvidenceFile({
      folderId,
      fileName,
      buffer: file.buffer,
      mimeType: file.mimeType,
    });
    const zohoAttachment = await uploadLeadAttachmentToZoho({
      idZoho: lead.idZoho,
      fileName,
      buffer: file.buffer,
      mimeType: file.mimeType,
    });

    uploaded.push({
      id: randomUUID(),
      n: index,
      acao,
      round: round || null,
      fileName,
      mimeType: file.mimeType,
      size: file.size,
      workdriveFileId: remote.fileId,
      url: remote.url,
      previewUrl: remote.previewUrl || null,
      zohoAttachmentId: zohoAttachment.attachmentId || null,
      uploadedAt: now,
      uploadedBy: actor,
    });
    index += 1;
  }

  return {
    evidencias: [...(Array.isArray(lead.evidencias) ? lead.evidencias : []), ...uploaded],
    workdriveFolderId: folderId,
    workdriveFolderName: folderName,
    protocolo,
    uploaded,
  };
}
