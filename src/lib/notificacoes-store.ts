// Singleton store de Notificações com persistência no Supabase.
// Usa createStoreBase para eliminar boilerplate.
import { useEffect, useState } from "react";
import type { Notificacao } from "./academic-types";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentProjectId, requireProjectIdForWrite } from "./current-project";
import { createStoreBase } from "./store-base";
import { toast } from "sonner";

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

// ── Base ─────────────────────────────────────────────────────────────

const base = createStoreBase<Notificacao[]>(async (set) => {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[notificacoes] load error", error);
    set([]);
    return;
  }
  set(((data ?? []) as unknown as NotifRow[]).map(rowToNotif));
}, []);

// ── Public store ─────────────────────────────────────────────────────

export const notificacoesStore = {
  getAll(): Notificacao[] {
    return base.get();
  },
  async addMany(items: Notificacao[]) {
    if (items.length === 0) return;

    // Dedup LOCAL — remove duplicatas dentro do batch.
    const seen = new Set<string>();
    const itemsLimpos = items.filter((n) => {
      if (!n.agendamentoId || !n.kind) return true;
      const key = `${n.destinatarioId}|${n.agendamentoId}|${n.kind}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (itemsLimpos.length === 0) return;

    // Optimistic — IDs runtime já são UUIDs, sem toUuid.
    const all = base.get();
    base.set([...itemsLimpos, ...all]);
    base.emit();

    const rows = itemsLimpos.map((n) => ({
      id: n.id,
      destinatario_user_id: n.destinatarioUserId ?? null,
      destinatario_tipo: n.destinatarioTipo,
      destinatario_ref: n.destinatarioId,
      titulo: n.titulo,
      mensagem: n.mensagem,
      curso_id: n.cursoId || null,
      turma_id: n.turmaId || null,
      data: n.data || null,
      inicio: n.inicio || null,
      fim: n.fim || null,
      professor: n.professor ?? null,
      atividade_ids: (n.atividadeIds ?? []) as never,
      kind: n.kind ?? null,
      lida: n.lida,
      agendamento_id: n.agendamentoId ?? null,
      project_id: requireProjectIdForWrite() ?? undefined,
    }));

    // Dedup AUTORITATIVO contra o banco antes de inserir.
    // O store local pode estar vazio (ex.: o load falhou sob carga / 503), e aí
    // o dedup local acima não filtra nada. O código antigo reinseria tudo,
    // linha por linha em Promise.all, abrindo centenas de conexões concorrentes
    // que esgotavam o pool do projeto e devolviam 503 em todo o app a cada 60s.
    // Agora: 1 SELECT das notificações já existentes destes agendamentos + 1
    // INSERT em lote só das novas (nunca N requisições concorrentes).
    const agIds = [...new Set(rows.map((r) => r.agendamento_id).filter((v): v is string => !!v))];
    let jaExiste = new Set<string>();
    if (agIds.length > 0) {
      const { data: existentes } = await supabase
        .from("notificacoes")
        .select("destinatario_ref, agendamento_id, kind")
        .in("agendamento_id", agIds);
      jaExiste = new Set(
        (
          (existentes ?? []) as Array<{
            destinatario_ref: string | null;
            agendamento_id: string | null;
            kind: string | null;
          }>
        ).map((r) => `${r.destinatario_ref}|${r.agendamento_id}|${r.kind}`),
      );
    }
    const rowsNovas = rows.filter(
      (r) =>
        !r.agendamento_id ||
        !r.kind ||
        !jaExiste.has(`${r.destinatario_ref}|${r.agendamento_id}|${r.kind}`),
    );
    if (rowsNovas.length === 0) return;

    const { error } = await supabase.from("notificacoes").insert(rowsNovas);
    // 23505 = corrida rara entre clientes; o índice único garante idempotência.
    if (error && error.code !== "23505") {
      console.error("[notificacoes] insert error", error);
      toast.error(`Erro ao registrar notificações: ${error.message}`);
    }
  },
  async marcarLida(id: string) {
    // IDs runtime já são UUIDs — usar direto.
    const all = base.get();
    base.set(all.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    base.emit();
    const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    if (error) {
      console.error("[notificacoes] marcarLida error", error);
      toast.error(`Erro ao marcar notificação: ${error.message}`);
    }
  },
  async marcarTodasLidas() {
    const projectId = getCurrentProjectId();
    const snap = base.get();
    base.set(snap.map((n) => ({ ...n, lida: true })));
    base.emit();
    let query = supabase.from("notificacoes").update({ lida: true }).eq("lida", false);
    if (projectId) query = query.eq("project_id", projectId);
    const { error } = await query;
    if (error) {
      base.set(snap);
      base.emit();
      console.error("[notificacoes] marcarTodasLidas error", error);
      toast.error(`Erro ao marcar todas: ${error.message}`);
    }
  },
  async remove(id: string) {
    // IDs runtime já são UUIDs — usar direto.
    const all = base.get();
    base.set(all.filter((n) => n.id !== id));
    base.emit();
    const { error } = await supabase.from("notificacoes").delete().eq("id", id);
    if (error) {
      console.error("[notificacoes] remove error", error);
      toast.error(`Erro ao remover notificação: ${error.message}`);
    }
  },
  async cleanupOrphans(idsAgendamentosValidos: string[]): Promise<number> {
    const validSet = new Set(idsAgendamentosValidos);
    const all = base.get();
    const orfas = all.filter((n) => n.agendamentoId && !validSet.has(n.agendamentoId));
    if (orfas.length === 0) return 0;

    const orfasIds = new Set(orfas.map((n) => n.id));
    base.set(all.filter((n) => !orfasIds.has(n.id)));
    base.emit();

    const { error } = await supabase
      .from("notificacoes")
      .delete()
      .in("id", [...orfasIds]);
    if (error) {
      console.error("[notificacoes] cleanupOrphans error", error);
      toast.error(`Erro ao limpar notificações órfãs: ${error.message}`);
      return 0;
    }
    return orfas.length;
  },
  subscribe: base.subscribe.bind(base),
  ensureInit: base.ensureInit.bind(base),
};

export function useNotificacoes(): Notificacao[] {
  const [snap, setSnap] = useState(notificacoesStore.getAll());
  useEffect(() => {
    void base.ensureInit();
    const unsub = base.subscribe(() => setSnap([...base.get()]));
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
