import { body, validationResult } from "express-validator";

/**
 * Validação para login
 */
export const validateLogin = [
  body("email")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Email muito longo"),

  body("senha")
    .notEmpty()
    .withMessage("Senha é obrigatória")
    .isLength({ min: 6, max: 100 })
    .withMessage("Senha deve ter entre 6 e 100 caracteres")
    .trim(),
];

/**
 * Validação para verificar email
 */
export const validateCheckEmail = [
  body("email")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Email muito longo"),
];

/**
 * Middleware para verificar resultados da validação
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: "Dados inválidos",
      details: errors.array(),
    });
  }
  next();
};
