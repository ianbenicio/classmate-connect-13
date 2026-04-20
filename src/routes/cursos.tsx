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
import { GraduationCap, ClipboardList, Plus, Users } from "lucide-react";
import { ActivityFormDialog } from "@/components/academic/ActivityFormDialog";
import { CourseFormDialog } from "@/components/academic/CourseFormDialog";
import { SkillDetailDialog } from "@/components/academic/SkillDetailDialog";
import { CourseDetailDialog } from "@/components/academic/CourseDetailDialog";
import { TurmaFormDialog } from "@/components/academic/TurmaFormDialog";
import { TurmaDetailDialog } from "@/components/academic/TurmaDetailDialog";
import {
  SEED_ALUNOS,
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
  Turma,
} from "@/lib/academic-types";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useAgendamentos } from "@/lib/agendamentos-store";

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
  const [cursos, setCursos] = useState<Curso[]>(SEED_CURSOS);
  const [turmas, setTurmas] = useState<Turma[]>(SEED_TURMAS);
  const [alunos] = useState(SEED_ALUNOS);
  const [atividades, setAtividades] = useState<Atividade[]>(SEED_ATIVIDADES);
  const [habilidades] = useState<Habilidade[]>(SEED_HABILIDADES);

  const [cursoSelecionado, setCursoSelecionado] = useState<Curso | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Atividade | undefined>();
  const [defaultTipo, setDefaultTipo] = useState<AtividadeTipo>(0);

  const [cursoFormOpen, setCursoFormOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | undefined>();

  const [turmaFormOpen, setTurmaFormOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | undefined>();
  const [turmaDetalhe, setTurmaDetalhe] = useState<Turma | null>(null);
  const [confirmDeleteTurma, setConfirmDeleteTurma] = useState<Turma | null>(
    null,
  );

  const [habilidadeDetalhe, setHabilidadeDetalhe] =
    useState<Habilidade | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Atividade | null>(null);

  const habilidadeMap = useMemo(
    () => new Map(habilidades.map((h) => [h.id, h])),
    [habilidades],
  );

  const turmasPorCurso = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of turmas)
      map.set(t.cursoId, (map.get(t.cursoId) ?? 0) + 1);
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

  const agendamentos = useAgendamentos();

  // Progresso de aulas por curso: soma de aulas concluídas em todas as turmas
  // / (total de aulas do curso × número de turmas).
  const progressoPorCurso = useMemo(() => {
    const aulasIdsPorCurso = new Map<string, Set<string>>();
    for (const a of atividades) {
      if (a.tipo !== 0) continue;
      let set = aulasIdsPorCurso.get(a.cursoId);
      if (!set) {
        set = new Set();
        aulasIdsPorCurso.set(a.cursoId, set);
      }
      set.add(a.id);
    }
    const turmaToCurso = new Map(turmas.map((t) => [t.id, t.cursoId]));
    const dadasPorCursoTurma = new Map<string, Map<string, Set<string>>>();
    for (const ag of agendamentos) {
      if (ag.status !== "concluido") continue;
      const cursoId = turmaToCurso.get(ag.turmaId);
      if (!cursoId) continue;
      const aulasSet = aulasIdsPorCurso.get(cursoId);
      if (!aulasSet) continue;
      let porTurma = dadasPorCursoTurma.get(cursoId);
      if (!porTurma) {
        porTurma = new Map();
        dadasPorCursoTurma.set(cursoId, porTurma);
      }
      let s = porTurma.get(ag.turmaId);
      if (!s) {
        s = new Set();
        porTurma.set(ag.turmaId, s);
      }
      for (const aid of ag.atividadeIds) {
        if (aulasSet.has(aid)) s.add(aid);
      }
    }
    const result = new Map<string, { dadas: number; total: number; pct: number }>();
    for (const c of cursos) {
      const totalAulas = aulasIdsPorCurso.get(c.id)?.size ?? 0;
      const numTurmas = turmasPorCurso.get(c.id) ?? 0;
      const total = totalAulas * numTurmas;
      let dadas = 0;
      const porTurma = dadasPorCursoTurma.get(c.id);
      if (porTurma) {
        for (const s of porTurma.values()) dadas += s.size;
      }
      const pct = total > 0 ? Math.round((dadas / total) * 100) : 0;
      result.set(c.id, { dadas, total, pct });
    }
    return result;
  }, [atividades, agendamentos, cursos, turmas, turmasPorCurso]);

  const handleSaveCurso = (curso: Curso) => {
    setCursos((prev) => {
      const exists = prev.some((c) => c.id === curso.id);
      return exists
        ? prev.map((c) => (c.id === curso.id ? curso : c))
        : [...prev, curso];
    });
    if (cursoSelecionado?.id === curso.id) setCursoSelecionado(curso);
  };

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

  const handleSaveTurma = (turma: Turma) => {
    setTurmas((prev) => {
      const exists = prev.some((t) => t.id === turma.id);
      return exists
        ? prev.map((t) => (t.id === turma.id ? turma : t))
        : [...prev, turma];
    });
  };

  const handleDeleteTurma = (t: Turma) => {
    setTurmas((prev) => prev.filter((x) => x.id !== t.id));
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
            const prog = progressoPorCurso.get(c.id) ?? { dadas: 0, total: 0, pct: 0 };
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
                {prog.total > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span className="uppercase tracking-wide font-medium">
                        Aulas dadas
                      </span>
                      <span className="font-mono">
                        {prog.dadas}/{prog.total} ({prog.pct}%)
                      </span>
                    </div>
                    <Progress value={prog.pct} className="h-1.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <CourseDetailDialog
        curso={cursoSelecionado}
        atividades={atividades}
        turmas={turmas}
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
      />

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        cursos={cursos}
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
          editing={editingTurma}
          onSave={handleSaveTurma}
        />
      )}

      <TurmaDetailDialog
        turma={turmaDetalhe}
        curso={
          turmaDetalhe
            ? cursos.find((c) => c.id === turmaDetalhe.cursoId)
            : undefined
        }
        alunos={alunos}
        atividades={atividades}
        onOpenChange={(open) => !open && setTurmaDetalhe(null)}
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

      <AlertDialog
        open={!!confirmDeleteTurma}
        onOpenChange={(open) => !open && setConfirmDeleteTurma(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma <strong>{confirmDeleteTurma?.nome}</strong> será removida.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDeleteTurma && handleDeleteTurma(confirmDeleteTurma)
              }
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
