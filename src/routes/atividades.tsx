import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const atividades = SEED_ATIVIDADES;

  const porCurso = useMemo(() => {
    return cursos.map((c) => {
      const ativs = atividades.filter((a) => a.cursoId === c.id);
      return {
        curso: c,
        aulas: ativs.filter((a) => a.tipo === 0).length,
        tarefas: ativs.filter((a) => a.tipo === 1).length,
        total: ativs.length,
      };
    });
  }, [cursos, atividades]);

  const totalAulas = porCurso.reduce((acc, p) => acc + p.aulas, 0);
  const totalTarefas = porCurso.reduce((acc, p) => acc + p.tarefas, 0);

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
          <Button asChild variant="outline">
            <Link to="/cursos">
              <BookOpen /> Gerenciar cursos
            </Link>
          </Button>
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {porCurso.map(({ curso, aulas, tarefas, total }) => (
                <Link
                  key={curso.id}
                  to="/atividades/$cursoId"
                  params={{ cursoId: curso.id }}
                  className="block bg-card border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{curso.cod}</Badge>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      {total} atividades{" "}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <h3 className="font-semibold mb-3">{curso.nome}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md border bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium inline-flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" /> Aulas
                      </div>
                      <div className="text-lg font-bold">{aulas}</div>
                    </div>
                    <div className="rounded-md border bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium inline-flex items-center gap-1">
                        <ClipboardList className="h-3 w-3" /> Tarefas
                      </div>
                      <div className="text-lg font-bold">{tarefas}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
