import { useMemo, useState } from "react";
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
  Pencil,
  Plus,
  Trash2,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
import { Users } from "lucide-react";
import type { Atividade, Curso, Habilidade, Turma } from "@/lib/academic-types";

type FiltroTipo = "todos" | "aulas" | "tarefas";

interface Props {
  curso: Curso | null;
  atividades: Atividade[];
  turmas: Turma[];
  habilidadeMap: Map<string, Habilidade>;
  onOpenChange: (open: boolean) => void;
  onNew: (tipoDefault: 0 | 1) => void;
  onEdit: (a: Atividade) => void;
  onDelete: (a: Atividade) => void;
  onSkillClick: (h: Habilidade) => void;
}

export function CourseDetailDialog({
  curso,
  atividades,
  turmas,
  habilidadeMap,
  onOpenChange,
  onNew,
  onEdit,
  onDelete,
  onSkillClick,
}: Props) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");

  const turmasDoCurso = useMemo(
    () => (curso ? turmas.filter((t) => t.cursoId === curso.id) : []),
    [curso, turmas],
  );

  const doCurso = useMemo(
    () => (curso ? atividades.filter((a) => a.cursoId === curso.id) : []),
    [curso, atividades],
  );

  const filtradas = useMemo(() => {
    return doCurso.filter((a) => {
      if (filtroTipo === "aulas" && a.tipo !== 0) return false;
      if (filtroTipo === "tarefas" && a.tipo !== 1) return false;
      return true;
    });
  }, [doCurso, filtroTipo]);

  const agrupadas = useMemo(() => {
    const map = new Map<string, Atividade[]>();
    for (const a of filtradas) {
      if (!map.has(a.grupo)) map.set(a.grupo, []);
      map.get(a.grupo)!.push(a);
    }
    return map;
  }, [filtradas]);

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

        {/* Turmas */}
        <section className="py-3 border-y">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Turmas ({turmasDoCurso.length})
          </h3>
          {turmasDoCurso.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma turma cadastrada para este curso.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {turmasDoCurso.map((t) => (
                <Badge key={t.id} variant="secondary" className="font-normal">
                  {t.nome}
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Atividades — Filtros */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-full mt-2">
            Atividades
          </h3>
          <div className="flex gap-1">
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
            className="ml-auto"
            onClick={() => onNew(filtroTipo === "tarefas" ? 1 : 0)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>

        {/* Lista */}
        {agrupadas.size === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma atividade neste curso ainda.
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {Array.from(agrupadas.entries()).map(([grupo, items]) => (
              <div key={grupo}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {grupo}
                </h3>
                <div className="space-y-3">
                  {items.map((a) => {
                    const isAula = a.tipo === 0;
                    return (
                      <article
                        key={a.id}
                        className="bg-card border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={isAula ? "default" : "secondary"}
                                className="gap-1"
                              >
                                {isAula ? (
                                  <GraduationCap className="h-3 w-3" />
                                ) : (
                                  <ClipboardList className="h-3 w-3" />
                                )}
                                {isAula ? "Aula" : "Tarefa"}
                              </Badge>
                              <span className="text-xs font-mono text-muted-foreground">
                                {a.codigo}
                              </span>
                            </div>
                            <h4 className="font-semibold">{a.nome}</h4>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {a.descricao}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onEdit(a)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onDelete(a)}
                              aria-label="Remover"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                          {a.prazo && <span>📅 {a.prazo}</span>}
                          <span>👤 {a.criadoPor}</span>
                        </div>

                        {a.habilidadeIds.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {a.habilidadeIds.map((id) => {
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
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
