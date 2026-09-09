import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "crypto";
import { ENV } from "../config/env.js";

const ALG = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const SEAL_VERSION = 1;

let derived;

function masterKeyBuffer() {
  const raw = String(ENV.DATA_ENCRYPTION_KEY || "").trim();
  if (!raw) {
    const err = new Error(
      "DATA_ENCRYPTION_KEY ausente. Defina uma chave Base64 de 32 bytes no .env.",
    );
    err.status = 503;
    err.code = "ENCRYPTION_KEY_MISSING";
    throw err;
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length < 32) {
    const err = new Error(
      "DATA_ENCRYPTION_KEY inválida. Use `openssl rand -base64 32`.",
    );
    err.status = 503;
    err.code = "ENCRYPTION_KEY_INVALID";
    throw err;
  }
  return buf.subarray(0, 32);
}

function keys() {
  if (!derived) {
    const master = masterKeyBuffer();
    derived = {
      enc: Buffer.from(hkdfSync("sha256", master, Buffer.from("tegrapharma"), "tegrapharma-aes-v1", KEY_LENGTH)),
      mac: Buffer.from(hkdfSync("sha256", master, Buffer.from("tegrapharma"), "tegrapharma-hmac-v1", KEY_LENGTH)),
    };
  }
  return derived;
}

export function assertEncryptionReady() {
  keys();
}

export function isSealedPayload(value) {
  return Boolean(value && typeof value === "object" && value._sealed === true);
}

export function encryptJson(value, aad) {
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALG, keys().enc, iv);
  cipher.setAAD(Buffer.from(String(aad || ""), "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    _sealed: true,
    v: SEAL_VERSION,
    alg: "A256GCM",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: ciphertext.toString("base64"),
  };
}

export function decryptJson(sealed, aad) {
  if (!isSealedPayload(sealed)) return sealed;
  if (Number(sealed.v) !== SEAL_VERSION || sealed.alg !== "A256GCM") {
    const err = new Error("Formato de cifra não suportado.");
    err.status = 500;
    err.code = "ENCRYPTION_FORMAT";
    throw err;
  }
  const decipher = createDecipheriv(
    ALG,
    keys().enc,
    Buffer.from(sealed.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(String(aad || ""), "utf8"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(sealed.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8"));
}

export function hmacIndex(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  return createHmac("sha256", keys().mac).update(text, "utf8").digest("hex");
}

export function normalizeEmail(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .trim();
}
