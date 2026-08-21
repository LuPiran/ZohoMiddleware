/**
 * Monta o prefill do médico prescritor a partir de um Lead Médico, para uso
 * no formulário de Compra (seção "Novo médico prescritor").
 */
export function buildLeadPrefill(lead) {
  if (!lead) return null;
  return {
    temNovoMedicoPrescritor: true,
    nomeMedico: lead.nome || "",
    crmMedico: lead.numeroRegistro || "",
    ufCrm: lead.ufCrm || lead.uf || "",
    celularMedico: lead.celular || lead.telefone || "",
    emailMedico: lead.email || "",
    especialidadeMedico: lead.tipoLead || lead.especialidade || "",
  };
}
