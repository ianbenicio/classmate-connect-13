/**
 * Contexto de aplicação de formulários
 * Metadados invisíveis que rastreiam quando e como um formulário foi preenchido
 */

export interface ContextoFormulario {
  /** ID único da aplicação deste formulário */
  id: string;

  /** Identificadores de contexto educacional */
  cursoId: string;
  cursoCodigo?: string;
  cursoNome?: string;

  turmaId: string;
  turmaCodigo?: string;

  /** Se aplicado em um agendamento específico */
  agendamentoId?: string;

  /** Respondente da avaliação */
  respondeuId: string; // userId ou alunoId
  respondeuNome: string;
  respondeuTipo: "aluno" | "professor" | "outro";

  /** Quem aplicou/recolheu o formulário */
  aplicadoPorId: string; // userId do professor/staff
  aplicadoPorNome: string;

  /** Data e hora */
  respondidoEm: string; // ISO timestamp

  /** Localização (opcional) */
  local?: string; // sala, local de aplicação

  /** Tags customizadas para categorização */
  tags?: string[];

  /** Notas adicionais */
  notas?: string;
}

/**
 * Respostas de formulário com contexto
 */
export interface RespostaFormulario {
  id: string;
  formularioId: string;
  formularioSlug: string;

  /** Contexto de aplicação */
  contexto: ContextoFormulario;

  /** Respostas por ID de pergunta */
  respostas: Record<string, unknown>; // JSON das respostas

  /** Metadados técnicos */
  criadoEm: string; // ISO timestamp
  atualizadoEm?: string; // ISO timestamp

  /** Status */
  completo: boolean;
  validado?: boolean;
}

/**
 * Builder para criar contexto de aplicação de forma segura
 */
export class ContextoFormularioBuilder {
  private contexto: ContextoFormulario;

  constructor(
    cursoId: string,
    turmaId: string,
    respondeuId: string,
    respondeuNome: string,
    respondeuTipo: "aluno" | "professor" | "outro",
    aplicadoPorId: string,
    aplicadoPorNome: string
  ) {
    this.contexto = {
      id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cursoId,
      turmaId,
      respondeuId,
      respondeuNome,
      respondeuTipo,
      aplicadoPorId,
      aplicadoPorNome,
      respondidoEm: new Date().toISOString(),
    };
  }

  withAgendamento(agendamentoId: string): this {
    this.contexto.agendamentoId = agendamentoId;
    return this;
  }

  withCursoInfo(codigo: string, nome: string): this {
    this.contexto.cursoCodigo = codigo;
    this.contexto.cursoNome = nome;
    return this;
  }

  withTurmaInfo(codigo: string): this {
    this.contexto.turmaCodigo = codigo;
    return this;
  }

  withLocal(local: string): this {
    this.contexto.local = local;
    return this;
  }

  withTags(tags: string[]): this {
    this.contexto.tags = tags;
    return this;
  }

  withNotas(notas: string): this {
    this.contexto.notas = notas;
    return this;
  }

  build(): ContextoFormulario {
    return this.contexto;
  }
}

/**
 * Função auxiliar para extrair contexto de um agendamento
 */
export async function extrairContextoDeAgendamento(
  agendamentoId: string,
  agendamentos: any[],
  turmas: any[],
  cursos: any[]
): Promise<Partial<ContextoFormulario>> {
  const ag = agendamentos.find((a) => a.id === agendamentoId);
  if (!ag) return {};

  const turma = turmas.find((t) => t.id === ag.turmaId);
  const curso = cursos.find((c) => c.id === ag.cursoId || c.id === turma?.cursoId);

  return {
    agendamentoId,
    cursoId: curso?.id || ag.cursoId,
    cursoCodigo: curso?.cod,
    cursoNome: curso?.nome,
    turmaId: ag.turmaId,
    turmaCodigo: turma?.codigo,
    local: turma?.local || "—",
  };
}
