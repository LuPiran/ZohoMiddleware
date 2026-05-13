import express from "express";
import { chamarZohoApi } from "../services/zohoApi.js";

const router = express.Router();

router.get("/ping", async (req, res) => {
  const startedAt = Date.now();
  const probes = [
    {
      name: "contacts-read",
      endpoint: "/Contacts?page=1&per_page=1&fields=id",
    },
    {
      name: "portal-onix-read",
      endpoint: "/Portal_onix?page=1&per_page=1&fields=id",
    },
    {
      name: "ocorrencias-read",
      endpoint: "/Ocorrencias?page=1&per_page=1&fields=id",
    },
  ];

  const probeResults = [];

  for (const probe of probes) {
    try {
      await chamarZohoApi("GET", probe.endpoint, null, {
        timeoutMs: 12000,
      });

      probeResults.push({
        name: probe.name,
        endpoint: probe.endpoint,
        ok: true,
      });
    } catch (error) {
      probeResults.push({
        name: probe.name,
        endpoint: probe.endpoint,
        ok: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Erro desconhecido",
        code: error.response?.data?.code || null,
      });
    }
  }

  const successCount = probeResults.filter((item) => item.ok).length;
  const failedCount = probeResults.length - successCount;
  const zohoReachable = successCount > 0;

  if (zohoReachable) {
    return res.json({
      success: true,
      zohoReachable: true,
      message: "Conexao com Zoho confirmada para pelo menos um endpoint de negocio",
      latencyMs: Date.now() - startedAt,
      details: {
        successCount,
        failedCount,
        probes: probeResults,
      },
    });
  }

  return res.status(503).json({
    success: false,
    zohoReachable: false,
    message: "Falha ao conectar no Zoho com os endpoints de negocio",
    latencyMs: Date.now() - startedAt,
    details: {
      successCount,
      failedCount,
      probes: probeResults,
    },
  });
});

export default router;
