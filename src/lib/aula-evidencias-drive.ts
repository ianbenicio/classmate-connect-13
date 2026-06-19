import { supabase } from "@/integrations/supabase/client";
import type { PlanoAulaDados } from "./aula-evidencias";

type DriveAction = "ensure_folder" | "create_plan_doc" | "verify";

export interface AulaEvidenciasDriveResult {
  ok: boolean;
  error?: string;
  path?: string;
  folder?: {
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
  };
  file?: {
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
  };
  reused?: boolean;
  results?: Array<{
    tipo: "plano_aula" | "chamada_arquivo";
    status: string;
    expectedNames: string[];
    observacao?: string | null;
    file?: {
      id: string;
      name: string;
      mimeType: string;
      webViewLink?: string;
    } | null;
  }>;
}

async function invokeDriveAction(
  action: DriveAction,
  agendamentoId: string,
  planoDados?: PlanoAulaDados,
): Promise<AulaEvidenciasDriveResult> {
  const { data, error } = await supabase.functions.invoke("aula-evidencias-drive", {
    body: {
      action,
      agendamentoId,
      planoDados,
    },
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return (data ?? {
    ok: false,
    error: "Resposta vazia da Edge Function.",
  }) as AulaEvidenciasDriveResult;
}

export function ensureAulaDriveFolder(agendamentoId: string) {
  return invokeDriveAction("ensure_folder", agendamentoId);
}

export function createPlanoAulaDriveDoc(agendamentoId: string, planoDados: PlanoAulaDados) {
  return invokeDriveAction("create_plan_doc", agendamentoId, planoDados);
}

export function verificarAulaDrive(agendamentoId: string) {
  return invokeDriveAction("verify", agendamentoId);
}
