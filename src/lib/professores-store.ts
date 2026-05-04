// =====================================================================
// Camada de compatibilidade — Professores derivados de Usuários (Fase 8).
// =====================================================================
// A tabela `professores` foi eliminada. Um "Professor" é um Usuário com
// role "professor", cujos dados específicos (telefone, formacao, bio, etc.)
// vivem em `profiles`. Este módulo expõe a mesma API antiga (Professor,
// useProfessores, professoresStore) mas a fonte de verdade agora é
// `usersStore`. ID do Professor === userId do User.
//
// Avaliações de professores continuam em `professor_avaliacoes`, agora
// chaveadas por `professor_user_id` (FK para auth.users).
// =====================================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usersStore, useUsers, updateUserProfessorFields, type UserRow } from "./users-store";

// ---------------------------------------------------------------------
// Tipos públicos (mantidos por compatibilidade)
// ---------------------------------------------------------------------
export interface Professor {
  /** Igual ao userId — não há mais ID separado. */
  id: string;
  /** Igual a `id`. Mantido por compat com código que diferencia. */
  userId: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  formacao: string | null;
  bio: string | null;
  fotoUrl: string | null;
  cargaHorariaSemanalMin: number;
  habilidadesIds: string[];
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  criadoPorUserId: string | null;
}

export interface ProfessorAvaliacao {
  id: string;
  /** Mantido por compat — agora é igual a `professorUserId`. */
  professorId: string;
  professorUserId: string;
  avaliadorUserId: string;
  avaliadorTipo: "aluno" | "coordenacao" | "admin" | "autoavaliacao";
  agendamentoId: string | null;
  notas: Record<string, number>;
  comentario: string | null;
  tags: string[];
  criadoEm: string;
}

// ---------------------------------------------------------------------
// Conversão User → Professor
// ---------------------------------------------------------------------
function userToProfessor(u: UserRow): Professor {
  return {
    id: u.userId, // ID === userId agora
    userId: u.userId,
    nome: u.displayName,
    email: u.email,
    telefone: u.telefone ?? null,
    cpf: u.cpf ?? null,
    formacao: u.formacao ?? null,
    bio: u.bio ?? null,
    fotoUrl: u.fotoUrl ?? null,
    cargaHorariaSemanalMin: u.cargaHorariaSemanalMin ?? 0,
    habilidadesIds: u.habilidadesIds ?? [],
    ativo: u.ativo ?? true,
    criadoEm: u.criadoEm,
    atualizadoEm: u.criadoEm,
    criadoPorUserId: null,
  };
}

function isProfessor(u: UserRow): boolean {
  return u.roles.includes("professor");
}

// ---------------------------------------------------------------------
// Avaliações — armazenadas em `professor_avaliacoes` (chave: professor_user_id)
// ---------------------------------------------------------------------
type ProfessorAvaliacaoRow = {
  id: string;
  professor_user_id: string;
  avaliador_user_id: string;
  avaliador_tipo: string;
  agendamento_id: string | null;
  notas: Record<string, number>;
  comentario: string | null;
  tags: string[] | null;
  criado_em: string;
};

function rowToAvaliacao(r: ProfessorAvaliacaoRow): ProfessorAvaliacao {
  return {
    id: r.id,
    professorId: r.professor_user_id, // alias
    professorUserId: r.professor_user_id,
    avaliadorUserId: r.avaliador_user_id,
    avaliadorTipo: r.avaliador_tipo as ProfessorAvaliacao["avaliadorTipo"],
    agendamentoId: r.agendamento_id,
    notas: r.notas ?? {},
    comentario: r.comentario,
    tags: r.tags ?? [],
    criadoEm: r.criado_em,
  };
}

let avaliacoes: ProfessorAvaliacao[] = [];
let avaliacoesInitialized = false;
let avaliacoesInitPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadAvaliacoes(): Promise<void> {
  const { data, error } = await supabase
    .from("professor_avaliacoes")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) {
    if (error.code !== "PGRST301" && error.code !== "42501") {
      console.error("[professor_avaliacoes] load error", error);
    }
    avaliacoes = [];
    return;
  }
  avaliacoes = ((data ?? []) as unknown as ProfessorAvaliacaoRow[]).map(rowToAvaliacao);
}

async function ensureInitAvaliacoes(): Promise<void> {
  if (avaliacoesInitialized) return;
  if (!avaliacoesInitPromise) {
    avaliacoesInitPromise = loadAvaliacoes().then(() => {
      avaliacoesInitialized = true;
      emit();
    });
  }
  return avaliacoesInitPromise;
}

// ---------------------------------------------------------------------
// Store público (compat shim) — deriva tudo de usersStore
// ---------------------------------------------------------------------
export const professoresStore = {
  // ---- Leitura ----
  getAll(): Professor[] {
    return usersStore.getAll().filter(isProfessor).map(userToProfessor);
  },
  getAtivos(): Professor[] {
    return professoresStore.getAll().filter((p) => p.ativo);
  },
  getById(id: string): Professor | undefined {
    // ID === userId
    return professoresStore.getByUserId(id);
  },
  getByUserId(userId: string): Professor | undefined {
    const u = usersStore.getAll().find((x) => x.userId === userId);
    if (!u || !isProfessor(u)) return undefined;
    return userToProfessor(u);
  },
  getByNome(nome: string): Professor | undefined {
    const norm = nome.trim().toLowerCase();
    return professoresStore.getAll().find((p) => p.nome.trim().toLowerCase() === norm);
  },
  getAvaliacoes(): ProfessorAvaliacao[] {
    return avaliacoes;
  },
  getAvaliacoesDoProfessor(professorId: string): ProfessorAvaliacao[] {
    // professorId === userId
    return avaliacoes.filter((a) => a.professorUserId === professorId);
  },

  // ---- Escrita: Professor ----
  /**
   * "Salva" um professor — na verdade atualiza os campos estendidos do
   * profile correspondente. NÃO cria usuários (que precisam de auth).
   */
  async upsert(entry: Professor): Promise<void> {
    if (!entry.userId) {
      toast.error("Não é possível salvar professor sem usuário vinculado.");
      return;
    }

    // Garante que o usuário tem role "professor"
    const u = usersStore.getAll().find((x) => x.userId === entry.userId);
    if (u && !u.roles.includes("professor")) {
      await usersStore.addRole(entry.userId, "professor");
    }

    // Atualiza display_name se mudou
    if (u && u.displayName !== entry.nome) {
      await usersStore.updateDisplayName(entry.userId, entry.nome);
    }

    // Atualiza campos específicos em profiles
    await updateUserProfessorFields(entry.userId, {
      telefone: entry.telefone,
      cpf: entry.cpf,
      formacao: entry.formacao,
      bio: entry.bio,
      fotoUrl: entry.fotoUrl,
      cargaHorariaSemanalMin: entry.cargaHorariaSemanalMin,
      habilidadesIds: entry.habilidadesIds,
      ativo: entry.ativo,
    });
    emit();
  },

  /** Cria/garante que o usuário tem role "professor". */
  async createFromUser(user: UserRow): Promise<void> {
    if (user.roles.includes("professor")) return;
    await usersStore.addRole(user.userId, "professor");
    emit();
  },

  /**
   * Backfill: para cada usuário com role "professor" que ainda não tem
   * dados estendidos preenchidos, não faz nada (não há mais sync separado).
   * Mantido como no-op por compat. Retorna 0.
   */
  async syncFromUsers(_users: UserRow[]): Promise<number> {
    // Nada a sincronizar — User+role é a única fonte de verdade.
    return 0;
  },

  /**
   * "Remove" um professor — na verdade remove a role "professor" do usuário.
   * O usuário continua existindo (com outros papéis ou nenhum).
   */
  async remove(id: string): Promise<void> {
    // id === userId
    await usersStore.removeRole(id, "professor");
    emit();
  },

  async toggleAtivo(id: string): Promise<void> {
    const p = professoresStore.getById(id);
    if (!p) return;
    await updateUserProfessorFields(p.userId, { ativo: !p.ativo });
    emit();
  },

  // ---- Escrita: Avaliações ----
  async addAvaliacao(entry: ProfessorAvaliacao): Promise<void> {
    avaliacoes = [entry, ...avaliacoes];
    emit();

    const row = {
      id: entry.id,
      professor_user_id: entry.professorUserId,
      avaliador_user_id: entry.avaliadorUserId,
      avaliador_tipo: entry.avaliadorTipo,
      agendamento_id: entry.agendamentoId,
      notas: entry.notas,
      comentario: entry.comentario,
      tags: entry.tags ?? [],
    };
    const { error } = await supabase
      .from("professor_avaliacoes")
      .upsert(row as never, { onConflict: "id" });
    if (error) {
      console.error("[professor_avaliacoes] insert error", error);
      toast.error(`Erro ao salvar avaliação: ${error.message}`);
      await loadAvaliacoes();
      emit();
    }
  },

  async removeAvaliacao(id: string): Promise<void> {
    avaliacoes = avaliacoes.filter((a) => a.id !== id);
    emit();

    const { error } = await supabase.from("professor_avaliacoes").delete().eq("id", id);
    if (error) {
      console.error("[professor_avaliacoes] remove error", error);
      toast.error(`Erro ao remover avaliação: ${error.message}`);
      await loadAvaliacoes();
      emit();
    }
  },

  // ---- Subscriptions / init ----
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    // Repassa também eventos de usersStore (que mudam o derivado).
    const unsubUsers = usersStore.subscribe(fn);
    return () => {
      listeners.delete(fn);
      unsubUsers();
    };
  },

  ensureInit: async () => {
    await Promise.all([usersStore.ensureInit(), ensureInitAvaliacoes()]);
  },

  async reload(): Promise<void> {
    await Promise.all([usersStore.refresh(), loadAvaliacoes()]);
    emit();
  },
};

// ---------------------------------------------------------------------
// Hooks React
// ---------------------------------------------------------------------
export function useProfessores(): Professor[] {
  const allUsers = useUsers();
  return useMemo(() => allUsers.filter(isProfessor).map(userToProfessor), [allUsers]);
}

export function useProfessoresAtivos(): Professor[] {
  const todos = useProfessores();
  return useMemo(() => todos.filter((p) => p.ativo), [todos]);
}

export function useProfessorAvaliacoes(professorId?: string): ProfessorAvaliacao[] {
  const [snap, setSnap] = useState<ProfessorAvaliacao[]>(avaliacoes);
  useEffect(() => {
    void professoresStore.ensureInit();
    const unsub = professoresStore.subscribe(() => setSnap([...avaliacoes]));
    return unsub;
  }, []);
  return professorId ? snap.filter((a) => a.professorUserId === professorId) : snap;
}

// ---------------------------------------------------------------------
// Helpers (compat)
// ---------------------------------------------------------------------
/**
 * Deriva os agendamentos de um professor combinando match por
 * `professorUserId` (fonte nova) ou nome (legado).
 */
export function getAgendamentosDoProfessor<
  T extends {
    professorUserId?: string;
    professorId?: string;
    professor?: string;
  },
>(professor: { id: string; userId?: string | null; nome: string }, agendamentos: T[]): T[] {
  const userId = professor.userId ?? professor.id;
  const nomeNorm = professor.nome.trim().toLowerCase();
  return agendamentos.filter(
    (ag) =>
      (ag.professorUserId && ag.professorUserId === userId) ||
      (ag.professorId && ag.professorId === professor.id) ||
      (ag.professor && ag.professor.trim().toLowerCase() === nomeNorm),
  );
}

export function getAtividadesDoProfessor<
  T extends {
    professorUserId?: string;
    professorId?: string;
    professor?: string;
  },
>(professor: { id: string; userId?: string | null; nome: string }, atividades: T[]): T[] {
  return getAgendamentosDoProfessor(professor, atividades);
}

// ---------------------------------------------------------------------
// Cálculos (preservados — agora aceitam tanto Professor quanto User base)
// ---------------------------------------------------------------------
function duracaoMin(inicio: string, fim: string): number {
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fim.split(":").map(Number);
  return hf * 60 + mf - (hi * 60 + mi);
}

export function calcularCargaTrabalhada(
  professor: Professor,
  agendamentos: Array<{
    professor?: string;
    professorId?: string;
    professorUserId?: string;
    inicio: string;
    fim: string;
    status: string;
  }>,
): { totalMin: number; concluidasMin: number; pendentesMin: number } {
  let totalMin = 0;
  let concluidasMin = 0;
  let pendentesMin = 0;
  const nomeNorm = professor.nome.trim().toLowerCase();
  for (const ag of agendamentos) {
    const matches =
      (ag.professorUserId && ag.professorUserId === professor.userId) ||
      (ag.professorId && ag.professorId === professor.id) ||
      (ag.professor != null && ag.professor.trim().toLowerCase() === nomeNorm);
    if (!matches) continue;
    const dur = duracaoMin(ag.inicio, ag.fim);
    totalMin += dur;
    if (ag.status === "concluido") concluidasMin += dur;
    else pendentesMin += dur;
  }
  return { totalMin, concluidasMin, pendentesMin };
}

export interface ProfessorScores {
  porCriterio: Record<string, number>;
  geral: number | null;
  total: number;
}

export function calcularScores(avs: ProfessorAvaliacao[]): ProfessorScores {
  if (avs.length === 0) return { porCriterio: {}, geral: null, total: 0 };
  const soma: Record<string, number> = {};
  const cont: Record<string, number> = {};
  for (const a of avs) {
    for (const [k, v] of Object.entries(a.notas)) {
      if (typeof v !== "number" || isNaN(v)) continue;
      soma[k] = (soma[k] ?? 0) + v;
      cont[k] = (cont[k] ?? 0) + 1;
    }
  }
  const porCriterio: Record<string, number> = {};
  let somaTudo = 0;
  let contTudo = 0;
  for (const k of Object.keys(soma)) {
    porCriterio[k] = soma[k] / cont[k];
    somaTudo += soma[k];
    contTudo += cont[k];
  }
  return {
    porCriterio,
    geral: contTudo > 0 ? somaTudo / contTudo : null,
    total: avs.length,
  };
}

export interface DesempenhoHabilidade {
  habilidadeId: string;
  media: number;
  count: number;
  min?: number;
  max?: number;
}

export function calcularDesempenhoHabilidades(
  professor: Professor,
  avaliacoes: Array<{
    agendamentoId: string | null;
    tipo: string;
    dados: unknown;
  }>,
  agendamentos: Array<{
    id: string;
    professor?: string;
    professorId?: string;
    professorUserId?: string;
  }>,
): Record<string, DesempenhoHabilidade> {
  const nomeNorm = professor.nome.trim().toLowerCase();
  const agendamentosDoProf = new Set<string>();
  for (const ag of agendamentos) {
    const matches =
      (ag.professorUserId && ag.professorUserId === professor.userId) ||
      (ag.professorId && ag.professorId === professor.id) ||
      (ag.professor != null && ag.professor.trim().toLowerCase() === nomeNorm);
    if (matches) agendamentosDoProf.add(ag.id);
  }
  const checklistsDoProf = avaliacoes.filter(
    (av) =>
      av.tipo === "checklist_aluno" && av.agendamentoId && agendamentosDoProf.has(av.agendamentoId),
  );
  const desempenho: Record<string, { notas: number[]; min: number; max: number }> = {};
  for (const checklist of checklistsDoProf) {
    const dados = checklist.dados as { habilidadesNotas?: Record<string, unknown> } | null;
    const habilidadesNotas = dados?.habilidadesNotas ?? {};
    for (const [habilidadeId, nota] of Object.entries(habilidadesNotas)) {
      if (typeof nota !== "number" || nota < 1 || nota > 5) continue;
      const entry = desempenho[habilidadeId] || { notas: [], min: 5, max: 1 };
      entry.notas.push(nota);
      entry.min = Math.min(entry.min, nota);
      entry.max = Math.max(entry.max, nota);
      desempenho[habilidadeId] = entry;
    }
  }
  const resultado: Record<string, DesempenhoHabilidade> = {};
  for (const [habilidadeId, entry] of Object.entries(desempenho)) {
    const media =
      entry.notas.length > 0 ? entry.notas.reduce((a, b) => a + b, 0) / entry.notas.length : 0;
    resultado[habilidadeId] = {
      habilidadeId,
      media: Math.round(media * 100) / 100,
      count: entry.notas.length,
      min: entry.min,
      max: entry.max,
    };
  }
  return resultado;
}
