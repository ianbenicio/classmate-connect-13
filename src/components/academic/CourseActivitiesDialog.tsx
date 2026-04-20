import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ClipboardList,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  type Atividade,
  type AtividadeTipo,
  type Curso,
  type Grupo,
} from "@/lib/academic-types";
import { SEED_GRUPOS } from "@/lib/academic-seed";

interface Props {
  curso: Curso | null;
  atividades: Atividade[];
  onOpenChange: (open: boolean) => void;
  onNew: (tipo: AtividadeTipo) => void;
  onEdit: (a: Atividade) => void;
  onDelete: (a: Atividade) => void;
}

export function CourseActivitiesDialog({
  curso,
  atividades,
  onOpenChange,
  onNew,
  onEdit,
  onDelete,
}: Props) {
  const { aulas, tarefas, gruposCurso } = useMemo(() => {
    const list = curso
      ? atividades.filter((a) => a.cursoId === curso.id)
      : [];
    return {
      aulas: list.filter((a) => a.tipo === 0),
      tarefas: list.filter((a) => a.tipo === 1),
      gruposCurso: curso ? (SEED_GRUPOS[curso.id] ?? []) : [],
    };
  }, [curso, atividades]);

  return (
    <Dialog open={!!curso} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{curso?.cod}</Badge>
            <DialogTitle>{curso?.nome}</DialogTitle>
          </div>
          {curso?.descricao && (
            <DialogDescription>{curso.descricao}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex justify-end">
          {curso && (
            <Button asChild size="sm" variant="outline">
              <Link
                to="/atividades/$cursoId"
                params={{ cursoId: curso.id }}
              >
                Abrir página do curso <ArrowRight />
              </Link>
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Column
            title="Aulas"
            icon={<GraduationCap className="h-4 w-4" />}
            items={aulas}
            grupos={gruposCurso}
            emptyText="Nenhuma aula cadastrada."
            onAdd={() => onNew(0)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          <Column
            title="Tarefas"
            icon={<ClipboardList className="h-4 w-4" />}
            items={tarefas}
            grupos={gruposCurso}
            emptyText="Nenhuma tarefa cadastrada."
            onAdd={() => onNew(1)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Column({
  title,
  icon,
  items,
  grupos,
  emptyText,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: React.ReactNode;
  items: Atividade[];
  grupos: Grupo[];
  emptyText: string;
  onAdd: () => void;
  onEdit: (a: Atividade) => void;
  onDelete: (a: Atividade) => void;
}) {
  // Group items by grupo cod, preserving grupos order
  const grouped = useMemo(() => {
    const map = new Map<string, Atividade[]>();
    for (const a of items) {
      const list = map.get(a.grupo) ?? [];
      list.push(a);
      map.set(a.grupo, list);
    }
    // Order by grupos definition, then any remaining
    const result: { cod: string; nome: string; items: Atividade[] }[] = [];
    for (const g of grupos) {
      const list = map.get(g.cod);
      if (list?.length) {
        result.push({ cod: g.cod, nome: g.nome, items: list });
        map.delete(g.cod);
      }
    }
    // Any remaining not in grupos definition
    for (const [cod, list] of map) {
      result.push({ cod, nome: cod, items: list });
    }
    return result;
  }, [items, grupos]);

  const showGroupHeaders = grouped.length > 1;

  return (
    <section className="rounded-md border bg-muted/30 flex flex-col">
      <header className="flex items-center gap-2 px-3 py-2 border-b">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {items.length}
        </Badge>
        <Button size="sm" variant="ghost" onClick={onAdd} className="h-7">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </header>
      <div className="p-2 space-y-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {emptyText}
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.cod}>
              {showGroupHeaders && (
                <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {group.cod}
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {group.nome}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {group.items.length}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.nome}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {a.codigo}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onEdit(a)}
                        aria-label={`Editar ${a.nome}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onDelete(a)}
                        aria-label={`Remover ${a.nome}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
