import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

export async function listLeadsMedicos() {
  const response = await api.get(API_ENDPOINTS.LEADS_MEDICOS.LIST);
  return {
    success: Boolean(response.data?.success),
    role: response.data?.role,
    viewer: response.data?.viewer || null,
    total: response.data?.total ?? response.data?.data?.length ?? 0,
    data: Array.isArray(response.data?.data) ? response.data.data : [],
  };
}

export async function getLeadMedico(id) {
  const response = await api.get(API_ENDPOINTS.LEADS_MEDICOS.DETAIL(id));
  return {
    success: Boolean(response.data?.success),
    role: response.data?.role,
    viewer: response.data?.viewer || null,
    data: response.data?.data || null,
  };
}

export function buildEvidenceFormData({ observacao, files }) {
  const form = new FormData();
  if (observacao) form.append("observacao", observacao);
  (files || []).forEach((file) => form.append("evidencias", file));
  return form;
}

export async function registrarTentativa(id, round, observacao, files = []) {
  const response = await api.post(
    API_ENDPOINTS.LEADS_MEDICOS.TENTATIVA(id, round),
    buildEvidenceFormData({ observacao, files }),
    { timeout: 120000 },
  );
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export async function registrarPrimeiraTentativa(id, observacao) {
  return registrarTentativa(id, 1, observacao);
}

export async function solicitarQuartaTentativa(id, { dataQuartaTentativa, motivo, files = [] }) {
  const form = new FormData();
  if (dataQuartaTentativa) form.append("dataQuartaTentativa", dataQuartaTentativa);
  if (motivo) form.append("motivo", motivo);
  files.forEach((file) => form.append("evidencias", file));

  const response = await api.post(
    API_ENDPOINTS.LEADS_MEDICOS.QUARTA_TENTATIVA_SOLICITAR(id),
    form,
    { timeout: 120000 },
  );
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export async function marcarTentativaSemRetorno(id, round, observacao) {
  const response = await api.post(
    API_ENDPOINTS.LEADS_MEDICOS.TENTATIVA_SEM_RETORNO(id, round),
    { observacao },
  );
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export async function marcarLeadSemInteresse(id, observacao, files = []) {
  const response = await api.post(
    API_ENDPOINTS.LEADS_MEDICOS.SEM_INTERESSE(id),
    buildEvidenceFormData({ observacao, files }),
    { timeout: 120000 },
  );
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export async function marcarLeadSemContato(id, files = []) {
  const response = await api.post(
    API_ENDPOINTS.LEADS_MEDICOS.SEM_CONTATO(id),
    buildEvidenceFormData({ files }),
    { timeout: 120000 },
  );
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export async function confirmarCheckin(id) {
  const response = await api.post(API_ENDPOINTS.LEADS_MEDICOS.ACEITAR(id));
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export async function recusarOferta(id) {
  const response = await api.post(API_ENDPOINTS.LEADS_MEDICOS.RECUSAR(id));
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export async function listPendingOffers() {
  const response = await api.get(API_ENDPOINTS.LEADS_MEDICOS.OFERTAS_PENDENTES);
  return {
    success: Boolean(response.data?.success),
    role: response.data?.role,
    viewer: response.data?.viewer || null,
    total: response.data?.total ?? response.data?.data?.length ?? 0,
    data: Array.isArray(response.data?.data) ? response.data.data : [],
  };
}

export const leadsMedicosService = {
  list: listLeadsMedicos,
  getById: getLeadMedico,
  registrarPrimeiraTentativa,
  registrarTentativa,
  marcarSemInteresse: marcarLeadSemInteresse,
  marcarSemContato: marcarLeadSemContato,
  marcarSemRetorno: marcarTentativaSemRetorno,
  solicitarQuartaTentativa,
  confirmarCheckin,
  aceitarOferta: confirmarCheckin,
  recusarOferta,
  listPendingOffers,
};
