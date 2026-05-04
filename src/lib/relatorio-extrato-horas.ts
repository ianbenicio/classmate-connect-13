// =====================================================================
// Relatório Extrato de Horas por Professor (Fase B)
// =====================================================================
// Agregação de dados para gerar relatório de horas trabalhadas e avaliadas
// por professor. Apenas inclui aulas concluídas que foram avaliadas.
//
// Dados de entrada: agendamentos, avaliacoes, professores
// Saída: estrutura para renderização em tabela e PDF

import type { Agendamento } from "./academic-types";
import type { UserRow } from "./users-store";
import type { AvaliacaoRecord } from "./avaliacoes-types";

/**
 * Registro de uma aula individual no relatório.
 */
export interface ClassRecord {
  agendamentoId: string;
  data: string; // YYYY-MM-DD
  inicio: string; // HH:MM
  fim: string; // HH:MM
  duracaoHoras: number; // Decimal hours (ex: 1.5)
  duracaoMin: number; // For calculations
  professorNome: string;
  /** UserId do professor (auth.users). Substitui antigo professorId. */
  professorUserId?: string;
  avaliacaoStatus: "com_avaliacao" | "sem_avaliacao";
}

/**
 * Agregação de dados por professor.
 */
export interface RelatorioProfessor {
  professorNome: string;
  /** UserId do professor (auth.users). */
  professorUserId?: string;
  totalClasses: number;
  totalHoras: number;
  classesAvaliadas: number;
  classesAvaliadas_: number; // sem avaliacao (for verification)
  classes: ClassRecord[];
}

/**
 * Payload completo do relatório.
 */
export interface ExtratoHorasPayload {
  geradoEm: string; // ISO timestamp
  dataInicio?: string; // YYYY-MM-DD (optional filter)
  dataFim?: string; // YYYY-MM-DD (optional filter)
  totalProfessores: number;
  totalClasses: number;
  totalHoras: number;
  professores: RelatorioProfessor[];
}

/**
 * Converte tempo "HH:MM" para minutos.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Converte minutos para horas decimais (ex: 90 min = 1.5 h).
 */
function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Gera relatório de extrato de horas por professor.
 *
 * @param agendamentos Lista de todos os agendamentos
 * @param avaliacoes Lista de todas as avaliações
 * @param professores Lista de todos os professores (para lookup por ID)
 * @param dataInicio Filtro opcional: data mínima (YYYY-MM-DD)
 * @param dataFim Filtro opcional: data máxima (YYYY-MM-DD)
 * @returns Estrutura pronta para renderização
 */
export function gerarExtratoHoras(
  agendamentos: Agendamento[],
  avaliacoes: AvaliacaoRecord[],
  professores: UserRow[],
  dataInicio?: string,
  dataFim?: string,
): ExtratoHorasPayload {
  // Monta set de agendamentos com relatório do professor para lookup rápido.
  // Considera "avaliado" apenas quando o professor enviou o relatorio_prof —
  // checklists/relatórios de aluno não contam como avaliação da aula.
  const agendamentosComAvaliacao = new Set<string>();
  for (const av of avaliacoes) {
    if (av.tipo !== "relatorio_prof") continue;
    if (av.agendamentoId) {
      agendamentosComAvaliacao.add(av.agendamentoId);
    }
  }

  // Filtra agendamentos: concluídos + opcionalmente por data range
  const agendamentosFiltrados = agendamentos.filter((ag) => {
    if (ag.status !== "concluido") return false;
    if (dataInicio && ag.data < dataInicio) return false;
    if (dataFim && ag.data > dataFim) return false;
    return true;
  });

  // Mapa de users (professores) por userId para lookup
  const usersByUserId = new Map<string, UserRow>();
  for (const u of professores) {
    usersByUserId.set(u.userId, u);
  }

  // Agrupa classes por professor
  const posProfessor = new Map<string, ClassRecord[]>();

  let agendamentosProcessados = 0;
  let agendamentosSemAvaliacao = 0;
  let agendamentosSemProfessor = 0;

  for (const ag of agendamentosFiltrados) {
    const temAvaliacao = agendamentosComAvaliacao.has(ag.id);
    if (!temAvaliacao) {
      agendamentosSemAvaliacao++;
      continue;
    }

    agendamentosProcessados++;
    const duracaoMin = timeToMinutes(ag.fim) - timeToMinutes(ag.inicio);
    const duracaoHoras = minutesToHours(duracaoMin);

    // Fase 8: prioriza professorUserId (FK direta para auth.users).
    // Fallback para nome string em agendamentos legados.
    let professorNome = ag.professor || "(sem professor)";
    const professorUserId: string | undefined = ag.professorUserId;

    if (!ag.professorUserId && !ag.professor) {
      agendamentosSemProfessor++;
    }

    if (ag.professorUserId && usersByUserId.has(ag.professorUserId)) {
      const u = usersByUserId.get(ag.professorUserId)!;
      professorNome = u.displayName;
    }

    const chaveProf = professorUserId || professorNome.toLowerCase();

    const classes = posProfessor.get(chaveProf) ?? [];
    classes.push({
      agendamentoId: ag.id,
      data: ag.data,
      inicio: ag.inicio,
      fim: ag.fim,
      duracaoHoras,
      duracaoMin,
      professorNome,
      professorUserId,
      avaliacaoStatus: "com_avaliacao",
    });
    posProfessor.set(chaveProf, classes);
  }

  // Constrói array de RelatorioProfessor ordenado por nome
  const relatorioProfessores: RelatorioProfessor[] = [];
  let totalHorasGeral = 0;
  let totalClassesGeral = 0;

  for (const [_chave, classes] of Array.from(posProfessor.entries()).sort(([, a], [, b]) =>
    (a[0]?.professorNome || "").localeCompare(b[0]?.professorNome || ""),
  )) {
    const totalClasses = classes.length;
    const totalHoras = classes.reduce((sum, c) => sum + c.duracaoHoras, 0);

    relatorioProfessores.push({
      professorNome: classes[0].professorNome,
      professorUserId: classes[0].professorUserId,
      totalClasses,
      totalHoras: Math.round(totalHoras * 100) / 100, // Round to 2 decimals
      classesAvaliadas: classes.filter((c) => c.avaliacaoStatus === "com_avaliacao").length,
      classesAvaliadas_: classes.filter((c) => c.avaliacaoStatus === "sem_avaliacao").length,
      classes: classes.sort((a, b) => a.data.localeCompare(b.data)), // Sort by date
    });

    totalHorasGeral += totalHoras;
    totalClassesGeral += totalClasses;
  }

  return {
    geradoEm: new Date().toISOString(),
    dataInicio,
    dataFim,
    totalProfessores: relatorioProfessores.length,
    totalClasses: totalClassesGeral,
    totalHoras: Math.round(totalHorasGeral * 100) / 100,
    professores: relatorioProfessores,
  };
}

/**
 * Formata um número de horas para exibição (ex: 1.5 -> "1h 30m" ou "1,5 h").
 */
export function formatarHoras(horas: number, formato: "decimal" | "verbal" = "decimal"): string {
  if (formato === "decimal") {
    return `${horas}h`;
  }

  const inteiros = Math.floor(horas);
  const minutos = Math.round((horas - inteiros) * 60);
  if (minutos === 0) return `${inteiros}h`;
  return `${inteiros}h ${minutos}m`;
}
