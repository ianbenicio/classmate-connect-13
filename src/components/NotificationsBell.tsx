import { useMemo, useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notificacoesStore, useNotificacoes } from "@/lib/notificacoes-store";
import { cn } from "@/lib/utils";
import { useAlunos } from "@/lib/alunos-store";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useCursos } from "@/lib/cursos-store";
import { useAuth } from "@/lib/auth";
import { AvaliacaoAulaDialog } from "@/components/academic/AvaliacaoAulaDialog";
import { RelatorioProfessorDialog } from "@/components/academic/RelatorioProfessorDialog";
import { usePendenciasDerivadas, type PendenciaDerivada } from "@/lib/pendencias-derivadas";
import type { Notificacao } from "@/lib/academic-types";

const KINDS_PENDENCIA = new Set(["plano_pendente", "atrasado", "expirado"]);
const TITULO_PENDENCIA: Record<string, string> = {
  plano_pendente: "Plano de aula pendente",
  atrasado: "Relatório pendente",
  expirado: "Prazo de relatório expirado",
};

export function NotificationsBell() {
  const allNotifs = useNotificacoes();
  const { user, displayName, hasRole } = useAuth();

  // Filtra notificações de acordo com o papel do usuário logado.
  // - admin/coordenacao: vê todas (visão geral)
  // - professor: apenas notifs endereçadas ao próprio professor (por nome)
  // - aluno: apenas notifs endereçadas ao próprio aluno (por id ou nome)
  // - sem papel: nenhuma
  const notifs = useMemo(() => {
    if (hasRole("admin") || hasRole("coordenacao")) return allNotifs;

    const nomeKey = (displayName ?? "").trim().toLowerCase();
    const userId = user?.id ?? "";

    if (hasRole("professor")) {
      return allNotifs.filter((n) => {
        if (n.destinatarioTipo !== "professor") return false;
        // Canônico: destinatarioUserId. Fallback: destinatarioId por userId/nome (legado).
        if (n.destinatarioUserId && n.destinatarioUserId === user?.id) return true;
        const ref = (n.destinatarioId ?? "").trim().toLowerCase();
        return ref === nomeKey || ref === userId;
      });
    }

    if (hasRole("aluno")) {
      return allNotifs.filter((n) => {
        if (n.destinatarioTipo !== "aluno") return false;
        if (n.destinatarioUserId && n.destinatarioUserId === user?.id) return true;
        const ref = (n.destinatarioId ?? "").trim().toLowerCase();
        return ref === nomeKey || ref === userId;
      });
    }

    return [];
  }, [allNotifs, displayName, user?.id, hasRole]);

  // Stores p/ contexto + computar as pendências derivadas.
  const alunos = useAlunos();
  const agendamentos = useAgendamentos();
  const turmas = useTurmas();
  const cursos = useCursos();

  // F2: pendências (plano/atrasado/expirado) são DERIVADAS on-demand (RPC + fallback),
  // não persistidas. Eventos reais (kind=agendado etc.) seguem no store.
  const { pendencias: derivadas, resumo } = usePendenciasDerivadas();

  // Eventos persistidos = notifs do papel SEM as kinds de pendência (agora derivadas).
  const eventos = useMemo(
    () => notifs.filter((n) => !n.kind || !KINDS_PENDENCIA.has(n.kind)),
    [notifs],
  );

  // Pendências derivadas como itens de exibição (informativos, não acionáveis).
  // Já vêm com escopo de papel da RPC — não passam pelo filtro de papel acima.
  const itensDerivados = useMemo<Notificacao[]>(() => {
    return derivadas.map((p: PendenciaDerivada) => {
      const ag = agendamentos.find((a) => a.id === p.agendamentoId);
      const turma = ag ? turmas.find((t) => t.id === ag.turmaId) : undefined;
      const curso = turma ? cursos.find((c) => c.id === turma.cursoId) : undefined;
      const ctx = [curso?.nome, turma?.nome, `${p.data} ${p.inicio}-${p.fim}`]
        .filter(Boolean)
        .join(" · ");
      return {
        id: `pend:${p.agendamentoId}:${p.kind}`,
        destinatarioTipo: "professor",
        destinatarioId: "",
        titulo: TITULO_PENDENCIA[p.kind] ?? "Pendência",
        mensagem: ctx,
        kind: p.kind as Notificacao["kind"],
        agendamentoId: p.agendamentoId,
        data: p.data,
        inicio: p.inicio,
        fim: p.fim,
        criadoEm: new Date().toISOString(),
        lida: true,
      } as Notificacao;
    });
  }, [derivadas, agendamentos, turmas, cursos]);

  const itens = useMemo(() => [...itensDerivados, ...eventos], [itensDerivados, eventos]);
  const naoLidas = eventos.filter((n) => !n.lida).length + resumo.urgent + resumo.critical;

  // Notificação ativa cujo dialog está aberto.
  const [avaliacaoCtx, setAvaliacaoCtx] = useState<Notificacao | null>(null);
  const [relatorioCtx, setRelatorioCtx] = useState<Notificacao | null>(null);

  // "Acionável aluno" = leva ao formulário "Como foi sua aula?" (relatorio_aluno).
  // Só vira actionable depois que o professor fechou o relatório (que faz upsert
  // com kind=agendado). Antes disso, a notif do aluno é só informativa.
  // RLS da tabela `notificacoes` já restringe a leitura por destinatário.
  const isAvaliacaoAlunoActionable = (n: Notificacao): boolean => {
    return n.destinatarioTipo === "aluno" && !!n.agendamentoId && n.kind === "agendado";
  };

  // "Acionável professor" = leva ao RelatorioProfessorDialog.
  // Mesmo critério estrutural; o destinatário diferencia o dialog aberto.
  const isRelatorioProfActionable = (n: Notificacao): boolean => {
    return n.destinatarioTipo === "professor" && !!n.agendamentoId && n.kind === "agendado";
  };

  const isAnyActionable = (n: Notificacao): boolean =>
    isAvaliacaoAlunoActionable(n) || isRelatorioProfActionable(n);

  const handleNotifClick = (n: Notificacao) => {
    // Derivadas (id "pend:...") não persistem — não marcar lida.
    if (!n.id.startsWith("pend:")) notificacoesStore.marcarLida(n.id);
    if (isAvaliacaoAlunoActionable(n)) {
      setAvaliacaoCtx(n);
    } else if (isRelatorioProfActionable(n)) {
      setRelatorioCtx(n);
    }
  };

  // Resolve o contexto necessário para AvaliacaoAulaDialog a partir da
  // notificação. Se algo estiver faltando (agendamento removido, turma
  // movida, etc.), o dialog fica fechado e logamos.
  const avaliacaoFromNotif = (() => {
    if (!avaliacaoCtx) return null;
    const ag = agendamentos.find((g) => g.id === avaliacaoCtx.agendamentoId);
    const aluno = alunos.find(
      (a) =>
        a.id === avaliacaoCtx.destinatarioId ||
        (!!avaliacaoCtx.destinatarioUserId && a.userId === avaliacaoCtx.destinatarioUserId),
    );
    const turma = turmas.find((t) => t.id === avaliacaoCtx.turmaId);
    const curso = cursos.find((c) => c.id === avaliacaoCtx.cursoId);
    if (!ag || !aluno || !turma || !curso) return null;
    return { ag, aluno, turma, curso };
  })();

  const relatorioFromNotif = (() => {
    if (!relatorioCtx) return null;
    const ag = agendamentos.find((g) => g.id === relatorioCtx.agendamentoId);
    const turma = turmas.find((t) => t.id === relatorioCtx.turmaId);
    const curso = cursos.find((c) => c.id === relatorioCtx.cursoId);
    if (!ag || !turma || !curso) return null;
    return { ag, turma, curso };
  })();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
              {naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold text-sm">Notificações</div>
          {eventos.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => notificacoesStore.marcarTodasLidas()}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {itens.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {itens.map((n) => {
                const actionable = isAnyActionable(n);
                const isProf = isRelatorioProfActionable(n);
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "p-3 text-sm hover:bg-muted/40 cursor-pointer",
                      !n.lida && "bg-primary/5",
                    )}
                    onClick={() => handleNotifClick(n)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-xs">{n.titulo}</div>
                      <Badge
                        variant={n.destinatarioTipo === "professor" ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {n.destinatarioTipo === "professor" ? "Professor" : "Aluno"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground leading-snug">{n.mensagem}</div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(n.criadoEm), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                      {actionable && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotifClick(n);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {isProf ? "Preencher relatório" : "Avaliar aula"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>

      {avaliacaoFromNotif && (
        <AvaliacaoAulaDialog
          open
          onOpenChange={(o) => !o && setAvaliacaoCtx(null)}
          agendamento={avaliacaoFromNotif.ag}
          aluno={avaliacaoFromNotif.aluno}
          turma={avaliacaoFromNotif.turma}
          curso={avaliacaoFromNotif.curso}
        />
      )}
      {relatorioFromNotif && (
        <RelatorioProfessorDialog
          open
          onOpenChange={(o) => !o && setRelatorioCtx(null)}
          agendamento={relatorioFromNotif.ag}
          turma={relatorioFromNotif.turma}
          curso={relatorioFromNotif.curso}
        />
      )}
    </Popover>
  );
}
