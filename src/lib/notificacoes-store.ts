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
  created_at: string;
};

function rowToNotif(r: NotifRow): Notificacao {
  return {
    id: r.id,
    destinatarioTipo: (r.destinatario_tipo as Notificacao["destinatarioTipo"]) ?? "aluno",
    destinatarioId: r.destinatario_ref ?? "",
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
  };
}

function notifToRow(n: Notificacao) {
  return {
    id: toUuid(n.id),
    destinatario_user_id: null as string | null,
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
    // Atualiza memória de forma otimista, mantendo IDs locais já em UUID.
    const local: Notificacao[] = items.map((n) => ({
      ...n,
      id: toUuid(n.id),
    }));
    notificacoes = [...local, ...notificacoes];
    emit();
    const rows = items.map(notifToRow);
    const { error } = await supabase.from("notificacoes").insert(rows);
    if (error) {
      console.error("[notificacoes] insert error", error);
      toast.error(`Erro ao registrar notificações: ${error.message}`);
    }
  },
  async marcarLida(id: string) {
    const dbId = toUuid(id);
    notificacoes = notificacoes.map((n) =>
      n.id === dbId || n.id === id ? { ...n, lida: true } : n,
    );
    emit();
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("id", dbId);
    if (error) {
      console.error("[notificacoes] marcarLida error", error);
      toast.error(`Erro ao marcar notificação: ${error.message}`);
    }
  },
  async marcarTodasLidas() {
    notificacoes = notificacoes.map((n) => ({ ...n, lida: true }));
    emit();
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("lida", false);
    if (error) {
      console.error("[notificacoes] marcarTodasLidas error", error);
      toast.error(`Erro ao marcar todas: ${error.message}`);
    }
  },
  async remove(id: string) {
    const dbId = toUuid(id);
    notificacoes = notificacoes.filter((n) => n.id !== dbId && n.id !== id);
    emit();
    const { error } = await supabase
      .from("notificacoes")
      .delete()
      .eq("id", dbId);
    if (error) {
      console.error("[notificacoes] remove error", error);
      toast.error(`Erro ao remover notificação: ${error.message}`);
    }
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
    const unsub = notificacoesStore.subscribe(() =>
      setSnap([...notificacoesStore.getAll()]),
    );
    return () => {
      unsub();
    };
  }, []);
  return snap;
}
