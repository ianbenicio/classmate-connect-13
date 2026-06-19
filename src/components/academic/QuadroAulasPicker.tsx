// Picker em grade para escolher uma aula disponível no agendamento.
// Mostra todas as aulas (tipo=0) do curso como células coloridas:
//   - verde  = concluída (agendamento concluido)   → NÃO selecionável
//   - amarelo = agendada (agendamento pendente)     → NÃO selecionável
//   - cinza  = disponível                           → selecionável
// Clique numa célula disponível para selecionar; botão OK confirma.
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import type { Atividade, Curso } from "@/lib/academic-types";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { getStatusAulasDaTurma } from "@/lib/cronograma-aulas";

type CelulaStatus = "concluida" | "agendada" | "disponivel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso: Curso;
  atividades: Atividade[];
  /** Turma alvo — define quais aulas já estão agendadas/concluídas. */
  turmaId: string | undefined;
  /** Chamado com o id da aula selecionada ao confirmar. */
  onSelect: (aulaId: string) => void;
}

const STATUS_CLASSES: Record<CelulaStatus, string> = {
  concluida:
    "bg-emerald-500/20 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 cursor-not-allowed",
  agendada:
    "bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-300 cursor-not-allowed",
  disponivel:
    "bg-muted border-border text-foreground hover:border-primary hover:bg-accent cursor-pointer",
};

const STATUS_LABEL: Record<CelulaStatus, string> = {
  concluida: "Concluída",
  agendada: "Agendada",
  disponivel: "Disponível",
};

export function QuadroAulasPicker({
  open,
  onOpenChange,
  curso,
  atividades,
  turmaId,
  onSelect,
}: Props) {
  const todosAgendamentos = useAgendamentos();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setSelectedId(null);
  }, [open]);

  const aulasCurso = useMemo(
    () =>
      atividades
        .filter((a) => a.cursoId === curso.id && a.tipo === 0)
        .sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [atividades, curso.id],
  );

  // Aulas já concluídas/agendadas para a turma (cancelados liberam).
  const { aulasConcluidasIds, aulasAgendadasIds } = useMemo(
    () => getStatusAulasDaTurma(todosAgendamentos, turmaId, aulasCurso),
    [aulasCurso, todosAgendamentos, turmaId],
  );

  const celulas = useMemo(
    () =>
      aulasCurso.map((a) => {
        let status: CelulaStatus = "disponivel";
        if (aulasConcluidasIds.has(a.id)) status = "concluida";
        else if (aulasAgendadasIds.has(a.id)) status = "agendada";
        return { atividade: a, status };
      }),
    [aulasCurso, aulasConcluidasIds, aulasAgendadasIds],
  );

  const stats = useMemo(() => {
    const c = { concluida: 0, agendada: 0, disponivel: 0 };
    for (const cel of celulas) c[cel.status]++;
    return c;
  }, [celulas]);

  const handleConfirm = () => {
    if (!selectedId) return;
    onSelect(selectedId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Selecione uma aula
          </DialogTitle>
          <DialogDescription>
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {curso.cod}
              </Badge>
              <span>{curso.nome}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 text-xs">
          <LegendDot color="bg-muted-foreground/40" label={`Disponível (${stats.disponivel})`} />
          <LegendDot color="bg-amber-500" label={`Agendada (${stats.agendada})`} />
          <LegendDot color="bg-emerald-500" label={`Concluída (${stats.concluida})`} />
        </div>

        {aulasCurso.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">
            Este curso ainda não tem aulas cadastradas.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2 mt-2">
            {celulas.map(({ atividade, status }) => {
              const selectable = status === "disponivel";
              const isSelected = selectedId === atividade.id;
              return (
                <button
                  key={atividade.id}
                  type="button"
                  disabled={!selectable}
                  title={`${atividade.codigo} — ${atividade.nome} · ${STATUS_LABEL[status]}`}
                  onClick={() => selectable && setSelectedId(atividade.id)}
                  className={`relative aspect-square border-2 rounded-md flex items-center justify-center font-mono text-[11px] font-semibold transition-all ${STATUS_CLASSES[status]} ${
                    isSelected ? "ring-2 ring-primary ring-offset-1 border-primary" : ""
                  }`}
                >
                  {atividade.codigo}
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedId}>
            OK
          </Button>
        </DialogFooter>
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
