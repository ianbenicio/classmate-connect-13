import { useEffect, useMemo, useState } from "react";
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
import { GraduationCap, ClipboardList, Plus, Users } from "lucide-react";
import { ActivityFormDialog } from "@/components/academic/ActivityFormDialog";
import { CourseFormDialog } from "@/components/academic/CourseFormDialog";
import { SkillDetailDialog } from "@/components/academic/SkillDetailDialog";
import { CourseDetailDialog } from "@/components/academic/CourseDetailDialog";
import { TurmaFormDialog } from "@/components/academic/TurmaFormDialog";
import { TurmaDetailDialog } from "@/components/academic/TurmaDetailDialog";
import { QuadroAulasDialog } from "@/components/academic/QuadroAulasDialog";
import { Progress } from "@/components/ui/progress";
import { useGruposByCursoCod } from "@/lib/grupos-store";
import {
  addMinutesToHHMM,
  getTurnoDiarioMin,
  type Atividade,
  type AtividadeTipo,
  type Curso,
  type Habilidade,
  type Turma,
} from "@/lib/academic-types";
import { toast } from "sonner";

import { useAgendamentos } from "@/lib/agendamentos-store";
import { cursosStore, useCursos } from "@/lib/cursos-store";
import { turmasStore, useTurmas } from "@/lib/turmas-store";
import { atividadesStore, useAtividades } from "@/lib/atividades-store";
import { useAlunos } from "@/lib/alunos-store";
import { useHabilidades } from "@/lib/habilidades-store";

export const Route = createFileRoute("/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos — Sistema Acadêmico" },
      {
        name: "description",
        content:
          "Gerencie cursos, turmas e atividades. Selecione um curso para visualizar suas aulas e tarefas.",
      },
      { property: "og:title", content: "Cursos — Sistema Acadêmico" },
      {
        property: "og:description",
        content: "Gerencie cursos, turmas e atividades acadêmicas.",
      },
    ],
  }),
  component: CursosPage,
});

function CursosPage() {
  const cursos = useCursos();
  const turmas = useTurmas();
  const alunos = useAlunos();
  const atividades = useAtividades();
  const habilidades = useHabilidades();
  const gruposByCursoCod = useGruposByCursoCod();

  const [cursoSelecionado, setCursoSelecionado] = useState<Curso | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Atividade | undefined>();
  const [defaultTipo, setDefaultTipo] = useState<AtividadeTipo>(0);

  const [cursoFormOpen, setCursoFormOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | undefined>();

  const [turmaFormOpen, setTurmaFormOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | undefined>();
  const [turmaDetalhe, setTurmaDetalhe] = useState<Turma | null>(null);
  const [confirmDeleteTurma, setConfirmDeleteTurma] = useState<Turma | null>(null);

  const [habilidadeDetalhe, setHabilidadeDetalhe] = useState<Habilidade | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Atividade | null>(null);

  const [quadroCurso, setQuadroCurso] = useState<Curso | null>(null);

  const habilidadeMap = useMemo(() => new Map(habilidades.map((h) => [h.id, h])), [habilidades]);

  const turmasPorCurso = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of turmas) map.set(t.cursoId, (map.get(t.cursoId) ?? 0) + 1);
    return map;
  }, [turmas]);

  const contagemPorCurso = useMemo(() => {
    const map = new Map<string, { aulas: number; tarefas: number }>();
    for (const c of cursos) map.set(c.id, { aulas: 0, tarefas: 0 });
    for (const a of atividades) {
      const c = map.get(a.cursoId);
      if (!c) continue;
      if (a.tipo === 0) c.aulas++;
      else c.tarefas++;
    }
    return map;
  }, [atividades, cursos]);

  // Conjunto de atividades (aulas) consideradas "dadas" por curso —
  // quando ao menos um aluno tem presença=true.
  const aulasDadasPorCurso = useMemo(() => {
    const aulaIdsPorCurso = new Map<string, Set<string>>();
    for (const a of atividades) {
      if (a.tipo !== 0) continue;
      let s = aulaIdsPorCurso.get(a.cursoId);
      if (!s) {
        s = new Set();
        aulaIdsPorCurso.set(a.cursoId, s);
      }
      s.add(a.id);
    }
    const dadasPorCurso = new Map<string, Set<string>>();
    for (const c of cursos) dadasPorCurso.set(c.id, new Set());
    for (const al of alunos) {
      if (!al.cursoId) continue;
      const validos = aulaIdsPorCurso.get(al.cursoId);
      if (!validos) continue;
      const dadas = dadasPorCurso.get(al.cursoId)!;
      for (const r of al.aulas ?? []) {
        if (r.presente && validos.has(r.atividadeId)) dadas.add(r.atividadeId);
      }
    }
    return dadasPorCurso;
  }, [atividades, alunos, cursos]);

  const agendamentos = useAgendamentos();

  useEffect(() => {
    if (!cursoSelecionado) return;
    const nextCurso = cursos.find(
      (c) => c.id === cursoSelecionado.id || c.cod === cursoSelecionado.cod,
    );
    if (!nextCurso) {
      setCursoSelecionado(null);
      return;
    }
    if (nextCurso.id !== cursoSelecionado.id) {
      setCursoSelecionado(nextCurso);
    }
  }, [cursos, cursoSelecionado]);

  const handleSaveCurso = (curso: Curso) => {
    cursosStore.upsert(curso);
    if (cursoSelecionado?.id === curso.id) setCursoSelecionado(curso);

    // Migra automaticamente as turmas deste curso: recalcula o `fim` de
    // cada slot com base no novo turnoDiarioMin do curso.
    const turno = getTurnoDiarioMin(curso);
    if (turno > 0) {
      const next = turmasStore.getAll().map((t) =>
        t.cursoId === curso.id
          ? {
              ...t,
              horarios: t.horarios.map((h) => ({
                ...h,
                fim: addMinutesToHHMM(h.inicio, turno),
              })),
            }
          : t,
      );
      turmasStore.setMany(next);
    }
  };

  const handleSave = (atividade: Atividade) => {
    atividadesStore.upsert(atividade);
  };

  const handleDelete = (a: Atividade) => {
    atividadesStore.remove(a.id);
    toast.success("Atividade removida");
    setConfirmDelete(null);
  };

  const handleSaveTurma = (turma: Turma) => {
    turmasStore.upsert(turma);
  };

  const handleDeleteTurma = (t: Turma) => {
    turmasStore.remove(t.id);
    toast.success("Turma removida");
    setConfirmDeleteTurma(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">📚 Cursos</h1>
            <p className="text-muted-foreground mt-1">
              Selecione um curso para visualizar suas atividades.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingCurso(undefined);
              setCursoFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo curso
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((c) => {
            const cont = contagemPorCurso.get(c.id) ?? { aulas: 0, tarefas: 0 };
            const numTurmas = turmasPorCurso.get(c.id) ?? 0;
            const dadas = aulasDadasPorCurso.get(c.id)?.size ?? 0;
            const totalAulas = cont.aulas;
            const pct = totalAulas > 0 ? Math.round((dadas / totalAulas) * 100) : 0;

            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setCursoSelecionado(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setCursoSelecionado(c);
                  }
                }}
                className="cursor-pointer text-left bg-card border rounded-lg p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{c.cod}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {cont.aulas + cont.tarefas} atividades
                  </span>
                </div>
                <h2 className="text-xl font-semibold mb-1">{c.nome}</h2>
                {c.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.descricao}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {numTurmas} turmas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {cont.aulas} aulas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {cont.tarefas} tarefas
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CourseDetailDialog
        curso={cursoSelecionado}
        atividades={atividades}
        turmas={turmas}
        alunos={alunos}
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
        onEditCurso={(c) => {
          setEditingCurso(c);
          setCursoFormOpen(true);
        }}
        onNewTurma={() => {
          setEditingTurma(undefined);
          setTurmaFormOpen(true);
        }}
        onEditTurma={(t) => {
          setEditingTurma(t);
          setTurmaFormOpen(true);
        }}
        onDeleteTurma={(t) => setConfirmDeleteTurma(t)}
        onTurmaClick={(t) => setTurmaDetalhe(t)}
        onShowQuadro={(c) => setQuadroCurso(c)}
      />

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        cursos={cursos}
        grupos={gruposByCursoCod}
        habilidades={habilidades}
        editing={editing}
        defaultTipo={defaultTipo}
        onSave={handleSave}
      />

      <SkillDetailDialog
        habilidade={habilidadeDetalhe}
        onOpenChange={(open) => !open && setHabilidadeDetalhe(null)}
      />

      <CourseFormDialog
        open={cursoFormOpen}
        onOpenChange={setCursoFormOpen}
        editing={editingCurso}
        onSave={handleSaveCurso}
      />

      {cursoSelecionado && (
        <TurmaFormDialog
          open={turmaFormOpen}
          onOpenChange={setTurmaFormOpen}
          cursoId={cursoSelecionado.id}
          curso={cursoSelecionado}
          editing={editingTurma}
          onSave={handleSaveTurma}
        />
      )}

      <TurmaDetailDialog
        turma={turmaDetalhe}
        curso={turmaDetalhe ? cursos.find((c) => c.id === turmaDetalhe.cursoId) : undefined}
        alunos={alunos}
        atividades={atividades}
        onOpenChange={(open) => !open && setTurmaDetalhe(null)}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A atividade <strong>{confirmDelete?.nome}</strong>{" "}
              será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDelete(confirmDelete)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDeleteTurma}
        onOpenChange={(open) => !open && setConfirmDeleteTurma(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma <strong>{confirmDeleteTurma?.nome}</strong> será removida. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteTurma && handleDeleteTurma(confirmDeleteTurma)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuadroAulasDialog
        open={!!quadroCurso}
        onOpenChange={(open) => !open && setQuadroCurso(null)}
        curso={quadroCurso}
        atividades={atividades}
        aulasDadasIds={
          quadroCurso ? (aulasDadasPorCurso.get(quadroCurso.id) ?? new Set()) : new Set()
        }
      />
    </div>
  );
}
