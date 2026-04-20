import type { Atividade, Curso, Habilidade } from "./academic-types";

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
