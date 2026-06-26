// Detecção PURA de pendências derivadas (plano de aula não enviado, relatório
// atrasado/expirado). Sem stores, sem efeitos, sem persistência — fonte única
// da regra, parametrizada por `now` (o `asOf`), espelhável em SQL e usável
// on-demand pela UI. Ver docs/design/notificacoes-arquitetura.md.

import {
  agendamentoDispensaRequisitos,
  computeSlotEstado,
  type Agendamento,
} from "./academic-types";
import { evidenciaEstaValida, getEvidenciaPorTipo, type AulaEvidencia } from "./aula-evidencias";

export type PendenciaKind = "plano_pendente" | "atrasado" | "expirado";

export interface Pendencia {
  agendamentoId: string;
  kind: PendenciaKind;
  agendamento: Agendamento;
}

export interface CalcularPendenciasInput {
  agendamentos: Agendamento[];
  evidencias: AulaEvidencia[];
  now?: Date;
}

/**
 * Retorna as pendências atuais (uma entrada por agendamento por condição).
 * Um agendamento pode gerar `plano_pendente` E `atrasado`/`expirado` ao mesmo
 * tempo. Agendamentos concluídos ou com requisitos dispensados são ignorados.
 */
export function calcularPendencias({
  agendamentos,
  evidencias,
  now = new Date(),
}: CalcularPendenciasInput): Pendencia[] {
  const evidenciasByAgendamento = new Map<string, AulaEvidencia[]>();
  for (const e of evidencias) {
    const list = evidenciasByAgendamento.get(e.agendamentoId) ?? [];
    list.push(e);
    evidenciasByAgendamento.set(e.agendamentoId, list);
  }

  const out: Pendencia[] = [];
  for (const a of agendamentos) {
    if (agendamentoDispensaRequisitos(a)) continue;
    if (a.status === "concluido") continue;

    const evs = evidenciasByAgendamento.get(a.id) ?? [];
    const plano = getEvidenciaPorTipo(evs, "plano_aula");
    if (!evidenciaEstaValida(plano)) {
      out.push({ agendamentoId: a.id, kind: "plano_pendente", agendamento: a });
    }

    const estado = computeSlotEstado(a.data, a.fim, a, now);
    if (estado === "atrasado") {
      out.push({ agendamentoId: a.id, kind: "atrasado", agendamento: a });
    } else if (estado === "expirado") {
      out.push({ agendamentoId: a.id, kind: "expirado", agendamento: a });
    }
  }
  return out;
}
