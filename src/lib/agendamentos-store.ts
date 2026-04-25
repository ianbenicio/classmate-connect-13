// Singleton store de Agendamentos com persistência no Supabase.
// Espelha o padrão de turmas-store / atividades-store: ensureInit + loadFromDb
// + top-up do seed + cache em memória + pub/sub.
import { useEffect, useState } from "react";
import type {
  Agendamento,
  DiaSemana,
  StatusAgendamento,
} from "./academic-types";
import { SEED_AGENDAMENTOS } from "./academic-seed";
import { supabase } from "@/integrations/supabase/client";
import { toUuid, toUuidArray } from "./db-mapping";
import { toast } from "sonner";

let agendamentos: Agendamento[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type AgendamentoRow = {
  id: string;
  turma_id: string;
  data: string;
  dia_semana: DiaSemana;
  inicio: string;
  fim: string;
  atividade_ids: unknown;
  status: StatusAgendamento;
  concluido_em: string | null;
  observacao: string | null;
  professor: string | null;
  criado_por_user_id: string | null;
  criado_por_nome: string | null;
  bloco_index: number;
  blocos_total: number;
  parte_grupo_id: string | null;
  parte_num: number;
  partes_total: number;
  meta: unknown;
  created_at: string;
};

type AgendamentoMeta = {
  slotInicio?: string;
  slotFim?: string;
};

function readMeta(raw: unknown): AgendamentoMeta {
  if (!raw || typeof raw !== "object") return {};
  return raw as AgendamentoMeta;
}

function rowToAgendamento(r: AgendamentoRow): Agendamento {
  const meta = readMeta(r.meta);
  return {
    id: r.id,
    turmaId: r.turma_id,
    data: r.data,
    diaSemana: r.dia_semana,
    inicio: r.inicio,
    fim: r.fim,
    atividadeIds: (Array.isArray(r.atividade_ids) ? r.atividade_ids : []) as string[],
    status: r.status,
    criadoEm: r.created_at,
    concluidoEm: r.concluido_em ?? undefined,
    observacao: r.observacao ?? undefined,
    professor: r.professor ?? undefined,
    criadoPorUserId: r.criado_por_user_id ?? undefined,
    criadoPorNome: r.criado_por_nome ?? undefined,
    blocoIndex: r.bloco_index,
    blocosTotal: r.blocos_total,
    slotInicio: meta.slotInicio,
    slotFim: meta.slotFim,
    parteGrupoId: r.parte_grupo_id ?? undefined,
    parteNum: r.parte_num,
    partesTotal: r.partes_total,
  };
}

function agendamentoToRow(a: Agendamento) {
  const meta: AgendamentoMeta = {};
  if (a.slotInicio !== undefined) meta.slotInicio = a.slotInicio;
  if (a.slotFim !== undefined) meta.slotFim = a.slotFim;
  return {
    id: toUuid(a.id),
    turma_id: toUuid(a.turmaId),
    data: a.data,
    dia_semana: a.diaSemana,
    inicio: a.inicio,
    fim: a.fim,
    atividade_ids: toUuidArray(a.atividadeIds) as never,
    status: a.status,
    concluido_em: a.concluidoEm ?? null,
    observacao: a.observacao ?? null,
    professor: a.professor ?? null,
    criado_por_user_id: a.criadoPorUserId ?? null,
    criado_por_nome: a.criadoPorNome ?? null,
    bloco_index: a.blocoIndex ?? 0,
    blocos_total: a.blocosTotal ?? 1,
    parte_grupo_id: a.parteGrupoId ?? null,
    parte_num: a.parteNum ?? 1,
    partes_total: a.partesTotal ?? 1,
    meta: meta as never,
  };
}

async function topUpAgendamentos(existingIds: Set<string>) {
  if (SEED_AGENDAMENTOS.length === 0) return false;
  const missing = SEED_AGENDAMENTOS.filter(
    (a) => !existingIds.has(toUuid(a.id)),
  );
  if (missing.length === 0) return false;
  const rows = missing.map(agendamentoToRow);
  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("agendamentos")
      .upsert(chunk, { onConflict: "id", ignoreDuplicates: true });
    if (error) {
      console.error("[agendamentos] top-up error (chunk)", error);
      continue;
    }
    inserted += chunk.length;
  }
  if (inserted > 0) {
    console.info(`[agendamentos] top-up: +${inserted} linhas do seed`);
  }
  return inserted > 0;
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .order("data", { ascending: true });
  if (error) {
    console.error("[agendamentos] load error", error);
    agendamentos = [...SEED_AGENDAMENTOS];
    return;
  }
  const rows = (data ?? []) as unknown as AgendamentoRow[];
  const existingIds = new Set(rows.map((r) => r.id));
  const inserted = await topUpAgendamentos(existingIds);
  if (inserted) {
    const { data: data2 } = await supabase
      .from("agendamentos")
      .select("*")
      .order("data", { ascending: true });
    agendamentos = ((data2 ?? []) as unknown as AgendamentoRow[]).map(
      rowToAgendamento,
    );
  } else {
    agendamentos = rows.map(rowToAgendamento);
  }
}

async function ensureInit(): Promise<void> {
  if (initialized) {
    await loadFromDb();
    emit();
    return;
  }
  if (!initPromise) {
    initPromise = loadFromDb().then(() => {
      initialized = true;
      emit();
    });
  }
  return initPromise;
}

export const agendamentosStore = {
  getAll(): Agendamento[] {
    return agendamentos;
  },
  async add(a: Agendamento) {
    const row = agendamentoToRow(a);
    const local: Agendamento = {
      ...a,
      id: row.id,
      turmaId: row.turma_id,
      atividadeIds: toUuidArray(a.atividadeIds),
    };
    agendamentos = [local, ...agendamentos];
    emit();
    const { error } = await supabase
      .from("agendamentos")
      .upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[agendamentos] add error", error);
      toast.error(`Erro ao salvar agendamento: ${error.message}`);
    }
  },
  async update(id: string, patch: Partial<Agendamento>) {
    const dbId = toUuid(id);
    const current = agendamentos.find((x) => x.id === dbId || x.id === id);
    if (!current) return;
    const next: Agendamento = { ...current, ...patch, id: dbId };
    agendamentos = agendamentos.map((x) => (x.id === dbId ? next : x));
    emit();
    const row = agendamentoToRow(next);
    const { error } = await supabase
      .from("agendamentos")
      .upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[agendamentos] update error", error);
      toast.error(`Erro ao atualizar agendamento: ${error.message}`);
    }
  },
  async remove(id: string) {
    const dbId = toUuid(id);
    agendamentos = agendamentos.filter((x) => x.id !== dbId && x.id !== id);
    emit();
    const { error } = await supabase
      .from("agendamentos")
      .delete()
      .eq("id", dbId);
    if (error) {
      console.error("[agendamentos] remove error", error);
      toast.error(`Erro ao remover agendamento: ${error.message}`);
    }
  },
  async marcarConcluido(id: string) {
    await this.update(id, {
      status: "concluido",
      concluidoEm: new Date().toISOString(),
    });
  },
  async reabrir(id: string) {
    await this.update(id, {
      status: "pendente",
      concluidoEm: undefined,
    });
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useAgendamentos(): Agendamento[] {
  const [snapshot, setSnapshot] = useState(agendamentosStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = agendamentosStore.subscribe(() =>
      setSnapshot([...agendamentosStore.getAll()]),
    );
    return () => {
      unsub();
    };
  }, []);
  return snapshot;
}
