import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Pencil, Plus, Trash2, GraduationCap, ClipboardList } from "lucide-react";
import { ActivityFormDialog } from "@/components/academic/ActivityFormDialog";
import { SkillDetailDialog } from "@/components/academic/SkillDetailDialog";
import {
  SEED_ATIVIDADES,
  SEED_CURSOS,
  SEED_GRUPOS,
  SEED_HABILIDADES,
} from "@/lib/academic-seed";
import type {
  Atividade,
  AtividadeTipo,
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
          "Registro e gestão de aulas e tarefas com vinculação de habilidades.",
      },
    ],
  }),
  component: AtividadesPage,
});

type FiltroTipo = "todos" | "aulas" | "tarefas";

function AtividadesPage() {
  const [atividades, setAtividades] = useState<Atividade[]>(SEED_ATIVIDADES);
  const [habilidades] = useState<Habilidade[]>(SEED_HABILIDADES);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [filtroCurso, setFiltroCurso] = useState<string>("todos");
  const [filtroGrupo, setFiltroGrupo] = useState<string>("todos");

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
  const cursoMap = useMemo(
    () => new Map(SEED_CURSOS.map((c) => [c.id, c])),
    [],
  );

  const filtradas = useMemo(() => {
    return atividades.filter((a) => {
      if (filtroTipo === "aulas" && a.tipo !== 0) return false;
      if (filtroTipo === "tarefas" && a.tipo !== 1) return false;
      if (filtroCurso !== "todos" && a.cursoId !== filtroCurso) return false;
      if (filtroGrupo !== "todos" && a.grupo !== filtroGrupo) return false;
      return true;
    });
  }, [atividades, filtroTipo, filtroCurso, filtroGrupo]);

  // Group by curso > grupo
  const agrupadas = useMemo(() => {
    const map = new Map<string, Map<string, Atividade[]>>();
    for (const a of filtradas) {
      if (!map.has(a.cursoId)) map.set(a.cursoId, new Map());
      const g = map.get(a.cursoId)!;
      if (!g.has(a.grupo)) g.set(a.grupo, []);
      g.get(a.grupo)!.push(a);
    }
    return map;
  }, [filtradas]);

  const gruposDoFiltro = useMemo(() => {
    if (filtroCurso === "todos") {
      return Array.from(new Set(Object.values(SEED_GRUPOS).flat()));
    }
    return SEED_GRUPOS[filtroCurso] ?? [];
  }, [filtroCurso]);

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
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">📚 Atividades</h1>
          <p className="text-muted-foreground mt-1">
            Registre aulas e tarefas, organize por curso e vincule habilidades.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-card border rounded-lg">
          <Select
            value={filtroCurso}
            onValueChange={(v) => {
              setFiltroCurso(v);
              setFiltroGrupo("todos");
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cursos</SelectItem>
              {SEED_CURSOS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {gruposDoFiltro.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 ml-auto">
            {(["todos", "aulas", "tarefas"] as FiltroTipo[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={filtroTipo === t ? "default" : "outline"}
                onClick={() => setFiltroTipo(t)}
              >
                {t === "todos" ? "Todos" : t === "aulas" ? "Aulas" : "Tarefas"}
              </Button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setDefaultTipo(filtroTipo === "tarefas" ? 1 : 0);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>

        {/* Lista agrupada */}
        {agrupadas.size === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma atividade encontrada com os filtros atuais.
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(agrupadas.entries()).map(([cursoId, grupos]) => (
              <section key={cursoId}>
                <h2 className="text-xl font-semibold mb-3">
                  {cursoMap.get(cursoId)?.nome ?? cursoId}
                </h2>
                <div className="space-y-6">
                  {Array.from(grupos.entries()).map(([grupo, items]) => (
                    <div key={grupo}>
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {grupo}
                      </h3>
                      <div className="space-y-3">
                        {items.map((a) => (
                          <ActivityCard
                            key={a.id}
                            atividade={a}
                            habilidadeMap={habilidadeMap}
                            onEdit={() => {
                              setEditing(a);
                              setFormOpen(true);
                            }}
                            onDelete={() => setConfirmDelete(a)}
                            onSkillClick={(h) => setHabilidadeDetalhe(h)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
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

interface CardProps {
  atividade: Atividade;
  habilidadeMap: Map<string, Habilidade>;
  onEdit: () => void;
  onDelete: () => void;
  onSkillClick: (h: Habilidade) => void;
}

function ActivityCard({
  atividade,
  habilidadeMap,
  onEdit,
  onDelete,
  onSkillClick,
}: CardProps) {
  const isAula = atividade.tipo === 0;
  return (
    <article className="bg-card border rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isAula ? "default" : "secondary"} className="gap-1">
              {isAula ? (
                <GraduationCap className="h-3 w-3" />
              ) : (
                <ClipboardList className="h-3 w-3" />
              )}
              {isAula ? "Aula" : "Tarefa"}
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {atividade.codigo}
            </span>
          </div>
          <h4 className="font-semibold text-base">{atividade.nome}</h4>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {atividade.descricao}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            aria-label="Remover"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
        {atividade.prazo && <span>📅 {atividade.prazo}</span>}
        <span>👤 {atividade.criadoPor}</span>
      </div>

      {atividade.habilidadeIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {atividade.habilidadeIds.map((id) => {
            const h = habilidadeMap.get(id);
            if (!h) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSkillClick(h)}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20 transition-colors"
              >
                {h.sigla}
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}
