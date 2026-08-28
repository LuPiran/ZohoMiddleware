/**
 * Gera o HTML de todos os modelos de e-mail (Leads Médicos) com dado de
 * exemplo, sem enviar nada de verdade — útil pra ajustar template sem
 * precisar criar lead de teste na base.
 *
 * Uso:
 *   node scripts/preview-emails.mjs            # imprime JSON no stdout
 *   node scripts/preview-emails.mjs --out DIR  # grava um .html por modelo em DIR
 */
import { previewEmailTemplates } from "../src/services/emailService.js";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const outIndex = process.argv.indexOf("--out");
const outDir = outIndex !== -1 ? process.argv[outIndex + 1] : null;

const previews = previewEmailTemplates();

if (outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const p of previews) {
    const file = resolve(outDir, `${p.key}.html`);
    writeFileSync(file, p.html, "utf8");
  }
  console.log(`✓ ${previews.length} modelos gravados em ${outDir}`);
} else {
  console.log(JSON.stringify(previews, null, 2));
}
