// =====================================================================
// Store singleton de Professores (Fase 1 da seção Professores).
// =====================================================================
// Espelha o padrão de `comportamento-tags-store.ts`:
//   • Singleton em memória + pub/sub para reatividade React.
//   • Carrega lazy (na 1ª chamada de `ensureInit`).
//   • Não toca em `atividades`, `agendamentos`, `notificacoes` — fases
//     seguintes farão a integração.
//
// Visibilidade: a tabela `professores` tem RLS exigindo papel staff
// (admin/coordenação/professor). Aluno/pais não veem. A UI de gestão
// (ProfessoresManagerDialog — Fase 2) só é montada se isStaff().
// =====================================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UserRow } from "./users-store";

// ---------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------
export interface Professor {
  id: string;
  /** FK para auth.users — opcional (pode existir antes do professor logar). */
  userId: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  formacao: string | null;
  bio: string | null;
  fotoUrl: string | null;
  /** Limite máximo de minutos por semana (0 = sem controle). */
  cargaHorariaSemanalMin: number;
  /** Especialidades — referencia tabela `habilidades` por id. */
  habilidadesIds: string[];
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  criadoPorUserId: string | null;
}

/** Avaliação de um professor — pode ser por aula (agendamento) ou geral. */
export interface ProfessorAvaliacao {
  id: string;
  professorId: string;
  avaliadorUserId: string;
  avaliadorTipo: "aluno" | "coordenacao" | "admin" | "autoavaliacao";
  /** Aula avaliada — null para avaliação geral. */
  agendamentoId: string | null;
  /** JSON livre. Sugestão de critérios:
   *   { clareza: 1-5, dominio: 1-5, engajamento: 1-5, pontualidade: 1-5 } */
  notas: Record<string, number>;
  comentario: string | null;
  criadoEm: string;
}

// ---------------------------------------------------------------------
// Tipos de linha do banco
// ---------------------------------------------------------------------
type ProfessorRow = {
  id: string;
  user_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  formacao: string | null;
  bio: string | null;
  foto_url: string | null;
  carga_horaria_semanal_min: number;
  habilidades_ids: string[];
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  criado_por_user_id: string | null;
};

type ProfessorAvaliacaoRow = {
  id: string;
  professor_id: string;
  avaliador_user_id: string;
  avaliador_tipo: string;
  agendamento_id: string | null;
  notas: Record<string, number>;
  comentario: string | null;
  criado_em: string;
};

// ---------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------
function rowToProfessor(r: ProfessorRow): Professor {
  return {
    id: r.id,
    userId: r.user_id,
    nome: r.nome,
    email: r.email,
    telefone: r.telefone,
    cpf: r.cpf,
    formacao: r.formacao,
    bio: r.bio,
    fotoUrl: r.foto_url,
    cargaHorariaSemanalMin: r.carga_horaria_semanal_min,
    habilidadesIds: r.habilidades_ids ?? [],
    ativo: r.ativo,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
    criadoPorUserId: r.criado_por_user_id,
  };
}

function professorToRow(p: Professor): Omit<ProfessorRow, "criado_em" | "atualizado_em"> {
  return {
    id: p.id,
    user_id: p.userId,
    nome: p.nome,
    email: p.email,
    telefone: p.telefone,
    cpf: p.cpf,
    formacao: p.formacao,
    bio: p.bio,
    foto_url: p.fotoUrl,
    carga_horaria_semanal_min: p.cargaHorariaSemanalMin,
    habilidades_ids: p.habilidadesIds,
    ativo: p.ativo,
    criado_por_user_id: p.criadoPorUserId,
  };
}

function rowToAvaliacao(r: ProfessorAvaliacaoRow): ProfessorAvaliacao {
  return {
    id: r.id,
    professorId: r.professor_id,
    avaliadorUserId: r.avaliador_user_id,
    avaliadorTipo: r.avaliador_tipo as ProfessorAvaliacao["avaliadorTipo"],
    agendamentoId: r.agendamento_id,
    notas: r.notas ?? {},
    comentario: r.comentario,
    criadoEm: r.criado_em,
  };
}

// ---------------------------------------------------------------------
// Estado singleton
// ---------------------------------------------------------------------
let professores: Professor[] = [];
let avaliacoes: ProfessorAvaliacao[] = [];
let initialized = false;
let initPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function loadFromDb(): Promise<void> {
  // Carrega professores e avaliações em paralelo.
  const [{ data: profData, error: profErr }, { data: avalData, error: avalErr }] =
    await Promise.all([
      supabase.from("professores").select("*").order("nome"),
      supabase.from("professor_avaliacoes").select("*").order("criado_em", { ascending: false }),
    ]);

  if (profErr) {
    // RLS pode bloquear quem não é staff — tratamos silenciosamente para
    // não poluir o console de alunos/pais.
    if (profErr.code !== "PGRST301" && profErr.code !== "42501") {
      console.error("[professores] load error", profErr);
    }
    professores = [];
  } else {
    professores = ((profData ?? []) as unknown as ProfessorRow[]).map(rowToProfessor);
  }

  if (avalErr) {
    if (avalErr.code !== "PGRST301" && avalErr.code !== "42501") {
      console.error("[professor_avaliacoes] load error", avalErr);
    }
    avaliacoes = [];
  } else {
    avaliacoes = ((avalData ?? []) as unknown as ProfessorAvaliacaoRow[]).map(rowToAvaliacao);
  }
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

// ---------------------------------------------------------------------
// Store público
// ---------------------------------------------------------------------
export const professoresStore = {
  // ---- Leitura ----
  getAll(): Professor[] {
    return professores;
  },
  getAtivos(): Professor[] {
    return professores.filter((p) => p.ativo);
  },
  getById(id: string): Professor | undefined {
    return professores.find((p) => p.id === id);
  },
  getByUserId(userId: string): Professor | undefined {
    return professores.find((p) => p.userId === userId);
  },
  getByNome(nome: string): Professor | undefined {
    const norm = nome.trim().toLowerCase();
    return professores.find((p) => p.nome.trim().toLowerCase() === norm);
  },
  getAvaliacoes(): ProfessorAvaliacao[] {
    return avaliacoes;
  },
  getAvaliacoesDoProfessor(professorId: string): ProfessorAvaliacao[] {
    return avaliacoes.filter((a) => a.professorId === professorId);
  },

  // ---- Escrita: Professor ----
  /** Cria ou atualiza professor. Optimistic UI. */
  async upsert(entry: Professor): Promise<void> {
    const exists = professores.some((p) => p.id === entry.id);
    professores = exists
      ? professores.map((p) => (p.id === entry.id ? entry : p))
      : [...professores, entry].sort((a, b) => a.nome.localeCompare(b.nome));
    emit();

    const row = professorToRow(entry);
    const { error } = await supabase
      .from("professores")
      .upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[professores] upsert error", error);
      toast.error(`Erro ao salvar professor: ${error.message}`);
      // Reverte cache para evitar drift visual em caso de RLS reject.
      await loadFromDb();
      emit();
    }
  },

  /** Cria novo professor a partir de um usuário (Fase A - auto-sync). */
  async createFromUser(user: UserRow): Promise<void> {
    // Verifica se professor já existe para este usuário
    const existente = professores.find((p) => p.userId === user.userId);
    if (existente) {
      console.info(`[professores] Professor já existe para userId ${user.userId}`);
      return;
    }

    // Cria novo Professor com dados do usuário
    const novoProfessor: Professor = {
      id: crypto.randomUUID(),
      userId: user.userId,
      nome: user.displayName,
      email: user.email,
      telefone: null,
      cpf: null,
      formacao: null,
      bio: null,
      fotoUrl: null,
      cargaHorariaSemanalMin: 0, // sem limite por padrão
      habilidadesIds: [],
      ativo: true,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      criadoPorUserId: null,
    };

    // Salva usando upsert normal
    await professoresStore.upsert(novoProfessor);
  },

  async remove(id: string): Promise<void> {
    professores = professores.filter((p) => p.id !== id);
    avaliacoes = avaliacoes.filter((a) => a.professorId !== id);
    emit();

    const { error } = await supabase.from("professores").delete().eq("id", id);
    if (error) {
      console.error("[professores] remove error", error);
      toast.error(`Erro ao remover professor: ${error.message}`);
      await loadFromDb();
      emit();
    }
  },

  /** Alterna `ativo` (preserva histórico — não deleta). */
  async toggleAtivo(id: string): Promise<void> {
    const p = professores.find((x) => x.id === id);
    if (!p) return;
    await professoresStore.upsert({ ...p, ativo: !p.ativo });
  },

  // ---- Escrita: Avaliações ----
  async addAvaliacao(entry: ProfessorAvaliacao): Promise<void> {
    avaliacoes = [entry, ...avaliacoes];
    emit();

    const row = {
      id: entry.id,
      professor_id: entry.professorId,
      avaliador_user_id: entry.avaliadorUserId,
      avaliador_tipo: entry.avaliadorTipo,
      agendamento_id: entry.agendamentoId,
      notas: entry.notas,
      comentario: entry.comentario,
    };
    const { error } = await supabase
      .from("professor_avaliacoes")
      .upsert(row, { onConflict: "id" });
    if (error) {
      console.error("[professor_avaliacoes] insert error", error);
      toast.error(`Erro ao salvar avaliação: ${error.message}`);
      await loadFromDb();
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
      await loadFromDb();
      emit();
    }
  },

  // ---- Subscriptions / init ----
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  ensureInit,

  /** Força recarga do banco — útil após mudanças externas. */
  async reload(): Promise<void> {
    await loadFromDb();
    emit();
  },
};

// ---------------------------------------------------------------------
// Hooks React
// ---------------------------------------------------------------------
export function useProfessores(): Professor[] {
  const [snap, setSnap] = useState<Professor[]>(professoresStore.getAll());
  useEffect(() => {
    void ensureInit();
    const unsub = professoresStore.subscribe(() =>
      setSnap([...professoresStore.getAll()]),
    );
    return unsub;
  }, []);
  return snap;
}

export function useProfessoresAtivos(): Professor[] {
  const todos = useProfessores();
  return todos.filter((p) => p.ativo);
}

export function useProfessorAvaliacoes(professorId?: string): ProfessorAvaliacao[] {
  const [snap, setSnap] = useState<ProfessorAvaliacao[]>(
    professoresStore.getAvaliacoes(),
  );
  useEffect(() => {
    void ensureInit();
    const unsub = professoresStore.subscribe(() =>
      setSnap([...professoresStore.getAvaliacoes()]),
    );
    return unsub;
  }, []);
  return professorId ? snap.filter((a) => a.professorId === professorId) : snap;
}

// ---------------------------------------------------------------------
// Helpers de cálculo (carga horária trabalhada por agendamentos)
// ---------------------------------------------------------------------
/**
 * Calcula minutos totais trabalhados pelo professor a partir de uma lista
 * de agendamentos. Conta apenas agendamentos onde o professor está vinculado
 * por `professor_id` (Fase 6) OU pelo nome (compat).
 */
export function calcularCargaTrabalhada(
  professor: Professor,
  agendamentos: Array<{
    professor?: string;
    professorId?: string;
    inicio: string;
    fim: string;
    status: string;
  }>,
): { totalMin: number; concluidasMin: number; pendentesMin: number } {
  let totalMin = 0;
  let concluidasMin = 0;
  let pendentesMin = 0;

  for (const ag of agendamentos) {
    const matches =
      ag.professorId === professor.id ||
      (ag.professor != null && ag.professor.trim().toLowerCase() === professor.nome.trim().toLowerCase());
    if (!matches) continue;

    const dur = duracaoMin(ag.inicio, ag.fim);
    totalMin += dur;
    if (ag.status === "concluido") concluidasMin += dur;
    else pendentesMin += dur;
  }

  return { totalMin, concluidasMin, pendentesMin };
}

function duracaoMin(inicio: string, fim: string): number {
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fim.split(":").map(Number);
  return hf * 60 + mf - (hi * 60 + mi);
}

// ---------------------------------------------------------------------
// Helpers de avaliação (média de notas)
// ---------------------------------------------------------------------
export interface ProfessorScores {
  porCriterio: Record<string, number>;
  geral: number | null;
  total: number;
}

/** Média das notas por critério + média geral. Ignora avaliações sem notas. */
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
