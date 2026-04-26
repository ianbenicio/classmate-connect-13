import { useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  notificacoesStore,
  useNotificacoes,
} from "@/lib/notificacoes-store";
import { cn } from "@/lib/utils";
import { useAlunos } from "@/lib/alunos-store";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useCursos } from "@/lib/cursos-store";
import { AvaliacaoAulaDialog } from "@/components/academic/AvaliacaoAulaDialog";
import { RelatorioProfessorDialog } from "@/components/academic/RelatorioProfessorDialog";
import type { Notificacao } from "@/lib/academic-types";

export function NotificationsBell() {
  const notifs = useNotificacoes();
  const naoLidas = notifs.filter((n) => !n.lida).length;

  // Stores necessários para resolver o contexto da notificação ao abrir
  // o dialog de avaliação do aluno.
  const alunos = useAlunos();
  const agendamentos = useAgendamentos();
  const turmas = useTurmas();
  const cursos = useCursos();

  // Notificação ativa cujo dialog está aberto.
  const [avaliacaoCtx, setAvaliacaoCtx] = useState<Notificacao | null>(null);
  const [relatorioCtx, setRelatorioCtx] = useState<Notificacao | null>(null);

  // "Acionável aluno" = leva ao formulário "Como foi sua aula?" (relatorio_aluno).
  // Só vira actionable depois que o professor fechou o relatório (que faz upsert
  // com kind=agendado). Antes disso, a notif do aluno é só informativa.
  // RLS da tabela `notificacoes` já restringe a leitura por destinatário.
  const isAvaliacaoAlunoActionable = (n: Notificacao): boolean => {
    return (
      n.destinatarioTipo === "aluno" &&
      !!n.agendamentoId &&
      n.kind === "agendado"
    );
  };

  // "Acionável professor" = leva ao RelatorioProfessorDialog.
  // Mesmo critério estrutural; o destinatário diferencia o dialog aberto.
  const isRelatorioProfActionable = (n: Notificacao): boolean => {
    return (
      n.destinatarioTipo === "professor" &&
      !!n.agendamentoId &&
      n.kind === "agendado"
    );
  };

  const isAnyActionable = (n: Notificacao): boolean =>
    isAvaliacaoAlunoActionable(n) || isRelatorioProfActionable(n);

  const handleNotifClick = (n: Notificacao) => {
    notificacoesStore.marcarLida(n.id);
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
    const aluno = alunos.find((a) => a.id === avaliacaoCtx.destinatarioId);
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
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificações"
          className="relative"
        >
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
          {notifs.length > 0 && (
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
          {notifs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {notifs.map((n) => {
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
                    <div className="text-xs text-muted-foreground leading-snug">
                      {n.mensagem}
                    </div>
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
