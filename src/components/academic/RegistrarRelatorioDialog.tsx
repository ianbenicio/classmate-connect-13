// Dialog placeholder para registrar o Relatório de uma atividade agendada.
// O formulário completo (chamada/avaliação para aula, recebimento/nota para tarefa)
// será implementado numa próxima rodada.

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardCheck, AlertTriangle } from "lucide-react";
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
import { agendamentosStore } from "@/lib/agendamentos-store";
import { notificacoesStore } from "@/lib/notificacoes-store";
import {
  computeSlotEstado,
  type Agendamento,
  type Atividade,
  type Curso,
  type Turma,
} from "@/lib/academic-types";
import { SEED_ALUNOS } from "@/lib/academic-seed";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: Agendamento | null;
  turma?: Turma;
  curso?: Curso;
  atividades: Atividade[];
}

export function RegistrarRelatorioDialog({
  open,
  onOpenChange,
  agendamento,
  turma,
  curso,
  atividades,
}: Props) {
  if (!agendamento) return null;

  const estado = computeSlotEstado(
    agendamento.data,
    agendamento.fim,
    agendamento,
  );
  const ativsDoAg = atividades.filter((a) =>
    agendamento.atividadeIds.includes(a.id),
  );
  const dataFmt = format(
    new Date(`${agendamento.data}T00:00:00`),
    "PPP",
    { locale: ptBR },
  );

  const handleConfirmar = () => {
    agendamentosStore.marcarConcluido(agendamento.id);

    // Notifica alunos + professor que o relatório foi registrado
    if (turma && curso) {
      const alunos = SEED_ALUNOS.filter((al) => al.turmaId === turma.id);
      const base = {
        titulo: `Relatório registrado — ${turma.cod}`,
        mensagem: `${curso.nome} · ${turma.nome} · ${dataFmt} ${agendamento.inicio}–${agendamento.fim} — relatório registrado.`,
        cursoId: curso.id,
        turmaId: turma.id,
        data: agendamento.data,
        inicio: agendamento.inicio,
        fim: agendamento.fim,
        professor: agendamento.professor,
        atividadeIds: agendamento.atividadeIds,
        criadoEm: new Date().toISOString(),
        lida: false,
        kind: "concluido" as const,
      };
      notificacoesStore.addMany([
        ...alunos.map((al) => ({
          ...base,
          id: crypto.randomUUID(),
          destinatarioTipo: "aluno" as const,
          destinatarioId: al.id,
        })),
        ...(agendamento.professor
          ? [
              {
                ...base,
                id: crypto.randomUUID(),
                destinatarioTipo: "professor" as const,
                destinatarioId: agendamento.professor,
              },
            ]
          : []),
      ]);
    }

    toast.success("Relatório registrado.");
    onOpenChange(false);
  };

  const aulas = ativsDoAg.filter((a) => a.tipo === 0);
  const tarefas = ativsDoAg.filter((a) => a.tipo === 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" /> Registrar relatório
          </DialogTitle>
          <DialogDescription>
            {turma?.nome} · {dataFmt} · {agendamento.inicio}–{agendamento.fim}
          </DialogDescription>
        </DialogHeader>

        {estado === "atrasado" && (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 inline-flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" /> Relatório atrasado — registre dentro de 24h após o fim do slot.
          </div>
        )}

        <div className="space-y-3 text-sm">
          {curso && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Curso:</span>
              <Badge variant="outline">{curso.cod}</Badge>
              <span>{curso.nome}</span>
            </div>
          )}
          {agendamento.professor && (
            <div>
              <span className="text-muted-foreground text-xs">Professor: </span>
              {agendamento.professor}
            </div>
          )}

          {aulas.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                🎓 Aulas — chamada + avaliação (formulário completo em breve)
              </div>
              <ul className="text-xs space-y-1">
                {aulas.map((a) => (
                  <li key={a.id} className="border rounded px-2 py-1">
                    <span className="font-medium">{a.codigo}</span> · {a.nome}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tarefas.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                📋 Tarefas — confirmação de recebimento + nota (formulário completo em breve)
              </div>
              <ul className="text-xs space-y-1">
                {tarefas.map((a) => (
                  <li key={a.id} className="border rounded px-2 py-1">
                    <span className="font-medium">{a.codigo}</span> · {a.nome}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground border-l-2 border-muted pl-2">
            Por enquanto, ao confirmar, o agendamento é marcado como concluído e uma notificação é gerada. O formulário detalhado (chamada, avaliações, notas) será adicionado em seguida.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar}>
            <ClipboardCheck /> Confirmar relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
