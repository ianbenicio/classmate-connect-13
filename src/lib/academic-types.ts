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
