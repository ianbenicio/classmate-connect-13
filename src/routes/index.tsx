import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  GraduationCap,
  ClipboardList,
  Users,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import {
  SEED_ALUNOS,
  SEED_ATIVIDADES,
  SEED_CURSOS,
  SEED_TURMAS,
} from "@/lib/academic-seed";

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
  const cursos = SEED_CURSOS;
  const turmas = SEED_TURMAS;
  const atividades = SEED_ATIVIDADES;
  const alunos = SEED_ALUNOS;

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
    { label: "Alunos", value: alunos.length, icon: GraduationCap },
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

        {/* Cursos */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Cursos</h2>
            <Link
              to="/cursos"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Gerenciar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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

        {/* Próximas atividades */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight inline-flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Próximas atividades
            </h2>
            <Link
              to="/cursos"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
    </div>
  );
}
