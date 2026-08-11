import * as jose from "jose";
import { ENV } from "../config/env.js";

let jwks = null;

function getEntraConfig() {
  const clientId = ENV.ENTRA_CLIENT_ID;
  const tenantId = ENV.ENTRA_TENANT_ID;
  const issuer =
    ENV.ENTRA_ISSUER ||
    (tenantId
      ? `https://login.microsoftonline.com/${tenantId}/v2.0`
      : undefined);

  if (!clientId || !tenantId || !issuer) {
    const error = new Error(
      "Microsoft Entra ID não configurado. Defina ENTRA_CLIENT_ID e ENTRA_TENANT_ID.",
    );
    error.code = "ENTRA_NOT_CONFIGURED";
    throw error;
  }

  return { clientId, tenantId, issuer };
}

function getJwks(tenantId) {
  if (!jwks) {
    jwks = jose.createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      ),
    );
  }
  return jwks;
}

function extrairEmail(payload) {
  const candidatos = [
    payload.email,
    payload.preferred_username,
    payload.upn,
    payload.unique_name,
  ];

  for (const valor of candidatos) {
    if (typeof valor === "string" && valor.includes("@")) {
      return valor.trim().toLowerCase();
    }
  }

  return null;
}

/**
 * Valida o ID token emitido pelo Microsoft Entra ID (OIDC).
 * @param {string} idToken
 * @returns {Promise<{ email: string, nome: string, oid: string|null, payload: object }>}
 */
export async function validarIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    const error = new Error("ID token Microsoft é obrigatório");
    error.code = "ENTRA_TOKEN_MISSING";
    throw error;
  }

  const { clientId, tenantId, issuer } = getEntraConfig();

  let payload;
  try {
    const result = await jose.jwtVerify(idToken, getJwks(tenantId), {
      issuer,
      audience: clientId,
    });
    payload = result.payload;
  } catch (err) {
    console.error("[ENTRA AUTH] Falha ao validar ID token:", err.message);
    const error = new Error("Token Microsoft inválido ou expirado");
    error.code = "ENTRA_TOKEN_INVALID";
    error.cause = err;
    throw error;
  }

  if (payload.tid && payload.tid !== tenantId) {
    const error = new Error("Token Microsoft não pertence ao tenant configurado");
    error.code = "ENTRA_TENANT_MISMATCH";
    throw error;
  }

  if (
    payload.email_verified === false ||
    payload.email_verified === "false"
  ) {
    const error = new Error("E-mail Microsoft não verificado");
    error.code = "ENTRA_EMAIL_UNVERIFIED";
    throw error;
  }

  const email = extrairEmail(payload);
  if (!email) {
    const error = new Error(
      "Não foi possível obter o e-mail da conta Microsoft",
    );
    error.code = "ENTRA_EMAIL_MISSING";
    throw error;
  }

  const nome =
    (typeof payload.name === "string" && payload.name.trim()) ||
    email.split("@")[0];

  return {
    email,
    nome,
    oid: typeof payload.oid === "string" ? payload.oid : null,
    payload,
  };
}

export default {
  validarIdToken,
};
