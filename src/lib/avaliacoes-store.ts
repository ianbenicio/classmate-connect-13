// Store de Avaliações com persistência no Supabase (tabela `avaliacoes`).
// Cobre 3 formulários: relatorio_prof, checklist_aluno, relatorio_aluno.
// Mantém compat com o tipo antigo `AvaliacaoAula` (tipo 'aula_aluno_legacy').
//
// Rastreabilidade:
// - `criado_por_user_id` é gravado a partir da sessão atual (auditoria)
// - `dados._snapshot` congela contexto (curso/turma/atividades/habilidades)
//   no momento do envio, para que relatórios futuros não mudem se o
//   cadastro for editado.
// - Quando o `relatorio_prof` é enviado com `presencas`, sincroniza a tabela
//   `presencas` (1 linha por aluno × atividade do agendamento).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toUuid } from "./db-mapping";
import { toast } from "sonner";
import type { AvaliacaoAula } from "./avaliacoes-types";
import type {
  ChecklistAlunoDados,
  RelatorioAlunoDados,
  RelatorioProfessorDados,
  FormularioTipo,
} from "./formularios-types";
import { buildAvaliacaoSnapshot } from "./avaliacao-snapshot";
import { agendamentosStore } from "./agendamentos-store";

export interface AvaliacaoRecord<T = unknown> {
  id: string;
  agendamentoId: string | null;
  alunoId: string | null;
  atividadeId: string | null;
  tipo: FormularioTipo | "aula_aluno_legacy";
  dados: T;
  criadoEm: string;
}

let registros: AvaliacaoRecord[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type Row = {
  id: string;
  agendamento_id: string | null;
  aluno_id: string | null;
  atividade_id: string | null;
  tipo: string;
  dados: unknown;
  created_at: string;
};

function rowTo(r: Row): AvaliacaoRecord {
  return {
    id: r.id,
    agendamentoId: r.agendamento_id,
    alunoId: r.aluno_id,
    atividadeId: r.atividade_id,
    tipo: r.tipo as AvaliacaoRecord["tipo"],
    dados: (r.dados ?? {}) as unknown,
    criadoEm: r.created_at,
  };
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("avaliacoes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[avaliacoes] load error", error);
    return;
  }
  registros = (data as Row[] | null ?? []).map(rowTo);
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

export const avaliacoesStore = {
  getAll(): AvaliacaoRecord[] {
    return registros;
  },

  /** Retorna o registro do tipo X de um agendamento (e opcionalmente aluno). */
  find<T>(
    tipo: FormularioTipo,
    agendamentoId: string,
    alunoId?: string,
  ): AvaliacaoRecord<T> | undefined {
    const agId = toUuid(agendamentoId);
    const alId = alunoId ? toUuid(alunoId) : undefined;
    return registros.find(
      (r) =>
        r.tipo === tipo &&
        (r.agendamentoId === agId || r.agendamentoId === agendamentoId) &&
        (alId
          ? r.alunoId === alId || r.alunoId === alunoId
          : r.alunoId === null),
    ) as AvaliacaoRecord<T> | undefined;
  },

  /** Lista todos do tipo para um agendamento (ex.: todos checklists). */
  listByAgendamento(tipo: FormularioTipo, agendamentoId: string): AvaliacaoRecord[] {
    const agId = toUuid(agendamentoId);
    return registros.filter(
      (r) =>
        r.tipo === tipo &&
        (r.agendamentoId === agId || r.agendamentoId === agendamentoId),
    );
  },

  async saveRelatorioProf(
    agendamentoId: string,
    dados: RelatorioProfessorDados,
  ) {
    return this.save("relatorio_prof", agendamentoId, null, null, dados);
  },

  async saveChecklistAluno(
    agendamentoId: string,
    alunoId: string,
    dados: ChecklistAlunoDados,
  ) {
    return this.save("checklist_aluno", agendamentoId, alunoId, null, dados);
  },

  async saveRelatorioAluno(
    agendamentoId: string,
    alunoId: string,
    dados: RelatorioAlunoDados,
  ) {
    return this.save("relatorio_aluno", agendamentoId, alunoId, null, dados);
  },

  async save(
    tipo: FormularioTipo,
    agendamentoId: string | null,
    alunoId: string | null,
    atividadeId: string | null,
    dados: unknown,
  ): Promise<AvaliacaoRecord> {
    const existing = agendamentoId
      ? this.find(tipo, agendamentoId, alunoId ?? undefined)
      : undefined;
    const id = existing?.id ?? crypto.randomUUID();

    // — usuário atual (auditoria)
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    // — snapshot de contexto (congela curso/turma/atividades/habilidades)
    const dadosObj = (dados ?? {}) as Record<string, unknown>;
    const habilidadeIds = Object.keys(
      (dadosObj.habilidadesNotas ?? {}) as Record<string, unknown>,
    );
    const snapshot = buildAvaliacaoSnapshot(agendamentoId, habilidadeIds);
    const dadosComSnapshot = { ...dadosObj, _snapshot: snapshot };

    const row = {
      id,
      agendamento_id: agendamentoId ? toUuid(agendamentoId) : null,
      aluno_id: alunoId ? toUuid(alunoId) : null,
      atividade_id: atividadeId ? toUuid(atividadeId) : null,
      tipo,
      dados: dadosComSnapshot as never,
      criado_por_user_id: authUser?.id ?? null,
    };
    // Atualização otimista local
    const local: AvaliacaoRecord = {
      id,
      agendamentoId: row.agendamento_id,
      alunoId: row.aluno_id,
      atividadeId: row.atividade_id,
      tipo,
      dados: dadosComSnapshot,
      criadoEm: existing?.criadoEm ?? new Date().toISOString(),
    };
    registros = existing
      ? registros.map((r) => (r.id === id ? local : r))
      : [local, ...registros];
    emit();
    const { error } = await supabase
      .from("avaliacoes")
      .upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[avaliacoes] save error", error);
      toast.error(`Erro ao salvar avaliação: ${error.message}`);
    }

    // — Sincroniza chamada com a tabela `presencas` quando for relatorio_prof
    if (tipo === "relatorio_prof" && agendamentoId) {
      await syncPresencas(
        agendamentoId,
        (dadosObj.presencas ?? {}) as Record<string, boolean>,
        authUser?.id ?? null,
      );
    }

    return local;
  },

  async remove(id: string) {
    registros = registros.filter((r) => r.id !== id);
    emit();
    const { error } = await supabase.from("avaliacoes").delete().eq("id", id);
    if (error) console.error("[avaliacoes] remove error", error);
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  ensureInit,

  // ============ COMPAT: API antiga AvaliacaoAula (mantida por enquanto) ============
  /** @deprecated use saveRelatorioAluno */
  byAgendamentoAluno(agendamentoId: string, alunoId: string): AvaliacaoAula | undefined {
    const r = this.find<AvaliacaoAula>("relatorio_aluno", agendamentoId, alunoId) as
      | AvaliacaoRecord<AvaliacaoAula>
      | undefined;
    return r?.dados;
  },
  /** @deprecated use saveRelatorioAluno */
  upsert(av: AvaliacaoAula) {
    void this.save(
      "relatorio_aluno",
      av.agendamentoId,
      av.alunoId,
      null,
      av as unknown,
    );
  },
};

export function useAvaliacoes(): AvaliacaoRecord[] {
  const [snap, setSnap] = useState<AvaliacaoRecord[]>(avaliacoesStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = avaliacoesStore.subscribe(() =>
      setSnap([...avaliacoesStore.getAll()]),
    );
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
