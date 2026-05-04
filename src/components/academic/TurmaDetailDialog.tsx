import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Mail,
  Clock,
  GraduationCap,
  ClipboardList,
  CalendarCheck,
  RotateCcw,
  BookOpen,
  Star,
  BarChart2,
  User as UserIcon,
} from "lucide-react";
import {
  blocosPorTurno,
  formatHorarioSlot,
  formatMinutos,
  getDuracaoAulaMin,
  getTurnoDiarioMin,
  type Agendamento,
  type Aluno,
  type Atividade,
  type Curso,
  type Turma,
} from "@/lib/academic-types";
import { agendamentosStore, useAgendamentos } from "@/lib/agendamentos-store";
import { useHabilidades } from "@/lib/habilidades-store";
import { QuadroAulasDialog } from "@/components/academic/QuadroAulasDialog";
import { toast } from "sonner";

interface Props {
  turma: Turma | null;
  curso?: Curso;
  alunos: Aluno[];
  atividades: Atividade[];
  onOpenChange: (open: boolean) => void;
}

export function TurmaDetailDialog({ turma, curso, alunos, atividades, onOpenChange }: Props) {
  const [quadroOpen, setQuadroOpen] = useState(false);
  const allAgendamentos = useAgendamentos();
  const todasHabilidades = useHabilidades();
  const alunosDaTurma = turma ? alunos.filter((a) => a.turmaId === turma.id) : [];

  // Habilidades do curso.
  const habilidadesDoCurso = useMemo(() => {
    const ids = new Set(curso?.habilidadeIds ?? []);
    return todasHabilidades.filter((h) => ids.has(h.id));
  }, [todasHabilidades, curso]);

  // Propriedades derivadas do curso.
  const blocosDia = curso ? blocosPorTurno(curso) : 0;
  const duracaoAulaMin = curso ? getDuracaoAulaMin(curso) : 0;
  const turnoDiarioMin = curso ? getTurnoDiarioMin(curso) : 0;
  const cargaTotal = curso?.cargaHorariaTotalMin ?? 0;
  // Total de aulas esperadas = carga horária total / duração de cada aula.
  const totalAulasEsperadas =
    cargaTotal > 0 && duracaoAulaMin > 0 ? Math.ceil(cargaTotal / duracaoAulaMin) : 0;

  // Aulas "dadas" pela turma = aulas do curso com ≥1 aluno da turma com presença=true.
  const { aulasDadasIds, totalAulas, dadas, pct } = useMemo(() => {
    if (!turma || !curso) {
      return { aulasDadasIds: new Set<string>(), totalAulas: 0, dadas: 0, pct: 0 };
    }
    const aulasCursoIds = new Set(
      atividades.filter((a) => a.cursoId === curso.id && a.tipo === 0).map((a) => a.id),
    );
    const dadasSet = new Set<string>();
    for (const al of alunosDaTurma) {
      for (const r of al.aulas ?? []) {
        if (r.presente && aulasCursoIds.has(r.atividadeId)) dadasSet.add(r.atividadeId);
      }
    }
    const total = aulasCursoIds.size;
    const d = dadasSet.size;
    return {
      aulasDadasIds: dadasSet,
      totalAulas: total,
      dadas: d,
      pct: total > 0 ? Math.round((d / total) * 100) : 0,
    };
  }, [turma, curso, atividades, alunosDaTurma]);

  const agendaDaTurma = turma
    ? allAgendamentos
        .filter((a) => a.turmaId === turma.id)
        .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
    : [];
  const pendentes = agendaDaTurma.filter((a) => a.status === "pendente");
  const concluidas = agendaDaTurma.filter((a) => a.status === "concluido");

  // Progresso de aulas baseado em agendamentos concluídos vs total esperado.
  const aulasConcluidas = concluidas.length;
  const pctAgendamentos =
    totalAulasEsperadas > 0
      ? Math.min(100, Math.round((aulasConcluidas / totalAulasEsperadas) * 100))
      : 0;

  const ativPorId = new Map(atividades.map((a) => [a.id, a]));

  // Aulas Realizadas = agendamentos concluídos cujo conteúdo inclui ao menos
  // uma atividade do tipo Aula (tipo 0). Ordenadas mais recentes primeiro.
  const aulasRealizadas = concluidas
    .map((ag) => {
      const aulas = ag.atividadeIds
        .map((id) => ativPorId.get(id))
        .filter((a): a is Atividade => !!a && a.tipo === 0);
      return aulas.length ? { ag, aulas } : null;
    })
    .filter((x): x is { ag: Agendamento; aulas: Atividade[] } => !!x)
    .sort((a, b) => (b.ag.data + b.ag.inicio).localeCompare(a.ag.data + a.ag.inicio));

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
            <div className="text-xs uppercase text-muted-foreground">Data início</div>
            <div className="font-medium">{turma?.data || "—"}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs uppercase text-muted-foreground mb-1">Horários</div>
            {!turma?.horarios?.length ? (
              <div className="text-sm text-muted-foreground">—</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {turma.horarios.map((h, i) => (
                  <Badge key={i} variant="secondary" className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatHorarioSlot(h)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {turma?.descricao && (
            <div className="col-span-2">
              <div className="text-xs uppercase text-muted-foreground">Descrição</div>
              <div>{turma.descricao}</div>
            </div>
          )}
        </section>

        {/* Propriedades do curso herdadas pela turma */}
        {curso && (blocosDia > 0 || cargaTotal > 0 || habilidadesDoCurso.length > 0) && (
          <section className="mt-3 border rounded-md p-3 bg-muted/20 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5" />
              Propriedades do curso
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {cargaTotal > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Carga horária</div>
                  <div className="font-semibold">{formatMinutos(cargaTotal)}</div>
                </div>
              )}
              {blocosDia > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Aulas/dia</div>
                  <div className="font-semibold">{blocosDia}</div>
                </div>
              )}
              {duracaoAulaMin > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Duração/aula</div>
                  <div className="font-semibold">{formatMinutos(duracaoAulaMin)}</div>
                </div>
              )}
              {turnoDiarioMin > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Turno diário</div>
                  <div className="font-semibold">{formatMinutos(turnoDiarioMin)}</div>
                </div>
              )}
              {totalAulasEsperadas > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Total aulas</div>
                  <div className="font-semibold">{totalAulasEsperadas}</div>
                </div>
              )}
            </div>

            {habilidadesDoCurso.length > 0 && (
              <div>
                <div className="text-[10px] uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Habilidades
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {habilidadesDoCurso.map((h) => (
                    <Badge
                      key={h.id}
                      variant="secondary"
                      className="text-[10px] font-normal"
                      title={h.descricao}
                    >
                      <span className="font-semibold mr-1">{h.sigla}</span>
                      {h.nome ?? h.descricao}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Progresso de aulas (baseado em agendamentos concluídos) */}
        {totalAulasEsperadas > 0 && (
          <section className="mt-3">
            <div className="border rounded-md p-3 bg-muted/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-wide font-medium text-muted-foreground inline-flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" />
                  Progresso de aulas
                </span>
                <span className="font-mono text-muted-foreground">
                  {aulasConcluidas}/{totalAulasEsperadas} ({pctAgendamentos}%)
                </span>
              </div>
              <Progress value={pctAgendamentos} className="h-2" />
              <p className="text-[10px] text-muted-foreground">
                Agendamentos concluídos vs. total esperado pela carga horária
              </p>
            </div>
          </section>
        )}

        {totalAulas > 0 && (
          <section className="mt-3">
            <button
              type="button"
              onClick={() => setQuadroOpen(true)}
              className="w-full text-left group border rounded-md p-3 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors"
              title="Ver Quadro de Aulas"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="uppercase tracking-wide font-medium text-muted-foreground inline-flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Aulas dadas (por presenças)
                </span>
                <span className="font-mono text-muted-foreground group-hover:text-primary transition-colors">
                  {dadas}/{totalAulas} ({pct}%)
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </button>
          </section>
        )}

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
            <BookOpen className="h-3.5 w-3.5" />
            Aulas Realizadas ({aulasRealizadas.length})
          </h3>

          {aulasRealizadas.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-md p-6 text-center">
              Nenhuma aula realizada ainda. As aulas aparecem aqui quando o professor registra o
              relatório.
            </p>
          ) : (
            <ul className="border rounded-lg divide-y">
              {aulasRealizadas.map(({ ag, aulas }) => (
                <li key={ag.id} className="p-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ag.data} · {ag.inicio}–{ag.fim}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {aulas.map((a) => (
                          <Badge
                            key={a.id}
                            variant="outline"
                            className="inline-flex items-center gap-1"
                          >
                            <GraduationCap className="h-3 w-3" />
                            {a.nome}
                          </Badge>
                        ))}
                      </div>
                      {ag.professor && (
                        <div className="mt-1.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {ag.professor}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      <CalendarCheck className="h-3 w-3 mr-1" />
                      Concluída
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
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
                      <p className="text-xs text-muted-foreground mt-2 italic">{al.observacao}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </DialogContent>

      <QuadroAulasDialog
        open={quadroOpen}
        onOpenChange={setQuadroOpen}
        curso={curso ?? null}
        atividades={atividades}
        aulasDadasIds={aulasDadasIds}
      />
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
                    <Button size="sm" variant="outline" onClick={() => onReabrir(ag.id)}>
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
