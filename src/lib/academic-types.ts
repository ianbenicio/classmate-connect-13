// Domain types for the academic management system.
// Mirrors the spec: Atividade (parent) -> Aula | Tarefa, plus Habilidade.

export type AtividadeTipo = 0 | 1; // 0 = Aula, 1 = Tarefa

export interface Habilidade {
  id: string;
  sigla: string;
  descricao: string;
  grupo?: string;
}

export interface Curso {
  id: string;
  cod: string;
  nome: string;
  descricao?: string;
}

export interface Turma {
  id: string;
  cursoId: string;
  nome: string;
  cod: string;
  data: string; // ISO date — data de início ou referência da turma
  horario: string; // ex.: "08:00 - 10:00"
  alunosIds: string[];
  descricao?: string;
}

// Registro de presença/avaliação de um aluno em uma aula específica
export interface RegistroAula {
  atividadeId: string; // referencia uma Atividade do tipo 0 (Aula)
  presente: boolean;
  observacao?: string;
}

// Entrega/avaliação de um aluno em uma tarefa
export interface RegistroTrabalho {
  atividadeId: string; // referencia uma Atividade do tipo 1 (Tarefa)
  entregue: boolean;
  nota?: number;
  observacao?: string;
}

export interface Aluno {
  id: string;
  nome: string;
  contato: string; // email/telefone
  cursoId: string;
  turmaId: string;
  habilidadeIds: string[]; // habilidades demonstradas/desenvolvidas
  aulas: RegistroAula[]; // histórico de presença em aulas
  trabalhos: RegistroTrabalho[]; // histórico de entregas
  observacao?: string;
}

// Base shared by Aula and Tarefa
export interface Atividade {
  id: string;
  tipo: AtividadeTipo;
  nome: string;
  codigo: string; // auto: SIGLA_CURSO + GRUPO + sequencial
  cursoId: string;
  grupo: string;
  descricao: string;
  objetivoResultados: string;
  prazo: string; // ISO date
  criadoPor: string;
  habilidadeIds: string[];

  // Aula-only
  descricaoConteudo?: string;
  sugestoesPais?: string;

  // Tarefa-only
  instrucoes?: string;
}
