import { supabase } from "@/integrations/supabase/client";
import { requireProjectIdForWrite } from "./current-project";
import {
  getNomeArquivoChamadaUpload,
  validarArquivoEvidencia,
  type AulaEvidencia,
  type AulaEvidenciaContext,
} from "./aula-evidencias";

export const AULA_CHAMADAS_BUCKET = "aula-chamadas";

const STORAGE_URL_PREFIX = `storage://${AULA_CHAMADAS_BUCKET}/`;

function inferMimeType(file: File): string {
  const lowerName = file.name.toLowerCase();
  if (file.type) return file.type;
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

function toStorageUrl(path: string): string {
  return `${STORAGE_URL_PREFIX}${path}`;
}

function parseStoragePath(value?: string): string | null {
  if (!value?.startsWith(STORAGE_URL_PREFIX)) return null;
  return value.slice(STORAGE_URL_PREFIX.length);
}

export async function uploadChamadaArquivo(ctx: AulaEvidenciaContext, file: File) {
  const projectId = requireProjectIdForWrite();
  if (!projectId) throw new Error("Projeto ativo nao definido para upload da chamada.");

  const mimeType = inferMimeType(file);
  const arquivoNome = getNomeArquivoChamadaUpload(ctx, {
    name: file.name,
    mimeType,
  });
  const validation = validarArquivoEvidencia(ctx, "chamada_arquivo", {
    name: arquivoNome,
    mimeType,
  });
  if (!validation.valido) {
    throw new Error(validation.motivo ?? "Arquivo da chamada invalido.");
  }

  const storagePath = `${projectId}/${ctx.agendamento.id}/${arquivoNome}`;
  const { error } = await supabase.storage.from(AULA_CHAMADAS_BUCKET).upload(storagePath, file, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) throw new Error(error.message);

  return {
    arquivoNome,
    mimeType,
    arquivoUrl: toStorageUrl(storagePath),
    storagePath,
  };
}

export async function createChamadaSignedUrl(evidencia: Pick<AulaEvidencia, "arquivoUrl">) {
  const storagePath = parseStoragePath(evidencia.arquivoUrl);
  if (!storagePath) return evidencia.arquivoUrl ?? null;

  const { data, error } = await supabase.storage
    .from(AULA_CHAMADAS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
