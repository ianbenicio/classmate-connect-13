// Tipos das respostas dos formulários SIAA salvos em `avaliacoes.dados` (jsonb).
// Cada formulário usa um `tipo` distinto na coluna `avaliacoes.tipo`.

export type Nota1a5 = 1 | 2 | 3 | 4 | 5;

// =====================================================================
// 1) RELATÓRIO DO PROFESSOR — preenchido pelo prof após a aula
// avaliacoes.tipo = 'relatorio_prof'
// =====================================================================
export interface RelatorioProfessorDados {
  /** Resumo do que foi feito na aula. */
  resumo: string;
  /** Engajamento médio da turma (1-5). */
  engajamentoTurma: Nota1a5 | null;
  /** Cumprimento do plano de aula (1-5). */
  cumprimentoPlano: Nota1a5 | null;
  /** O que funcionou bem (texto livre). */
  destaques?: string;
  /** Pontos de atenção / dificuldades (texto livre). */
  dificuldades?: string;
  /** Sugestões para próxima aula. */
  sugestoes?: string;
  /** Chamada — alunoId → presente. */
  presencas: Record<string, boolean>;
}

// =====================================================================
// 2) CHECKLIST INDIVIDUAL DO ALUNO — 1 por aluno preenchido pelo prof
// avaliacoes.tipo = 'checklist_aluno'
// =====================================================================
export interface ChecklistAlunoDados {
  /** Nota por habilidade (1-5). habilidadeId → nota. */
  habilidadesNotas: Record<string, Nota1a5>;
  /** Tags de comportamento (multi-select). */
  comportamento: ComportamentoTag[];
  /** Engajamento individual (1-5). */
  engajamento: Nota1a5 | null;
  /** Observação livre do professor sobre o aluno na aula. */
  observacao?: string;
}

export type ComportamentoTag =
  | "participativo"
  | "colaborativo"
  | "concentrado"
  | "criativo"
  | "lider"
  | "disperso"
  | "agitado"
  | "tímido"
  | "ausente"
  | "frustrado";

export const COMPORTAMENTO_TAGS: { value: ComportamentoTag; label: string; emoji: string; tom: "pos" | "neg" }[] = [
  { value: "participativo", label: "Participativo", emoji: "🙋", tom: "pos" },
  { value: "colaborativo", label: "Colaborativo", emoji: "🤝", tom: "pos" },
  { value: "concentrado", label: "Concentrado", emoji: "🎯", tom: "pos" },
  { value: "criativo", label: "Criativo", emoji: "💡", tom: "pos" },
  { value: "lider", label: "Liderança", emoji: "⭐", tom: "pos" },
  { value: "disperso", label: "Disperso", emoji: "🌀", tom: "neg" },
  { value: "agitado", label: "Agitado", emoji: "⚡", tom: "neg" },
  { value: "tímido", label: "Tímido", emoji: "🙊", tom: "neg" },
  { value: "ausente", label: "Apático", emoji: "😶", tom: "neg" },
  { value: "frustrado", label: "Frustrado", emoji: "😤", tom: "neg" },
];

// =====================================================================
// 3) RELATÓRIO DO ALUNO — preenchido pelo aluno após a aula (substitui o antigo)
// avaliacoes.tipo = 'relatorio_aluno'
// =====================================================================
export interface RelatorioAlunoDados {
  /** Validação do conteúdo: aluno entendeu a aula? (1-5) */
  entendeuConteudo: Nota1a5 | null;
  /** Bloco 1 — A aula. */
  aula: {
    interessante: Nota1a5 | null;
    ritmoBom: Nota1a5 | null;
    materiaisOk: Nota1a5 | null;
  };
  /** Bloco 2 — O professor. */
  professor: {
    explicaBem: Nota1a5 | null;
    ajudaQuandoTrava: Nota1a5 | null;
    respeito: Nota1a5 | null;
  };
  /** Bloco 3 — Você na aula. */
  euNaAula: {
    participei: Nota1a5 | null;
    aprendiAlgoNovo: Nota1a5 | null;
  };
  /** Bloco 4 — Aberta. */
  destaqueDoDia?: string;
  oQueMudaria?: string;
}

// =====================================================================
// FONTES DE COMPORTAMENTO (helpers UI)
// =====================================================================
export type FormularioTipo = "relatorio_prof" | "checklist_aluno" | "relatorio_aluno";

export const FORMULARIO_LABELS: Record<FormularioTipo, { titulo: string; emoji: string; descricao: string }> = {
  relatorio_prof: {
    titulo: "Relatório da aula (professor)",
    emoji: "📋",
    descricao: "Chamada + avaliação geral da aula e da turma.",
  },
  checklist_aluno: {
    titulo: "Checklist individual",
    emoji: "✅",
    descricao: "Avaliação por aluno: habilidades, comportamento, engajamento.",
  },
  relatorio_aluno: {
    titulo: "Como foi sua aula?",
    emoji: "✨",
    descricao: "Sua opinião sobre a aula de hoje.",
  },
};
