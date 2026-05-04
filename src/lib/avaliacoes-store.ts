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
import type { AvaliacaoAula, AvaliacaoRecord } from "./avaliacoes-types";
import type {
  ChecklistAlunoDados,
  RelatorioAlunoDados,
  RelatorioProfessorDados,
  FormularioTipo,
} from "./formularios-types";
import { buildAvaliacaoSnapshot } from "./avaliacao-snapshot";
import { agendamentosStore } from "./agendamentos-store";
import { SEED_AVALIACOES } from "./academic-seed";
import { devInfo } from "./dev-log";

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

function avaliacaoToRow(a: AvaliacaoRecord): Row {
  return {
    id: toUuid(a.id),
    agendamento_id: a.agendamentoId ? toUuid(a.agendamentoId) : null,
    aluno_id: a.alunoId ? toUuid(a.alunoId) : null,
    atividade_id: a.atividadeId ? toUuid(a.atividadeId) : null,
    tipo: a.tipo,
    dados: a.dados,
    created_at: a.criadoEm,
  };
}

async function topUpAvaliacoes(existingIds: Set<string>) {
  if (SEED_AVALIACOES.length === 0) return false;
  const missing = SEED_AVALIACOES.filter((a) => !existingIds.has(toUuid(a.id)));
  if (missing.length === 0) return false;
  const rows = missing.map(avaliacaoToRow);
  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("avaliacoes")
      .upsert(chunk as never, { onConflict: "id", ignoreDuplicates: true });
    if (error) {
      console.error("[avaliacoes] top-up error (chunk)", error);
      continue;
    }
    inserted += chunk.length;
  }
  if (inserted > 0) {
    devInfo(`[avaliacoes] top-up: +${inserted} linhas do seed`);
  }
  return inserted > 0;
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
  const rows = (data as Row[] | null) ?? [];
  const existingIds = new Set(rows.map((r) => r.id));
  const inserted = await topUpAvaliacoes(existingIds);
  if (inserted) {
    const { data: data2 } = await supabase
      .from("avaliacoes")
      .select("*")
      .order("created_at", { ascending: false });
    registros = ((data2 ?? []) as unknown as Row[]).map(rowTo);
  } else {
    registros = rows.map(rowTo);
  }
}

async function ensureInit(): Promise<void> {
  // Recarrega sempre — consistente com agendamentos-store. Garante que
  // avaliações criadas em outra aba/sessão fiquem visíveis ao reabrir uma rota.
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
        (alId ? r.alunoId === alId || r.alunoId === alunoId : r.alunoId === null),
    ) as AvaliacaoRecord<T> | undefined;
  },

  /** Lista todos do tipo para um agendamento (ex.: todos checklists). */
  listByAgendamento(tipo: FormularioTipo, agendamentoId: string): AvaliacaoRecord[] {
    const agId = toUuid(agendamentoId);
    return registros.filter(
      (r) => r.tipo === tipo && (r.agendamentoId === agId || r.agendamentoId === agendamentoId),
    );
  },

  async saveRelatorioProf(agendamentoId: string, dados: RelatorioProfessorDados) {
    return this.save("relatorio_prof", agendamentoId, null, null, dados);
  },

  async saveChecklistAluno(agendamentoId: string, alunoId: string, dados: ChecklistAlunoDados) {
    return this.save("checklist_aluno", agendamentoId, alunoId, null, dados);
  },

  async saveRelatorioAluno(agendamentoId: string, alunoId: string, dados: RelatorioAlunoDados) {
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
    const habilidadeIds = Object.keys((dadosObj.habilidadesNotas ?? {}) as Record<string, unknown>);
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
    registros = existing ? registros.map((r) => (r.id === id ? local : r)) : [local, ...registros];
    emit();
    const { error } = await supabase.from("avaliacoes").upsert(row, { onConflict: "id" });
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

  /**
   * Marca presença/ausência rápida sem precisar abrir o relatório completo.
   * Usado pelo CheckInRapido (#10). Idempotente — pode ser chamado várias
   * vezes para o mesmo aluno (upsert).
   */
  async marcarPresenca(agendamentoId: string, alunoId: string, presente: boolean): Promise<void> {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    await syncPresencas(agendamentoId, { [alunoId]: presente }, authUser?.id ?? null);
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
    void this.save("relatorio_aluno", av.agendamentoId, av.alunoId, null, av as unknown);
  },
};

export function useAvaliacoes(): AvaliacaoRecord[] {
  const [snap, setSnap] = useState<AvaliacaoRecord[]>(avaliacoesStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = avaliacoesStore.subscribe(() => setSnap([...avaliacoesStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}

/**
 * Sincroniza a chamada do `relatorio_prof` com a tabela `presencas`.
 * Cria/atualiza 1 linha por aluno × atividade do agendamento.
 */
async function syncPresencas(
  agendamentoId: string,
  presencas: Record<string, boolean>,
  registradoPorUserId: string | null,
): Promise<void> {
  const ag = agendamentosStore.getAll().find((g) => g.id === agendamentoId);
  if (!ag) {
    console.warn("[presencas] agendamento não encontrado:", agendamentoId);
    return;
  }
  if (ag.atividadeIds.length === 0) {
    // Aviso ao usuário também é dado pelo dialog antes de salvar.
    console.warn(
      "[presencas] agendamento sem atividades, frequência não foi gravada:",
      agendamentoId,
    );
    return;
  }
  const agUuid = toUuid(agendamentoId);

  const rows = Object.entries(presencas).flatMap(([alunoId, presente]) =>
    ag.atividadeIds.map((atividadeId) => ({
      agendamento_id: agUuid,
      aluno_id: toUuid(alunoId),
      atividade_id: toUuid(atividadeId),
      presente,
      registrado_por_user_id: registradoPorUserId,
    })),
  );
  if (rows.length === 0) return;

  // Upsert atômico via UNIQUE INDEX criado em
  // 20260425150000_presencas_unique_index.sql.
  const { error } = await supabase
    .from("presencas")
    .upsert(rows, { onConflict: "agendamento_id,aluno_id,atividade_id" });
  if (error) {
    console.error("[presencas] upsert error", error);
    toast.error(`Erro ao salvar presenças: ${error.message}`);
  }
}

// Re-export AvaliacaoRecord for backwards compatibility
export type { AvaliacaoRecord };
