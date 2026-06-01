// Synthetic test data for classmate-connect-13 tests.
// All IDs are deterministic UUIDs — no randomness.
import type { Agendamento, Curso, HorarioSlot, Turma } from "@/lib/academic-types";

// ── Courses ──────────────────────────────────────────────────────────

export const CURSO_MUSICA: Curso = {
  id: "c0000000-0000-0000-0000-000000000001",
  cod: "MP",
  nome: "Musicalização e Prática",
  descricao: "Curso de musicalização infantil",
  duracaoAulaMin: 50,
  turnoDiarioMin: 150,
  cargaHorariaTotalMin: 600,
  habilidadeIds: ["h001", "h002"],
};

export const CURSO_SEM_DURACAO: Curso = {
  id: "c0000000-0000-0000-0000-000000000002",
  cod: "GEN",
  nome: "Curso Genérico",
};

// ── Slots ────────────────────────────────────────────────────────────

export const SLOT_SEG_MANHA: HorarioSlot = {
  diaSemana: "seg",
  inicio: "08:00",
  fim: "10:30",
};

export const SLOT_TER_TARDE: HorarioSlot = {
  diaSemana: "ter",
  inicio: "14:00",
  fim: "16:00",
};

// ── Turmas ────────────────────────────────────────────────────────────

export const TURMA_A: Turma = {
  id: "t0000000-0000-0000-0000-000000000001",
  cod: "MP_T1",
  nome: "Turma Alpha",
  cursoId: CURSO_MUSICA.id,
  data: "2026-03-01",
  alunosIds: ["a001", "a002", "a003"],
  horarios: [SLOT_SEG_MANHA, SLOT_TER_TARDE],
};

// ── Agendamentos ─────────────────────────────────────────────────────

export function makeAgendamento(overrides: Partial<Agendamento> = {}): Agendamento {
  return {
    id: "ag000000-0000-0000-0000-000000000001",
    turmaId: TURMA_A.id,
    data: "2026-05-26",
    diaSemana: "seg",
    inicio: "08:00",
    fim: "08:50",
    atividadeIds: ["at001"],
    status: "pendente",
    criadoEm: "2026-05-20T10:00:00Z",
    professor: "Prof. Ana",
    professorUserId: "u-prof-001",
    criadoPorUserId: "u-admin-001",
    criadoPorNome: "Admin",
    blocoIndex: 0,
    blocosTotal: 1,
    slotInicio: "08:00",
    slotFim: "10:30",
    ...overrides,
  };
}

export function makeConcluido(overrides: Partial<Agendamento> = {}): Agendamento {
  return makeAgendamento({
    id: "ag000000-0000-0000-0000-000000000002",
    status: "concluido",
    concluidoEm: "2026-05-26T12:00:00Z",
    ...overrides,
  });
}
