import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  GraduationCap,
  ClipboardList,
  ArrowRight,
  BookOpen,
  Plus,
} from "lucide-react";
import {
  SEED_ATIVIDADES,
  SEED_CURSOS,
  SEED_GRUPOS,
  SEED_HABILIDADES,
  SEED_TURMAS,
} from "@/lib/academic-seed";
import { ActivityFormDialog } from "@/components/academic/ActivityFormDialog";
import type { Atividade } from "@/lib/academic-types";
import { toast } from "sonner";

export const Route = createFileRoute("/atividades")({
  head: () => ({
    meta: [
      { title: "Atividades — Sistema Acadêmico" },
      {
        name: "description",
        content:
          "Veja a quantidade de aulas e tarefas cadastradas em cada curso.",
      },
      { property: "og:title", content: "Atividades — Sistema Acadêmico" },
      {
        property: "og:description",
        content: "Aulas e tarefas organizadas por curso.",
      },
    ],
  }),
  component: AtividadesPage,
});

function AtividadesPage() {
  const cursos = SEED_CURSOS;
  const [atividades, setAtividades] = useState<Atividade[]>(SEED_ATIVIDADES);
  const [formOpen, setFormOpen] = useState(false);

  const porCurso = useMemo(() => {
    return cursos.map((c) => {
      const ativs = atividades.filter((a) => a.cursoId === c.id);
      const aulas = ativs.filter((a) => a.tipo === 0);
      const tarefas = ativs.filter((a) => a.tipo === 1);
      return { curso: c, aulas, tarefas, total: ativs.length };
    });
  }, [cursos, atividades]);

  const totalAulas = porCurso.reduce((acc, p) => acc + p.aulas.length, 0);
  const totalTarefas = porCurso.reduce((acc, p) => acc + p.tarefas.length, 0);

  const handleSave = (atividade: Atividade) => {
    setAtividades((prev) => {
      const exists = prev.some((a) => a.id === atividade.id);
      return exists
        ? prev.map((a) => (a.id === atividade.id ? atividade : a))
        : [atividade, ...prev];
    });
    toast.success("Atividade salva");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              📋 Atividades
            </h1>
            <p className="text-muted-foreground mt-1">
              Aulas e tarefas organizadas por curso.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setFormOpen(true)}>
              <Plus /> Nova Atividade
            </Button>
            <Button asChild variant="outline">
              <Link to="/cursos">
                <BookOpen /> Gerenciar cursos
              </Link>
            </Button>
          </div>
        </header>

        {/* Resumo geral */}
        <section className="grid gap-3 sm:grid-cols-3 mb-10">
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Cursos
              </span>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{cursos.length}</div>
          </div>
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Aulas
              </span>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{totalAulas}</div>
          </div>
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Tarefas
              </span>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{totalTarefas}</div>
          </div>
        </section>

        {/* Cursos com contagem de atividades */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Atividades por curso
            </h2>
          </div>

          {porCurso.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-lg p-6 text-center">
              Nenhum curso cadastrado.
            </p>
          ) : (
            <Accordion
              type="multiple"
              className="space-y-2"
            >
              {porCurso.map(({ curso, aulas, tarefas, total }) => (
                <AccordionItem
                  key={curso.id}
                  value={curso.id}
                  className="bg-card border rounded-lg shadow-sm px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <Badge variant="outline" className="shrink-0">
                        {curso.cod}
                      </Badge>
                      <span className="font-semibold truncate text-left">
                        {curso.nome}
                      </span>
                      <div className="ml-auto flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {aulas.length}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ClipboardList className="h-3.5 w-3.5" />
                          {tarefas.length}
                        </span>
                        <Badge variant="secondary">{total}</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="flex justify-end mb-3">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/atividades/$cursoId"
                          params={{ cursoId: curso.id }}
                        >
                          Abrir curso <ArrowRight />
                        </Link>
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ActivityList
                        title="Aulas"
                        icon={<GraduationCap className="h-4 w-4" />}
                        items={aulas}
                        emptyText="Nenhuma aula cadastrada."
                      />
                      <ActivityList
                        title="Tarefas"
                        icon={<ClipboardList className="h-4 w-4" />}
                        items={tarefas}
                        emptyText="Nenhuma tarefa cadastrada."
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </section>
      </div>

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        cursos={cursos}
        turmas={SEED_TURMAS}
        grupos={SEED_GRUPOS}
        habilidades={SEED_HABILIDADES}
        onSave={handleSave}
      />
    </div>
  );
}

function ActivityList({
  title,
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  items: Atividade[];
  emptyText: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {items.length}
        </Badge>
      </div>
      <div className="p-2 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {emptyText}
          </p>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="rounded-md border bg-background px-3 py-2"
            >
              <div className="text-sm font-medium truncate">{a.nome}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {a.codigo} · {a.grupo}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
