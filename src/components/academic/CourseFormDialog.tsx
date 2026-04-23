import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatMinutos, type Curso } from "@/lib/academic-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (curso: Curso) => void;
  editing?: Curso;
}

interface SlotDraft {
  horas: string;
  minutos: string;
}

function slotToMin(s: SlotDraft): number {
  return (parseInt(s.horas || "0", 10) || 0) * 60 + (parseInt(s.minutos || "0", 10) || 0);
}

function minToSlot(min: number): SlotDraft {
  return {
    horas: String(Math.floor(min / 60)),
    minutos: String(min % 60),
  };
}

export function CourseFormDialog({ open, onOpenChange, onSave, editing }: Props) {
  const [cod, setCod] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cargaHoras, setCargaHoras] = useState<string>("");
  const [cargaMin, setCargaMin] = useState<string>("");
  const [slots, setSlots] = useState<SlotDraft[]>([{ horas: "1", minutos: "0" }]);

  useEffect(() => {
    if (open) {
      setCod(editing?.cod ?? "");
      setNome(editing?.nome ?? "");
      setDescricao(editing?.descricao ?? "");
      const totalMin = editing?.cargaHorariaTotalMin ?? 0;
      setCargaHoras(String(Math.floor(totalMin / 60)));
      setCargaMin(String(totalMin % 60));

      // Reconstrói os slots a partir do curso: turnoDiarioMin / duracaoAulaMin.
      const dur = editing?.duracaoAulaMin ?? 60;
      const turno = editing?.turnoDiarioMin ?? dur;
      const qtd = Math.max(1, Math.floor(turno / Math.max(1, dur)));
      setSlots(Array.from({ length: qtd }, () => minToSlot(dur)));
    }
  }, [open, editing]);

  const duracaoAulaMin = useMemo(() => slotToMin(slots[0] ?? { horas: "0", minutos: "0" }), [slots]);
  const turnoTotalMin = useMemo(
    () => slots.reduce((acc, s) => acc + slotToMin(s), 0),
    [slots],
  );
  const slotsIguais = useMemo(
    () => slots.length > 0 && slots.every((s) => slotToMin(s) === duracaoAulaMin),
    [slots, duracaoAulaMin],
  );

  const addSlot = () => {
    // Novo slot herda a duração do anterior (mantém slots iguais).
    setSlots((prev) => [...prev, prev[prev.length - 1] ?? { horas: "1", minutos: "0" }]);
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const updateSlot = (idx: number, patch: Partial<SlotDraft>) => {
    setSlots((prev) => {
      const next = prev.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      // Mantém todos os slots iguais ao primeiro alterado (regra: mesma duração).
      const novaDur = slotToMin(next[idx]);
      return next.map(() => minToSlot(novaDur));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cod.trim() || !nome.trim()) {
      toast.error("Cod e Nome são obrigatórios.");
      return;
    }
    const cargaTotalMin =
      (parseInt(cargaHoras || "0", 10) || 0) * 60 +
      (parseInt(cargaMin || "0", 10) || 0);
    if (slots.length === 0) {
      toast.error("Adicione pelo menos um slot de aula.");
      return;
    }
    if (duracaoAulaMin <= 0) {
      toast.error("A duração de cada slot deve ser maior que zero.");
      return;
    }
    if (!slotsIguais) {
      toast.error("Todos os slots devem ter a mesma duração.");
      return;
    }
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      cod: cod.trim().toUpperCase(),
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      cargaHorariaTotalMin: cargaTotalMin,
      duracaoAulaMin: duracaoAulaMin,
      turnoDiarioMin: turnoTotalMin,
    });
    toast.success(editing ? "Curso atualizado!" : "Curso criado!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Curso" : "Novo Curso"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cod *</Label>
            <Input
              value={cod}
              onChange={(e) => setCod(e.target.value)}
              placeholder="Ex.: DSG"
              maxLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Design"
            />
          </div>

          <div className="space-y-3 rounded-md border p-3 bg-muted/30">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Carga horária total
              </Label>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Horas</Label>
                  <Input
                    type="number"
                    min={0}
                    value={cargaHoras}
                    onChange={(e) => setCargaHoras(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Minutos</Label>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={cargaMin}
                    onChange={(e) => setCargaMin(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tempo total previsto do curso. 0 = sem controle.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Slots de aula *
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addSlot}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar slot
                </Button>
              </div>

              <div className="space-y-2">
                {slots.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-end gap-2 rounded-md border bg-background p-2"
                  >
                    <div className="flex h-9 min-w-[70px] items-center justify-center rounded-md bg-primary/10 px-2 text-xs font-semibold text-primary">
                      Aula {idx + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Horas
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={s.horas}
                        onChange={(e) => updateSlot(idx, { horas: e.target.value })}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Minutos
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={s.minutos}
                        onChange={(e) =>
                          updateSlot(idx, { minutos: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeSlot(idx)}
                      disabled={slots.length <= 1}
                      aria-label="Remover slot"
                      className="text-destructive hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground">
                Define quantas aulas cabem em um turno e a duração de cada uma.
                Todos os slots têm a mesma duração. Cada slot poderá receber
                uma atividade + professor no agendamento.
              </p>

              {turnoTotalMin > 0 && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                  <strong>{slots.length} aula(s)</strong> de{" "}
                  <strong>{formatMinutos(duracaoAulaMin)}</strong> = turno
                  diário de <strong>{formatMinutos(turnoTotalMin)}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">💾 Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
