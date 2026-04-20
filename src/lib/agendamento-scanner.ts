// Varredor: detecta agendamentos cujo estado mudou (agendado→atrasado, atrasado→expirado)
// e gera notificações correspondentes para alunos da turma + professor.
// Roda quando o app monta e a cada 60s enquanto aberto.
//
// Idempotência: usamos um Set em memória + chave "{agendamentoId}|{kind}" para
// não gerar a mesma notificação duas vezes na mesma sessão.

import { useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { agendamentosStore } from "./agendamentos-store";
import { notificacoesStore } from "./notificacoes-store";
import {
  computeSlotEstado,
  type Agendamento,
  type Notificacao,
} from "./academic-types";
import { SEED_ALUNOS, SEED_CURSOS, SEED_TURMAS } from "./academic-seed";

const generated = new Set<string>();

function k(a: Agendamento, kind: Notificacao["kind"]) {
  return `${a.id}|${kind}`;
}

function buildNotifs(
  a: Agendamento,
  kind: NonNullable<Notificacao["kind"]>,
  titulo: string,
  mensagemExtra: string,
): Notificacao[] {
  const turma = SEED_TURMAS.find((t) => t.id === a.turmaId);
  if (!turma) return [];
  const curso = SEED_CURSOS.find((c) => c.id === turma.cursoId);
  const dataFmt = format(new Date(`${a.data}T00:00:00`), "PPP", { locale: ptBR });
  const mensagem = `${curso?.nome ?? ""} · ${turma.nome} · ${dataFmt} ${a.inicio}–${a.fim}${
    a.professor ? ` · ${a.professor}` : ""
  } — ${mensagemExtra}`;
  const base = {
    titulo,
    mensagem,
    cursoId: turma.cursoId,
    turmaId: turma.id,
    data: a.data,
    inicio: a.inicio,
    fim: a.fim,
    professor: a.professor,
    atividadeIds: a.atividadeIds,
    criadoEm: new Date().toISOString(),
    lida: false,
    kind,
  };
  const alunos = SEED_ALUNOS.filter((al) => al.turmaId === turma.id);
  const out: Notificacao[] = alunos.map((al) => ({
    ...base,
    id: crypto.randomUUID(),
    destinatarioTipo: "aluno" as const,
    destinatarioId: al.id,
  }));
  if (a.professor) {
    out.push({
      ...base,
      id: crypto.randomUUID(),
      destinatarioTipo: "professor" as const,
      destinatarioId: a.professor,
    });
  }
  return out;
}

export function runScanner(now: Date = new Date()) {
  const ags = agendamentosStore.getAll();
  const novas: Notificacao[] = [];

  for (const a of ags) {
    if (a.status === "concluido") continue;
    const estado = computeSlotEstado(a.data, a.fim, a, now);

    if (estado === "atrasado") {
      const key = k(a, "atrasado");
      if (!generated.has(key)) {
        generated.add(key);
        novas.push(
          ...buildNotifs(
            a,
            "atrasado",
            "Relatório pendente",
            "registre o relatório dentro de 24h.",
          ),
        );
      }
    } else if (estado === "expirado") {
      const key = k(a, "expirado");
      if (!generated.has(key)) {
        generated.add(key);
        novas.push(
          ...buildNotifs(
            a,
            "expirado",
            "Prazo de relatório expirado",
            "o prazo de 24h passou sem registro.",
          ),
        );
      }
    }
  }

  if (novas.length) notificacoesStore.addMany(novas);
}

export function useAgendamentoScanner(intervalMs = 60_000) {
  useEffect(() => {
    runScanner();
    const id = window.setInterval(() => runScanner(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}
