import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  GraduationCap,
  ClipboardList,
  BookOpen,
  Plus,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import {
  SEED_ATIVIDADES,
  SEED_CURSOS,
  SEED_GRUPOS,
  SEED_HABILIDADES,
  SEED_TURMAS,
} from "@/lib/academic-seed";
import { ActivityFormDialog } from "@/components/academic/ActivityFormDialog";
import { CourseActivitiesDialog } from "@/components/academic/CourseActivitiesDialog";
import { PendingReportsDialog } from "@/components/academic/PendingReportsDialog";
import type {
  Atividade,
  AtividadeTipo,
  Curso,
} from "@/lib/academic-types";
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
  const [editing, setEditing] = useState<Atividade | undefined>();
  const [defaultTipo, setDefaultTipo] = useState<AtividadeTipo>(0);
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Atividade | null>(null);
  const [pendentesOpen, setPendentesOpen] = useState(false);

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

  const handleNew = (tipo: AtividadeTipo) => {
    setEditing(undefined);
    setDefaultTipo(tipo);
    setFormOpen(true);
  };

  const handleEdit = (a: Atividade) => {
    setEditing(a);
    setFormOpen(true);
  };

  const handleDelete = (a: Atividade) => {
    setAtividades((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Atividade removida");
    setConfirmDelete(null);
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
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setPendentesOpen(true)}
            >
              <ClipboardCheck /> Registrar Relatório
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setDefaultTipo(0);
                setFormOpen(true);
              }}
            >
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
            <p className="text-xs text-muted-foreground">
              Clique em um curso para ver suas atividades
            </p>
          </div>

          {porCurso.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-lg p-6 text-center">
              Nenhum curso cadastrado.
            </p>
          ) : (
            <div className="grid gap-2">
              {porCurso.map(({ curso, aulas, tarefas, total }) => (
                <button
                  key={curso.id}
                  type="button"
                  onClick={() => setSelectedCurso(curso)}
                  className="bg-card border rounded-lg shadow-sm px-4 py-4 text-left hover:border-primary/50 hover:shadow transition-all flex items-center gap-3"
                >
                  <Badge variant="outline" className="shrink-0">
                    {curso.cod}
                  </Badge>
                  <span className="font-semibold truncate flex-1 min-w-0">
                    {curso.nome}
                  </span>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {aulas.length}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClipboardList className="h-3.5 w-3.5" />
                      {tarefas.length}
                    </span>
                    <Badge variant="secondary">{total}</Badge>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <CourseActivitiesDialog
        curso={selectedCurso}
        atividades={atividades}
        onOpenChange={(open) => !open && setSelectedCurso(null)}
        onNew={(tipo) => {
          if (!selectedCurso) return;
          setEditing(undefined);
          setDefaultTipo(tipo);
          setFormOpen(true);
        }}
        onEdit={handleEdit}
        onDelete={(a) => setConfirmDelete(a)}
      />

      <PendingReportsDialog
        open={pendentesOpen}
        onOpenChange={setPendentesOpen}
        cursos={cursos}
        turmas={SEED_TURMAS}
        atividades={atividades}
      />

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        cursos={cursos}
        grupos={SEED_GRUPOS}
        habilidades={SEED_HABILIDADES}
        editing={editing}
        defaultTipo={defaultTipo}
        onSave={handleSave}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              A atividade <strong>{confirmDelete?.nome}</strong> será removida
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
