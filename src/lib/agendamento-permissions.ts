// =====================================================================
// agendamento-permissions — Regras unificadas de permissao para Agendamento
// =====================================================================
// Centraliza autorização de acoes sobre agendamentos. Antes desta
// extracao, 6 sites na UI duplicavam a regra com divergencias entre
// "permissivo" (criador OU professor) e "estrito" (so criador), gerando
// bugs onde um professor podia operar a propria aula em uma tela mas
// nao em outra.
//
// Regra canonica (decisao do produto):
// Pode gerenciar quem: admin, criador do agendamento, OU professor da aula.
// Justificativa: professor titular ainda precisa abrir/fechar/relatorio
// na propria aula, mesmo que outro coordenador tenha criado o slot.
//
// Para acoes destrutivas (delete) o caller pode usar `canDeleteAgendamento`
// que e mais restrito (so admin + criador) — protege contra o professor
// excluir uma aula montada pela coordenacao.

import type { Agendamento } from "./academic-types";

export interface AgendamentoActor {
  /** ID do usuario autenticado (auth.uid). Pode ser null em sessao publica. */
  userId: string | null;
  /** True se o usuario tem role admin ou coordenacao. */
  isStaff: boolean;
}

/**
 * Pode gerenciar (abrir checklist, lancar relatorio, marcar presenca):
 * admin/coordenacao, criador, ou professor da aula.
 *
 * Use sempre que a UI precisar decidir se mostra botao de acao
 * sobre um agendamento.
 */
export function canManageAgendamento(
  actor: AgendamentoActor,
  agendamento: Pick<Agendamento, "criadoPorUserId" | "professorUserId">,
): boolean {
  if (actor.isStaff) return true;
  if (actor.userId === null) return false;
  return (
    agendamento.criadoPorUserId === actor.userId ||
    agendamento.professorUserId === actor.userId
  );
}

/**
 * Regra estrita para delecao: somente admin/coordenacao ou criador.
 * Professor titular NAO pode deletar agendamento montado por outro.
 */
export function canDeleteAgendamento(
  actor: AgendamentoActor,
  agendamento: Pick<Agendamento, "criadoPorUserId">,
): boolean {
  if (actor.isStaff) return true;
  if (actor.userId === null) return false;
  return agendamento.criadoPorUserId === actor.userId;
}
