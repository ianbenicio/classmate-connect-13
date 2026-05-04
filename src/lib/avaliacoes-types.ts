// Tipos da Avaliação da Aula preenchida pelo aluno (substitui o auto-relatório).
// Estrutura: 5 perguntas fechadas sobre a Aula + 5 sobre o Professor (escala 1–5)
// + 2 a 3 perguntas abertas rotativas sorteadas a cada aula
// + área de interesse opcional para a próxima aula.

import type { FormularioTipo } from "./formularios-types";

export type Nota = 1 | 2 | 3 | 4 | 5;

/**
 * Registro genérico de avaliação armazenado no Supabase.
 * Cobre múltiplos tipos: relatorio_prof, checklist_aluno, relatorio_aluno, aula_aluno_legacy.
 */
export interface AvaliacaoRecord<T = unknown> {
  id: string;
  agendamentoId: string | null;
  alunoId: string | null;
  atividadeId: string | null;
  tipo: FormularioTipo | "aula_aluno_legacy";
  dados: T;
  criadoEm: string;
}

/** Perguntas fechadas — Aula */
export const PERGUNTAS_AULA = [
  {
    id: "objetivo",
    emoji: "🎯",
    titulo: "Entendi o objetivo",
    pergunta: "Eu entendi o que a gente ia aprender ou criar hoje?",
  },
  {
    id: "pratica",
    emoji: "🔧",
    titulo: "Mão na massa",
    pergunta: "Consegui fazer algo prático na aula?",
  },
  {
    id: "diversao",
    emoji: "🎮",
    titulo: "Foi divertido?",
    pergunta: "A aula me manteve interessado do começo ao fim?",
  },
  {
    id: "ritmo",
    emoji: "⏱️",
    titulo: "Ritmo da aula",
    pergunta: "O tempo foi bom? Nem corrido, nem parado demais?",
  },
  {
    id: "materiais",
    emoji: "💻",
    titulo: "Materiais funcionaram?",
    pergunta: "Os recursos (software, peças, exemplos) ajudaram?",
  },
] as const;

/** Perguntas fechadas — Professor */
export const PERGUNTAS_PROFESSOR = [
  {
    id: "explica",
    emoji: "💙",
    titulo: "Explica bem",
    pergunta: "O professor explicou de um jeito que eu entendi?",
  },
  {
    id: "ajuda",
    emoji: "🙋",
    titulo: "Ajuda quando travo",
    pergunta: "Quando tive dúvida, o professor me ajudou de um jeito legal?",
  },
  {
    id: "respeito",
    emoji: "🤝",
    titulo: "Respeita todo mundo",
    pergunta: "O professor foi paciente e respeitoso com todos?",
  },
  {
    id: "energia",
    emoji: "⚡",
    titulo: "Deixa a aula animada",
    pergunta: "O professor manteve a energia da aula legal?",
  },
  {
    id: "evolucao",
    emoji: "↩️",
    titulo: "Me ajudou a evoluir",
    pergunta: "Quando errei, o professor me ajudou a melhorar?",
  },
] as const;

export type PerguntaAulaId = (typeof PERGUNTAS_AULA)[number]["id"];
export type PerguntaProfId = (typeof PERGUNTAS_PROFESSOR)[number]["id"];

/** Pool de perguntas abertas rotativas (sorteadas 2–3 por aula). */
export const PERGUNTAS_ABERTAS_AULA = [
  { id: "a_legal", pergunta: "O que foi MAIS legal hoje? 😊" },
  { id: "a_travou", pergunta: "Teve algo que travou ou ficou confuso? 🤔" },
  { id: "a_mudaria", pergunta: "Se você fosse o professor, o que mudaria? 💡" },
  { id: "a_projeto", pergunta: "Como você usaria isso em um projeto seu? 🎨" },
  { id: "a_palavra", pergunta: "Uma palavra para a aula de hoje:" },
] as const;

export const PERGUNTAS_ABERTAS_PROFESSOR = [
  { id: "p_ajudou", pergunta: "O que o professor fez que te ajudou mais hoje? ☀️" },
  { id: "p_ouvido", pergunta: "Teve um momento que você não se sentiu ouvido? Como foi?" },
  { id: "p_dica", pergunta: "O professor deu uma dica que você vai guardar? 💡" },
  { id: "p_erro", pergunta: "Como o professor reagiu quando alguém errou?" },
  { id: "p_recado", pergunta: "Um recadinho rápido para o professor:" },
] as const;

export type AreaInteresse = "design" | "robotica" | "esports" | "ia";

export const AREAS_INTERESSE: { value: AreaInteresse; label: string; emoji: string }[] = [
  { value: "design", label: "Design", emoji: "🎨" },
  { value: "robotica", label: "Robótica", emoji: "🤖" },
  { value: "esports", label: "E-sports", emoji: "🎮" },
  { value: "ia", label: "IA", emoji: "🧠" },
];

export interface RespostaAberta {
  perguntaId: string;
  texto: string;
}

export interface AvaliacaoAula {
  id: string;
  agendamentoId: string;
  alunoId: string;
  turmaId: string;
  cursoId: string;
  professor?: string;
  enviadoEm: string; // ISO
  // Notas — null = "não se aplica / pulou"
  aula: Record<PerguntaAulaId, Nota | null>;
  professor_notas: Record<PerguntaProfId, Nota | null>;
  abertas: RespostaAberta[];
  areaInteresse?: AreaInteresse;
}

/** Hash determinístico estável (string → uint32). */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Sorteio determinístico de perguntas abertas para um par (agendamento, aluno).
 * Garante que reabrir o formulário traga as mesmas perguntas.
 *
 * Pega 2 da Aula + 1 do Professor (3 no total) — equilibra fadiga e cobertura.
 */
export function sortearAbertas(
  agendamentoId: string,
  alunoId: string,
): {
  aula: (typeof PERGUNTAS_ABERTAS_AULA)[number][];
  prof: (typeof PERGUNTAS_ABERTAS_PROFESSOR)[number][];
} {
  const seedAula = hashString(`${agendamentoId}|${alunoId}|aula`);
  const seedProf = hashString(`${agendamentoId}|${alunoId}|prof`);

  const pickN = <T>(arr: readonly T[], seed: number, n: number): T[] => {
    const idxs = arr.map((_, i) => i);
    // Fisher-Yates seedado simples (LCG)
    let s = seed || 1;
    for (let i = idxs.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return idxs.slice(0, n).map((i) => arr[i]);
  };

  return {
    aula: pickN(PERGUNTAS_ABERTAS_AULA, seedAula, 2),
    prof: pickN(PERGUNTAS_ABERTAS_PROFESSOR, seedProf, 1),
  };
}

/** Score 1–5 de um bloco (média das notas não-nulas). */
export function calcScore(notas: Record<string, Nota | null>): number | null {
  const vals = Object.values(notas).filter((n): n is Nota => n !== null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
