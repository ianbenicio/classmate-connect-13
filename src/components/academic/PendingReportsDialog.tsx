// Lista as pendências de relatório (estado "agendado-no-dia" e "atrasado")
// para o usuário logado (ou todas, se admin). Permite abrir o dialog.

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardCheck, AlertTriangle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  computeSlotEstado,
  type Agendamento,
  type Atividade,
  type Curso,
  type Turma,
} from "@/lib/academic-types";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAuth } from "@/lib/auth";
import { RelatorioProfessorDialog } from "./RelatorioProfessorDialog";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cursos: Curso[];
  turmas: Turma[];
  atividades: Atividade[];
}

export function PendingReportsDialog({
  open,
  onOpenChange,
  cursos,
  turmas,
  atividades,
}: Props) {
  const agendamentos = useAgendamentos();
  const { user: authUser, hasRole, displayName } = useAuth();
  const isAdmin = hasRole("admin");
  const currentUserId = authUser?.id ?? null;
  const currentUserNome =
    displayName || (authUser?.user_metadata?.name as string | undefined) || authUser?.email || "—";
  const [selecionado, setSelecionado] = useState<{
    agendamento: Agendamento;
    turma: Turma;
    curso: Curso;
  } | null>(null);

  const cursoMap = useMemo(
    () => new Map(cursos.map((c) => [c.id, c])),
    [cursos],
  );
  const turmaMap = useMemo(
    () => new Map(turmas.map((t) => [t.id, t])),
    [turmas],
  );

  const pendencias = useMemo(() => {
    const now = new Date();
    return agendamentos
      .filter((a) => a.status !== "concluido")
      .filter((a) => {
        if (isAdmin) return true;
        return currentUserId !== null && a.criadoPorUserId === currentUserId;
      })
      .map((a) => ({
        a,
        estado: computeSlotEstado(a.data, a.fim, a, now),
      }))
      .filter(({ estado }) => estado === "agendado" || estado === "atrasado")
      .sort((x, y) => `${x.a.data} ${x.a.inicio}`.localeCompare(`${y.a.data} ${y.a.inicio}`));
  }, [agendamentos, isAdmin, currentUserId]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> Relatórios pendentes
            </DialogTitle>
            <DialogDescription>
              {isAdmin
                ? "Todas as atividades aguardando relatório."
                : `Atividades agendadas por ${currentUserNome} aguardando relatório.`}
            </DialogDescription>
          </DialogHeader>

          {pendencias.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-lg p-6 text-center">
              Nada pendente — bom trabalho!
            </p>
          ) : (
            <ul className="divide-y border rounded-lg max-h-[60vh] overflow-y-auto">
              {pendencias.map(({ a, estado }) => {
                const turma = turmaMap.get(a.turmaId);
                const curso = turma ? cursoMap.get(turma.cursoId) : undefined;
                const ativs = atividades.filter((x) =>
                  a.atividadeIds.includes(x.id),
                );
                const dataFmt = format(
                  new Date(`${a.data}T00:00:00`),
                  "PPP",
                  { locale: ptBR },
                );
                return (
                  <li
                    key={a.id}
                    className="p-3 flex items-start gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="mt-0.5">
                      {estado === "atrasado" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {curso && <Badge variant="outline">{curso.cod}</Badge>}
                        <span className="font-medium">{turma?.nome}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            estado === "atrasado" &&
                              "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                          )}
                        >
                          {estado === "atrasado" ? "Atrasado" : "Hoje"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {dataFmt} · {a.inicio}–{a.fim}
                        {a.professor && ` · ${a.professor}`}
                      </div>
                      {ativs.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {ativs
                            .map(
                              (x) =>
                                `${x.tipo === 0 ? "🎓" : "📋"} ${x.codigo}`,
                            )
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        turma &&
                        curso &&
                        setSelecionado({ agendamento: a, turma, curso })
                      }
                    >
                      Registrar
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <RelatorioProfessorDialog
        open={!!selecionado}
        onOpenChange={(o) => !o && setSelecionado(null)}
        agendamento={selecionado?.agendamento ?? null}
        turma={selecionado?.turma}
        curso={selecionado?.curso}
      />
    </>
  );
}
