import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWT_SECRET =
  process.env.JWT_SECRET || "sua-chave-secreta-super-segura-altere-em-producao";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_JWKS_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`
  : null;
const supabaseJwks = SUPABASE_JWKS_URL
  ? createRemoteJWKSet(new URL(SUPABASE_JWKS_URL))
  : null;

/**
 * Gera um token JWT para o usuário
 * @param {Object} usuario - Dados do usuário
 * @returns {string} Token JWT
 */
export function generateToken(usuario) {
  const payload = {
    id: usuario.id,
    email: usuario.Email || usuario.email,
    // Não incluir informações sensíveis no token
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifica e decodifica um token JWT
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload decodificado ou null se inválido
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function verifySupabaseToken(token) {
  if (!supabaseJwks) return null;

  try {
    const { payload } = await jwtVerify(token, supabaseJwks);
    // IMPORTANTE: `...payload` deve vir ANTES de `id`, senão um claim `id` (se existir)
    // sobrescreve o UUID real do usuário (`sub`) e quebra getUserById / join com supabase_id.
    const emailFromMeta =
      payload.user_metadata?.email || payload.user_metadata?.Email;
    return {
      ...payload,
      id: payload.sub,
      email: payload.email ?? emailFromMeta,
      supabase: true,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Middleware para verificar autenticação via JWT
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Token de autenticação não fornecido",
    });
  }

  const decoded = (await verifySupabaseToken(token)) || verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: "Token inválido ou expirado",
    });
  }

  req.user = decoded;
  // Sempre usar o subject do Supabase como id de Auth (UUID), nunca outro claim.
  if (decoded.sub) {
    req.user.id = decoded.sub;
  }
  next();
}
