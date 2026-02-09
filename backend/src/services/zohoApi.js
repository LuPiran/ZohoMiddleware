import axios from "axios";
import gerarAcessToken from "../zoho/auth.js";
import { ENV } from "../config/env.js";

export async function chamarZohoApi(method, endpoint, data = null) {
  console.log("[ZOHO API] Fazendo chamada à API da Zoho...");
  console.log("[ZOHO API] Método:", method);
  console.log("[ZOHO API] Endpoint:", endpoint);

  // Garante que a URL base termina sem barra e o endpoint começa com barra
  // Corrige URL incorreta: zohoapi.com -> zohoapis.com
  let baseUrl =
    ENV.ZOHO_API_BASE?.replace(/\/$/, "") || "https://www.zohoapis.com/crm/v2";
  baseUrl = baseUrl.replace("zohoapi.com", "zohoapis.com");

  // Se a base URL não inclui /crm/v2, adiciona
  if (!baseUrl.includes("/crm/v2")) {
    baseUrl = baseUrl.replace(/\/$/, "") + "/crm/v2";
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  console.log("[ZOHO API] URL completa:", fullUrl);
  console.log("[ZOHO API] Base URL:", baseUrl);

  const token = await gerarAcessToken();
  console.log("[ZOHO API] Token obtido:", token ? "✓" : "✗");

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
      },
      data,
      timeout: 60000, // 60 segundos de timeout
    });

    console.log(
      "[ZOHO API] ✓ Sucesso! Resposta recebida com status:",
      response.status,
    );
    console.log(
      "[ZOHO API] Resposta:",
      JSON.stringify(response.data).substring(0, 200),
    );
    return response.data;
  } catch (error) {
    console.error("[ZOHO API] ✗ ERRO na chamada à API:");
    console.error("[ZOHO API] Status:", error.response?.status);
    console.error("[ZOHO API] Status Text:", error.response?.statusText);
    console.error("[ZOHO API] URL:", fullUrl);
    console.error(
      "[ZOHO API] Mensagem:",
      error.response?.data || error.message,
    );
    console.error(
      "[ZOHO API] Error completo:",
      JSON.stringify(error.response?.data || error.message),
    );

    // Adiciona código de erro para timeout
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      error.code = "ETIMEDOUT";
    }

    throw error;
  }
}
