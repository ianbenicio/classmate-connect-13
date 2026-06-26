// Varredor: detecta agendamentos cujo estado mudou (agendado→atrasado,
// atrasado→expirado) e gera notificações correspondentes para alunos da
// turma + professor. Roda quando o app monta e a cada 60s enquanto aberto.
//
// Idempotência: o banco aplica um índice único parcial sobre
// (destinatario_ref, agendamento_id, kind) — duplicatas são silenciosamente
// ignoradas via `upsert(..., ignoreDuplicates: true)` em notificacoesStore.
// Esse contrato vale entre abas, dispositivos e reloads.
//
// Aluno e professor recebem TEXTOS DIFERENTES:
//  - professor → "registre o relatório"
//  - aluno     → "avalie a aula"

import { useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { agendamentosStore } from "./agendamentos-store";
import { notificacoesStore } from "./notificacoes-store";
import { type Agendamento, type Notificacao } from "./academic-types";
import { calcularPendencias } from "./pendencias";
import { alunosStore } from "./alunos-store";
import { cursosStore } from "./cursos-store";
import { turmasStore } from "./turmas-store";
import { aulaEvidenciasStore } from "./aula-evidencias-store";

interface BuildOpts {
  kind: NonNullable<Notificacao["kind"]>;
  tituloProfessor: string;
  mensagemProfessor: string;
  tituloAluno: string;
  mensagemAluno: string;
}

function buildNotifs(a: Agendamento, opts: BuildOpts): Notificacao[] {
  const turma = turmasStore.getAll().find((t) => t.id === a.turmaId);
  if (!turma) return [];
  const curso = cursosStore.getAll().find((c) => c.id === turma.cursoId);
  const dataFmt = format(new Date(`${a.data}T00:00:00`), "PPP", { locale: ptBR });
  const ctx = `${curso?.nome ?? ""} · ${turma.nome} · ${dataFmt} ${a.inicio}–${a.fim}${
    a.professor ? ` · ${a.professor}` : ""
  }`;
  const baseShared = {
    cursoId: turma.cursoId,
    turmaId: turma.id,
    data: a.data,
    inicio: a.inicio,
    fim: a.fim,
    professor: a.professor,
    atividadeIds: a.atividadeIds,
    criadoEm: new Date().toISOString(),
    lida: false,
    kind: opts.kind,
    agendamentoId: a.id,
  };

  const out: Notificacao[] = [];

  // Alunos da turma. Dedup é responsabilidade do banco.
  const alunos = alunosStore.getAll().filter((al) => al.turmaId === turma.id);
  for (const al of alunos) {
    out.push({
      ...baseShared,
      id: crypto.randomUUID(),
      destinatarioTipo: "aluno",
      destinatarioId: al.id,
      // userId quando aluno tem conta vinculada — habilita RLS por auth.uid.
      destinatarioUserId: al.userId,
      titulo: opts.tituloAluno,
      mensagem: `${ctx} — ${opts.mensagemAluno}`,
    });
  }

  // Professor responsável.
  if (a.professor || a.professorUserId) {
    out.push({
      ...baseShared,
      id: crypto.randomUUID(),
      destinatarioTipo: "professor",
      // Prefere userId no destinatarioId; cai pro nome se ainda sem vínculo.
      destinatarioId: a.professorUserId ?? a.professor ?? "",
      destinatarioUserId: a.professorUserId,
      titulo: opts.tituloProfessor,
      mensagem: `${ctx} — ${opts.mensagemProfessor}`,
    });
  }

  return out;
}

function buildPlanoPendenteNotif(a: Agendamento): Notificacao[] {
  const turma = turmasStore.getAll().find((t) => t.id === a.turmaId);
  if (!turma) return [];
  const curso = cursosStore.getAll().find((c) => c.id === turma.cursoId);
  const dataFmt = format(new Date(`${a.data}T00:00:00`), "PPP", { locale: ptBR });
  const ctx = `${curso?.nome ?? ""} · ${turma.nome} · ${dataFmt} ${a.inicio}-${a.fim}${
    a.professor ? ` · ${a.professor}` : ""
  }`;

  if (!a.professor && !a.professorUserId) return [];

  return [
    {
      id: crypto.randomUUID(),
      destinatarioTipo: "professor",
      destinatarioId: a.professorUserId ?? a.professor ?? "",
      destinatarioUserId: a.professorUserId,
      titulo: "Plano de aula pendente",
      mensagem: `${ctx} - submeta o plano de aula ate o dia da aula para evitar uma critica.`,
      cursoId: turma.cursoId,
      turmaId: turma.id,
      data: a.data,
      inicio: a.inicio,
      fim: a.fim,
      professor: a.professor,
      atividadeIds: a.atividadeIds,
      criadoEm: new Date().toISOString(),
      lida: false,
      kind: "plano_pendente",
      agendamentoId: a.id,
    },
  ];
}

export function runScanner(now: Date = new Date()) {
  const ags = agendamentosStore.getAll();
  const evidencias = aulaEvidenciasStore.getAll();
  const novas: Notificacao[] = [];

  for (const p of calcularPendencias({ agendamentos: ags, evidencias, now })) {
    const a = p.agendamento;
    if (p.kind === "plano_pendente") {
      novas.push(...buildPlanoPendenteNotif(a));
    } else if (p.kind === "atrasado") {
      novas.push(
        ...buildNotifs(a, {
          kind: "atrasado",
          tituloProfessor: "Relatório pendente",
          mensagemProfessor: "registre o relatório dentro de 24h.",
          tituloAluno: "Avalie a aula",
          mensagemAluno: "como foi a aula? Sua avaliação ajuda a melhorar.",
        }),
      );
    } else if (p.kind === "expirado") {
      novas.push(
        ...buildNotifs(a, {
          kind: "expirado",
          tituloProfessor: "Prazo de relatório expirado",
          mensagemProfessor: "o prazo de 24h passou sem registro.",
          tituloAluno: "Período de avaliação encerrado",
          mensagemAluno: "o prazo de 24h para avaliar a aula passou.",
        }),
      );
    }
  }

  if (novas.length) {
    void notificacoesStore.addMany(novas);
  }

  // Limpa chave legada de dedup em localStorage. Deduplicar agora é
  // responsabilidade do banco (índice único parcial). Pode remover este
  // bloco após algumas semanas.
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("app.scannerDedup");
    } catch {
      // ignora
    }
  }
}

export function useAgendamentoScanner(intervalMs = 60_000) {
  useEffect(() => {
    const tick = () => {
      void aulaEvidenciasStore.ensureInit().then(() => runScanner());
    };
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}
