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
import { Pencil, Plus, Trash2, Settings } from "lucide-react";
import { Users } from "lucide-react";
import {
  formatHorarios,
  formatMinutos,
  getDuracaoAulaMin,
  type Aluno,
  type Atividade,
  type Curso,
  type Habilidade,
  type Turma,
} from "@/lib/academic-types";
import { Progress } from "@/components/ui/progress";
import { ActivityViewDialog } from "./ActivityViewDialog";
import { useAuth } from "@/lib/auth";

interface Props {
  curso: Curso | null;
  atividades: Atividade[];
  turmas: Turma[];
  alunos: Aluno[];
  habilidadeMap: Map<string, Habilidade>;
  onOpenChange: (open: boolean) => void;
  onNew: (tipoDefault: 0 | 1) => void;
  onEdit: (a: Atividade) => void;
  onDelete: (a: Atividade) => void;
  onSkillClick: (h: Habilidade) => void;
  onEditCurso: (c: Curso) => void;
  onNewTurma: () => void;
  onEditTurma: (t: Turma) => void;
  onDeleteTurma: (t: Turma) => void;
  onTurmaClick: (t: Turma) => void;
  onShowQuadro?: (c: Curso) => void;
}

export function CourseDetailDialog({
  curso,
  atividades,
  turmas,
  alunos,
  habilidadeMap,
  onOpenChange,
  onNew,
  onEdit,
  onDelete,
  onSkillClick,
  onEditCurso,
  onNewTurma,
  onEditTurma,
  onDeleteTurma,
  onTurmaClick,
  onShowQuadro,
}: Props) {
  const [viewing, setViewing] = useState<Atividade | null>(null);
  const { hasRole, isStaff: isStaffFn } = useAuth();
  const isAluno = hasRole("aluno") && !isStaffFn();
  const perfil: "aluno" | "professor" | "coordenacao" = isAluno
    ? "aluno"
    : hasRole("admin") || hasRole("coordenacao")
      ? "coordenacao"
      : "professor";

  const turmasDoCurso = useMemo(
    () => (curso ? turmas.filter((t) => t.cursoId === curso.id) : []),
    [curso, turmas],
  );

  const doCurso = useMemo(
    () => (curso ? atividades.filter((a) => a.cursoId === curso.id) : []),
    [curso, atividades],
  );

  const aulasDoCurso = useMemo(() => doCurso.filter((a) => a.tipo === 0), [doCurso]);

  const totalAulasCurso = useMemo(() => aulasDoCurso.length, [aulasDoCurso]);

  // Aulas dadas por turma derivadas das presenças reais dos alunos.
  // Uma aula conta como "dada" para a turma quando ao menos um aluno
  // daquela turma tem registro de presença=true para a atividade.
  const aulasDadasPorTurma = useMemo(() => {
    const aulaIds = new Set(aulasDoCurso.map((a) => a.id));
    const map = new Map<string, Set<string>>();
    for (const al of alunos) {
      if (!al.turmaId) continue;
      const turmaIsCurso = turmasDoCurso.some((t) => t.id === al.turmaId);
      if (!turmaIsCurso) continue;
      let set = map.get(al.turmaId);
      if (!set) {
        set = new Set();
        map.set(al.turmaId, set);
      }
      for (const aula of al.aulas ?? []) {
        if (!aula.presente) continue;
        if (aulaIds.has(aula.atividadeId)) set.add(aula.atividadeId);
      }
    }
    return map;
  }, [alunos, aulasDoCurso, turmasDoCurso]);

  const progressoCurso = useMemo(() => {
    if (!curso || totalAulasCurso === 0 || turmasDoCurso.length === 0) {
      return { dadas: 0, total: 0, pct: 0, minDadas: 0, minTotal: 0 };
    }
    let dadas = 0;
    let minDadas = 0;
    const ativMap = new Map(aulasDoCurso.map((a) => [a.id, a]));
    for (const t of turmasDoCurso) {
      const set = aulasDadasPorTurma.get(t.id);
      if (!set) continue;
      dadas += set.size;
      for (const id of set) {
        minDadas += ativMap.get(id)?.cargaHorariaMin ?? getDuracaoAulaMin(curso);
      }
    }
    const total = totalAulasCurso * turmasDoCurso.length;
    const minTotal = (curso.cargaHorariaTotalMin ?? 0) * turmasDoCurso.length;
    return {
      dadas,
      total,
      pct: Math.round((dadas / total) * 100),
      minDadas,
      minTotal,
    };
  }, [curso, totalAulasCurso, turmasDoCurso, aulasDadasPorTurma, aulasDoCurso]);

  return (
    <Dialog open={!!curso} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{curso?.cod}</Badge>
            <DialogTitle className="flex-1">{curso?.nome}</DialogTitle>
            {curso && (
              <Button size="sm" variant="outline" onClick={() => onEditCurso(curso)}>
                <Settings className="h-4 w-4 mr-1" />
                Editar curso
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">Detalhes do curso</DialogDescription>
        </DialogHeader>

        {/* Propriedades do curso */}
        {curso && (
          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm py-3 border-b">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">
              Cod_Curso
            </dt>
            <dd className="font-mono">{curso.cod}</dd>

            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">
              Nome
            </dt>
            <dd className="font-medium">{curso.nome}</dd>

            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-0.5">
              Descrição
            </dt>
            <dd className="text-muted-foreground whitespace-pre-wrap">{curso.descricao || "—"}</dd>
          </dl>
        )}

        {/* Progresso geral do curso — clicável abre o Quadro de Aulas */}
        {curso && totalAulasCurso > 0 && turmasDoCurso.length > 0 && (
          <button
            type="button"
            onClick={() => onShowQuadro?.(curso)}
            className="py-3 border-b w-full text-left group hover:bg-muted/30 transition-colors -mx-1 px-1 rounded"
            title="Abrir Quadro de Aulas"
          >
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-medium text-muted-foreground uppercase tracking-wide">
                Progresso do curso
              </span>
              <span className="font-mono text-muted-foreground group-hover:text-primary transition-colors">
                {progressoCurso.dadas}/{progressoCurso.total} aulas ({progressoCurso.pct}%)
                {progressoCurso.minTotal > 0 && (
                  <>
                    {" "}
                    · {formatMinutos(progressoCurso.minDadas)}/
                    {formatMinutos(progressoCurso.minTotal)}
                  </>
                )}
              </span>
            </div>
            <Progress value={progressoCurso.pct} className="h-2" />
          </button>
        )}

        {/* Turmas */}
        <section className="py-3 border-y">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Turmas ({turmasDoCurso.length})
            </h3>
            <Button size="sm" variant="outline" onClick={onNewTurma}>
              <Plus className="h-4 w-4 mr-1" />
              Nova turma
            </Button>
          </div>
          {turmasDoCurso.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma turma cadastrada para este curso.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {turmasDoCurso.map((t) => (
                <div
                  key={t.id}
                  className="border rounded-md p-2.5 bg-muted/30 text-sm hover:border-primary/40 hover:bg-muted/60 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <button
                      type="button"
                      onClick={() => onTurmaClick(t)}
                      className="text-left flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {t.cod}
                        </Badge>
                        <span className="font-medium truncate">{t.nome}</span>
                      </div>
                    </button>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTurma(t);
                        }}
                        aria-label="Editar turma"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTurma(t);
                        }}
                        aria-label="Remover turma"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTurmaClick(t)}
                    className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 w-full text-left"
                  >
                    <span>📅 {t.data}</span>
                    <span>🕐 {formatHorarios(t.horarios)}</span>
                    <span>👥 {t.alunosIds.length} alunos</span>
                  </button>
                  {totalAulasCurso > 0 &&
                    (() => {
                      const dadas = aulasDadasPorTurma.get(t.id)?.size ?? 0;
                      const pct = Math.round((dadas / totalAulasCurso) * 100);
                      return (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Aulas dadas</span>
                            <span className="font-mono">
                              {dadas}/{totalAulasCurso} ({pct}%)
                            </span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })()}
                </div>
              ))}
            </div>
          )}
        </section>
      </DialogContent>

      <ActivityViewDialog
        atividade={viewing}
        curso={curso ?? undefined}
        habilidades={Array.from(habilidadeMap.values())}
        perfil={perfil}
        onOpenChange={(o) => !o && setViewing(null)}
      />
    </Dialog>
  );
}
