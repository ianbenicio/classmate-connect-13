import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import type { Aluno, Atividade, Curso } from "@/lib/academic-types";
import { useAgendamentos } from "@/lib/agendamentos-store";

type CelulaStatus = "dada" | "agendada" | "presente" | "ausente" | "pendente";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso: Curso | null;
  atividades: Atividade[];
  /** Quando definido, ativa o modo "aluno": presente (verde) / ausente (vermelho) / pendente (cinza). */
  aluno?: Aluno | null;
  /** Conjunto de IDs de atividades de aula consideradas "dadas" pela turma do aluno (ou pelo curso, no modo curso). */
  aulasDadasIds: Set<string>;
  /** ID da turma para filtrar agendamentos (modo turma). */
  turmaId?: string;
}

const STATUS_CLASSES: Record<CelulaStatus, string> = {
  dada: "bg-emerald-500/20 border-emerald-500/60 text-emerald-700 dark:text-emerald-300",
  agendada: "bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-300",
  presente: "bg-emerald-500/20 border-emerald-500/60 text-emerald-700 dark:text-emerald-300",
  ausente: "bg-red-500/20 border-red-500/60 text-red-700 dark:text-red-300",
  pendente: "bg-muted border-border text-muted-foreground",
};

const STATUS_LABEL: Record<CelulaStatus, string> = {
  dada: "Concluída",
  agendada: "Agendada",
  presente: "Presente",
  ausente: "Ausente",
  pendente: "Pendente",
};

export function QuadroAulasDialog({
  open,
  onOpenChange,
  curso,
  atividades,
  aluno,
  aulasDadasIds,
  turmaId,
}: Props) {
  const todosAgendamentos = useAgendamentos();

  const aulasCurso = useMemo(
    () =>
      curso
        ? atividades
            .filter((a) => a.cursoId === curso.id && a.tipo === 0)
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
        : [],
    [atividades, curso],
  );

  // Mapas de atividade → status do agendamento para a turma.
  // aulasConcluidasIds: aulas com agendamento "concluido" (professor finalizou relatório).
  // aulasAgendadasIds: aulas com agendamento pendente (agendadas mas não concluídas).
  const { aulasConcluidasIds, aulasAgendadasIds } = useMemo(() => {
    const concluidas = new Set<string>();
    const agendadas = new Set<string>();
    if (!turmaId) return { aulasConcluidasIds: concluidas, aulasAgendadasIds: agendadas };
    for (const ag of todosAgendamentos) {
      if (ag.turmaId !== turmaId) continue;
      for (const ativId of ag.atividadeIds) {
        if (ag.status === "concluido") {
          concluidas.add(ativId);
        } else {
          // pendente = agendado mas não concluído
          if (!concluidas.has(ativId)) agendadas.add(ativId);
        }
      }
    }
    // Se uma aula tem agendamento concluido E pendente, concluido ganha.
    for (const id of concluidas) agendadas.delete(id);
    return { aulasConcluidasIds: concluidas, aulasAgendadasIds: agendadas };
  }, [todosAgendamentos, turmaId]);

  // Mapa atividadeId → presença do aluno (quando há aluno).
  const presencaAluno = useMemo(() => {
    const m = new Map<string, boolean>();
    if (aluno) {
      for (const r of aluno.aulas ?? []) m.set(r.atividadeId, r.presente);
    }
    return m;
  }, [aluno]);

  const celulas = useMemo(() => {
    return aulasCurso.map((a) => {
      let status: CelulaStatus;
      if (aluno) {
        if (presencaAluno.has(a.id)) {
          status = presencaAluno.get(a.id) ? "presente" : "ausente";
        } else {
          // Não há registro: se a aula foi dada pela turma → ausente; senão → pendente.
          status = aulasDadasIds.has(a.id) ? "ausente" : "pendente";
        }
      } else {
        // Modo turma/curso: prioriza status do agendamento.
        if (aulasConcluidasIds.has(a.id) || aulasDadasIds.has(a.id)) {
          status = "dada"; // verde — concluída
        } else if (aulasAgendadasIds.has(a.id)) {
          status = "agendada"; // amarelo — agendada
        } else {
          status = "pendente"; // cinza
        }
      }
      return { atividade: a, status };
    });
  }, [aulasCurso, aluno, presencaAluno, aulasDadasIds, aulasConcluidasIds, aulasAgendadasIds]);

  const stats = useMemo(() => {
    const counts = { dada: 0, agendada: 0, presente: 0, ausente: 0, pendente: 0 };
    for (const c of celulas) counts[c.status]++;
    return counts;
  }, [celulas]);

  const total = aulasCurso.length;
  // Só concluídas (verdes) contam para progressão.
  const progresso = aluno ? stats.presente : stats.dada;
  const pct = total > 0 ? Math.round((progresso / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Quadro de Aulas
          </DialogTitle>
          <DialogDescription>
            {curso ? (
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {curso.cod}
                </Badge>
                <span>{curso.nome}</span>
                {aluno && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-medium text-foreground">{aluno.nome}</span>
                  </>
                )}
              </span>
            ) : (
              "Selecione um curso"
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Resumo */}
        <div className="border rounded-md p-3 bg-muted/20">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-muted-foreground uppercase tracking-wide">
              {aluno ? "Presença" : "Aulas concluídas"}
            </span>
            <span className="font-mono text-muted-foreground">
              {progresso}/{total} ({pct}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-xs">
            {aluno ? (
              <>
                <LegendDot color="bg-emerald-500" label={`Presente (${stats.presente})`} />
                <LegendDot color="bg-red-500" label={`Ausente (${stats.ausente})`} />
                <LegendDot color="bg-muted-foreground/40" label={`Pendente (${stats.pendente})`} />
              </>
            ) : (
              <>
                <LegendDot color="bg-emerald-500" label={`Concluída (${stats.dada})`} />
                {stats.agendada > 0 && (
                  <LegendDot color="bg-amber-500" label={`Agendada (${stats.agendada})`} />
                )}
                <LegendDot color="bg-muted-foreground/40" label={`Pendente (${stats.pendente})`} />
              </>
            )}
          </div>
        </div>

        {/* Grade de células */}
        {total === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">
            Este curso ainda não tem aulas cadastradas.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2 mt-2">
            {celulas.map(({ atividade, status }) => (
              <div
                key={atividade.id}
                title={`${atividade.codigo} — ${atividade.nome} · ${STATUS_LABEL[status]}`}
                className={`relative aspect-square border-2 rounded-md flex items-center justify-center font-mono text-[11px] font-semibold ${STATUS_CLASSES[status]}`}
              >
                {atividade.codigo}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
