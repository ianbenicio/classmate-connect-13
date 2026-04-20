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
import type { Turma } from "@/lib/academic-types";

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
  const [horario, setHorario] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setCod(editing?.cod ?? "");
    setData(editing?.data ?? "");
    setHorario(editing?.horario ?? "");
    setDescricao(editing?.descricao ?? "");
  }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cod.trim()) {
      toast.error("Nome e Cod são obrigatórios.");
      return;
    }
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      cursoId,
      nome: nome.trim(),
      cod: cod.trim().toUpperCase(),
      data: data || new Date().toISOString().slice(0, 10),
      horario: horario.trim(),
      alunosIds: editing?.alunosIds ?? [],
      descricao: descricao.trim() || undefined,
    });
    toast.success(editing ? "Turma atualizada!" : "Turma criada!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
              <Label>Data</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Horário</Label>
              <Input
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="Ex.: 08:00 - 10:00"
              />
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
