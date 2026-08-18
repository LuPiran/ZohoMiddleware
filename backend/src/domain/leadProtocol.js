import { randomBytes } from "crypto";

/** Alphabet sem I/O/0/1 para reduzir confusão visual. */
const PROTOCOL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PROTOCOL_LENGTH = 5;
export const PROTOCOL_PATTERN = /^[A-Z0-9]{5}$/;

export function normalizeProtocolo(value) {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return raw || undefined;
}

export function isValidProtocolo(value) {
  return PROTOCOL_PATTERN.test(normalizeProtocolo(value) || "");
}

export function generateProtocolo() {
  const bytes = randomBytes(PROTOCOL_LENGTH);
  let out = "";
  for (let i = 0; i < PROTOCOL_LENGTH; i += 1) {
    out += PROTOCOL_ALPHABET[bytes[i] % PROTOCOL_ALPHABET.length];
  }
  return out;
}

export function slugLeadName(nome) {
  const slug = String(nome || "lead")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug || "lead";
}

export function leadFolderName(nome, protocolo) {
  return `${slugLeadName(nome)}_${normalizeProtocolo(protocolo) || "XXXXX"}`;
}

export function evidenceFileBaseName(nome, protocolo, index) {
  return `${leadFolderName(nome, protocolo)}_${index}`;
}
