import { useMemo, useState } from "react";
import { format } from "date-fns";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GraduationCap,
  ClipboardList,
  Users,
  CalendarClock,
  CalendarDays,
} from "lucide-react";
import { useAlunos } from "@/lib/alunos-store";
import { useCursos } from "@/lib/cursos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useAtividades } from "@/lib/atividades-store";
import { ScheduleCalendar } from "@/components/academic/ScheduleCalendar";
import { AgendarAtividadeDialog } from "@/components/academic/AgendarAtividadeDialog";
import { RegistrarRelatorioDialog } from "@/components/academic/RegistrarRelatorioDialog";
import { TurmaDiaDetailDialog } from "@/components/academic/TurmaDiaDetailDialog";
import { agendamentosStore, useAgendamentos } from "@/lib/agendamentos-store";
import { useCurrentUser } from "@/lib/auth-store";
import type { Agendamento, Curso, HorarioSlot, Turma } from "@/lib/academic-types";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — Sistema Acadêmico" },
      {
        name: "description",
        content:
          "Visão geral de cursos, turmas, alunos e próximas aulas e tarefas.",
      },
      { property: "og:title", content: "Painel — Sistema Acadêmico" },
      {
        property: "og:description",
        content:
          "Visão geral de cursos, turmas, alunos e próximas atividades.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const cursos = useCursos();
  const turmas = useTurmas();
  const atividades = useAtividades();
  const alunos = useAlunos();
  const agendamentos = useAgendamentos();
  const currentUser = useCurrentUser();

  const [agendarCtx, setAgendarCtx] = useState<{
    curso: Curso;
    turma: Turma;
    data: string;
    slot: HorarioSlot;
  } | null>(null);
  const [relatorioCtx, setRelatorioCtx] = useState<{
    agendamento: Agendamento;
    turma: Turma;
    curso: Curso;
  } | null>(null);
  const [diaDetailCtx, setDiaDetailCtx] = useState<{
    curso: Curso;
    turma: Turma;
    date: Date;
    slot: HorarioSlot;
  } | null>(null);

  const aulasCount = atividades.filter((a) => a.tipo === 0).length;
  const tarefasCount = atividades.filter((a) => a.tipo === 1).length;

  const cursoMap = useMemo(
    () => new Map(cursos.map((c) => [c.id, c])),
    [cursos],
  );

  const proximas = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return [...atividades]
      .filter((a) => a.prazo >= hoje)
      .sort((a, b) => a.prazo.localeCompare(b.prazo))
      .slice(0, 8);
  }, [atividades]);

  const stats = [
    {
      label: "Cursos",
      value: cursos.length,
      icon: BookOpen,
      to: "/cursos" as const,
    },
    { label: "Turmas", value: turmas.length, icon: Users },
    {
      label: "Alunos",
      value: alunos.length,
      icon: GraduationCap,
      to: "/alunos" as const,
    },
    {
      label: "Aulas / Tarefas",
      value: `${aulasCount} / ${tarefasCount}`,
      icon: ClipboardList,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">📊 Painel</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema acadêmico.
          </p>
        </header>

        {/* Cards-resumo */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {stats.map((s) => {
            const Icon = s.icon;
            const card = (
              <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    {s.label}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
              </div>
            );
            return s.to ? (
              <Link key={s.label} to={s.to} className="block">
                {card}
              </Link>
            ) : (
              <div key={s.label}>{card}</div>
            );
          })}
        </section>

        {/* Calendário */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight inline-flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendário
            </h2>
          </div>
          <ScheduleCalendar
            turmas={turmas}
            cursos={cursos}
            agendamentos={agendamentos}
            onCellHeaderClick={({ turma, date, inicio, fim, diaSemana }) => {
              const curso = cursoMap.get(turma.cursoId);
              if (!curso) return;
              setDiaDetailCtx({
                curso,
                turma,
                date,
                slot: { diaSemana, inicio, fim },
              });
            }}
            onRemoverAgendamento={(agendamento, turma) => {
              const isOwner =
                currentUser.role === "admin" ||
                agendamento.criadoPorUserId === currentUser.id;
              if (!isOwner) {
                toast.info("Apenas o professor que agendou pode remover.");
                return;
              }
              if (
                !window.confirm(
                  "Remover este agendamento? O slot ficará disponível novamente.",
                )
              )
                return;
              agendamentosStore.remove(agendamento.id);
              toast.success("Agendamento removido.");
            }}
            onRegistrarRelatorio={(agendamento, turma) => {
              const curso = cursoMap.get(turma.cursoId);
              if (!curso) return;
              const podeRegistrar =
                currentUser.role === "admin" ||
                agendamento.criadoPorUserId === currentUser.id;
              if (!podeRegistrar) {
                toast.info(
                  `Apenas ${agendamento.criadoPorNome ?? "o professor que agendou"} pode registrar o relatório.`,
                );
                return;
              }
              setRelatorioCtx({ agendamento, turma, curso });
            }}
            onSlotClick={({ turma, date, inicio, fim, diaSemana, estado, agendamento }) => {
              const curso = cursoMap.get(turma.cursoId);
              if (!curso) return;

              if (estado === "vazio_futuro") {
                setAgendarCtx({
                  curso,
                  turma,
                  data: format(date, "yyyy-MM-dd"),
                  slot: { diaSemana, inicio, fim },
                });
                return;
              }

              if ((estado === "agendado" || estado === "atrasado") && agendamento) {
                // Clique no slot ocupado abre o dialog de detalhes (menu Ver/Remover/Relatório)
                setDiaDetailCtx({
                  curso,
                  turma,
                  date,
                  slot: { diaSemana, inicio, fim },
                });
                return;
              }

              if (estado === "concluido") {
                setDiaDetailCtx({
                  curso,
                  turma,
                  date,
                  slot: { diaSemana, inicio, fim },
                });
              }
            }}
          />
        </section>

        {/* Cursos */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Cursos</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/cursos">
                <BookOpen /> Cursos
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((c) => {
              const turmasCurso = turmas.filter((t) => t.cursoId === c.id);
              const ativs = atividades.filter((a) => a.cursoId === c.id);
              return (
                <Link
                  key={c.id}
                  to="/cursos"
                  className="block bg-card border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{c.cod}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {ativs.length} atividades
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1">{c.nome}</h3>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {turmasCurso.length} turmas
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Alunos */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Alunos
            </h2>
            <span className="text-sm text-muted-foreground">
              {alunos.length} no total
            </span>
          </div>
          <div className="bg-card border rounded-lg divide-y">
            {cursos.map((c) => {
              const total = alunos.filter((a) => a.cursoId === c.id).length;
              return (
                <div
                  key={c.id}
                  className="p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                >
                  <Badge variant="outline" className="font-mono">
                    {c.cod}
                  </Badge>
                  <span className="font-medium flex-1 min-w-0 truncate">
                    {c.nome}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-mono tabular-nums">{total}</span>
                    <span className="hidden sm:inline">alunos</span>
                  </span>
                </div>
              );
            })}
            {cursos.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground text-center">
                Nenhum curso cadastrado.
              </p>
            )}
          </div>
        </section>

        {/* Próximas atividades */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight inline-flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Próximas atividades
            </h2>
            <Button asChild size="sm">
              <Link to="/atividades">
                <ClipboardList /> Atividades
              </Link>
            </Button>
          </div>

          {proximas.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-lg p-6 text-center">
              Nenhuma atividade futura cadastrada.
            </p>
          ) : (
            <ul className="bg-card border rounded-lg divide-y">
              {proximas.map((a) => {
                const isAula = a.tipo === 0;
                const curso = cursoMap.get(a.cursoId);
                return (
                  <li
                    key={a.id}
                    className="p-4 flex items-start gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <Badge
                      variant={isAula ? "default" : "secondary"}
                      className="gap-1 mt-0.5"
                    >
                      {isAula ? (
                        <GraduationCap className="h-3 w-3" />
                      ) : (
                        <ClipboardList className="h-3 w-3" />
                      )}
                      {isAula ? "Aula" : "Tarefa"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{a.nome}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {a.codigo}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {curso && <span>{curso.nome}</span>}
                        <span>📅 {a.prazo}</span>
                        <span>👤 {a.criadoPor}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {agendarCtx && (
        <AgendarAtividadeDialog
          open
          onOpenChange={(o) => !o && setAgendarCtx(null)}
          curso={agendarCtx.curso}
          turmas={turmas.filter((t) => t.cursoId === agendarCtx.curso.id)}
          atividades={atividades}
          defaultTurmaId={agendarCtx.turma.id}
          defaultData={agendarCtx.data}
          defaultSlot={agendarCtx.slot}
          lockTurmaEHorario
        />
      )}

      <RegistrarRelatorioDialog
        open={!!relatorioCtx}
        onOpenChange={(o) => !o && setRelatorioCtx(null)}
        agendamento={relatorioCtx?.agendamento ?? null}
        turma={relatorioCtx?.turma}
        curso={relatorioCtx?.curso}
        atividades={atividades}
      />

      {diaDetailCtx && (
        <TurmaDiaDetailDialog
          open
          onOpenChange={(o) => !o && setDiaDetailCtx(null)}
          curso={diaDetailCtx.curso}
          turma={diaDetailCtx.turma}
          date={diaDetailCtx.date}
          slot={diaDetailCtx.slot}
          agendamentos={agendamentos}
          atividades={atividades}
          onAgendar={(blocoIndex) => {
            setAgendarCtx({
              curso: diaDetailCtx.curso,
              turma: diaDetailCtx.turma,
              data: format(diaDetailCtx.date, "yyyy-MM-dd"),
              slot: diaDetailCtx.slot,
            });
          }}
          onRegistrarRelatorio={(agendamento) => {
            setRelatorioCtx({
              agendamento,
              turma: diaDetailCtx.turma,
              curso: diaDetailCtx.curso,
            });
          }}
          onRemoverAgendamento={(agendamento) => {
            const isOwner =
              currentUser.role === "admin" ||
              agendamento.criadoPorUserId === currentUser.id;
            if (!isOwner) {
              toast.info("Apenas o professor que agendou pode remover.");
              return;
            }
            if (
              !window.confirm(
                "Remover este agendamento? O slot ficará disponível novamente.",
              )
            )
              return;
            agendamentosStore.remove(agendamento.id);
            toast.success("Agendamento removido.");
            setDiaDetailCtx(null);
          }}
        />
      )}
    </div>
  );
}
