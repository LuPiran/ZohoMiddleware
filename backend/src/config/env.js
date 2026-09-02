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
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY, // geocoding de leads e consultores
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

  // AWS / DynamoDB — Leads Médicos
  AWS_REGION: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  DYNAMODB_LEADS_TABLE:
    process.env.DYNAMODB_LEADS_TABLE || "portal_leads_medicos",
  DYNAMODB_LEADS_ZOHO_ID_INDEX:
    process.env.DYNAMODB_LEADS_ZOHO_ID_INDEX || "gsi_zoho",
  DYNAMODB_LEADS_ZOHO_ID_ATTR:
    process.env.DYNAMODB_LEADS_ZOHO_ID_ATTR || "idZoho",
  DYNAMODB_LEADS_CONSULTOR_INDEX:
    process.env.DYNAMODB_LEADS_CONSULTOR_INDEX || "gsi_consultor",
  DYNAMODB_LEADS_CONSULTOR_ATTR:
    process.env.DYNAMODB_LEADS_CONSULTOR_ATTR || "consultorId",
  DYNAMODB_LEADS_CONSULTOR_SK_ATTR:
    process.env.DYNAMODB_LEADS_CONSULTOR_SK_ATTR || "entradaEm",
  DYNAMODB_LEADS_SLA_INDEX:
    process.env.DYNAMODB_LEADS_SLA_INDEX || "gsi_sla",
  DYNAMODB_LEADS_SLA_STATUS_ATTR:
    process.env.DYNAMODB_LEADS_SLA_STATUS_ATTR || "slaStatus",
  DYNAMODB_LEADS_SLA_DEADLINE_ATTR:
    process.env.DYNAMODB_LEADS_SLA_DEADLINE_ATTR || "slaDeadline",
  DYNAMODB_CONSULTORES_TABLE:
    process.env.DYNAMODB_CONSULTORES_TABLE || "portal_consultores",
  DYNAMODB_CONSULTORES_EMAIL_INDEX:
    process.env.DYNAMODB_CONSULTORES_EMAIL_INDEX || "gsi_email",
  DYNAMODB_CONSULTORES_EMAIL_ATTR:
    process.env.DYNAMODB_CONSULTORES_EMAIL_ATTR || "email",
  DYNAMODB_CONSULTORES_REGIAO_INDEX:
    process.env.DYNAMODB_CONSULTORES_REGIAO_INDEX || "gsi_regiao",
  DYNAMODB_CONSULTORES_REGIAO_ATTR:
    process.env.DYNAMODB_CONSULTORES_REGIAO_ATTR || "regiao",
  ZOHO_LEADS_WEBHOOK_SECRET: process.env.ZOHO_LEADS_WEBHOOK_SECRET,

  SLA_OFFER_MINUTES: Number(process.env.SLA_OFFER_MINUTES || 10),

  // Módulo CRM dos leads médicos (não confundir com ZOHO_MODULE_NAME dos usuários)
  ZOHO_LEADS_MODULE: process.env.ZOHO_LEADS_MODULE || "Leads_M_dicos",
  ZOHO_LEAD_STATUS_FIELD: process.env.ZOHO_LEAD_STATUS_FIELD || "Status",
  ZOHO_LEAD_CONSULTOR_FIELD:
    process.env.ZOHO_LEAD_CONSULTOR_FIELD || "Consultor_Tegra",
  ZOHO_LEAD_EMAIL_CONSULTOR_FIELD: process.env.ZOHO_LEAD_EMAIL_CONSULTOR_FIELD || "E_mail_do_Consultor",
  ZOHO_LEAD_DATA_QUALIFICADO_FIELD:
    process.env.ZOHO_LEAD_DATA_QUALIFICADO_FIELD || "Data_Lead_qualifica_o",
  ZOHO_LEAD_DATA_INTERESSE_FIELD:
    process.env.ZOHO_LEAD_DATA_INTERESSE_FIELD || "Data_Lead_Com_Interesse",
  ZOHO_LEAD_DATA_SEM_CONTATO_FIELD:
    process.env.ZOHO_LEAD_DATA_SEM_CONTATO_FIELD || "Data_lead_sem_contato",
  ZOHO_LEAD_DATA_SEM_INTERESSE_FIELD:
    process.env.ZOHO_LEAD_DATA_SEM_INTERESSE_FIELD || "Data_lead_sem_interesse",
  ZOHO_LEAD_DATA_CONVERTIDO_FIELD:
    process.env.ZOHO_LEAD_DATA_CONVERTIDO_FIELD || "Data_Conversao",
  ZOHO_LEAD_DATA_1A_FIELD: process.env.ZOHO_LEAD_DATA_1A_FIELD || "Data_1_Tentativa",
  ZOHO_LEAD_OBS_1A_FIELD: process.env.ZOHO_LEAD_OBS_1A_FIELD || "Tentativa_1",
  ZOHO_LEAD_STATUS_1A_FIELD:
    process.env.ZOHO_LEAD_STATUS_1A_FIELD || "Status_1_Tentativa",
  ZOHO_LEAD_DATA_2A_FIELD: process.env.ZOHO_LEAD_DATA_2A_FIELD || "Data_2_Tentativa",
  ZOHO_LEAD_OBS_2A_FIELD: process.env.ZOHO_LEAD_OBS_2A_FIELD || "Tentativa_2",
  ZOHO_LEAD_STATUS_2A_FIELD:
    process.env.ZOHO_LEAD_STATUS_2A_FIELD || "Status_2_Tentativa",
  ZOHO_LEAD_DATA_3A_FIELD: process.env.ZOHO_LEAD_DATA_3A_FIELD || "Data_3_Tentativa",
  ZOHO_LEAD_OBS_3A_FIELD: process.env.ZOHO_LEAD_OBS_3A_FIELD || "Tentativa_3",
  ZOHO_LEAD_STATUS_3A_FIELD:
    process.env.ZOHO_LEAD_STATUS_3A_FIELD || "Status_3_Tentativa",
  ZOHO_LEAD_ADD_2A_FIELD:
    process.env.ZOHO_LEAD_ADD_2A_FIELD || "Adicionar_2_Tentativa",
  ZOHO_LEAD_ADD_3A_FIELD:
    process.env.ZOHO_LEAD_ADD_3A_FIELD || "Adicionar_3_Tentativa",
  ZOHO_LEAD_PROTOCOLO_FIELD:
    process.env.ZOHO_LEAD_PROTOCOLO_FIELD || "Protocolo_Portal",

  // Sessão "4ª Tentativas de Contato" (solicitada pelo consultor, sem aprovação)
  ZOHO_LEAD_DATA_4A_FIELD: process.env.ZOHO_LEAD_DATA_4A_FIELD || "Data_4_Tentativa",
  ZOHO_LEAD_OBS_4A_FIELD: process.env.ZOHO_LEAD_OBS_4A_FIELD || "Tentativa",   // 4ª usa "Tentativa" sem sufixo numérico
  ZOHO_LEAD_STATUS_4A_FIELD:
    process.env.ZOHO_LEAD_STATUS_4A_FIELD || "Status_4_Tentativa",
  ZOHO_LEAD_ADD_4A_FIELD:
    process.env.ZOHO_LEAD_ADD_4A_FIELD || "Adicionar_4_Tentativa",
  ZOHO_LEAD_MOTIVO_4A_FIELD:
    process.env.ZOHO_LEAD_MOTIVO_4A_FIELD || "Motivo_4_Tentativa",

  // Rejeição de oferta (48h sem aceite ou recusa explícita) e "Lead Sem Tratativa"
  ZOHO_LEAD_DATA_REJEITADO_FIELD:
    process.env.ZOHO_LEAD_DATA_REJEITADO_FIELD || "Data_Lead_Rejeitado",
  ZOHO_LEAD_DATA_SEM_TRATATIVA_FIELD:
    process.env.ZOHO_LEAD_DATA_SEM_TRATATIVA_FIELD || "Data_Lead_Sem_Tratativa",

  // Agendamento — data de próximo contato previsto (independente da rodada de
  // tentativa formal), até 4 por lead
  ZOHO_LEAD_DATA_AGENDAMENTO_1_FIELD:
    process.env.ZOHO_LEAD_DATA_AGENDAMENTO_1_FIELD || "Data_Agendamento_1",
  ZOHO_LEAD_DATA_AGENDAMENTO_2_FIELD:
    process.env.ZOHO_LEAD_DATA_AGENDAMENTO_2_FIELD || "Data_Agendamento_2",
  ZOHO_LEAD_DATA_AGENDAMENTO_3_FIELD:
    process.env.ZOHO_LEAD_DATA_AGENDAMENTO_3_FIELD || "Data_Agendamento_3",
  ZOHO_LEAD_DATA_AGENDAMENTO_4_FIELD:
    process.env.ZOHO_LEAD_DATA_AGENDAMENTO_4_FIELD || "Data_Agendamento_4",

  // Consultor escolhe "só qualificar pro MKT" em vez de ir pra Compra —
  // status próprio, para não misturar com "Lead Com Interesse"
  ZOHO_LEAD_DATA_QUALIFICADO_MKT_FIELD:
    process.env.ZOHO_LEAD_DATA_QUALIFICADO_MKT_FIELD || "Data_Lead_Qualificado_MKT",

  // Campos de distribuição/SLA — sincronizados de volta ao Zoho após distribuição/aceite/rejeição
  ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD:
    process.env.ZOHO_LEAD_DIST_CONSULTOR_NOME_FIELD || "Dist_Consultor_Nome",
  ZOHO_LEAD_DIST_CONSULTOR_EMAIL_FIELD:
    process.env.ZOHO_LEAD_DIST_CONSULTOR_EMAIL_FIELD || "Dist_Consultor_Email",
  ZOHO_LEAD_DIST_CONSULTOR_ID_FIELD:
    process.env.ZOHO_LEAD_DIST_CONSULTOR_ID_FIELD || "Dist_Consultor_Id_Portal",
  ZOHO_LEAD_DIST_DATA_ATRIBUICAO_FIELD:
    process.env.ZOHO_LEAD_DIST_DATA_ATRIBUICAO_FIELD || "Dist_Data_Atribuicao",
  ZOHO_LEAD_DIST_DATA_CHECKIN_FIELD:
    process.env.ZOHO_LEAD_DIST_DATA_CHECKIN_FIELD || "Dist_Data_Checkin",
  ZOHO_LEAD_DIST_REGIAO_FIELD:
    process.env.ZOHO_LEAD_DIST_REGIAO_FIELD || "Dist_Regiao",
  ZOHO_LEAD_DIST_FILA_FIELD:
    process.env.ZOHO_LEAD_DIST_FILA_FIELD || "Dist_Fila",
  ZOHO_LEAD_DIST_STATUS_FIELD:
    process.env.ZOHO_LEAD_DIST_STATUS_FIELD || "Dist_Status",
  ZOHO_LEAD_DIST_RODADAS_FIELD:
    process.env.ZOHO_LEAD_DIST_RODADAS_FIELD || "Dist_Rodadas",
  ZOHO_LEAD_DIST_GEO_METODO_FIELD:
    process.env.ZOHO_LEAD_DIST_GEO_METODO_FIELD || "Dist_Geo_Metodo",
  ZOHO_LEAD_DIST_ERRO_SYNC_FIELD:
    process.env.ZOHO_LEAD_DIST_ERRO_SYNC_FIELD || "Dist_Erro_Sync",

  // Confirmação de que o lead passou pelo Portal + de qual evento ele veio
  // (campos já existiam no Zoho, sem uso — só passaram a ser escritos agora)
  ZOHO_LEAD_EVENTO_TRATADO_FIELD:
    process.env.ZOHO_LEAD_EVENTO_TRATADO_FIELD || "Evento_tratado",
  ZOHO_LEAD_NOME_EVENTO_FIELD:
    process.env.ZOHO_LEAD_NOME_EVENTO_FIELD || "Nome_evento",

  DYNAMODB_LEADS_PROTOCOLO_INDEX:
    process.env.DYNAMODB_LEADS_PROTOCOLO_INDEX || "gsi_protocolo",
  DYNAMODB_LEADS_PROTOCOLO_ATTR:
    process.env.DYNAMODB_LEADS_PROTOCOLO_ATTR || "protocolo",

  ZOHO_WORKDRIVE_CLIENT_ID: process.env.ZOHO_WORKDRIVE_CLIENT_ID,
  ZOHO_WORKDRIVE_CLIENT_SECRET: process.env.ZOHO_WORKDRIVE_CLIENT_SECRET,
  ZOHO_WORKDRIVE_REFRESH_TOKEN: process.env.ZOHO_WORKDRIVE_REFRESH_TOKEN,
  ZOHO_WORKDRIVE_FOLDER_ID:
    process.env.ZOHO_WORKDRIVE_FOLDER_ID || "8uwd527d3a78def86494e8fd6b959cbb2bc8d",
  ZOHO_WORKDRIVE_API_BASE:
    process.env.ZOHO_WORKDRIVE_API_BASE || "https://www.zohoapis.com/workdrive/api/v1",
  ZOHO_WORKDRIVE_ACCOUNTS_URL: process.env.ZOHO_WORKDRIVE_ACCOUNTS_URL,
  ZOHO_WORKDRIVE_DOWNLOAD_BASE: process.env.ZOHO_WORKDRIVE_DOWNLOAD_BASE,
  ZOHO_WORKDRIVE_PREVIEW_BASE:
    process.env.ZOHO_WORKDRIVE_PREVIEW_BASE ||
    "https://previewengine-accl.zohoexternal.com/image/WD",

  // E-mail transacional: none | microsoft | resend
  MAIL_PROVIDER: (process.env.MAIL_PROVIDER || "none").toLowerCase(),
  MAIL_FROM: process.env.MAIL_FROM || "",
  /** Quando setado, todos os e-mails são redirecionados para este endereço (modo teste). */
  MAIL_REDIRECT_TO: process.env.MAIL_REDIRECT_TO || "",
  GRAPH_MAIL_TENANT_ID:
    process.env.GRAPH_MAIL_TENANT_ID || process.env.ENTRA_TENANT_ID,
  GRAPH_MAIL_CLIENT_ID: process.env.GRAPH_MAIL_CLIENT_ID,
  GRAPH_MAIL_CLIENT_SECRET: process.env.GRAPH_MAIL_CLIENT_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
};