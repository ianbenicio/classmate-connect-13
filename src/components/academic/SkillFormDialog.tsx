// Form dialog para criar/editar uma Habilidade.
// Habilidade é uma entidade independente — sem classificação de tipo.
// A associação com Curso/Atividade é feita nos próprios formulários deles.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { habilidadesStore } from "@/lib/habilidades-store";
import type { Habilidade } from "@/lib/academic-types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Habilidade | null;
}

export function SkillFormDialog({ open, onOpenChange, editing }: Props) {
  const [sigla, setSigla] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [grupo, setGrupo] = useState("");

  useEffect(() => {
    if (open) {
      setSigla(editing?.sigla ?? "");
      setNome(editing?.nome ?? "");
      setDescricao(editing?.descricao ?? "");
      setGrupo(editing?.grupo ?? "");
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!sigla.trim()) {
      toast.error("Sigla é obrigatória.");
      return;
    }
    if (!descricao.trim()) {
      toast.error("Descrição é obrigatória.");
      return;
    }

    const h: Habilidade = {
      id: editing?.id ?? crypto.randomUUID(),
      sigla: sigla.trim().toUpperCase(),
      nome: nome.trim() || undefined,
      descricao: descricao.trim(),
      grupo: grupo.trim() || undefined,
    };
    await habilidadesStore.upsert(h);
    toast.success(editing ? "Habilidade atualizada." : "Habilidade criada.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar habilidade" : "Nova habilidade"}
          </DialogTitle>
          <DialogDescription>
            Cadastre a habilidade. Ela poderá ser vinculada a cursos (até 8 por
            curso) e a atividades (até 5 por atividade).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sk-sigla">Sigla / ID</Label>
            <Input
              id="sk-sigla"
              value={sigla}
              onChange={(e) => setSigla(e.target.value)}
              placeholder="ex.: COM-01"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sk-desc">Descrição</Label>
            <Textarea
              id="sk-desc"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que essa habilidade representa?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sk-grupo">Grupo (opcional)</Label>
            <Input
              id="sk-grupo"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              placeholder="ex.: Socioemocional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editing ? "Salvar" : "Criar habilidade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
