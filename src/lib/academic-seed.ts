import type {
  Agendamento,
  Aluno,
  Atividade,
  Curso,
  Habilidade,
  Turma,
} from "./academic-types";

// ====================================================================
// CURSOS
// ====================================================================
export const SEED_CURSOS: Curso[] = [
  { id: "c-mp", cod: "MP", nome: "Curso MP", descricao: "Nome do curso a ser definido." },
  { id: "c-gp", cod: "GP", nome: "Curso GP", descricao: "Nome do curso a ser definido." },
  { id: "c-ad", cod: "AD", nome: "Curso AD", descricao: "Nome do curso a ser definido." },
  { id: "c-rb", cod: "RB", nome: "Curso RB", descricao: "Nome do curso a ser definido." },
];

// ====================================================================
// TURMAS — turmas não têm professor; o professor pertence à atividade.
// ====================================================================
export const SEED_TURMAS: Turma[] = [
  // ----- MP -----
  { id: "t-mp-1", cursoId: "c-mp", nome: "MP_T1", cod: "MP_T1", data: "2026-02-02", horarios: [{ diaSemana: "seg", inicio: "14:00", fim: "15:00" }], alunosIds: [] },
  { id: "t-mp-2", cursoId: "c-mp", nome: "MP_T2", cod: "MP_T2", data: "2026-02-06", horarios: [{ diaSemana: "sex", inicio: "09:00", fim: "10:00" }], alunosIds: [] },
  { id: "t-mp-3", cursoId: "c-mp", nome: "MP_T3", cod: "MP_T3", data: "2026-02-06", horarios: [{ diaSemana: "sex", inicio: "14:00", fim: "15:00" }], alunosIds: [] },
  { id: "t-mp-4", cursoId: "c-mp", nome: "MP_T4", cod: "MP_T4", data: "2026-02-07", horarios: [{ diaSemana: "sab", inicio: "07:30", fim: "08:30" }], alunosIds: [] },
  { id: "t-mp-5", cursoId: "c-mp", nome: "MP_T5", cod: "MP_T5", data: "2026-02-08", horarios: [{ diaSemana: "dom", inicio: "10:00", fim: "11:00" }], alunosIds: [] },
  { id: "t-mp-6", cursoId: "c-mp", nome: "MP_T6", cod: "MP_T6", data: "2026-02-03", horarios: [{ diaSemana: "ter", inicio: "14:00", fim: "15:00" }], alunosIds: [] },
  { id: "t-mp-7", cursoId: "c-mp", nome: "MP_T7", cod: "MP_T7", data: "2026-02-03", horarios: [{ diaSemana: "ter", inicio: "14:00", fim: "15:00" }], alunosIds: [] },

  // ----- GP -----
  { id: "t-gp-2006-1", cursoId: "c-gp", nome: "GP_T2006-1", cod: "GP_T2006-1", data: "2026-02-02", horarios: [{ diaSemana: "seg", inicio: "14:00", fim: "15:00" }], alunosIds: [] },
  { id: "t-gp-4003-1", cursoId: "c-gp", nome: "GP_T4003-1", cod: "GP_T4003-1", data: "2026-02-04", horarios: [{ diaSemana: "qua", inicio: "14:00", fim: "15:00" }], alunosIds: [] },
  { id: "t-gp-7003-2", cursoId: "c-gp", nome: "GP_T7003-2", cod: "GP_T7003-2", data: "2026-02-07", horarios: [{ diaSemana: "sab", inicio: "13:30", fim: "14:30" }], alunosIds: [] },
  { id: "t-gp-7004-1", cursoId: "c-gp", nome: "GP_T7004-1", cod: "GP_T7004-1", data: "2026-02-07", horarios: [{ diaSemana: "sab", inicio: "13:30", fim: "14:30" }], alunosIds: [] },
  { id: "t-gp-8003-2", cursoId: "c-gp", nome: "GP_T8003-2", cod: "GP_T8003-2", data: "2026-02-08", horarios: [{ diaSemana: "dom", inicio: "12:30", fim: "13:30" }], alunosIds: [] },

  // ----- AD -----
  { id: "t-ad-1", cursoId: "c-ad", nome: "AD_T1", cod: "AD_T1", data: "2026-02-03", horarios: [{ diaSemana: "ter", inicio: "16:30", fim: "17:30" }, { diaSemana: "qui", inicio: "16:30", fim: "17:30" }], alunosIds: [] },
  { id: "t-ad-2", cursoId: "c-ad", nome: "AD_T2", cod: "AD_T2", data: "2026-02-08", horarios: [{ diaSemana: "dom", inicio: "15:00", fim: "16:00" }], alunosIds: [] },
  { id: "t-ad-3", cursoId: "c-ad", nome: "AD_T3", cod: "AD_T3", data: "2026-02-07", horarios: [{ diaSemana: "sab", inicio: "10:00", fim: "11:00" }], alunosIds: [] },
  { id: "t-ad-4", cursoId: "c-ad", nome: "AD_T4", cod: "AD_T4", data: "2026-02-07", horarios: [{ diaSemana: "sab", inicio: "15:00", fim: "16:00" }], alunosIds: [] },

  // ----- RB -----
  { id: "t-rb-1", cursoId: "c-rb", nome: "RB_T1", cod: "RB_T1", data: "2026-02-04", horarios: [{ diaSemana: "qua", inicio: "19:00", fim: "20:00" }], alunosIds: [] },
];

export const SEED_ALUNOS: Aluno[] = [];

export const SEED_HABILIDADES: Habilidade[] = [
  { id: "h-com-01", sigla: "COM-01", descricao: "Comunicação clara: capacidade de expressar ideias de forma objetiva.", grupo: "Socioemocional" },
  { id: "h-cri-02", sigla: "CRI-02", descricao: "Criatividade aplicada: gerar soluções originais.", grupo: "Cognitivo" },
  { id: "h-col-03", sigla: "COL-03", descricao: "Colaboração em equipe: trabalhar coletivamente.", grupo: "Socioemocional" },
  { id: "h-tec-04", sigla: "TEC-04", descricao: "Domínio técnico de ferramentas digitais.", grupo: "Técnico" },
];

export const SEED_GRUPOS: Record<string, string[]> = {
  "c-mp": ["Geral"],
  "c-gp": ["Geral"],
  "c-ad": ["Geral"],
  "c-rb": ["Geral"],
};

export const SEED_ATIVIDADES: Atividade[] = [];
export const SEED_AGENDAMENTOS: Agendamento[] = [];
