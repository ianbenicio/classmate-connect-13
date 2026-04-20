import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
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
  ArrowLeft,
  ClipboardList,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { ActivityFormDialog } from "@/components/academic/ActivityFormDialog";
import {
  SEED_ATIVIDADES,
  SEED_CURSOS,
  SEED_GRUPOS,
  SEED_HABILIDADES,
  SEED_TURMAS,
} from "@/lib/academic-seed";
import {
  getGrupoNome,
  type Atividade,
  type AtividadeTipo,
} from "@/lib/academic-types";
import { toast } from "sonner";

export const Route = createFileRoute("/atividades/$cursoId")({
  loader: ({ params }) => {
    const curso = SEED_CURSOS.find((c) => c.id === params.cursoId);
    if (!curso) throw notFound();
    return { curso };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.curso.nome ?? "Curso"} — Atividades`,
      },
      {
        name: "description",
        content: `Aulas e tarefas do curso ${loaderData?.curso.nome ?? ""}.`,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Curso não encontrado</h1>
      <Button asChild variant="outline">
        <Link to="/atividades">Voltar para Atividades</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p>Erro: {error.message}</p>
      <Button asChild variant="outline">
        <Link to="/atividades">Voltar</Link>
      </Button>
    </div>
  ),
  component: CursoAtividadesPage,
});

function CursoAtividadesPage() {
  const { curso } = Route.useLoaderData();

  const [atividades, setAtividades] = useState<Atividade[]>(SEED_ATIVIDADES);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Atividade | undefined>();
  const [defaultTipo, setDefaultTipo] = useState<AtividadeTipo>(0);
  const [confirmDelete, setConfirmDelete] = useState<Atividade | null>(null);

  const turmasDoCurso = useMemo(
    () => SEED_TURMAS.filter((t) => t.cursoId === curso.id),
    [curso.id],
  );

  const { aulas, tarefas } = useMemo(() => {
    const doCurso = atividades.filter((a) => a.cursoId === curso.id);
    return {
      aulas: doCurso.filter((a) => a.tipo === 0),
      tarefas: doCurso.filter((a) => a.tipo === 1),
    };
  }, [atividades, curso.id]);

  const handleSave = (atividade: Atividade) => {
    setAtividades((prev) => {
      const exists = prev.some((a) => a.id === atividade.id);
      return exists
        ? prev.map((a) => (a.id === atividade.id ? atividade : a))
        : [atividade, ...prev];
    });
  };

  const handleDelete = (a: Atividade) => {
    setAtividades((prev) => prev.filter((x) => x.id !== a.id));
    toast.success("Atividade removida");
    setConfirmDelete(null);
  };

  const openNew = (tipo: AtividadeTipo) => {
    setEditing(undefined);
    setDefaultTipo(tipo);
    setFormOpen(true);
  };

  const openEdit = (a: Atividade) => {
    setEditing(a);
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/atividades">
            <ArrowLeft /> Voltar
          </Link>
        </Button>

        {/* Cabeçalho do curso */}
        <header className="mb-8 bg-card border rounded-lg p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{curso.cod}</Badge>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {turmasDoCurso.length} turmas
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {curso.nome}
              </h1>
              {curso.descricao && (
                <p className="text-muted-foreground mt-2 max-w-2xl">
                  {curso.descricao}
                </p>
              )}
            </div>
            <div className="flex gap-3 text-sm">
              <div className="rounded-md border bg-muted/40 px-4 py-2 text-center min-w-[88px]">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium inline-flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" /> Aulas
                </div>
                <div className="text-2xl font-bold">{aulas.length}</div>
              </div>
              <div className="rounded-md border bg-muted/40 px-4 py-2 text-center min-w-[88px]">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium inline-flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" /> Tarefas
                </div>
                <div className="text-2xl font-bold">{tarefas.length}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Duas colunas: Aulas | Tarefas */}
        <div className="grid gap-6 md:grid-cols-2">
          <ActivityColumn
            title="Aulas"
            icon={<GraduationCap className="h-5 w-5" />}
            items={aulas}
            emptyText="Nenhuma aula cadastrada."
            onAdd={() => openNew(0)}
            onEdit={openEdit}
            onDelete={(a) => setConfirmDelete(a)}
          />
          <ActivityColumn
            title="Tarefas"
            icon={<ClipboardList className="h-5 w-5" />}
            items={tarefas}
            emptyText="Nenhuma tarefa cadastrada."
            onAdd={() => openNew(1)}
            onEdit={openEdit}
            onDelete={(a) => setConfirmDelete(a)}
          />
        </div>
      </div>

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        cursos={[curso]}
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

function ActivityColumn({
  title,
  icon,
  items,
  emptyText,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: React.ReactNode;
  items: Atividade[];
  emptyText: string;
  onAdd: () => void;
  onEdit: (a: Atividade) => void;
  onDelete: (a: Atividade) => void;
}) {
  return (
    <section className="bg-card border rounded-lg shadow-sm flex flex-col">
      <header className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold inline-flex items-center gap-2">
          {icon} {title}
          <Badge variant="secondary" className="ml-1">
            {items.length}
          </Badge>
        </h2>
        <Button size="sm" onClick={onAdd}>
          <Plus /> Adicionar
        </Button>
      </header>

      <div className="p-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {emptyText}
          </p>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md border bg-background p-3 hover:border-primary/40 transition-colors"
            >
                <div className="min-w-0">
                <div className="font-medium truncate">{a.nome}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {a.codigo} · {getGrupoNome(SEED_GRUPOS, a.cursoId, a.grupo)}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(a)}
                  aria-label={`Editar ${a.nome}`}
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(a)}
                  aria-label={`Remover ${a.nome}`}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
