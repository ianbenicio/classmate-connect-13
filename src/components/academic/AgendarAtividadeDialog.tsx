import { useEffect, useMemo, useState } from "react";
import { format, parse, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  diaSemanaFromDate,
  formatHorarioSlot,
  type Atividade,
  type Curso,
  type HorarioSlot,
  type Turma,
} from "@/lib/academic-types";
import { agendamentosStore } from "@/lib/agendamentos-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso: Curso;
  /** Atividades disponíveis (do curso) */
  atividades: Atividade[];
  /** Turmas do curso */
  turmas: Turma[];
  /** Atividades pré-selecionadas */
  defaultAtividadeIds?: string[];
  /** Turma pré-selecionada */
  defaultTurmaId?: string;
  /** Data e slot pré-selecionados (vindo do calendário) */
  defaultData?: string; // YYYY-MM-DD
  defaultSlot?: HorarioSlot;
}

export function AgendarAtividadeDialog({
  open,
  onOpenChange,
  curso,
  atividades,
  turmas,
  defaultAtividadeIds = [],
  defaultTurmaId,
  defaultData,
  defaultSlot,
}: Props) {
  const [turmaId, setTurmaId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  const [slotIdx, setSlotIdx] = useState<string>("");
  const [grupo, setGrupo] = useState<string>("");
  const [atividadeIds, setAtividadeIds] =
    useState<string[]>(defaultAtividadeIds);
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (!open) return;
    setTurmaId(defaultTurmaId ?? turmas[0]?.id ?? "");
    setDate(defaultData ? parse(defaultData, "yyyy-MM-dd", new Date()) : undefined);
    setSlotIdx("");
    setGrupo("");
    setAtividadeIds(defaultAtividadeIds);
    setObservacao("");
  }, [open, defaultTurmaId, defaultData, defaultAtividadeIds, turmas]);

  const turmaSelecionada = turmas.find((t) => t.id === turmaId);

  // Slots disponíveis = horários da turma cujo diaSemana corresponde à data escolhida
  const slotsDisponiveis = useMemo(() => {
    if (!turmaSelecionada || !date) return [];
    const dia = diaSemanaFromDate(date);
    return turmaSelecionada.horarios
      .map((h, i) => ({ slot: h, idx: i }))
      .filter(({ slot }) => slot.diaSemana === dia);
  }, [turmaSelecionada, date]);

  // Pré-seleciona slot pelo defaultSlot na abertura
  useEffect(() => {
    if (!open || !defaultSlot || !turmaSelecionada) return;
    const idx = turmaSelecionada.horarios.findIndex(
      (h) =>
        h.diaSemana === defaultSlot.diaSemana &&
        h.inicio === defaultSlot.inicio &&
        h.fim === defaultSlot.fim,
    );
    if (idx >= 0) setSlotIdx(String(idx));
  }, [open, defaultSlot, turmaSelecionada]);

  // Auto-seleciona se há um único slot disponível
  useEffect(() => {
    if (slotsDisponiveis.length === 1) {
      setSlotIdx(String(slotsDisponiveis[0].idx));
    }
  }, [slotsDisponiveis]);

  const toggleAtividade = (id: string) =>
    setAtividadeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaSelecionada) return toast.error("Selecione uma turma.");
    if (!date) return toast.error("Selecione uma data.");
    if (slotIdx === "") return toast.error("Selecione um horário.");
    if (atividadeIds.length === 0)
      return toast.error("Escolha ao menos uma atividade.");

    const slot = turmaSelecionada.horarios[Number(slotIdx)];
    const dataIso = format(date, "yyyy-MM-dd");

    agendamentosStore.add({
      id: crypto.randomUUID(),
      turmaId: turmaSelecionada.id,
      data: dataIso,
      diaSemana: slot.diaSemana,
      inicio: slot.inicio,
      fim: slot.fim,
      atividadeIds,
      status: "pendente",
      criadoEm: new Date().toISOString(),
      observacao: observacao.trim() || undefined,
    });
    toast.success("Atividade agendada!");
    onOpenChange(false);
  };

  const ativsDoCurso = atividades.filter((a) => a.cursoId === curso.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar atividade</DialogTitle>
          <DialogDescription>
            Curso: <strong>{curso.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Turma *</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome} · {t.cod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {turmas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Este curso ainda não possui turmas cadastradas.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon />
                    {date
                      ? format(date, "PPP", { locale: ptBR })
                      : "Escolher data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < addDays(new Date(), -365)}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Horário *</Label>
              {!turmaSelecionada ? (
                <p className="text-xs text-muted-foreground">
                  Selecione a turma.
                </p>
              ) : !date ? (
                <p className="text-xs text-muted-foreground">
                  Selecione a data.
                </p>
              ) : slotsDisponiveis.length === 0 ? (
                <p className="text-xs text-destructive">
                  A turma não tem horário neste dia da semana.
                </p>
              ) : (
                <Select value={slotIdx} onValueChange={setSlotIdx}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {slotsDisponiveis.map(({ slot, idx }) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {formatHorarioSlot(slot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Atividades *</Label>
            {ativsDoCurso.length === 0 ? (
              <p className="text-xs text-muted-foreground border rounded-md p-3">
                Nenhuma atividade cadastrada neste curso ainda.
              </p>
            ) : (
              <div className="rounded-md border p-2 space-y-1 max-h-56 overflow-y-auto">
                {ativsDoCurso.map((a) => {
                  const checked = atividadeIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className="flex items-start gap-3 cursor-pointer rounded-md p-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleAtividade(a.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {a.tipo === 0 ? "Aula" : "Tarefa"}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {a.nome}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.codigo} · {a.grupo}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Opcional"
            />
          </div>

          {turmaSelecionada && date && slotIdx !== "" && (
            <div className="rounded-md bg-muted/40 border p-3 text-sm">
              <div className="text-xs uppercase text-muted-foreground mb-1">
                Resumo
              </div>
              <div className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(date, "PPP", { locale: ptBR })} ·{" "}
                {formatHorarioSlot(turmaSelecionada.horarios[Number(slotIdx)])}{" "}
                · {turmaSelecionada.nome}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">📅 Agendar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
