// =====================================================================
// tarefas-alunos-store — Tracking de entrega de atividades tipo=tarefa
// =====================================================================
// Tabela `tarefas_alunos` (Fase A): registra por (agendamento, aluno,
// atividade) se o aluno completou a tarefa atribuída.
//
// Análoga ao tracking de `presencas` mas para atividades tipo=1 (tarefa).
// Escrita: RelatorioProfessorDialog quando o agendamento contém atividade
// tipo=tarefa.
// Leitura: MinhasAtividadesTable para status "Trab. Alunos" e /minha-area
// para histórico do aluno.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toUuid } from "./db-mapping";
import { getCurrentProjectId } from "./current-project";
import { toast } from "sonner";

export interface TarefaAluno {
  agendamentoId: string;
  alunoId: string;
  atividadeId: string;
  completou: boolean;
  observacao?: string;
  registradoEm?: string;
}

type Row = {
  agendamento_id: string;
  aluno_id: string;
  atividade_id: string;
  completou: boolean;
  observacao: string | null;
  registrado_em: string;
};

function rowTo(r: Row): TarefaAluno {
  return {
    agendamentoId: r.agendamento_id,
    alunoId: r.aluno_id,
    atividadeId: r.atividade_id,
    completou: r.completou,
    observacao: r.observacao ?? undefined,
    registradoEm: r.registrado_em,
  };
}

function toRow(t: TarefaAluno) {
  return {
    agendamento_id: toUuid(t.agendamentoId),
    aluno_id: toUuid(t.alunoId),
    atividade_id: toUuid(t.atividadeId),
    completou: t.completou,
    observacao: t.observacao ?? null,
    project_id: getCurrentProjectId() ?? undefined,
  };
}

let registros: TarefaAluno[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("tarefas_alunos")
    .select("*")
    .order("registrado_em", { ascending: false });
  if (error) {
    // RLS pode esconder ao aluno linhas de outras turmas — log silencioso.
    if (error.code !== "PGRST301" && error.code !== "42501") {
      console.error("[tarefas_alunos] load error", error);
    }
    registros = [];
    return;
  }
  registros = ((data ?? []) as unknown as Row[]).map(rowTo);
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

export const tarefasAlunosStore = {
  getAll(): TarefaAluno[] {
    return registros;
  },
  /** Lista as tarefas de um agendamento (todos alunos × atividades-tarefa). */
  getByAgendamento(agendamentoId: string): TarefaAluno[] {
    const dbId = toUuid(agendamentoId);
    return registros.filter((r) => r.agendamentoId === dbId || r.agendamentoId === agendamentoId);
  },
  /** Lista as tarefas de um aluno (para "Minha área" → histórico). */
  getByAluno(alunoId: string): TarefaAluno[] {
    return registros.filter((r) => r.alunoId === alunoId);
  },
  /**
   * Upsert em batch — chamado pelo RelatorioProfessorDialog ao salvar.
   * Sobrescreve cada (agendamento, aluno, atividade) com o estado novo.
   */
  async saveMany(items: TarefaAluno[]): Promise<void> {
    if (items.length === 0) return;
    const rows = items.map(toRow);

    // Atualização otimista local — substitui as keys do batch.
    const keysIncoming = new Set(
      items.map((t) => `${toUuid(t.agendamentoId)}|${t.alunoId}|${t.atividadeId}`),
    );
    registros = [
      ...registros.filter(
        (r) => !keysIncoming.has(`${r.agendamentoId}|${r.alunoId}|${r.atividadeId}`),
      ),
      ...items.map((t) => ({
        ...t,
        agendamentoId: toUuid(t.agendamentoId),
        registradoEm: new Date().toISOString(),
      })),
    ];
    emit();

    const { error } = await supabase
      .from("tarefas_alunos")
      .upsert(rows, { onConflict: "agendamento_id,aluno_id,atividade_id" });
    if (error) {
      console.error("[tarefas_alunos] saveMany error", error);
      toast.error(`Erro ao salvar tarefas dos alunos: ${error.message}`);
      // Reconcilia snapshot otimista com banco.
      await loadFromDb();
      emit();
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useTarefasAlunos(): TarefaAluno[] {
  const [snapshot, setSnapshot] = useState(tarefasAlunosStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = tarefasAlunosStore.subscribe(() => setSnapshot([...tarefasAlunosStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snapshot;
}
