import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { GraduationCap, ClipboardList, Plus } from "lucide-react";
import { ActivityFormDialog } from "@/components/academic/ActivityFormDialog";
import { CourseFormDialog } from "@/components/academic/CourseFormDialog";
import { SkillDetailDialog } from "@/components/academic/SkillDetailDialog";
import { CourseDetailDialog } from "@/components/academic/CourseDetailDialog";
import {
  SEED_ATIVIDADES,
  SEED_CURSOS,
  SEED_GRUPOS,
  SEED_HABILIDADES,
  SEED_TURMAS,
} from "@/lib/academic-seed";
import type {
  Atividade,
  AtividadeTipo,
  Curso,
  Habilidade,
} from "@/lib/academic-types";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atividades — Sistema Acadêmico" },
      {
        name: "description",
        content:
          "Selecione um curso para visualizar e gerenciar suas aulas e tarefas.",
      },
    ],
  }),
  component: AtividadesPage,
});

function AtividadesPage() {
  const [atividades, setAtividades] = useState<Atividade[]>(SEED_ATIVIDADES);
  const [habilidades] = useState<Habilidade[]>(SEED_HABILIDADES);

  const [cursoSelecionado, setCursoSelecionado] = useState<Curso | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Atividade | undefined>();
  const [defaultTipo, setDefaultTipo] = useState<AtividadeTipo>(0);

  const [habilidadeDetalhe, setHabilidadeDetalhe] =
    useState<Habilidade | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Atividade | null>(null);

  const habilidadeMap = useMemo(
    () => new Map(habilidades.map((h) => [h.id, h])),
    [habilidades],
  );

  const contagemPorCurso = useMemo(() => {
    const map = new Map<string, { aulas: number; tarefas: number }>();
    for (const c of SEED_CURSOS) map.set(c.id, { aulas: 0, tarefas: 0 });
    for (const a of atividades) {
      const c = map.get(a.cursoId);
      if (!c) continue;
      if (a.tipo === 0) c.aulas++;
      else c.tarefas++;
    }
    return map;
  }, [atividades]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">📚 Cursos</h1>
          <p className="text-muted-foreground mt-1">
            Selecione um curso para visualizar suas atividades.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SEED_CURSOS.map((c) => {
            const cont = contagemPorCurso.get(c.id) ?? { aulas: 0, tarefas: 0 };
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCursoSelecionado(c)}
                className="text-left bg-card border rounded-lg p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{c.cod}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {cont.aulas + cont.tarefas} atividades
                  </span>
                </div>
                <h2 className="text-xl font-semibold mb-1">{c.nome}</h2>
                {c.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {c.descricao}
                  </p>
                )}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {cont.aulas} aulas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {cont.tarefas} tarefas
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalhe do curso com lista + filtros */}
      <CourseDetailDialog
        curso={cursoSelecionado}
        atividades={atividades}
        habilidadeMap={habilidadeMap}
        onOpenChange={(open) => !open && setCursoSelecionado(null)}
        onNew={(tipo) => {
          setEditing(undefined);
          setDefaultTipo(tipo);
          setFormOpen(true);
        }}
        onEdit={(a) => {
          setEditing(a);
          setFormOpen(true);
        }}
        onDelete={(a) => setConfirmDelete(a)}
        onSkillClick={(h) => setHabilidadeDetalhe(h)}
      />

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        cursos={SEED_CURSOS}
        grupos={SEED_GRUPOS}
        habilidades={habilidades}
        editing={editing}
        defaultTipo={defaultTipo}
        onSave={handleSave}
      />

      <SkillDetailDialog
        habilidade={habilidadeDetalhe}
        onOpenChange={(open) => !open && setHabilidadeDetalhe(null)}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A atividade{" "}
              <strong>{confirmDelete?.nome}</strong> será removida permanentemente.
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
