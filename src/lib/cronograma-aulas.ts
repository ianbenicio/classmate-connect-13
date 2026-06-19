import type { Agendamento, Atividade, Turma } from "./academic-types";
import { diaSemanaFromDate } from "./academic-types";

export type CronogramaAulaStatus = "livre" | "agendada" | "finalizada";

export interface CronogramaActor {
  userId?: string;
  nome?: string;
}

export function getAgendamentosDaAula(
  agendamentos: Agendamento[],
  turmaId: string,
  atividadeId: string,
): Agendamento[] {
  return agendamentos
    .filter((agendamento) => agendamento.turmaId === turmaId)
    .filter((agendamento) => agendamento.atividadeIds.includes(atividadeId))
    .sort((a, b) => `${b.data} ${b.inicio}`.localeCompare(`${a.data} ${a.inicio}`));
}

export function getStatusCronogramaAula(agendamentos: Agendamento[]): CronogramaAulaStatus {
  if (agendamentos.some((agendamento) => agendamento.status === "concluido")) {
    return "finalizada";
  }
  if (agendamentos.length > 0) return "agendada";
  return "livre";
}

export function getAgendamentoReferenciaCronograma(
  agendamentos: Agendamento[],
): Agendamento | undefined {
  return agendamentos.find((agendamento) => agendamento.status === "concluido") ?? agendamentos[0];
}

export function buildAgendamentoCoordenacao({
  atividade,
  turma,
  status,
  actor,
  now = new Date(),
}: {
  atividade: Atividade;
  turma: Turma;
  status: Exclude<CronogramaAulaStatus, "livre">;
  actor: CronogramaActor;
  now?: Date;
}): Agendamento {
  const slot = turma.horarios[0];
  const data = turma.data || toLocalIsoDate(now);
  const timestamp = now.toISOString();

  return {
    id: crypto.randomUUID(),
    turmaId: turma.id,
    data,
    diaSemana: slot?.diaSemana ?? diaSemanaFromDate(now),
    inicio: slot?.inicio ?? "00:00",
    fim: slot?.fim ?? "00:00",
    slotInicio: slot?.inicio,
    slotFim: slot?.fim,
    blocoIndex: 0,
    blocosTotal: 1,
    atividadeIds: [atividade.id],
    habilidadeIds: atividade.habilidadeIds.length > 0 ? atividade.habilidadeIds : undefined,
    status: status === "finalizada" ? "concluido" : "pendente",
    concluidoEm: status === "finalizada" ? timestamp : undefined,
    criadoEm: timestamp,
    observacao: "Status definido manualmente pela coordenacao no cronograma de aulas.",
    professor: "Coordenacao",
    professorUserId: undefined,
    criadoPorUserId: actor.userId,
    criadoPorNome: actor.nome,
    origem: "coordenacao",
    requisitosDispensados: true,
    statusDefinidoPorUserId: actor.userId,
    statusDefinidoPorNome: actor.nome,
    statusDefinidoEm: timestamp,
  };
}

export function buildPatchStatusCoordenacao({
  atividade,
  status,
  actor,
  now = new Date(),
}: {
  atividade: Atividade;
  status: Exclude<CronogramaAulaStatus, "livre">;
  actor: CronogramaActor;
  now?: Date;
}): Partial<Agendamento> {
  const timestamp = now.toISOString();
  return {
    habilidadeIds: atividade.habilidadeIds.length > 0 ? atividade.habilidadeIds : undefined,
    status: status === "finalizada" ? "concluido" : "pendente",
    concluidoEm: status === "finalizada" ? timestamp : undefined,
    observacao: "Status definido manualmente pela coordenacao no cronograma de aulas.",
    professor: "Coordenacao",
    professorUserId: undefined,
    origem: "coordenacao",
    requisitosDispensados: true,
    statusDefinidoPorUserId: actor.userId,
    statusDefinidoPorNome: actor.nome,
    statusDefinidoEm: timestamp,
  };
}

function toLocalIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
