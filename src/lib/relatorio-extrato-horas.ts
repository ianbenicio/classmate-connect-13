// =====================================================================
// Relatório Extrato de Horas por Professor (Fase B)
// =====================================================================
// Agregação de dados para gerar relatório de horas trabalhadas e avaliadas
// por professor. Apenas inclui aulas concluídas que foram avaliadas.
//
// Dados de entrada: agendamentos, avaliacoes, professores
// Saída: estrutura para renderização em tabela e PDF

import type { Agendamento } from "./academic-types";
import type { Professor } from "./professores-store";
import type { Avaliacao } from "./formularios-types";

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
  professorId?: string;
  avaliacaoStatus: "com_avaliacao" | "sem_avaliacao";
}

/**
 * Agregação de dados por professor.
 */
export interface RelatorioProfessor {
  professorNome: string;
  professorId?: string;
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
  avaliacoes: Avaliacao[],
  professores: Professor[],
  dataInicio?: string,
  dataFim?: string,
): ExtratoHorasPayload {
  // Monta set de agendamentos com avaliações para lookup rápido
  const agendamentosComAvaliacao = new Set<string>();
  for (const av of avaliacoes) {
    if (av.agendamento_id) {
      agendamentosComAvaliacao.add(av.agendamento_id);
    }
  }

  // Filtra agendamentos: concluídos + opcionalmente por data range
  const agendamentosFiltrados = agendamentos.filter((ag) => {
    if (ag.status !== "concluido") return false;
    if (dataInicio && ag.data < dataInicio) return false;
    if (dataFim && ag.data > dataFim) return false;
    return true;
  });

  // Monta mapa de professores por ID para lookup
  const professoresById = new Map<string, Professor>();
  for (const prof of professores) {
    professoresById.set(prof.id, prof);
  }

  // Agrupa classes por professor
  const posProfessor = new Map<string, ClassRecord[]>();

  for (const ag of agendamentosFiltrados) {
    // Só inclui aulas que foram avaliadas
    const temAvaliacao = agendamentosComAvaliacao.has(ag.id);
    if (!temAvaliacao) continue; // Skip unevaluated classes

    // Calcula duração
    const duracaoMin = timeToMinutes(ag.fim) - timeToMinutes(ag.inicio);
    const duracaoHoras = minutesToHours(duracaoMin);

    // Encontra professor: por professor_id (FK) ou professor string (legacy)
    let professorNome = ag.professor || "(sem professor)";
    let professorId: string | undefined = ag.professor_id;

    // Se tem professor_id, tenta carregar nome do objeto Professor
    if (ag.professor_id && professoresById.has(ag.professor_id)) {
      const prof = professoresById.get(ag.professor_id)!;
      professorNome = prof.nome;
    }

    // Cria chave única: prefer professor_id se existe, senão usar nome string
    const chaveProf = professorId || professorNome.toLowerCase();

    // Adiciona à lista deste professor
    const classes = posProfessor.get(chaveProf) ?? [];
    classes.push({
      agendamentoId: ag.id,
      data: ag.data,
      inicio: ag.inicio,
      fim: ag.fim,
      duracaoHoras,
      duracaoMin,
      professorNome,
      professorId,
      avaliacaoStatus: "com_avaliacao",
    });
    posProfessor.set(chaveProf, classes);
  }

  // Constrói array de RelatorioProfessor ordenado por nome
  const relatorioProfessores: RelatorioProfessor[] = [];
  let totalHorasGeral = 0;
  let totalClassesGeral = 0;

  for (const [_chave, classes] of Array.from(posProfessor.entries()).sort(
    ([, a], [, b]) =>
      (a[0]?.professorNome || "").localeCompare(b[0]?.professorNome || ""),
  )) {
    const totalClasses = classes.length;
    const totalHoras = classes.reduce((sum, c) => sum + c.duracaoHoras, 0);

    relatorioProfessores.push({
      professorNome: classes[0].professorNome,
      professorId: classes[0].professorId,
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
