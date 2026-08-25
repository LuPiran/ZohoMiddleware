/**
 * geocoding.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Geocodificação via Google Maps Geocoding API + fórmula haversine para
 * cálculo de distância entre dois pontos geográficos.
 *
 * Resultados são cacheados em memória por sessão para evitar chamadas repetidas
 * à API para a mesma cidade/CEP (comum em rajadas de leads da mesma região).
 */

import { ENV } from "../config/env.js";

const GEOCODING_API_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
const REQUEST_TIMEOUT_MS = 5_000;

// ─── Cache em memória ──────────────────────────────────────────────────────
// Chave: string normalizada da query → valor: { lat, lng }
const geoCache = new Map();

// ─── Haversine ─────────────────────────────────────────────────────────────

/**
 * Distância em km entre dois pontos geográficos (fórmula haversine).
 * Precisão: ~0.5 % (suficiente para matching de leads a consultores).
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6_371; // raio médio da Terra em km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Geocodificação ─────────────────────────────────────────────────────────

/**
 * Geocodifica um local via Google Maps Geocoding API.
 * Retorna { lat, lng } ou null em caso de erro / chave ausente.
 *
 * Prioridade da query:
 *   1. CEP (mais preciso — geocodifica o CEP diretamente)
 *   2. enderecoCompleto (ex: "Rua X, 123, São Paulo, SP")
 *   3. cidade + estado
 *   4. só cidade
 *
 * @param {{ cidade?: string, estado?: string, cep?: string, enderecoCompleto?: string }} opts
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function geocodeAddress({ cidade, estado, cep, enderecoCompleto } = {}) {
  const apiKey = ENV.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null; // silencioso — sem chave, feature desativada

  // Monta query
  let query;
  const cepNums = String(cep || "").replace(/\D/g, "");
  if (cepNums.length === 8) {
    query = `${cepNums}, Brasil`;
  } else if (enderecoCompleto) {
    query = `${enderecoCompleto}, Brasil`;
  } else if (cidade && estado) {
    query = `${cidade}, ${estado}, Brasil`;
  } else if (cidade) {
    query = `${cidade}, Brasil`;
  } else {
    return null;
  }

  const cacheKey = query.toLowerCase().trim();
  if (geoCache.has(cacheKey)) return geoCache.get(cacheKey);

  try {
    const url = new URL(GEOCODING_API_BASE);
    url.searchParams.set("address", query);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("region", "br");
    url.searchParams.set("language", "pt-BR");

    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!resp.ok) {
      console.warn(`[GEO] HTTP ${resp.status} ao geocodificar "${query}"`);
      return null;
    }

    const data = await resp.json();

    if (data.status !== "OK" || !data.results?.[0]) {
      // ZERO_RESULTS é esperado para endereços inválidos — não logar como warn
      if (data.status !== "ZERO_RESULTS") {
        console.warn(`[GEO] status=${data.status} para "${query}"`);
      }
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    const result = { lat, lng };
    geoCache.set(cacheKey, result);
    console.log(`[GEO] ✓ "${query}" → ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    return result;
  } catch (err) {
    if (err.name === "TimeoutError") {
      console.warn(`[GEO] Timeout (${REQUEST_TIMEOUT_MS}ms) ao geocodificar "${query}"`);
    } else {
      console.warn(`[GEO] Erro ao geocodificar "${query}":`, err.message);
    }
    return null;
  }
}
