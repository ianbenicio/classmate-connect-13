import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, FileText, Send, User } from "lucide-react";
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
  blocoFim,
  blocoInicio,
  computeSlotEstado,
  endSlotPlus24h,
  endSlotDate,
  getDuracaoAulaMin,
  slotBlocosCount,
  type Agendamento,
  type Atividade,
  type Curso,
  type HorarioSlot,
  type Turma,
} from "@/lib/academic-types";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso: Curso;
  turma: Turma;
  date: Date;
  slot: HorarioSlot;
  agendamentos: Agendamento[];
  atividades: Atividade[];
  onAgendar: (blocoIndex: number) => void;
  onRegistrarRelatorio: (agendamento: Agendamento) => void;
  onRemoverAgendamento: (agendamento: Agendamento) => void;
}

export function TurmaDiaDetailDialog({
  open,
  onOpenChange,
  curso,
  turma,
  date,
  slot,
  agendamentos,
  atividades,
  onAgendar,
  onRegistrarRelatorio,
  onRemoverAgendamento,
}: Props) {
  const { user, hasRole } = useAuth();
  const now = new Date();
  const dataKey = format(date, "yyyy-MM-dd");
  const duracaoAulaMin = getDuracaoAulaMin(curso);
  const totalBlocos = slotBlocosCount(slot, duracaoAulaMin);

  // Mapa blocoIndex -> agendamento
  const agByBloco = new Map<number, Agendamento>();
  for (const a of agendamentos) {
    if (
      a.turmaId !== turma.id ||
      a.data !== dataKey ||
      (a.slotInicio ?? a.inicio) !== slot.inicio
    )
      continue;
    const start = a.blocoIndex ?? 0;
    const len = Math.max(1, a.blocosTotal ?? 1);
    for (let k = 0; k < len; k++) agByBloco.set(start + k, a);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {curso.nome} · {turma.cod}
          </DialogTitle>
          <DialogDescription>
            {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })} ·{" "}
            {slot.inicio}–{slot.fim} · {totalBlocos}{" "}
            {totalBlocos === 1 ? "aula" : "aulas"}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "grid gap-3",
            totalBlocos === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
          )}
        >
          {Array.from({ length: totalBlocos }).map((_, idx) => {
            const ag = agByBloco.get(idx);
            const inicio = blocoInicio(slot, idx, duracaoAulaMin);
            const fim = blocoFim(slot, idx, duracaoAulaMin);
            const estado = computeSlotEstado(dataKey, fim, ag, now);
            const isOwner = ag
              ? hasRole("admin") || ag.criadoPorUserId === user?.id
              : false;

            // Janela do relatório: do início do dia da aula até 24h após o fim
            const slotEnd = endSlotDate({ data: dataKey, fim });
            const slotEnd24 = endSlotPlus24h({ data: dataKey, fim });
            const startOfDay = new Date(`${dataKey}T00:00:00`);
            const dentroJanelaRelatorio =
              now >= startOfDay && now <= slotEnd24;

            const podeRegistrarRelatorio =
              !!ag &&
              isOwner &&
              dentroJanelaRelatorio &&
              ag.status !== "concluido";

            const ativsDoAg = ag
              ? atividades.filter((a) => ag.atividadeIds.includes(a.id))
              : [];

            return (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border p-3 flex flex-col gap-2",
                  ag
                    ? estado === "concluido"
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : estado === "atrasado"
                        ? "border-amber-500/50 bg-amber-500/5"
                        : estado === "expirado"
                          ? "border-muted-foreground/30 bg-muted/30"
                          : "border-primary/40 bg-primary/5"
                    : "border-dashed border-muted-foreground/30 bg-background",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Aula {idx + 1}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {inicio}–{fim}
                  </span>
                </div>

                {ag ? (
                  <>
                    {ativsDoAg.length > 0 && (
                      <div className="space-y-1">
                        {ativsDoAg.map((at) => (
                          <div
                            key={at.id}
                            className="flex items-start gap-1.5 text-sm"
                          >
                            <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">
                                {at.nome}
                              </div>
                              <div className="text-[11px] font-mono text-muted-foreground">
                                {at.codigo}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="truncate">
                        {ag.criadoPorNome ?? ag.professor ?? "—"}
                      </span>
                    </div>

                    {ag.observacao && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        {ag.observacao}
                      </p>
                    )}

                    {estado === "concluido" && (
                      <Badge
                        variant="outline"
                        className="self-start border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                      >
                        Relatório registrado
                      </Badge>
                    )}

                    <div className="flex flex-wrap gap-2 mt-auto pt-1">
                      {podeRegistrarRelatorio && (
                        <Button
                          size="sm"
                          onClick={() => {
                            onRegistrarRelatorio(ag);
                            onOpenChange(false);
                          }}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Relatório de Aula
                        </Button>
                      )}
                      {isOwner && estado !== "concluido" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onRemoverAgendamento(ag);
                          }}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Slot disponível
                    </p>
                    {now <= slotEnd && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-auto self-start"
                        onClick={() => {
                          onAgendar(idx);
                          onOpenChange(false);
                        }}
                      >
                        Agendar aula
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
