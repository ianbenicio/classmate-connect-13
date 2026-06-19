import type { Agendamento, Atividade, Turma } from "./academic-types";
import { diaSemanaFromDate } from "./academic-types";
import { toUuid } from "./db-mapping";

export type CronogramaAulaStatus = "livre" | "agendada" | "finalizada";

export interface CronogramaActor {
  userId?: string;
  nome?: string;
}

export interface StatusAulasTurma {
  aulasConcluidasIds: Set<string>;
  aulasAgendadasIds: Set<string>;
  aulasIndisponiveisIds: Set<string>;
}

export function idsEquivalentes(a: string | undefined | null, b: string | undefined | null) {
  if (!a || !b) return false;
  return a === b || toUuid(a) === toUuid(b);
}

export function agendamentoPertenceATurma(agendamento: Agendamento, turmaId: string): boolean {
  return idsEquivalentes(agendamento.turmaId, turmaId);
}

export function agendamentoContemAtividade(agendamento: Agendamento, atividadeId: string): boolean {
  return agendamento.atividadeIds.some((id) => idsEquivalentes(id, atividadeId));
}

function isAgendamentoCancelado(agendamento: Agendamento): boolean {
  return String(agendamento.status) === "cancelado";
}

function resolveAtividadeId(atividadeIdsReferencia: string[], atividadeId: string): string {
  return atividadeIdsReferencia.find((id) => idsEquivalentes(id, atividadeId)) ?? atividadeId;
}

export function getStatusAulasDaTurma(
  agendamentos: Agendamento[],
  turmaId: string | undefined,
  atividades: Pick<Atividade, "id">[],
): StatusAulasTurma {
  const concluidas = new Set<string>();
  const agendadas = new Set<string>();
  const atividadeIdsReferencia = atividades.map((atividade) => atividade.id);

  if (!turmaId) {
    return {
      aulasConcluidasIds: concluidas,
      aulasAgendadasIds: agendadas,
      aulasIndisponiveisIds: new Set(),
    };
  }

  for (const agendamento of agendamentos) {
    if (!agendamentoPertenceATurma(agendamento, turmaId)) continue;
    if (isAgendamentoCancelado(agendamento)) continue;

    for (const atividadeId of agendamento.atividadeIds) {
      const id = resolveAtividadeId(atividadeIdsReferencia, atividadeId);
      if (agendamento.status === "concluido") {
        concluidas.add(id);
      } else if (!concluidas.has(id)) {
        agendadas.add(id);
      }
    }
  }

  for (const id of concluidas) agendadas.delete(id);

  return {
    aulasConcluidasIds: concluidas,
    aulasAgendadasIds: agendadas,
    aulasIndisponiveisIds: new Set([...concluidas, ...agendadas]),
  };
}

export function getAgendamentosDaAula(
  agendamentos: Agendamento[],
  turmaId: string,
  atividadeId: string,
): Agendamento[] {
  return agendamentos
    .filter((agendamento) => agendamentoPertenceATurma(agendamento, turmaId))
    .filter((agendamento) => agendamentoContemAtividade(agendamento, atividadeId))
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
