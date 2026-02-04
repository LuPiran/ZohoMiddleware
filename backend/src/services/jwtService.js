import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "sua-chave-secreta-super-segura-altere-em-producao";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

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

/**
 * Middleware para verificar autenticação via JWT
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

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
