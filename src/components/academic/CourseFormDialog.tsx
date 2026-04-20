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

  useEffect(() => {
    if (open) {
      setCod(editing?.cod ?? "");
      setNome(editing?.nome ?? "");
      setDescricao(editing?.descricao ?? "");
    }
  }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cod.trim() || !nome.trim()) {
      toast.error("Cod e Nome são obrigatórios.");
      return;
    }
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      cod: cod.trim().toUpperCase(),
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
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
