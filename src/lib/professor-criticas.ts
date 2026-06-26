import {
  agendamentoDispensaRequisitos,
  endSlotPlus24h,
  type Agendamento,
  type Atividade,
} from "./academic-types";
import { evidenciaEstaValida, getEvidenciaPorTipo, type AulaEvidencia } from "./aula-evidencias";
import type { AvaliacaoRecord } from "./avaliacoes-types";

export const CRITICAS_POR_PUNICAO = 3;

export type CriticaProfessorTipo = "plano_aula_nao_enviado" | "relatorio_professor_nao_enviado";

export interface CriticaProfessor {
  id: string;
  tipo: CriticaProfessorTipo;
  pontos: number;
  agendamentoId: string;
  professorKey: string;
  professorUserId?: string;
  professorNome: string;
  data: string;
  inicio: string;
  fim: string;
  titulo: string;
  descricao: string;
}

export interface ResumoCriticasProfessor {
  professorKey: string;
  professorUserId?: string;
  professorNome: string;
  pontosCritica: number;
  punicoes: number;
  saldoCriticas: number;
  criticas: CriticaProfessor[];
}

export interface GerarCriticasProfessoresInput {
  agendamentos: Agendamento[];
  atividades: Atividade[];
  evidencias: AulaEvidencia[];
  avaliacoes: AvaliacaoRecord[];
  dataInicio?: string;
  dataFim?: string;
  now?: Date;
}

export function getProfessorCriticaKey(
  professorUserId: string | undefined,
  professorNome: string | undefined,
) {
  if (professorUserId) return `user:${professorUserId}`;
  return `nome:${(professorNome ?? "(sem professor)").trim().toLowerCase()}`;
}

export function getInicioDiaAula(agendamento: Pick<Agendamento, "data">): Date {
  // Fuso fixo da escola (BRT -03:00, sem DST) p/ não depender do TZ do runtime.
  return new Date(`${agendamento.data}T00:00:00-03:00`);
}

export function gerarResumoCriticasProfessores({
  agendamentos,
  atividades,
  evidencias,
  avaliacoes,
  dataInicio,
  dataFim,
  now = new Date(),
}: GerarCriticasProfessoresInput): ResumoCriticasProfessor[] {
  const atividadesById = new Map(atividades.map((atividade) => [atividade.id, atividade]));
  const evidenciasByAgendamento = groupBy(evidencias, (evidencia) => evidencia.agendamentoId);
  const relatoriosProfessor = new Set(
    avaliacoes
      .filter((avaliacao) => avaliacao.tipo === "relatorio_prof" && !!avaliacao.agendamentoId)
      .map((avaliacao) => avaliacao.agendamentoId as string),
  );

  const criticas: CriticaProfessor[] = [];

  for (const agendamento of agendamentos) {
    if (agendamentoDispensaRequisitos(agendamento)) continue;
    if (dataInicio && agendamento.data < dataInicio) continue;
    if (dataFim && agendamento.data > dataFim) continue;
    if (!agendamentoTemAula(agendamento, atividadesById)) continue;

    const professorNome = agendamento.professor || agendamento.criadoPorNome || "(sem professor)";
    const professorKey = getProfessorCriticaKey(agendamento.professorUserId, professorNome);
    const evs = evidenciasByAgendamento.get(agendamento.id) ?? [];
    const planoOk = evidenciaEstaValida(getEvidenciaPorTipo(evs, "plano_aula"));
    const relatorioOk = relatoriosProfessor.has(agendamento.id);

    if (!planoOk && now >= getInicioDiaAula(agendamento)) {
      criticas.push({
        id: `${agendamento.id}:plano_aula_nao_enviado`,
        tipo: "plano_aula_nao_enviado",
        pontos: 1,
        agendamentoId: agendamento.id,
        professorKey,
        professorUserId: agendamento.professorUserId,
        professorNome,
        data: agendamento.data,
        inicio: agendamento.inicio,
        fim: agendamento.fim,
        titulo: "Plano de aula nao enviado",
        descricao: "O plano de aula nao foi registrado ate o dia da aula.",
      });
    }

    if (!relatorioOk && now > endSlotPlus24h(agendamento)) {
      criticas.push({
        id: `${agendamento.id}:relatorio_professor_nao_enviado`,
        tipo: "relatorio_professor_nao_enviado",
        pontos: 1,
        agendamentoId: agendamento.id,
        professorKey,
        professorUserId: agendamento.professorUserId,
        professorNome,
        data: agendamento.data,
        inicio: agendamento.inicio,
        fim: agendamento.fim,
        titulo: "Relatorio do professor nao enviado",
        descricao: "O relatorio de aula do professor nao foi registrado dentro da janela de 24h.",
      });
    }
  }

  return resumirCriticasPorProfessor(criticas);
}

function resumirCriticasPorProfessor(criticas: CriticaProfessor[]): ResumoCriticasProfessor[] {
  const map = new Map<string, ResumoCriticasProfessor>();
  for (const critica of criticas) {
    const current =
      map.get(critica.professorKey) ??
      ({
        professorKey: critica.professorKey,
        professorUserId: critica.professorUserId,
        professorNome: critica.professorNome,
        pontosCritica: 0,
        punicoes: 0,
        saldoCriticas: 0,
        criticas: [],
      } satisfies ResumoCriticasProfessor);
    current.pontosCritica += critica.pontos;
    current.criticas.push(critica);
    current.punicoes = Math.floor(current.pontosCritica / CRITICAS_POR_PUNICAO);
    current.saldoCriticas = current.pontosCritica % CRITICAS_POR_PUNICAO;
    map.set(critica.professorKey, current);
  }

  return Array.from(map.values()).sort((a, b) => a.professorNome.localeCompare(b.professorNome));
}

function agendamentoTemAula(
  agendamento: Agendamento,
  atividadesById: Map<string, Atividade>,
): boolean {
  return agendamento.atividadeIds.some(
    (atividadeId) => atividadesById.get(atividadeId)?.tipo === 0,
  );
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
