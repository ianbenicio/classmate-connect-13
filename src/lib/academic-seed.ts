import type { Aluno, Atividade, Curso, Habilidade, Turma } from "./academic-types";

export const SEED_ALUNOS: Aluno[] = [
  {
    id: "al-001",
    nome: "Maria Silva",
    contato: "maria.silva@email.com",
    cursoId: "c-dsg",
    turmaId: "t-dsg-2026a",
    habilidadeIds: ["h-cri-02", "h-com-01"],
    aulas: [{ atividadeId: "a-001", presente: true }],
    trabalhos: [{ atividadeId: "a-002", entregue: true, nota: 8.5 }],
    observacao: "Demonstra forte interesse por tipografia.",
  },
  {
    id: "al-002",
    nome: "João Pereira",
    contato: "joao.pereira@email.com",
    cursoId: "c-dsg",
    turmaId: "t-dsg-2026a",
    habilidadeIds: ["h-tec-04"],
    aulas: [{ atividadeId: "a-001", presente: false, observacao: "Atestado médico" }],
    trabalhos: [],
  },
  {
    id: "al-003",
    nome: "Ana Costa",
    contato: "ana.costa@email.com",
    cursoId: "c-inf",
    turmaId: "t-inf-2026a",
    habilidadeIds: ["h-col-03"],
    aulas: [{ atividadeId: "a-003", presente: true }],
    trabalhos: [],
  },
];

export const SEED_TURMAS: Turma[] = [
  {
    id: "t-dsg-2026a",
    cursoId: "c-dsg",
    nome: "Design 2026/A",
    cod: "DSG-26A",
    data: "2026-02-03",
    horario: "08:00 - 10:00",
    alunosIds: ["al-001", "al-002"],
    descricao: "Turma matutina",
  },
  {
    id: "t-dsg-2026b",
    cursoId: "c-dsg",
    nome: "Design 2026/B",
    cod: "DSG-26B",
    data: "2026-02-03",
    horario: "14:00 - 16:00",
    alunosIds: [],
    descricao: "Turma vespertina",
  },
  {
    id: "t-inf-2026a",
    cursoId: "c-inf",
    nome: "Informática 2026/A",
    cod: "INF-26A",
    data: "2026-02-04",
    horario: "10:00 - 12:00",
    alunosIds: ["al-003"],
  },
  {
    id: "t-gam-2026a",
    cursoId: "c-gam",
    nome: "Games 2026/A",
    cod: "GAM-26A",
    data: "2026-02-05",
    horario: "19:00 - 21:00",
    alunosIds: [],
  },
];

export const SEED_CURSOS: Curso[] = [
  {
    id: "c-dsg",
    cod: "DSG",
    nome: "Design",
    descricao:
      "Curso voltado à formação de competências em design visual, identidade de marca e interfaces digitais.",
  },
  {
    id: "c-inf",
    cod: "INF",
    nome: "Informática",
    descricao:
      "Fundamentos de computação, lógica de programação e uso produtivo de ferramentas digitais.",
  },
  {
    id: "c-gam",
    cod: "GAM",
    nome: "Games",
    descricao:
      "Universo dos jogos eletrônicos: e-sports, design de jogos e cultura gamer aplicada à educação.",
  },
];

export const SEED_GRUPOS: Record<string, string[]> = {
  "c-dsg": ["Design UI", "Identidade Visual"],
  "c-inf": ["Informática Básica", "Lógica de Programação"],
  "c-gam": ["E-sports", "Game Design"],
};

export const SEED_HABILIDADES: Habilidade[] = [
  {
    id: "h-com-01",
    sigla: "COM-01",
    descricao:
      "Comunicação clara: capacidade de expressar ideias de forma objetiva. Avaliar pela coerência da apresentação e clareza nas respostas.",
    grupo: "Socioemocional",
  },
  {
    id: "h-cri-02",
    sigla: "CRI-02",
    descricao:
      "Criatividade aplicada: gerar soluções originais para problemas propostos. Identificar pela diversidade de abordagens.",
    grupo: "Cognitivo",
  },
  {
    id: "h-col-03",
    sigla: "COL-03",
    descricao:
      "Colaboração em equipe: trabalhar coletivamente respeitando opiniões. Avaliar pela participação ativa em dinâmicas.",
    grupo: "Socioemocional",
  },
  {
    id: "h-tec-04",
    sigla: "TEC-04",
    descricao:
      "Domínio técnico de ferramentas digitais. Avaliar pela execução de tarefas práticas no software.",
    grupo: "Técnico",
  },
];

export const SEED_ATIVIDADES: Atividade[] = [
  {
    id: "a-001",
    tipo: 0,
    nome: "Introdução ao Photoshop",
    codigo: "DSG-UI-001",
    cursoId: "c-dsg",
    grupo: "Design UI",
    descricao: "Primeira aula sobre ferramentas de imagem.",
    objetivoResultados: "Aluno deve reconhecer a interface e camadas.",
    prazo: "2026-05-10",
    criadoPor: "Prof. Ana",
    habilidadeIds: ["h-tec-04", "h-cri-02"],
    turmaIds: ["t-dsg-2026a"],
    descricaoConteudo: "Camadas, máscaras, atalhos básicos.",
    sugestoesPais: "Incentivar prática em casa por 15 min/dia.",
  },
  {
    id: "a-002",
    tipo: 1,
    nome: "Cartaz temático",
    codigo: "DSG-UI-002",
    cursoId: "c-dsg",
    grupo: "Design UI",
    descricao: "Tarefa prática de composição visual.",
    objetivoResultados: "Entregar cartaz aplicando hierarquia tipográfica.",
    prazo: "2026-05-20",
    criadoPor: "Prof. Ana",
    habilidadeIds: ["h-cri-02", "h-com-01"],
    turmaIds: ["t-dsg-2026a", "t-dsg-2026b"],
    instrucoes: "Tamanho A3, mínimo 3 elementos hierárquicos, entregar em PDF.",
  },
  {
    id: "a-003",
    tipo: 0,
    nome: "Lógica com fluxogramas",
    codigo: "INF-LP-001",
    cursoId: "c-inf",
    grupo: "Lógica de Programação",
    descricao: "Aula introdutória sobre raciocínio algorítmico.",
    objetivoResultados: "Construir fluxogramas simples para problemas do cotidiano.",
    prazo: "2026-05-12",
    criadoPor: "Prof. Bruno",
    habilidadeIds: ["h-com-01", "h-col-03"],
    descricaoConteudo: "Estruturas sequenciais, condicionais e repetição.",
    sugestoesPais: "Propor pequenos desafios lógicos em casa.",
  },
];
