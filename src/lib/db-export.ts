// Helpers de cliente: chama a server function, gera JSON e ZIP de CSVs.
import JSZip from "jszip";
import { exportDbSnapshot, type DbExportPayload } from "./db-export.functions";

function timestampSlug(iso: string): string {
  return iso.slice(0, 19).replace(/[:T]/g, "-");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Converte uma lista de objetos para CSV (RFC 4180). */
function toCSV(rows: unknown[]): string {
  if (rows.length === 0) return "";
  // Coleta a união de chaves em todas as linhas (Postgres pode trazer nulos esparsos).
  const colSet = new Set<string>();
  for (const r of rows as Record<string, unknown>[]) {
    for (const k of Object.keys(r)) colSet.add(k);
  }
  const cols = Array.from(colSet);

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    let s: string;
    if (typeof v === "object") s = JSON.stringify(v);
    else s = String(v);
    if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = cols.join(",");
  const body = (rows as Record<string, unknown>[])
    .map((r) => cols.map((c) => escape(r[c])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

async function fetchPayload(): Promise<DbExportPayload> {
  return exportDbSnapshot();
}

/** Baixa o snapshot completo do banco como JSON. */
export async function downloadDbJSON(): Promise<{
  filename: string;
  sizeBytes: number;
  payload: DbExportPayload;
}> {
  const payload = await fetchPayload();
  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: "application/json" });
  const filename = `academia-flow-db-${timestampSlug(payload.meta.geradoEm)}.json`;
  triggerDownload(blob, filename);
  return { filename, sizeBytes: blob.size, payload };
}

/** Baixa o snapshot como ZIP de CSVs (um por tabela). */
export async function downloadDbCSVZip(): Promise<{
  filename: string;
  sizeBytes: number;
  payload: DbExportPayload;
}> {
  const payload = await fetchPayload();
  const zip = new JSZip();
  zip.file("meta.json", JSON.stringify(payload.meta, null, 2));

  for (const [tabela, linhas] of Object.entries(payload.tabelas)) {
    zip.file(`${tabela}.csv`, toCSV(linhas as unknown[]));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `academia-flow-db-${timestampSlug(payload.meta.geradoEm)}.zip`;
  triggerDownload(blob, filename);
  return { filename, sizeBytes: blob.size, payload };
}
