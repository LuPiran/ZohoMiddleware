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

export async function registrarPrimeiraTentativa(id, observacao) {
  const response = await api.post(
    API_ENDPOINTS.LEADS_MEDICOS.PRIMEIRA_TENTATIVA(id),
    { observacao },
  );
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export async function marcarLeadSemInteresse(id, observacao) {
  const response = await api.post(
    API_ENDPOINTS.LEADS_MEDICOS.SEM_INTERESSE(id),
    { observacao },
  );
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export async function confirmarCheckin(id) {
  const response = await api.post(API_ENDPOINTS.LEADS_MEDICOS.CHECKIN(id));
  return {
    success: Boolean(response.data?.success),
    data: response.data?.data || null,
  };
}

export const leadsMedicosService = {
  list: listLeadsMedicos,
  getById: getLeadMedico,
  registrarPrimeiraTentativa,
  marcarSemInteresse: marcarLeadSemInteresse,
  confirmarCheckin,
};
