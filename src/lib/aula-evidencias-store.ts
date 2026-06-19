import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireProjectIdForWrite } from "./current-project";
import { toast } from "sonner";
import type { AulaEvidencia, AulaEvidenciaStatus, AulaEvidenciaTipo } from "./aula-evidencias";

type Row = {
  id: string;
  agendamento_id: string;
  tipo: AulaEvidenciaTipo;
  status: AulaEvidenciaStatus;
  arquivo_nome: string | null;
  arquivo_mime_type: string | null;
  arquivo_url: string | null;
  drive_file_id: string | null;
  drive_folder_id: string | null;
  submetido_por_user_id: string | null;
  submetido_por_nome: string | null;
  aprovado_por_user_id: string | null;
  aprovado_em: string | null;
  verificado_em: string | null;
  observacao: string | null;
  dados: unknown;
  created_at: string;
  updated_at: string;
};

function rowToEvidencia(row: Row): AulaEvidencia {
  return {
    id: row.id,
    agendamentoId: row.agendamento_id,
    tipo: row.tipo,
    status: row.status,
    arquivoNome: row.arquivo_nome ?? undefined,
    arquivoMimeType: row.arquivo_mime_type ?? undefined,
    arquivoUrl: row.arquivo_url ?? undefined,
    driveFileId: row.drive_file_id ?? undefined,
    driveFolderId: row.drive_folder_id ?? undefined,
    submetidoPorUserId: row.submetido_por_user_id ?? undefined,
    submetidoPorNome: row.submetido_por_nome ?? undefined,
    aprovadoPorUserId: row.aprovado_por_user_id ?? undefined,
    aprovadoEm: row.aprovado_em ?? undefined,
    verificadoEm: row.verificado_em ?? undefined,
    observacao: row.observacao ?? undefined,
    dados: (row.dados ?? {}) as AulaEvidencia["dados"],
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function evidenciaToRow(evidencia: AulaEvidencia) {
  return {
    id: evidencia.id,
    agendamento_id: evidencia.agendamentoId,
    tipo: evidencia.tipo,
    status: evidencia.status,
    arquivo_nome: evidencia.arquivoNome ?? null,
    arquivo_mime_type: evidencia.arquivoMimeType ?? null,
    arquivo_url: evidencia.arquivoUrl ?? null,
    drive_file_id: evidencia.driveFileId ?? null,
    drive_folder_id: evidencia.driveFolderId ?? null,
    submetido_por_user_id: evidencia.submetidoPorUserId ?? null,
    submetido_por_nome: evidencia.submetidoPorNome ?? null,
    aprovado_por_user_id: evidencia.aprovadoPorUserId ?? null,
    aprovado_em: evidencia.aprovadoEm ?? null,
    verificado_em: evidencia.verificadoEm ?? null,
    observacao: evidencia.observacao ?? null,
    dados: (evidencia.dados ?? {}) as never,
    project_id: requireProjectIdForWrite() ?? undefined,
  };
}

let evidencias: AulaEvidencia[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("aula_evidencias")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[aula_evidencias] load error", error);
    evidencias = [];
    return;
  }
  evidencias = ((data ?? []) as unknown as Row[]).map(rowToEvidencia);
}

async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = loadFromDb().then(() => {
      initialized = true;
      emit();
    });
  }
  return initPromise;
}

function sameEvidence(a: AulaEvidencia, b: AulaEvidencia) {
  return a.agendamentoId === b.agendamentoId && a.tipo === b.tipo;
}

export const aulaEvidenciasStore = {
  getAll(): AulaEvidencia[] {
    return evidencias;
  },
  getByAgendamento(agendamentoId: string): AulaEvidencia[] {
    return evidencias.filter((e) => e.agendamentoId === agendamentoId);
  },
  getOne(agendamentoId: string, tipo: AulaEvidenciaTipo): AulaEvidencia | undefined {
    return evidencias.find((e) => e.agendamentoId === agendamentoId && e.tipo === tipo);
  },
  async upsert(evidencia: Omit<AulaEvidencia, "id"> & { id?: string }): Promise<AulaEvidencia> {
    const existing = this.getOne(evidencia.agendamentoId, evidencia.tipo);
    const now = new Date().toISOString();
    const next: AulaEvidencia = {
      ...existing,
      ...evidencia,
      id: evidencia.id ?? existing?.id ?? crypto.randomUUID(),
      atualizadoEm: now,
      criadoEm: existing?.criadoEm ?? now,
    };

    const snap = evidencias;
    evidencias = existing
      ? evidencias.map((item) => (sameEvidence(item, next) ? next : item))
      : [next, ...evidencias];
    emit();

    const { error } = await supabase
      .from("aula_evidencias")
      .upsert(evidenciaToRow(next), { onConflict: "agendamento_id,tipo" });
    if (error) {
      evidencias = snap;
      emit();
      console.error("[aula_evidencias] upsert error", error);
      toast.error(`Erro ao salvar evidencia da aula: ${error.message}`);
    }
    return next;
  },
  async aprovarManual(
    agendamentoId: string,
    tipo: AulaEvidenciaTipo,
    userId: string | undefined,
    observacao?: string,
  ): Promise<void> {
    const evidencia = this.getOne(agendamentoId, tipo);
    if (!evidencia) return;
    await this.upsert({
      ...evidencia,
      status: "aprovado_manual",
      aprovadoPorUserId: userId,
      aprovadoEm: new Date().toISOString(),
      observacao: observacao ?? evidencia.observacao,
    });
  },
  async reload(): Promise<void> {
    await loadFromDb();
    initialized = true;
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useAulaEvidencias(): AulaEvidencia[] {
  const [snapshot, setSnapshot] = useState(aulaEvidenciasStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = aulaEvidenciasStore.subscribe(() =>
      setSnapshot([...aulaEvidenciasStore.getAll()]),
    );
    return () => {
      unsub();
    };
  }, []);
  return snapshot;
}
