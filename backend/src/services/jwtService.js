import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

function resolveJwtSecret() {
  const secret = ENV.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret || secret === "sua-chave-secreta-super-segura-altere-em-producao") {
    if (ENV.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET obrigatório em produção. Defina uma chave forte no .env.",
      );
    }
    console.warn(
      "[JWT] ⚠️ JWT_SECRET fraco ou ausente — use uma chave forte em produção.",
    );
    return secret || "dev-only-insecure-jwt-secret-change-me";
  }
  return secret;
}

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = ENV.JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "24h";

function extrairPerfil(usuario) {
  const perfil =
    usuario?.Perfil ||
    usuario?.perfil ||
    usuario?.Profile ||
    usuario?.profile ||
    usuario?.Perfil_Usuario ||
    usuario?.perfil_usuario ||
    "";
  return typeof perfil === "string" ? perfil.trim() : "";
}

/**
 * Gera um token JWT para o usuário
 * @param {Object} usuario - Dados do usuário
 * @returns {string} Token JWT
 */
export function generateToken(usuario) {
  const payload = {
    id: String(usuario.id),
    email: usuario.Email || usuario.email,
    perfil: extrairPerfil(usuario),
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

/**
 * Middleware para verificar autenticação via JWT (Authorization Bearer)
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Token de autenticação não fornecido",
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: "Token inválido ou expirado",
    });
  }

  req.user = decoded;
  next();
}

/**
 * Autenticação via Bearer ou query ?access= (para <img src> de foto).
 */
export function authenticateTokenOrQuery(req, res, next) {
  const authHeader = req.headers["authorization"];
  const bearer = authHeader && authHeader.split(" ")[1];
  const queryToken =
    typeof req.query.access === "string" ? req.query.access : null;
  const token = bearer || queryToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Token de autenticação não fornecido",
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: "Token inválido ou expirado",
    });
  }

  req.user = decoded;
  next();
}
