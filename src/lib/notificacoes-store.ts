// Singleton store de Notificações com persistência no Supabase.
import { useEffect, useState } from "react";
import type { Notificacao } from "./academic-types";
import { supabase } from "@/integrations/supabase/client";
import { toUuid, toUuidArray } from "./db-mapping";
import { toast } from "sonner";

let notificacoes: Notificacao[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

type NotifRow = {
  id: string;
  destinatario_user_id: string | null;
  destinatario_tipo: string;
  destinatario_ref: string | null;
  titulo: string;
  mensagem: string;
  curso_id: string | null;
  turma_id: string | null;
  data: string | null;
  inicio: string | null;
  fim: string | null;
  professor: string | null;
  atividade_ids: unknown;
  kind: string | null;
  lida: boolean;
  agendamento_id: string | null;
  created_at: string;
};

function rowToNotif(r: NotifRow): Notificacao {
  return {
    id: r.id,
    destinatarioTipo: (r.destinatario_tipo as Notificacao["destinatarioTipo"]) ?? "aluno",
    destinatarioId: r.destinatario_ref ?? "",
    destinatarioUserId: r.destinatario_user_id ?? undefined,
    titulo: r.titulo,
    mensagem: r.mensagem,
    cursoId: r.curso_id ?? "",
    turmaId: r.turma_id ?? "",
    data: r.data ?? "",
    inicio: r.inicio ?? "",
    fim: r.fim ?? "",
    professor: r.professor ?? undefined,
    atividadeIds: (Array.isArray(r.atividade_ids) ? r.atividade_ids : []) as string[],
    criadoEm: r.created_at,
    lida: !!r.lida,
    kind: (r.kind as Notificacao["kind"]) ?? undefined,
    agendamentoId: r.agendamento_id ?? undefined,
  };
}

function notifToRow(n: Notificacao) {
  return {
    id: toUuid(n.id),
    destinatario_user_id: n.destinatarioUserId ?? null,
    destinatario_tipo: n.destinatarioTipo,
    destinatario_ref: n.destinatarioId,
    titulo: n.titulo,
    mensagem: n.mensagem,
    curso_id: n.cursoId ? toUuid(n.cursoId) : null,
    turma_id: n.turmaId ? toUuid(n.turmaId) : null,
    data: n.data || null,
    inicio: n.inicio || null,
    fim: n.fim || null,
    professor: n.professor ?? null,
    atividade_ids: toUuidArray(n.atividadeIds) as never,
    kind: n.kind ?? null,
    lida: n.lida,
    agendamento_id: n.agendamentoId ? toUuid(n.agendamentoId) : null,
  };
}

async function loadFromDb() {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[notificacoes] load error", error);
    return;
  }
  notificacoes = ((data ?? []) as unknown as NotifRow[]).map(rowToNotif);
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

export const notificacoesStore = {
  getAll(): Notificacao[] {
    return notificacoes;
  },
  async addMany(items: Notificacao[]) {
    if (items.length === 0) return;

    // 1) Dedup LOCAL — remove duplicatas dentro do próprio batch.
    //    O índice parcial uq_notificacoes_dedup_scanner sobre
    //    (destinatario_ref, agendamento_id, kind) rejeita duplicatas no banco.
    //    Como ON CONFLICT (cols) não funciona com índice parcial via
    //    PostgREST (precisaria do WHERE), fazemos dedup proativo aqui.
    //    Casos comuns: o RelatorioProfessorDialog gera N tarefasChecklist
    //    (uma por aluno) todas com mesmo prof+agendamento+kind="agendado".
    const seen = new Set<string>();
    const itemsLimpos = items.filter((n) => {
      if (!n.agendamentoId || !n.kind) return true; // sem chave de dedup, passa
      const key = `${n.destinatarioId}|${n.agendamentoId}|${n.kind}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (itemsLimpos.length === 0) return;

    // 2) Atualização otimista local (apenas os deduplicados).
    const local: Notificacao[] = itemsLimpos.map((n) => ({
      ...n,
      id: toUuid(n.id),
    }));
    notificacoes = [...local, ...notificacoes];
    emit();

    // 3) Insert no banco. Se uma linha conflitar com algo já no banco
    //    (ex.: scanner já criou a notif antes), o batch inteiro falha
    //    em transação atômica. Para evitar isso, tentamos linha por linha
    //    em paralelo e ignoramos 23505 (unique_violation) silenciosamente.
    const rows = itemsLimpos.map(notifToRow);
    const results = await Promise.all(
      rows.map(async (row) => {
        const { error } = await supabase.from("notificacoes").insert(row);
        return error;
      }),
    );
    const erros = results.filter((e): e is NonNullable<typeof e> => e !== null);
    const fatais = erros.filter((e) => e.code !== "23505");
    if (erros.length > fatais.length) {
      // Dedup pelo banco — comportamento esperado, log silencioso.
      console.debug(
        `[notificacoes] ${erros.length - fatais.length} dedup(s) absorvidos pelo índice único.`,
      );
    }
    if (fatais.length > 0) {
      console.error("[notificacoes] insert errors", fatais);
      toast.error(`Erro ao registrar notificações: ${fatais[0].message}`);
    }
  },
  async marcarLida(id: string) {
    const dbId = toUuid(id);
    notificacoes = notificacoes.map((n) =>
      n.id === dbId || n.id === id ? { ...n, lida: true } : n,
    );
    emit();
    const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("id", dbId);
    if (error) {
      console.error("[notificacoes] marcarLida error", error);
      toast.error(`Erro ao marcar notificação: ${error.message}`);
    }
  },
  async marcarTodasLidas() {
    notificacoes = notificacoes.map((n) => ({ ...n, lida: true }));
    emit();
    const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("lida", false);
    if (error) {
      console.error("[notificacoes] marcarTodasLidas error", error);
      toast.error(`Erro ao marcar todas: ${error.message}`);
    }
  },
  async remove(id: string) {
    const dbId = toUuid(id);
    notificacoes = notificacoes.filter((n) => n.id !== dbId && n.id !== id);
    emit();
    const { error } = await supabase.from("notificacoes").delete().eq("id", dbId);
    if (error) {
      console.error("[notificacoes] remove error", error);
      toast.error(`Erro ao remover notificação: ${error.message}`);
    }
  },
  /**
   * Remove notificações órfãs — aquelas com `agendamentoId` definido mas que
   * referenciam agendamentos que não existem mais (foram removidos antes
   * da correção que apaga notificações no cancelamento).
   *
   * Recebe a lista de IDs de agendamentos válidos (do agendamentos-store)
   * para evitar dependência circular.
   *
   * Retorna o número de notificações removidas.
   */
  async cleanupOrphans(idsAgendamentosValidos: string[]): Promise<number> {
    const validSet = new Set<string>();
    for (const id of idsAgendamentosValidos) {
      validSet.add(id);
      validSet.add(toUuid(id));
    }
    const orfas = notificacoes.filter(
      (n) => n.agendamentoId && !validSet.has(n.agendamentoId),
    );
    if (orfas.length === 0) return 0;

    const orfasIds = orfas.map((n) => n.id);
    notificacoes = notificacoes.filter((n) => !orfasIds.includes(n.id));
    emit();

    const { error } = await supabase.from("notificacoes").delete().in("id", orfasIds);
    if (error) {
      console.error("[notificacoes] cleanupOrphans error", error);
      toast.error(`Erro ao limpar notificações órfãs: ${error.message}`);
      return 0;
    }
    return orfas.length;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  ensureInit,
};

export function useNotificacoes(): Notificacao[] {
  const [snap, setSnap] = useState(notificacoesStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = notificacoesStore.subscribe(() => setSnap([...notificacoesStore.getAll()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
