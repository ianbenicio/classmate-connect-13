import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DIAS_SEMANA,
  type DiaSemana,
  type HorarioSlot,
  type Turma,
} from "@/lib/academic-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cursoId: string;
  editing?: Turma;
  onSave: (turma: Turma) => void;
}

export function TurmaFormDialog({
  open,
  onOpenChange,
  cursoId,
  editing,
  onSave,
}: Props) {
  const [nome, setNome] = useState("");
  const [cod, setCod] = useState("");
  const [data, setData] = useState("");
  const [horarios, setHorarios] = useState<HorarioSlot[]>([]);
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setCod(editing?.cod ?? "");
    setData(editing?.data ?? "");
    setHorarios(editing?.horarios ?? []);
    setDescricao(editing?.descricao ?? "");
  }, [open, editing]);

  const addHorario = () =>
    setHorarios((prev) => [
      ...prev,
      { diaSemana: "seg", inicio: "08:00", fim: "10:00" },
    ]);

  const updateHorario = (i: number, patch: Partial<HorarioSlot>) =>
    setHorarios((prev) =>
      prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)),
    );

  const removeHorario = (i: number) =>
    setHorarios((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cod.trim()) {
      toast.error("Nome e Cod são obrigatórios.");
      return;
    }
    if (horarios.some((h) => !h.inicio || !h.fim)) {
      toast.error("Preencha início e fim de todos os horários.");
      return;
    }
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      cursoId,
      nome: nome.trim(),
      cod: cod.trim().toUpperCase(),
      data: data || new Date().toISOString().slice(0, 10),
      horarios,
      alunosIds: editing?.alunosIds ?? [],
      descricao: descricao.trim() || undefined,
    });
    toast.success(editing ? "Turma atualizada!" : "Turma criada!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Turma" : "Nova Turma"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Nome *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Design 2026/A"
              />
            </div>
            <div className="space-y-2">
              <Label>Cod *</Label>
              <Input
                value={cod}
                onChange={(e) => setCod(e.target.value)}
                placeholder="Ex.: DSG-26A"
                maxLength={12}
              />
            </div>
            <div className="space-y-2">
              <Label>Data início</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between">
                <Label>Horários semanais</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addHorario}
                >
                  <Plus /> Adicionar
                </Button>
              </div>
              {horarios.length === 0 ? (
                <p className="text-xs text-muted-foreground border rounded-md p-3 text-center">
                  Nenhum horário cadastrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {horarios.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-end gap-2 rounded-md border p-2"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <Label className="text-[10px] uppercase text-muted-foreground">
                          Dia
                        </Label>
                        <Select
                          value={h.diaSemana}
                          onValueChange={(v) =>
                            updateHorario(i, { diaSemana: v as DiaSemana })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIAS_SEMANA.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">
                          Início
                        </Label>
                        <Input
                          type="time"
                          value={h.inicio}
                          onChange={(e) =>
                            updateHorario(i, { inicio: e.target.value })
                          }
                          className="w-[110px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">
                          Fim
                        </Label>
                        <Input
                          type="time"
                          value={h.fim}
                          onChange={(e) =>
                            updateHorario(i, { fim: e.target.value })
                          }
                          className="w-[110px]"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeHorario(i)}
                        aria-label="Remover horário"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">💾 Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
