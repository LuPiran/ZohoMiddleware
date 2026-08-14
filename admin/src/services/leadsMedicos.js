import api from "./api";
import { API_ENDPOINTS } from "../utils/constants";

/**
 * Lista leads médicos visíveis para o usuário autenticado.
 */
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

export const leadsMedicosService = {
  list: listLeadsMedicos,
};
