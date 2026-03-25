/**
 * Serviço para gerenciar formulários salvos temporariamente
 * Salva no backend por usuário autenticado e mantém fallback local.
 */

import api from "./api";

function getStorageKey() {
  try {
    const raw =
      sessionStorage.getItem("user") || localStorage.getItem("user");
    if (raw) {
      const user = JSON.parse(raw);
      const identifier = user?.email || user?.id || user?._id || "anonymous";
      return `formularios_salvos_${String(identifier).toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    }
  } catch {
    // ignora erros de parse
  }
  return "formularios_salvos_anonymous";
}

function getLocalForms() {
  try {
    const data = localStorage.getItem(getStorageKey());
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalForms(formsArray) {
  localStorage.setItem(getStorageKey(), JSON.stringify(formsArray));
}

/**
 * Salva um formulário temporariamente
 * @param {Object} formData - Dados do formulário
 * @param {string} formData.tipo - Tipo do formulário (compra, recompra, proposta, ocorrencia)
 * @param {string} formData.titulo - Título/descrição do formulário
 * @param {string} formData.paciente - Nome do paciente/cliente
 * @param {string} formData.cpf - CPF/CNPJ do paciente/cliente
 * @param {string} formData.resumo - Resumo dos dados do formulário
 * @param {Object} formData.dados - Dados completos do formulário para recuperação
 * @param {string} formData.rota - Rota para voltar ao formulário
 * @returns {boolean} true se salvo com sucesso, false caso contrário
 */
export function salvarFormularioTemporariamente(formData) {
  try {
    const formsArray = getLocalForms();
    
    // Adicionar data de salvamento
    const novoFormulario = {
      ...formData,
      dataSalvamento: new Date().toISOString(),
      id: `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    formsArray.push(novoFormulario);
    
    // Limitar a 50 formulários salvos para não sobrecarregar o localStorage
    if (formsArray.length > 50) {
      formsArray.splice(0, formsArray.length - 50);
    }
    
    setLocalForms(formsArray);

    // Sincroniza no backend por usuário (best-effort).
    api.post("/v1/saved-forms", novoFormulario).catch((error) => {
      console.warn("[SAVED_FORMS] Não foi possível sincronizar no servidor:", error?.message || error);
    });

    console.log("Formulário salvo temporariamente:", novoFormulario);
    return true;
  } catch (error) {
    console.error("Erro ao salvar formulário temporariamente:", error);
    return false;
  }
}

/**
 * Obtém todos os formulários salvos
 * @returns {Array} Array de formulários salvos
 */
export async function obterFormulariosSalvos() {
  try {
    const response = await api.get("/v1/saved-forms");
    const forms = Array.isArray(response.data?.data) ? response.data.data : [];
    setLocalForms(forms);
    return forms;
  } catch (error) {
    console.warn("[SAVED_FORMS] Fallback local ao obter formulários:", error?.message || error);
    return getLocalForms();
  }
}

/**
 * Obtém a contagem de formulários salvos
 * @returns {number} Quantidade de formulários salvos
 */
export async function obterContagemFormulariosSalvos() {
  try {
    const response = await api.get("/v1/saved-forms/count");
    const count = Number(response.data?.count);
    if (Number.isFinite(count)) return count;
  } catch (error) {
    console.warn("[SAVED_FORMS] Fallback local na contagem:", error?.message || error);
  }
  return getLocalForms().length;
}

/**
 * Recupera um formulário salvo por ID
 * @param {string} id - ID do formulário
 * @returns {Object|null} O formulário encontrado ou null
 */
export async function recuperarFormulario(id) {
  try {
    const forms = await obterFormulariosSalvos();
    return forms.find(f => f.id === id) || null;
  } catch (error) {
    console.error("Erro ao recuperar formulário:", error);
    return null;
  }
}

/**
 * Exclui um formulário salvo por ID
 * @param {string} id - ID do formulário
 * @returns {boolean} true se excluído com sucesso, false caso contrário
 */
export async function excluirFormulario(id) {
  try {
    const formsArray = getLocalForms();
    const novaArray = formsArray.filter(f => f.id !== id);

    setLocalForms(novaArray);
    await api.delete(`/v1/saved-forms/${id}`);

    console.log("Formulário excluído:", id);
    return true;
  } catch (error) {
    console.error("Erro ao excluir formulário:", error);
    return false;
  }
}

/**
 * Limpa todos os formulários salvos
 * @returns {boolean} true se limpo com sucesso, false caso contrário
 */
export function limparTodosFormularios() {
  try {
    localStorage.removeItem(getStorageKey());
    console.log("Todos os formulários foram removidos");
    return true;
  } catch (error) {
    console.error("Erro ao limpar formulários:", error);
    return false;
  }
}

/**
 * Atualiza um formulário salvo
 * @param {string} id - ID do formulário
 * @param {Object} novosDados - Novos dados do formulário
 * @returns {boolean} true se atualizado com sucesso, false caso contrário
 */
export async function atualizarFormulario(id, novosDados) {
  try {
    const formsArray = getLocalForms();
    const index = formsArray.findIndex(f => f.id === id);
    
    if (index === -1) {
      console.warn("Formulário não encontrado para atualizar:", id);
      return false;
    }
    
    formsArray[index] = {
      ...formsArray[index],
      ...novosDados,
      dataAtualizacao: new Date().toISOString(),
    };
    
    setLocalForms(formsArray);
    await api.put(`/v1/saved-forms/${id}`, formsArray[index]);

    console.log("Formulário atualizado:", id);
    return true;
  } catch (error) {
    console.error("Erro ao atualizar formulário:", error);
    return false;
  }
}
