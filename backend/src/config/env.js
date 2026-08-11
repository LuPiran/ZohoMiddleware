import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  SERVE_FRONTEND: process.env.SERVE_FRONTEND,
  CEP_PROVIDER: process.env.CEP_PROVIDER,
  CEP_API_URL: process.env.CEP_API_URL,
  CEP_API_PASSWORD: process.env.CEP_API_PASSWORD,
  CEP_API_TIMEOUT_MS: process.env.CEP_API_TIMEOUT_MS,
  ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
  ZOHO_ACCOUNTS_URL: process.env.ZOHO_ACCOUNTS_URL,
  ZOHO_API_BASE: process.env.ZOHO_API_BASE,
  ZOHO_MODULE_NAME: process.env.ZOHO_MODULE_NAME,
  ZOHO_EMAIL_FIELD: process.env.ZOHO_EMAIL_FIELD,
  ZOHO_SENHA_FIELD: process.env.ZOHO_SENHA_FIELD,
  ZOHO_NOME_FIELD: process.env.ZOHO_NOME_FIELD,
  ZOHO_NAME_FIELD: process.env.ZOHO_NAME_FIELD || process.env.ZOHO_NOME_FIELD,
  ZOHO_STATUS_FIELD: process.env.ZOHO_STATUS_FIELD,
  ZOHO_FOTO_FIELD: process.env.ZOHO_FOTO_FIELD,
  ZOHO_ULTIMO_LOGIN_FIELD: process.env.ZOHO_ULTIMO_LOGIN_FIELD,
  ZOHO_ULTIMO_ACESSO_FIELD: process.env.ZOHO_ULTIMO_ACESSO_FIELD,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  ENTRA_CLIENT_ID: process.env.ENTRA_CLIENT_ID,
  ENTRA_TENANT_ID: process.env.ENTRA_TENANT_ID,
  ENTRA_ISSUER:
    process.env.ENTRA_ISSUER ||
    (process.env.ENTRA_TENANT_ID
      ? `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/v2.0`
      : undefined),
};
