import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Mail,
  Clock,
  GraduationCap,
  ClipboardList,
  CalendarCheck,
  RotateCcw,
  BookOpen,
  User as UserIcon,
} from "lucide-react";
import {
  formatHorarioSlot,
  type Aluno,
  type Atividade,
  type Curso,
  type Turma,
} from "@/lib/academic-types";
import {
  agendamentosStore,
  useAgendamentos,
} from "@/lib/agendamentos-store";
import { toast } from "sonner";

interface Props {
  turma: Turma | null;
  curso?: Curso;
  alunos: Aluno[];
  atividades: Atividade[];
  onOpenChange: (open: boolean) => void;
}

export function TurmaDetailDialog({
  turma,
  curso,
  alunos,
  atividades,
  onOpenChange,
}: Props) {
  const allAgendamentos = useAgendamentos();
  const alunosDaTurma = turma
    ? alunos.filter((a) => a.turmaId === turma.id)
    : [];

  const agendaDaTurma = turma
    ? allAgendamentos
        .filter((a) => a.turmaId === turma.id)
        .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
    : [];
  const pendentes = agendaDaTurma.filter((a) => a.status === "pendente");
  const concluidas = agendaDaTurma.filter((a) => a.status === "concluido");

  const ativPorId = new Map(atividades.map((a) => [a.id, a]));

  return (
    <Dialog open={!!turma} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">
              {turma?.cod}
            </Badge>
            <DialogTitle>{turma?.nome}</DialogTitle>
          </div>
          {curso && (
            <DialogDescription>
              Curso: <strong>{curso.nome}</strong>
            </DialogDescription>
          )}
        </DialogHeader>

        <section className="grid grid-cols-2 gap-3 py-3 border-y text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Data início
            </div>
            <div className="font-medium">{turma?.data || "—"}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs uppercase text-muted-foreground mb-1">
              Horários
            </div>
            {!turma?.horarios?.length ? (
              <div className="text-sm text-muted-foreground">—</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {turma.horarios.map((h, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="inline-flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    {formatHorarioSlot(h)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {turma?.descricao && (
            <div className="col-span-2">
              <div className="text-xs uppercase text-muted-foreground">
                Descrição
              </div>
              <div>{turma.descricao}</div>
            </div>
          )}
        </section>

        <section className="mt-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Agenda ({agendaDaTurma.length})
          </h3>

          {agendaDaTurma.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-md p-6 text-center">
              Nenhuma atividade agendada para esta turma ainda.
            </p>
          ) : (
            <div className="space-y-4">
              <AgendaGroup
                title="Pendentes"
                items={pendentes}
                ativPorId={ativPorId}
                onConcluir={(id) => {
                  agendamentosStore.marcarConcluido(id);
                  toast.success("Atividade marcada como concluída.");
                }}
                emptyText="Nenhum agendamento pendente."
              />
              <AgendaGroup
                title="Concluídas"
                items={concluidas}
                ativPorId={ativPorId}
                onReabrir={(id) => {
                  agendamentosStore.reabrir(id);
                  toast.success("Agendamento reaberto.");
                }}
                emptyText="Nenhuma conclusão registrada ainda."
                muted
              />
            </div>
          )}
        </section>

        <section className="mt-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Alunos ({alunosDaTurma.length})
          </h3>

          {alunosDaTurma.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-md p-6 text-center">
              Nenhum aluno cadastrado nesta turma.
            </p>
          ) : (
            <ul className="border rounded-lg divide-y">
              {alunosDaTurma.map((al) => {
                const presencas = al.aulas.filter((r) => r.presente).length;
                const entregas = al.trabalhos.filter((t) => t.entregue).length;
                return (
                  <li key={al.id} className="p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{al.nome}</div>
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {al.contato}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {presencas} presenças
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {entregas} entregas
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {al.habilidadeIds.length} habilidades
                        </Badge>
                      </div>
                    </div>
                    {al.observacao && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {al.observacao}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function AgendaGroup({
  title,
  items,
  ativPorId,
  onConcluir,
  onReabrir,
  emptyText,
  muted = false,
}: {
  title: string;
  items: ReturnType<typeof useAgendamentos>;
  ativPorId: Map<string, Atividade>;
  onConcluir?: (id: string) => void;
  onReabrir?: (id: string) => void;
  emptyText: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground border rounded-md p-3 text-center">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((ag) => {
            const ativs = ag.atividadeIds
              .map((id) => ativPorId.get(id))
              .filter(Boolean) as Atividade[];
            return (
              <li
                key={ag.id}
                className={`rounded-md border p-3 ${muted ? "bg-muted/30" : "bg-background"}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ag.data} · {ag.inicio}–{ag.fim}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ativs.map((a) => (
                        <Badge
                          key={a.id}
                          variant="outline"
                          className="inline-flex items-center gap-1"
                        >
                          {a.tipo === 0 ? (
                            <GraduationCap className="h-3 w-3" />
                          ) : (
                            <ClipboardList className="h-3 w-3" />
                          )}
                          {a.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {onConcluir && (
                    <Button size="sm" onClick={() => onConcluir(ag.id)}>
                      <CalendarCheck /> Concluir
                    </Button>
                  )}
                  {onReabrir && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReabrir(ag.id)}
                    >
                      <RotateCcw /> Reabrir
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
