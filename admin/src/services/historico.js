import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

function buildParams(params = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const per_page = Math.min(
    100,
    Math.max(1, Number(params.perPage ?? params.per_page) || 20),
  );
  const out = { page, per_page };
  const search = String(params.search ?? "").trim();
  if (search) out.search = search;
  const cid = params.consultor_id;
  if (cid != null && String(cid).trim() !== "") {
    out.consultor_id = String(cid).trim();
  }
  const createdFrom = String(params.created_from ?? "").trim();
  if (createdFrom) out.created_from = createdFrom;
  const createdTo = String(params.created_to ?? "").trim();
  if (createdTo) out.created_to = createdTo;
  return out;
}

export const historicoService = {
  async getFiltrosConsultores() {
    const response = await api.get(API_ENDPOINTS.HISTORICO.FILTROS_CONSULTORES);
    return response.data;
  },

  async listCompras(params = {}) {
    const response = await api.get(API_ENDPOINTS.HISTORICO.COMPRAS, {
      params: buildParams(params),
    });
    return response.data;
  },

  async listRecompras(params = {}) {
    const response = await api.get(API_ENDPOINTS.HISTORICO.RECOMPRAS, {
      params: buildParams(params),
    });
    return response.data;
  },

  async listPropostas(params = {}) {
    const response = await api.get(API_ENDPOINTS.HISTORICO.PROPOSTAS, {
      params: buildParams(params),
    });
    return response.data;
  },

  async listOcorrencias(params = {}) {
    const response = await api.get(API_ENDPOINTS.HISTORICO.OCORRENCIAS, {
      params: buildParams(params),
    });
    return response.data;
  },

  async getCompraById(id) {
    const response = await api.get(`${API_ENDPOINTS.HISTORICO.COMPRAS}/${id}`);
    return response.data;
  },

  async getRecompraById(id) {
    const response = await api.get(`${API_ENDPOINTS.HISTORICO.RECOMPRAS}/${id}`);
    return response.data;
  },

  async getPropostaById(id) {
    const response = await api.get(`${API_ENDPOINTS.HISTORICO.PROPOSTAS}/${id}`);
    return response.data;
  },

  async getOcorrenciaById(id) {
    const response = await api.get(`${API_ENDPOINTS.HISTORICO.OCORRENCIAS}/${id}`);
    return response.data;
  },

  /**
   * @param {'compra'|'recompra'|'proposta'|'ocorrencia'} tipo
   * @param {string} recordId
   * @param {number} fileIndex
   */
  async getArquivoSignedUrl(tipo, recordId, fileIndex) {
    const base =
      tipo === "compra"
        ? API_ENDPOINTS.HISTORICO.COMPRAS
        : tipo === "recompra"
          ? API_ENDPOINTS.HISTORICO.RECOMPRAS
          : tipo === "proposta"
            ? API_ENDPOINTS.HISTORICO.PROPOSTAS
            : API_ENDPOINTS.HISTORICO.OCORRENCIAS;
    const response = await api.get(
      `${base}/${recordId}/arquivos/${fileIndex}/signed`,
    );
    return response.data;
  },
};
