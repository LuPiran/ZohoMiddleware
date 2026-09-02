/**
 * Catálogo da Central Comercial TegraPharma.
 * Extraído da referência CentralTegraPharma_V4_agosto_2026 (pastas SharePoint).
 */

export const TOP_CATEGORY_IDS = [
  "lp",
  "la",
  "et",
  "mc",
  "ar",
  "co",
  "eb",
  "lk",
  "ev",
];

export const CATALOG_META = {
  "lp": {
    "label": "Lâminas de produtos",
    "desc": "UsaLine, LatamLine e ProLine",
    "icon": "droplet"
  },
  "lp-usa": {
    "label": "Linha UsaLine",
    "desc": "Óleos, gummies, caplets e tópicos",
    "icon": "droplet"
  },
  "lp-usa-cbdthc": {
    "label": "CBD / THC",
    "desc": "Orgânicos e convencionais",
    "icon": "droplet"
  },
  "lp-usa-caplets": {
    "label": "Caplets",
    "desc": "",
    "icon": "droplet"
  },
  "lp-usa-gummies": {
    "label": "Gummies",
    "desc": "",
    "icon": "droplet"
  },
  "lp-usa-isobroad": {
    "label": "Isolado e Broad Spectrum",
    "desc": "",
    "icon": "droplet"
  },
  "lp-usa-cbgcbn": {
    "label": "Óleos CBG e CBN",
    "desc": "",
    "icon": "droplet"
  },
  "lp-usa-topicos": {
    "label": "Tópicos e Odonto",
    "desc": "",
    "icon": "droplet"
  },
  "lp-lat": {
    "label": "Linha LatamLine",
    "desc": "Óleos THC/CBD",
    "icon": "droplet"
  },
  "lp-pro": {
    "label": "Linha ProLine",
    "desc": "ProLine 2400mg CBD",
    "icon": "droplet"
  },
  "la": {
    "label": "Lâminas de patologia",
    "desc": "Dor, sono, oncologia e mais",
    "icon": "heart"
  },
  "et": {
    "label": "Estratégia terapêutica",
    "desc": "Escolha por patologia ou por produto",
    "icon": "target"
  },
  "et-pat": {
    "label": "Estratégia por patologia",
    "desc": "Ansiedade, dor, sono…",
    "icon": "heart"
  },
  "et-prod": {
    "label": "Estratégia por produto",
    "desc": "UsaLine, LatamLine e ProLine",
    "icon": "droplet"
  },
  "et-usa": {
    "label": "Estratégia — UsaLine",
    "desc": "",
    "icon": "droplet"
  },
  "et-usa-cbdthc": {
    "label": "CBD / THC",
    "desc": "Orgânicos e convencionais",
    "icon": "droplet"
  },
  "et-usa-caplets": {
    "label": "Caplets",
    "desc": "",
    "icon": "droplet"
  },
  "et-usa-gummies": {
    "label": "Gummies",
    "desc": "",
    "icon": "droplet"
  },
  "et-usa-isobroad": {
    "label": "Isolado e Broad Spectrum",
    "desc": "",
    "icon": "droplet"
  },
  "et-usa-cbgcbn": {
    "label": "Óleos CBG e CBN",
    "desc": "",
    "icon": "droplet"
  },
  "et-usa-topicos": {
    "label": "Tópicos e Odonto",
    "desc": "",
    "icon": "droplet"
  },
  "et-lat": {
    "label": "Estratégia — LatamLine",
    "desc": "",
    "icon": "droplet"
  },
  "et-pro": {
    "label": "Estratégia — ProLine",
    "desc": "",
    "icon": "droplet"
  },
  "mc": {
    "label": "Materiais comerciais",
    "desc": "Portfólio, guias e apresentações",
    "icon": "briefcase"
  },
  "ar": {
    "label": "Artigos científicos",
    "desc": "Organizados por assunto",
    "icon": "micro"
  },
  "co": {
    "label": "COAs — Certificados de análise",
    "desc": "Por linha de produto",
    "icon": "check"
  },
  "co-usa": {
    "label": "COAs — UsaLine",
    "desc": "",
    "icon": "check"
  },
  "co-usa-cbdthc": {
    "label": "CBD / THC",
    "desc": "Orgânicos e convencionais",
    "icon": "check"
  },
  "co-usa-caplets": {
    "label": "Caplets",
    "desc": "",
    "icon": "check"
  },
  "co-usa-gummies": {
    "label": "Gummies",
    "desc": "",
    "icon": "check"
  },
  "co-usa-isobroad": {
    "label": "Isolado e Broad Spectrum",
    "desc": "",
    "icon": "check"
  },
  "co-usa-cbgcbn": {
    "label": "Óleos CBG e CBN",
    "desc": "",
    "icon": "check"
  },
  "co-usa-topicos": {
    "label": "Tópicos e Odonto",
    "desc": "",
    "icon": "check"
  },
  "co-lat": {
    "label": "COAs — LatamLine",
    "desc": "",
    "icon": "check"
  },
  "co-out": {
    "label": "COAs — ProLine",
    "desc": "",
    "icon": "check"
  },
  "eb": {
    "label": "Ebooks",
    "desc": "CBG, CBN, THC e canabinoides menores",
    "icon": "book"
  },
  "lk": {
    "label": "Links úteis",
    "desc": "Trilha, Anvisa, RDV, e-mail",
    "icon": "link"
  },
  "ev": {
    "label": "Eventos",
    "desc": "Verba e relatório padrão",
    "icon": "cal"
  }
};

export const CATALOG_PAGES = {
  "lp": {
    "groups": [
      {
        "items": [
          {
            "nav": "lp-usa"
          },
          {
            "nav": "lp-lat"
          },
          {
            "nav": "lp-pro"
          },
          {
            "leaf": true,
            "label": "Mini portfólio digital",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Mini%20portf%C3%B3lio"
          },
          {
            "leaf": true,
            "label": "Tabela de produtos",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Tabela%20de%20produtos"
          }
        ]
      }
    ]
  },
  "lp-usa": {
    "groups": [
      {
        "items": [
          {
            "nav": "lp-usa-cbdthc"
          },
          {
            "nav": "lp-usa-caplets"
          },
          {
            "nav": "lp-usa-gummies"
          },
          {
            "nav": "lp-usa-isobroad"
          },
          {
            "nav": "lp-usa-cbgcbn"
          },
          {
            "nav": "lp-usa-topicos"
          }
        ]
      }
    ]
  },
  "lp-usa-cbdthc": {
    "groups": [
      {
        "label": "Orgânicos",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine 3.000mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Org%C3%A2nico%206000mg%20e%203000mg%20Full%20Spectrum"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 6.000mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Org%C3%A2nico%206000mg%20e%203000mg%20Full%20Spectrum"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 12.000mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Org%C3%A2nico%2012000mg%20Full%20Spectrum"
          }
        ]
      },
      {
        "label": "Convencionais",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine 1500mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/1500mg%20Full%20Spectrum"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 3.000mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/3000mg%20Full%20Spectrum"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 6.000mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/6000mg%20Full%20Spectrum"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:5 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/1-5"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:10 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/1-10"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:20 Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/1-20"
          }
        ]
      }
    ]
  },
  "lp-usa-caplets": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine CBG Nano Caplets 1500mg",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Nano%20Caplets"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine CBN Nano Caplets 1500mg",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Nano%20Caplets"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine SLEEP CBN Nano Caplets 1500mg",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Nano%20Caplets"
          }
        ]
      }
    ]
  },
  "lp-usa-gummies": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine Gummies Balance Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Gummies"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine Gummies Equilibrium Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Gummies"
          }
        ]
      }
    ]
  },
  "lp-usa-isobroad": {
    "groups": [
      {
        "label": "Isolado",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine Isolate 1500mg CBD",
            "tag": "Isolate",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/1500mg%20Isolate"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine Isolate 6000mg CBD",
            "tag": "Isolate",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/6000mg%20Isolate"
          }
        ]
      },
      {
        "label": "Broad Spectrum",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine Broad Spectrum 3000mg CBD",
            "tag": "Broad Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/3000mg%20Broad"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 3.000mg CBD Broad Spectrum Orgânico",
            "tag": "Broad Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Forms/AllItems.aspx?id=%2Fsites%2FEstruturadePastas%2DTegraPharma%2FDocumentos%20Compartilhados%2FProjeto%20Eld%2FCentral%20comercial%20TegraPharma%2FL%C3%A2minas%20de%20produtos%2FUsaline%2F3000mg%20Broad%20Org%C3%A2nico&p=true&ga=1"
          }
        ]
      }
    ]
  },
  "lp-usa-cbgcbn": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:1 CBG/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/CBG%201-1%20%C3%93leo"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:2 CBN/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/CBN%201-2%20%C3%93leo"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine THCV 500mg e 100mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/THCV"
          }
        ]
      }
    ]
  },
  "lp-usa-topicos": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine CBG Pump",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Roll-On%20e%20Pump"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine CBG Roll On",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Roll-On%20e%20Pump"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine Mouthwash 1:1 CBG/CBD",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Usaline/Kit%20Odonto"
          }
        ]
      }
    ]
  },
  "lp-lat": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:1 300mg THC e 300mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Latam"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:1 750mg THC e 750mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Latam"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:1 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Latam"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:20 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Latam"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:30 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Latam"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1260mg THC Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Latam"
          }
        ]
      }
    ]
  },
  "lp-pro": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra ProLine 2400mg CBD",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20produtos/Proline/2400"
          }
        ]
      }
    ]
  },
  "la": {
    "groups": [
      {
        "label": "Lâminas por patologia",
        "items": [
          {
            "leaf": true,
            "label": "Lâmina — Alzheimer",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Alzheimer"
          },
          {
            "leaf": true,
            "label": "Lâmina — Ansiedade",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Ansiedade"
          },
          {
            "leaf": true,
            "label": "Lâmina — Autismo",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Autismo"
          },
          {
            "leaf": true,
            "label": "Lâmina — Dor",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Dor"
          },
          {
            "leaf": true,
            "label": "Lâmina — Epilepsia",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Epilepsia"
          },
          {
            "leaf": true,
            "label": "Lâmina — Fibromialgia",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Fibromialgia"
          },
          {
            "leaf": true,
            "label": "Lâmina — Oncologia",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Oncologia"
          },
          {
            "leaf": true,
            "label": "Lâmina — Sono",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Sono"
          },
          {
            "leaf": true,
            "label": "Lâmina — Odontologia",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Odonto"
          },
          {
            "leaf": true,
            "label": "Lâmina — Lesões (Hidrogel)",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A2minas%20de%20patologia/Les%C3%B5es"
          }
        ]
      },
      {
        "label": "Referências",
        "items": [
          {
            "leaf": true,
            "label": "Tabela de interação medicamentosa",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Tabela%20Intera%C3%A7%C3%A3o%20Medicamentosa"
          },
          {
            "leaf": true,
            "label": "Lâmina RDC 660",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/L%C3%A3mina%20RDC%20660x327"
          }
        ]
      }
    ]
  },
  "et": {
    "groups": [
      {
        "items": [
          {
            "nav": "et-pat"
          },
          {
            "nav": "et-prod"
          }
        ]
      }
    ]
  },
  "et-pat": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Ansiedade",
            "tag": null,
            "desc": "UsaLine 6.000mg Orgânico · Caplets CBN · Gummies Balance · LatamLine 1:1",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Ansiedade"
          },
          {
            "leaf": true,
            "label": "Insônia",
            "tag": null,
            "desc": "Caplets SLEEP · 1:2 CBN/CBD · LatamLine 1:1",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Ins%C3%B4nia"
          },
          {
            "leaf": true,
            "label": "Dor crônica",
            "tag": null,
            "desc": "UsaLine 1:5 · 1:10 · LatamLine 1:1 · 1:30 · 300mg THC",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Dor%20Cr%C3%B4nica"
          },
          {
            "leaf": true,
            "label": "Fibromialgia",
            "tag": null,
            "desc": "UsaLine 3.000mg e 6.000mg Full Spectrum Orgânico",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Fibromialgia"
          },
          {
            "leaf": true,
            "label": "Oncologia e cuidados paliativos",
            "tag": null,
            "desc": "LatamLine 300mg THC · 1:1 · UsaLine 6.000mg Orgânico",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Oncologia"
          },
          {
            "leaf": true,
            "label": "Parkinson, Alzheimer e demência",
            "tag": null,
            "desc": "UsaLine 6.000mg e 12.000mg Orgânico · LatamLine 1:1",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Parkinson"
          },
          {
            "leaf": true,
            "label": "TDAH e autismo",
            "tag": null,
            "desc": "UsaLine 1:2 CBN/CBD · Caplets CBN · 1:1 CBG/CBD",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/TDAH"
          },
          {
            "leaf": true,
            "label": "Epilepsia",
            "tag": null,
            "desc": "UsaLine Broad Spectrum 3000mg · Isolate 6000mg",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Epilepsia"
          },
          {
            "leaf": true,
            "label": "Compulsão e depressão",
            "tag": null,
            "desc": "UsaLine 3.000mg Orgânico · 1:1 CBG/CBD",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Compuls%C3%A3o"
          },
          {
            "leaf": true,
            "label": "Síndrome metabólica e obesidade",
            "tag": null,
            "desc": "UsaLine THCV · Gummies Equilibrium",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/S%C3%ADndrome%20Metab%C3%B3lica%20e%20obesidade"
          },
          {
            "leaf": true,
            "label": "Dor local e lesões",
            "tag": null,
            "desc": "CBG Roll On · CBG Pump",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Dor%20Local"
          },
          {
            "leaf": true,
            "label": "Odontologia",
            "tag": null,
            "desc": "Mouthwash CBG/CBD · Kit Odonto",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Patologias/Intraorais-Odonto"
          }
        ]
      }
    ]
  },
  "et-prod": {
    "groups": [
      {
        "items": [
          {
            "nav": "et-usa"
          },
          {
            "nav": "et-lat"
          },
          {
            "nav": "et-pro"
          }
        ]
      }
    ]
  },
  "et-usa": {
    "groups": [
      {
        "items": [
          {
            "nav": "et-usa-cbdthc"
          },
          {
            "nav": "et-usa-caplets"
          },
          {
            "nav": "et-usa-gummies"
          },
          {
            "nav": "et-usa-isobroad"
          },
          {
            "nav": "et-usa-cbgcbn"
          },
          {
            "nav": "et-usa-topicos"
          }
        ]
      }
    ]
  },
  "et-usa-cbdthc": {
    "groups": [
      {
        "label": "Orgânicos",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine 3.000mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": "Compulsão · Depressão · Fibromialgia",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Org%C3%A2nico%203k"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 6.000mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": "Ansiedade · Alzheimer · Oncologia · Parkinson",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Org%C3%A2nico%206k"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 12.000mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": "Alzheimer avançado",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Org%C3%A2nico%2012k"
          }
        ]
      },
      {
        "label": "Convencionais",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:5 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Dor moderada",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:10 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Dor crônica",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:20 Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Demência · Fadiga",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline"
          }
        ]
      }
    ]
  },
  "et-usa-caplets": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine CBN Nano Caplets 1500mg",
            "tag": null,
            "desc": "Ansiedade · TDAH · Hiperatividade",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Caplets/Caplets%20CBN%20e%20Org%C3%A2nico%206k"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine SLEEP CBN Nano Caplets 1500mg",
            "tag": null,
            "desc": "Insônia",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Caplets/Caplets%20CBN%20e%20Org%C3%A2nico%206k"
          }
        ]
      }
    ]
  },
  "et-usa-gummies": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine Gummies Balance Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Estresse e ansiedade",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Gummies/Balance"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine Gummies Equilibrium Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Equilíbrio metabólico",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Gummies/Equilibrium"
          }
        ]
      }
    ]
  },
  "et-usa-isobroad": {
    "groups": [
      {
        "label": "Isolado",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine Isolate 6000mg CBD",
            "tag": "Isolate",
            "desc": "Epilepsia",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/UsaLine%206k%20ISO"
          }
        ]
      },
      {
        "label": "Broad Spectrum",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine Broad Spectrum 3000mg CBD",
            "tag": "Broad Spectrum",
            "desc": "Epilepsia",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/UsaLine%203k%20BD"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 3.000mg CBD Broad Spectrum Orgânico",
            "tag": "Broad Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/:f:/s/EstruturadePastas-TegraPharma/IgDnn9OhpPklQrTvg7B_CdQiAem55aBnrCF8-I6oefdn-O0?e=46UpHg"
          }
        ]
      }
    ]
  },
  "et-usa-cbgcbn": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:1 CBG/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Autismo · Compulsão · Depressão",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:2 CBN/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Insônia · TDAH",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine THCV 500mg e 100mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": "Síndrome metabólica · Obesidade",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Org%C3%A2nico%20THCV"
          }
        ]
      }
    ]
  },
  "et-usa-topicos": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine CBG Roll On",
            "tag": null,
            "desc": "Dor local",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Usaline%20Roll%20On"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine CBG Pump",
            "tag": null,
            "desc": "Lesões de pele",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/Usaline/Usaline%20Pump"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine Mouthwash 1:1 CBG/CBD",
            "tag": null,
            "desc": "Odontologia",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/OdontoLine"
          }
        ]
      }
    ]
  },
  "et-lat": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:1 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Dor crônica · Insônia · Ansiedade · Oncologia · Parkinson",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/LatamLine/Latam%201.1"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:30 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Dor leve a moderada · Fadiga",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/LatamLine"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:1 300mg THC e 300mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Oncologia · Cuidados paliativos · Dor refratária",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/LatamLine/Latam%20300mg%20THC"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1260mg THC Full Spectrum",
            "tag": "Full Spectrum",
            "desc": "Cuidados paliativos · Demência · Dor refratária · Parkinson",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos/LatamLine/Latam%201260mg%20THC"
          }
        ]
      }
    ]
  },
  "et-pro": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra ProLine 2400mg CBD",
            "tag": null,
            "desc": "Alta concentração de CBD",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Estrat%C3%A9gia%20Terap%C3%AAutica/Por%20Produtos"
          }
        ]
      }
    ]
  },
  "mc": {
    "groups": [
      {
        "label": "Portfólio e apresentação",
        "items": [
          {
            "leaf": true,
            "label": "Tabela de produtos",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Tabela%20de%20produtos"
          },
          {
            "leaf": true,
            "label": "Mini portfólio digital",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Mini%20portf%C3%B3lio"
          },
          {
            "leaf": true,
            "label": "VA — Visual Aid",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/VA"
          },
          {
            "leaf": true,
            "label": "Memento — portfólio com informações técnicas",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Memento%20-%20Portf%C3%B3lio%20completo"
          },
          {
            "leaf": true,
            "label": "Template de slides",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Template%20-%20oficial"
          }
        ]
      },
      {
        "label": "Guias",
        "items": [
          {
            "leaf": true,
            "label": "Guia do Prescritor",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Guia%20do%20prescritor"
          },
          {
            "leaf": true,
            "label": "Passo a passo — preenchimento ANVISA",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Passo%20a%20Passo%20Anvisa"
          },
          {
            "leaf": true,
            "label": "Orientações de uso de produtos",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Guia%20Orienta%C3%A7%C3%A3o%20de%20Uso"
          }
        ]
      }
    ]
  },
  "ar": {
    "groups": [
      {
        "label": "Por patologia",
        "items": [
          {
            "leaf": true,
            "label": "Ansiedade, sono e depressão",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos"
          },
          {
            "leaf": true,
            "label": "Dor crônica, fibromialgia e enxaqueca",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos"
          },
          {
            "leaf": true,
            "label": "Autismo e epilepsia",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/Epilepsia%20e%20Autismo"
          },
          {
            "leaf": true,
            "label": "Demência, Parkinson e Alzheimer",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos"
          },
          {
            "leaf": true,
            "label": "Oncologia e cuidados paliativos",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/Oncologia%20e%20Dor%20Oncol%C3%B3gica"
          },
          {
            "leaf": true,
            "label": "Odontologia",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/Odontologia"
          },
          {
            "leaf": true,
            "label": "Pele e alopecia (uso tópico)",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/Uso%20T%C3%B3pico"
          }
        ]
      },
      {
        "label": "Por canabinoide",
        "items": [
          {
            "leaf": true,
            "label": "CBG",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/CBG"
          },
          {
            "leaf": true,
            "label": "CBN",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/CBN"
          },
          {
            "leaf": true,
            "label": "THCV e obesidade",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/THCV"
          },
          {
            "leaf": true,
            "label": "Interação medicamentosa",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/Intera%C3%A7%C3%B5es%20Medicamentosas"
          }
        ]
      },
      {
        "label": "Pesquisas TegraPharma",
        "items": [
          {
            "leaf": true,
            "label": "Modulação dos canabinoides — COVID-19",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/COVID-19"
          },
          {
            "leaf": true,
            "label": "Papel dos canabinoides na obesidade",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos/Obesidade"
          },
          {
            "leaf": true,
            "label": "Dor crônica — Estudo Delphi modificado",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Estudos%20cient%C3%ADficos"
          }
        ]
      },
      {
        "label": "Ferramentas de leitura",
        "items": [
          {
            "leaf": true,
            "label": "Prompt de IA — leitura crítica de artigos",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Materiais%20de%20Apoio/Prompts"
          },
          {
            "leaf": true,
            "label": "Livros — leitura complementar",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Artigos/Livros%20-%20Leitura%20Complementar"
          }
        ]
      }
    ]
  },
  "co": {
    "groups": [
      {
        "items": [
          {
            "nav": "co-usa"
          },
          {
            "nav": "co-lat"
          },
          {
            "nav": "co-out"
          }
        ]
      }
    ]
  },
  "co-usa": {
    "groups": [
      {
        "items": [
          {
            "nav": "co-usa-cbdthc"
          },
          {
            "nav": "co-usa-caplets"
          },
          {
            "nav": "co-usa-gummies"
          },
          {
            "nav": "co-usa-isobroad"
          },
          {
            "nav": "co-usa-cbgcbn"
          },
          {
            "nav": "co-usa-topicos"
          }
        ]
      }
    ]
  },
  "co-usa-cbdthc": {
    "groups": [
      {
        "label": "Orgânicos",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine 3.000mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Full%203000mg%20ORG%C3%82NICO"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 6.000mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Full%206000mg%20ORG%C3%82NICO"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 12.000mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Full%2012000mg%20ORG%C3%82NICO"
          }
        ]
      },
      {
        "label": "Convencionais",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine 1500mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Full%201.500mg"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 3.000mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Full%203000mg"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 6.000mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Full%206000mg"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:5 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:10 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:20 Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline"
          }
        ]
      }
    ]
  },
  "co-usa-caplets": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine CBG Nano Caplets 1500mg",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Tegra%20Caplets/Tegra%20UsaLine%20CBG%20Nano%20Caplets"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine CBN Nano Caplets 1500mg",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Tegra%20Caplets/Tegra%20UsaLine%20CBN%20Nano%20Caplets%20(Rosa)"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine SLEEP CBN Nano Caplets 1500mg",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Tegra%20Caplets/Tegra%20UsaLine%20SLEEP%20Nano%20Caplets"
          }
        ]
      }
    ]
  },
  "co-usa-gummies": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine Gummies Balance Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Gummies"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine Gummies Equilibrium Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Gummies"
          }
        ]
      }
    ]
  },
  "co-usa-isobroad": {
    "groups": [
      {
        "label": "Isolado",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine Isolate 1500mg CBD",
            "tag": "Isolate",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Isolado%201.500"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine Isolate 6000mg CBD",
            "tag": "Isolate",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Isolado%206000mg"
          }
        ]
      },
      {
        "label": "Broad Spectrum",
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine Broad Spectrum 3000mg CBD",
            "tag": "Broad Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Broad%203000mg"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 3.000mg CBD Broad Spectrum Orgânico",
            "tag": "Broad Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Broad%203000mg"
          }
        ]
      }
    ]
  },
  "co-usa-cbgcbn": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:1 CBG/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/CBG-CBD"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine 1:2 CBN/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine THCV 500mg e 100mg CBD Full Spectrum Orgânico",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/THCV"
          }
        ]
      }
    ]
  },
  "co-usa-topicos": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra UsaLine CBG Pump",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/T%C3%B3picos"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine CBG Roll On",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/T%C3%B3picos"
          },
          {
            "leaf": true,
            "label": "Tegra UsaLine Mouthwash 1:1 CBG/CBD",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Usaline/Odontoline"
          }
        ]
      }
    ]
  },
  "co-lat": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:1 300mg THC e 300mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Latam/300mg%20THC"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:1 750mg THC e 750mg CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Latam"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:1 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Latam"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:20 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Latam"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1:30 THC/CBD Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Latam"
          },
          {
            "leaf": true,
            "label": "Tegra LatamLine 1260mg THC Full Spectrum",
            "tag": "Full Spectrum",
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Latam"
          }
        ]
      }
    ]
  },
  "co-out": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Tegra ProLine 2400mg CBD",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/COAs/Tegra%20Pro"
          }
        ]
      }
    ]
  },
  "eb": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Ebook CBG — Fundamentos, mecanismos e aplicações clínicas",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Ebooks/CBG"
          },
          {
            "leaf": true,
            "label": "Ebook CBN — Equilíbrio mental",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Ebooks/CBN"
          },
          {
            "leaf": true,
            "label": "Ebook THC — Fundamentos, mecanismos e aplicações clínicas",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Ebooks/THC"
          },
          {
            "leaf": true,
            "label": "Ebook Canabinoides menores — Blend",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Ebooks/Canabinoides%20menores%20-%20blend%20de%20canabinoides"
          }
        ]
      }
    ]
  },
  "lk": {
    "groups": [
      {
        "label": "Aprendizagem e regulatório",
        "items": [
          {
            "leaf": true,
            "label": "Trilha de aprendizagem",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Trilha%20de%20aprendizagem"
          },
          {
            "leaf": true,
            "label": "Passo a passo Anvisa",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Passo%20a%20Passo%20Anvisa"
          }
        ]
      },
      {
        "label": "RDV e reembolso",
        "items": [
          {
            "leaf": true,
            "label": "Tutorial de RDV (vídeo)",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Restitui%C3%A7%C3%A3o%20-%20RDV"
          },
          {
            "leaf": true,
            "label": "Planilha de solicitação RDV",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Restitui%C3%A7%C3%A3o%20-%20RDV"
          }
        ]
      },
      {
        "label": "TI",
        "items": [
          {
            "leaf": true,
            "label": "Configurar assinatura de e-mail",
            "tag": null,
            "desc": null,
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Tutorial%20-%20Como%20ajustar%20sua%20assinatura%20e-mail"
          }
        ]
      }
    ]
  },
  "ev": {
    "groups": [
      {
        "items": [
          {
            "leaf": true,
            "label": "Solicitação de verba",
            "tag": null,
            "desc": "Planilha de budget para preencher",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Solciita%C3%A7%C3%A3o%20de%20verba%20-%20budget%20eventos"
          },
          {
            "leaf": true,
            "label": "Relatório padrão de eventos",
            "tag": null,
            "desc": "Modelo oficial TegraPharma",
            "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Modelo%20Relat%C3%B3rio"
          }
        ]
      }
    ]
  }
};

export const HOME_SECTIONS = [
  {
    "label": "Materiais do dia a dia",
    "items": [
      "lp",
      "la",
      "et",
      "mc"
    ]
  },
  {
    "label": "Conteúdo técnico",
    "items": [
      "ar",
      "co",
      "eb",
      {
        "leafHome": true,
        "label": "Apostila - Guia Prático de Relacionamento com Profissionais Técnicos",
        "icon": "book",
        "url": "https://onixcann.sharepoint.com/:f:/s/EstruturadePastas-TegraPharma/IgB-pCEo0N5lTaIIPZP9dsttAQCozBtAji87Usooacfe6bQ?e=toroFm"
      }
    ]
  },
  {
    "label": "Treinamento e operação",
    "items": [
      {
        "leafHome": true,
        "label": "Aula técnica de produtos",
        "desc": "Treinamento completo — Consultor 2026",
        "icon": "grad",
        "url": "https://onixcann.sharepoint.com/sites/EstruturadePastas-TegraPharma/Documentos%20Compartilhados/Projeto%20Eld/Central%20comercial%20TegraPharma/Aula%20Produtos%20-%20Consultor%202026"
      },
      "lk",
      "ev"
    ]
  }
];
