import {
  formatCodigoAtividade,
  type Agendamento,
  type Aluno,
  type Atividade,
  type Curso,
  type Grupo,
  type Habilidade,
  type Turma,
} from "./academic-types";

// ====================================================================
// CURSOS
// ====================================================================
export const SEED_CURSOS: Curso[] = [
  { id: "c-mp", cod: "MP", nome: "Curso MP", descricao: "Nome do curso a ser definido." },
  { id: "c-gp", cod: "GP", nome: "GamePro", descricao: "Formação completa para cyber atletas e criadores de conteúdo de games." },
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

// ====================================================================
// GRUPOS (Módulos) por curso.
// O `cod` compõe o código da atividade: <CURSO_COD><GRUPO_COD><NN>.
// ====================================================================
export const SEED_GRUPOS: Record<string, Grupo[]> = {
  "c-mp": [{ cod: "GERAL", nome: "Geral" }],
  "c-gp": [
    { cod: "CA", nome: "Canva e Adobe Express" },
    { cod: "FG", nome: "Fundamentos do Game" },
    { cod: "PA", nome: "Pacote Adobe" },
    { cod: "PP", nome: "Pro Player" },
    { cod: "ET", nome: "Estratégias e táticas" },
    { cod: "CH", nome: "Conversação Hard" },
    { cod: "P2", nome: "Pro Player 2" },
    { cod: "IN", nome: "Inglês para Cyber Atletas" },
  ],
  "c-ad": [{ cod: "GERAL", nome: "Geral" }],
  "c-rb": [{ cod: "GERAL", nome: "Geral" }],
};

// ====================================================================
// ATIVIDADES — catálogo de Aulas (tipo 0) e Tarefas (tipo 1) por curso.
// Códigos no formato <CURSO_COD><GRUPO_COD><NN> (ex.: GPCA01, MPGERAL01).
// Professor não é definido aqui — é atribuído ao agendar.
// ====================================================================

function mkAula(
  cursoId: string,
  cursoCod: string,
  grupoCod: string,
  seq: number,
  nome: string,
  conteudo: string,
  habilidadeIds: string[] = [],
): Atividade {
  return {
    id: `at-${cursoCod.toLowerCase()}-${grupoCod.toLowerCase()}-aula-${String(seq).padStart(2, "0")}`,
    tipo: 0,
    nome,
    codigo: formatCodigoAtividade(cursoCod, grupoCod, seq),
    cursoId,
    grupo: grupoCod,
    descricao: conteudo,
    objetivoResultados: `Ao final, o aluno deve compreender: ${nome}.`,
    prazo: "2026-12-31",
    criadoPor: "Admin",
    professor: "",
    habilidadeIds,
    descricaoConteudo: conteudo,
    sugestoesPais: "Reforçar o conteúdo em casa com perguntas abertas.",
  };
}

function mkTarefa(
  cursoId: string,
  cursoCod: string,
  grupoCod: string,
  seq: number,
  nome: string,
  instrucoes: string,
  habilidadeIds: string[] = [],
): Atividade {
  return {
    id: `at-${cursoCod.toLowerCase()}-${grupoCod.toLowerCase()}-tarefa-${String(seq).padStart(2, "0")}`,
    tipo: 1,
    nome,
    codigo: formatCodigoAtividade(cursoCod, grupoCod, seq),
    cursoId,
    grupo: grupoCod,
    descricao: instrucoes,
    objetivoResultados: `Praticar e consolidar o conteúdo: ${nome}.`,
    prazo: "2026-12-31",
    criadoPor: "Admin",
    professor: "",
    habilidadeIds,
    instrucoes,
  };
}

export const SEED_ATIVIDADES: Atividade[] = [
  // ----- MP (Música/Performance) — placeholder até receber a planilha -----
  mkAula("c-mp", "MP", "GERAL", 1, "Aula 1 — Boas-vindas e diagnóstico", "Apresentação do curso, expectativas e avaliação inicial dos alunos.", ["h-com-01"]),
  mkAula("c-mp", "MP", "GERAL", 2, "Aula 2 — Fundamentos rítmicos", "Pulso, tempo e subdivisões. Exercícios práticos de percussão corporal.", ["h-tec-04"]),
  mkAula("c-mp", "MP", "GERAL", 3, "Aula 3 — Leitura básica", "Introdução à leitura de partitura: claves, figuras e pausas.", ["h-tec-04", "h-cri-02"]),
  mkAula("c-mp", "MP", "GERAL", 4, "Aula 4 — Escalas maiores", "Construção e prática de escalas maiores em diferentes tonalidades.", ["h-tec-04"]),
  mkAula("c-mp", "MP", "GERAL", 5, "Aula 5 — Performance em grupo", "Ensaio coletivo focado em escuta e entrosamento.", ["h-col-03", "h-com-01"]),

  // ----- GP (GamePro) — 48 aulas em 8 módulos (planilha Aulas_GamePro.xlsx) -----
  // CA — Canva e Adobe Express
  mkAula("c-gp", "GP", "CA", 1, "Visão geral do design gráfico", "Visão geral do design gráfico aplicada ao mundo dos games."),
  mkAula("c-gp", "GP", "CA", 2, "Ferramentas de apoio ao designer", "Ferramentas de apoio ao designer: paletas, fontes, mockups."),
  mkAula("c-gp", "GP", "CA", 3, "Inteligências Artificiais no Design", "Uso de IAs no fluxo de criação visual."),
  mkAula("c-gp", "GP", "CA", 4, "Canva do básico ao avançado", "Canva: do básico ao avançado, com foco em peças para games."),
  mkAula("c-gp", "GP", "CA", 5, "Adobe express do básico ao avançado", "Adobe Express: edição rápida e templates."),
  mkAula("c-gp", "GP", "CA", 6, "Revisão de conteúdo e prova final", "Revisão geral do módulo e prova final."),
  // FG — Fundamentos do Game
  mkAula("c-gp", "GP", "FG", 1, "Visão geral e conceitos básicos sobre o game", "Visão geral e conceitos básicos sobre o game."),
  mkAula("c-gp", "GP", "FG", 2, "Classes e subclasses de cada personagem", "Classes e subclasses de cada personagem."),
  mkAula("c-gp", "GP", "FG", 3, "Melhor uso de cada skill", "Melhor uso de cada skill em diferentes cenários."),
  mkAula("c-gp", "GP", "FG", 4, "Armas/skill e utilitários", "Armas, skills e utilitários do jogo."),
  mkAula("c-gp", "GP", "FG", 5, "Função de cada classe", "Função de cada classe na composição do time."),
  mkAula("c-gp", "GP", "FG", 6, "Conhecendo os mapas", "Conhecendo os mapas: callouts, rotações e pontos-chave."),
  // PA — Pacote Adobe
  mkAula("c-gp", "GP", "PA", 1, "Ferramentas e layout Adobe", "Visão geral das ferramentas e layout do Pacote Adobe."),
  mkAula("c-gp", "GP", "PA", 2, "Photoshop do básico ao avançado", "Photoshop: do básico ao avançado."),
  mkAula("c-gp", "GP", "PA", 3, "Illustrator do básico ao avançado", "Illustrator: do básico ao avançado."),
  mkAula("c-gp", "GP", "PA", 4, "PREMIER do básico ao avançado", "Premiere: do básico ao avançado."),
  mkAula("c-gp", "GP", "PA", 5, "AFTER EFFECTS do básico ao avançado", "After Effects: do básico ao avançado."),
  mkAula("c-gp", "GP", "PA", 6, "Criação de Highlights - After + Premiere", "Criação de Highlights combinando After Effects e Premiere."),
  // PP — Pro Player
  mkAula("c-gp", "GP", "PP", 1, "Conceito básico de movimentação", "Conceito básico de movimentação."),
  mkAula("c-gp", "GP", "PP", 2, "Técnicas de movimentação avançadas", "Técnicas de movimentação avançadas."),
  mkAula("c-gp", "GP", "PP", 3, "Usando o mapa a seu favor", "Como usar o mapa a seu favor."),
  mkAula("c-gp", "GP", "PP", 4, "Técnicas de tiro", "Técnicas de tiro."),
  mkAula("c-gp", "GP", "PP", 5, "Movimentação e disparo simultâneos", "Movimentação e disparo simultâneos."),
  mkAula("c-gp", "GP", "PP", 6, "Competição, aplicando técnicas", "Competição: aplicando todas as técnicas em situação real."),
  // ET — Estratégias e táticas
  mkAula("c-gp", "GP", "ET", 1, "Estrategias competitivas", "Estratégias competitivas para times."),
  mkAula("c-gp", "GP", "ET", 2, "Análise de partidas", "Análise de partidas próprias e de profissionais."),
  mkAula("c-gp", "GP", "ET", 3, "Respostas táticas", "Respostas táticas a diferentes composições adversárias."),
  mkAula("c-gp", "GP", "ET", 4, "Ritmo de jogo", "Ritmo de jogo: quando pressionar e quando recuar."),
  mkAula("c-gp", "GP", "ET", 5, "Análise comportamental", "Análise comportamental de adversários e do próprio time."),
  mkAula("c-gp", "GP", "ET", 6, "Prova final", "Prova final do módulo."),
  // CH — Conversação Hard
  mkAula("c-gp", "GP", "CH", 1, "Linguagem formal", "Linguagem formal aplicada a entrevistas e patrocinadores."),
  mkAula("c-gp", "GP", "CH", 2, "Expressões cotidianas", "Expressões cotidianas em ambiente competitivo."),
  mkAula("c-gp", "GP", "CH", 3, "Conversação 2", "Conversação avançada — nível 2."),
  mkAula("c-gp", "GP", "CH", 4, "Feedforward", "Feedforward: comunicar antecipadamente o que se espera."),
  mkAula("c-gp", "GP", "CH", 5, "Gameplay", "Comunicação durante o gameplay."),
  mkAula("c-gp", "GP", "CH", 6, "Prova prática", "Prova prática do módulo."),
  // P2 — Pro Player 2
  mkAula("c-gp", "GP", "P2", 1, "Rotações", "Rotações entre posições e áreas do mapa."),
  mkAula("c-gp", "GP", "P2", 2, "Jogadas reativas", "Jogadas reativas: ler e responder."),
  mkAula("c-gp", "GP", "P2", 3, "Jogadas de início", "Jogadas de início de round/partida."),
  mkAula("c-gp", "GP", "P2", 4, "Tempo de skills", "Gerenciamento de tempo de skills e cooldowns."),
  mkAula("c-gp", "GP", "P2", 5, "Aplicação prática 1", "Aplicação prática — parte 1."),
  mkAula("c-gp", "GP", "P2", 6, "Aplicação prática 2", "Aplicação prática — parte 2."),
  // IN — Inglês para Cyber Atletas
  mkAula("c-gp", "GP", "IN", 1, "Termos usados nos games", "Termos em inglês usados nos games."),
  mkAula("c-gp", "GP", "IN", 2, "Indução e dedução", "Indução e dedução em conversas técnicas."),
  mkAula("c-gp", "GP", "IN", 3, "Simplificando Frases", "Simplificando frases para comunicação rápida."),
  mkAula("c-gp", "GP", "IN", 4, "Comunicação competitiva", "Comunicação competitiva em inglês."),
  mkAula("c-gp", "GP", "IN", 5, "Conversação 1", "Conversação — nível 1."),
  mkAula("c-gp", "GP", "IN", 6, "Prova prática", "Prova prática do módulo."),

  // ----- AD (Artes/Desenho) — placeholder -----
  mkAula("c-ad", "AD", "GERAL", 1, "Aula 1 — Linha e forma", "Exercícios de observação: linha contínua, contorno e silhueta.", ["h-cri-02"]),
  mkAula("c-ad", "AD", "GERAL", 2, "Aula 2 — Luz e sombra", "Estudo de valores tonais com lápis grafite.", ["h-cri-02", "h-tec-04"]),
  mkAula("c-ad", "AD", "GERAL", 3, "Aula 3 — Composição", "Regras de composição visual: terços, equilíbrio e foco.", ["h-cri-02"]),
  mkAula("c-ad", "AD", "GERAL", 4, "Aula 4 — Cor", "Teoria das cores e paletas harmônicas.", ["h-cri-02", "h-tec-04"]),
  mkTarefa("c-ad", "AD", "GERAL", 1, "Tarefa 1 — Estudo de objeto", "Desenhar um objeto do cotidiano aplicando luz e sombra.", ["h-cri-02"]),
  mkTarefa("c-ad", "AD", "GERAL", 2, "Tarefa 2 — Paleta limitada", "Compor uma cena usando apenas 3 cores + branco.", ["h-cri-02"]),

  // ----- RB (Robótica) — placeholder -----
  mkAula("c-rb", "RB", "GERAL", 1, "Aula 1 — Introdução à robótica", "O que é robótica, exemplos no cotidiano, componentes básicos.", ["h-tec-04", "h-com-01"]),
  mkAula("c-rb", "RB", "GERAL", 2, "Aula 2 — Circuitos elétricos", "Tensão, corrente e montagem de circuitos simples em protoboard.", ["h-tec-04"]),
  mkAula("c-rb", "RB", "GERAL", 3, "Aula 3 — Lógica de programação", "Variáveis, condicionais e laços com blocos visuais.", ["h-tec-04", "h-cri-02"]),
  mkAula("c-rb", "RB", "GERAL", 4, "Aula 4 — Sensores e atuadores", "Leitura de sensores e controle de motores/LEDs.", ["h-tec-04"]),
  mkAula("c-rb", "RB", "GERAL", 5, "Aula 5 — Projeto final", "Planejamento e construção colaborativa de um robô-protótipo.", ["h-col-03", "h-cri-02", "h-tec-04"]),
  mkTarefa("c-rb", "RB", "GERAL", 1, "Tarefa 1 — Diagrama de circuito", "Desenhar o esquema do circuito montado em aula.", ["h-tec-04"]),
  mkTarefa("c-rb", "RB", "GERAL", 2, "Tarefa 2 — Mini-programa", "Escrever em blocos um programa que pisque um LED em padrão SOS.", ["h-tec-04", "h-cri-02"]),
];

export const SEED_AGENDAMENTOS: Agendamento[] = [];
