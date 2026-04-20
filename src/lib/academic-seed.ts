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

// ====================================================================
// ATIVIDADES — catálogo de Aulas (tipo 0) e Tarefas (tipo 1) por curso.
// O professor escolhe uma destas ao agendar para uma turma.
// ====================================================================

const PROFS = ["Celso", "Anne", "Gustavo", "Manoel"];

function mkAula(
  cursoId: string,
  cursoCod: string,
  seq: number,
  nome: string,
  conteudo: string,
  professor: string,
  habilidadeIds: string[] = [],
): Atividade {
  const n = String(seq).padStart(2, "0");
  return {
    id: `at-${cursoId}-aula-${n}`,
    tipo: 0,
    nome,
    codigo: `${cursoCod}_G_A${n}`,
    cursoId,
    grupo: "Geral",
    descricao: conteudo,
    objetivoResultados: `Ao final, o aluno deve compreender: ${nome}.`,
    prazo: "2026-12-31",
    criadoPor: "Admin",
    professor,
    habilidadeIds,
    descricaoConteudo: conteudo,
    sugestoesPais: "Reforçar o conteúdo em casa com perguntas abertas.",
  };
}

function mkTarefa(
  cursoId: string,
  cursoCod: string,
  seq: number,
  nome: string,
  instrucoes: string,
  professor: string,
  habilidadeIds: string[] = [],
): Atividade {
  const n = String(seq).padStart(2, "0");
  return {
    id: `at-${cursoId}-tarefa-${n}`,
    tipo: 1,
    nome,
    codigo: `${cursoCod}_G_T${n}`,
    cursoId,
    grupo: "Geral",
    descricao: instrucoes,
    objetivoResultados: `Praticar e consolidar o conteúdo: ${nome}.`,
    prazo: "2026-12-31",
    criadoPor: "Admin",
    professor,
    habilidadeIds,
    instrucoes,
  };
}

export const SEED_ATIVIDADES: Atividade[] = [
  // ----- MP (Música/Performance) -----
  mkAula("c-mp", "MP", 1, "Aula 1 — Boas-vindas e diagnóstico", "Apresentação do curso, expectativas e avaliação inicial dos alunos.", "Celso", ["h-com-01"]),
  mkAula("c-mp", "MP", 2, "Aula 2 — Fundamentos rítmicos", "Pulso, tempo e subdivisões. Exercícios práticos de percussão corporal.", "Celso", ["h-tec-04"]),
  mkAula("c-mp", "MP", 3, "Aula 3 — Leitura básica", "Introdução à leitura de partitura: claves, figuras e pausas.", "Anne", ["h-tec-04", "h-cri-02"]),
  mkAula("c-mp", "MP", 4, "Aula 4 — Escalas maiores", "Construção e prática de escalas maiores em diferentes tonalidades.", "Anne", ["h-tec-04"]),
  mkAula("c-mp", "MP", 5, "Aula 5 — Performance em grupo", "Ensaio coletivo focado em escuta e entrosamento.", "Celso", ["h-col-03", "h-com-01"]),
  mkTarefa("c-mp", "MP", 1, "Tarefa 1 — Diário rítmico", "Gravar 1 minuto de palmas marcando pulso em 3 andamentos diferentes.", "Celso", ["h-tec-04"]),
  mkTarefa("c-mp", "MP", 2, "Tarefa 2 — Ditado de leitura", "Resolver folha de exercícios de leitura rítmica enviada em sala.", "Anne", ["h-tec-04"]),

  // ----- GP (Grupo de Performance) -----
  mkAula("c-gp", "GP", 1, "Aula 1 — Apresentação do repertório", "Escolha do repertório do semestre e divisão de naipes.", "Gustavo", ["h-com-01", "h-col-03"]),
  mkAula("c-gp", "GP", 2, "Aula 2 — Técnica de palco", "Postura, respiração e presença cênica.", "Gustavo", ["h-com-01"]),
  mkAula("c-gp", "GP", 3, "Aula 3 — Ensaio seccional", "Ensaio por naipes, foco em afinação e dinâmica.", "Manoel", ["h-col-03"]),
  mkAula("c-gp", "GP", 4, "Aula 4 — Ensaio geral", "Junção dos naipes e leitura completa do repertório.", "Manoel", ["h-col-03", "h-com-01"]),
  mkTarefa("c-gp", "GP", 1, "Tarefa 1 — Estudo individual", "Estudar individualmente sua parte do repertório por 30 min/dia.", "Gustavo", ["h-tec-04"]),

  // ----- AD (Artes/Desenho) -----
  mkAula("c-ad", "AD", 1, "Aula 1 — Linha e forma", "Exercícios de observação: linha contínua, contorno e silhueta.", "Anne", ["h-cri-02"]),
  mkAula("c-ad", "AD", 2, "Aula 2 — Luz e sombra", "Estudo de valores tonais com lápis grafite.", "Anne", ["h-cri-02", "h-tec-04"]),
  mkAula("c-ad", "AD", 3, "Aula 3 — Composição", "Regras de composição visual: terços, equilíbrio e foco.", "Manoel", ["h-cri-02"]),
  mkAula("c-ad", "AD", 4, "Aula 4 — Cor", "Teoria das cores e paletas harmônicas.", "Manoel", ["h-cri-02", "h-tec-04"]),
  mkTarefa("c-ad", "AD", 1, "Tarefa 1 — Estudo de objeto", "Desenhar um objeto do cotidiano aplicando luz e sombra.", "Anne", ["h-cri-02"]),
  mkTarefa("c-ad", "AD", 2, "Tarefa 2 — Paleta limitada", "Compor uma cena usando apenas 3 cores + branco.", "Manoel", ["h-cri-02"]),

  // ----- RB (Robótica) -----
  mkAula("c-rb", "RB", 1, "Aula 1 — Introdução à robótica", "O que é robótica, exemplos no cotidiano, componentes básicos.", "Gustavo", ["h-tec-04", "h-com-01"]),
  mkAula("c-rb", "RB", 2, "Aula 2 — Circuitos elétricos", "Tensão, corrente e montagem de circuitos simples em protoboard.", "Gustavo", ["h-tec-04"]),
  mkAula("c-rb", "RB", 3, "Aula 3 — Lógica de programação", "Variáveis, condicionais e laços com blocos visuais.", "Celso", ["h-tec-04", "h-cri-02"]),
  mkAula("c-rb", "RB", 4, "Aula 4 — Sensores e atuadores", "Leitura de sensores e controle de motores/LEDs.", "Celso", ["h-tec-04"]),
  mkAula("c-rb", "RB", 5, "Aula 5 — Projeto final", "Planejamento e construção colaborativa de um robô-protótipo.", "Gustavo", ["h-col-03", "h-cri-02", "h-tec-04"]),
  mkTarefa("c-rb", "RB", 1, "Tarefa 1 — Diagrama de circuito", "Desenhar o esquema do circuito montado em aula.", "Gustavo", ["h-tec-04"]),
  mkTarefa("c-rb", "RB", 2, "Tarefa 2 — Mini-programa", "Escrever em blocos um programa que pisque um LED em padrão SOS.", "Celso", ["h-tec-04", "h-cri-02"]),
];

export const SEED_AGENDAMENTOS: Agendamento[] = [];

