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
import { toast } from "sonner";
import type { Curso } from "@/lib/academic-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (curso: Curso) => void;
  editing?: Curso;
}

export function CourseFormDialog({ open, onOpenChange, onSave, editing }: Props) {
  const [cod, setCod] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cargaHoras, setCargaHoras] = useState<string>("");
  const [cargaMin, setCargaMin] = useState<string>("");
  const [duracaoHoras, setDuracaoHoras] = useState<string>("1");
  const [duracaoMin, setDuracaoMin] = useState<string>("0");

  useEffect(() => {
    if (open) {
      setCod(editing?.cod ?? "");
      setNome(editing?.nome ?? "");
      setDescricao(editing?.descricao ?? "");
      const totalMin = editing?.cargaHorariaTotalMin ?? 0;
      setCargaHoras(String(Math.floor(totalMin / 60)));
      setCargaMin(String(totalMin % 60));
      const dur = editing?.duracaoAulaMin ?? 60;
      setDuracaoHoras(String(Math.floor(dur / 60)));
      setDuracaoMin(String(dur % 60));
    }
  }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cod.trim() || !nome.trim()) {
      toast.error("Cod e Nome são obrigatórios.");
      return;
    }
    const cargaTotalMin =
      (parseInt(cargaHoras || "0", 10) || 0) * 60 +
      (parseInt(cargaMin || "0", 10) || 0);
    const duracaoTotal =
      (parseInt(duracaoHoras || "0", 10) || 0) * 60 +
      (parseInt(duracaoMin || "0", 10) || 0);
    if (duracaoTotal <= 0) {
      toast.error("A duração padrão da aula deve ser maior que zero.");
      return;
    }
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      cod: cod.trim().toUpperCase(),
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      cargaHorariaTotalMin: cargaTotalMin,
      duracaoAulaMin: duracaoTotal,
    });
    toast.success(editing ? "Curso atualizado!" : "Curso criado!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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

          <div className="grid grid-cols-2 gap-3 rounded-md border p-3 bg-muted/30">
            <div className="space-y-2 col-span-2">
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
            <div className="space-y-2 col-span-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Duração padrão da aula *
              </Label>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Horas</Label>
                  <Input
                    type="number"
                    min={0}
                    value={duracaoHoras}
                    onChange={(e) => setDuracaoHoras(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Minutos</Label>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={duracaoMin}
                    onChange={(e) => setDuracaoMin(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tamanho de cada bloco de aula. Define como o slot da turma é dividido.
              </p>
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
