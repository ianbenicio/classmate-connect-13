// Form dialog para criar/editar uma Habilidade.
// Campos: Nome (sigla), Descrição, Tipo (geral/especifica) + vínculo (curso ou atividade).
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { habilidadesStore } from "@/lib/habilidades-store";
import { useCursos } from "@/lib/cursos-store";
import { useAtividades } from "@/lib/atividades-store";
import type { Habilidade, HabilidadeTipo } from "@/lib/academic-types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Habilidade | null;
}

export function SkillFormDialog({ open, onOpenChange, editing }: Props) {
  const cursos = useCursos();
  const atividades = useAtividades();
  const [sigla, setSigla] = useState("");
  const [descricao, setDescricao] = useState("");
  const [grupo, setGrupo] = useState("");
  const [tipo, setTipo] = useState<HabilidadeTipo>("geral");
  const [cursoId, setCursoId] = useState<string>("");
  const [atividadeId, setAtividadeId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSigla(editing?.sigla ?? "");
      setDescricao(editing?.descricao ?? "");
      setGrupo(editing?.grupo ?? "");
      setTipo(editing?.tipo ?? "geral");
      setCursoId(editing?.cursoId ?? "");
      setAtividadeId(editing?.atividadeId ?? "");
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
    if (tipo === "geral" && !cursoId) {
      toast.error("Habilidade geral precisa de um curso.");
      return;
    }
    if (tipo === "especifica" && !atividadeId) {
      toast.error("Habilidade específica precisa de uma atividade.");
      return;
    }

    const h: Habilidade = {
      id: editing?.id ?? crypto.randomUUID(),
      sigla: sigla.trim().toUpperCase(),
      descricao: descricao.trim(),
      grupo: grupo.trim() || undefined,
      tipo,
      cursoId: tipo === "geral" ? cursoId : undefined,
      atividadeId: tipo === "especifica" ? atividadeId : undefined,
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
            Habilidades gerais ficam ligadas a um curso. Específicas a uma
            atividade.
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
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as HabilidadeTipo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">
                  Geral — vinculada ao curso
                </SelectItem>
                <SelectItem value="especifica">
                  Específica — vinculada à atividade
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === "geral" ? (
            <div className="space-y-1.5">
              <Label>Curso</Label>
              <Select value={cursoId} onValueChange={setCursoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  {cursos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cod} · {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Atividade</Label>
              <Select value={atividadeId} onValueChange={setAtividadeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma atividade" />
                </SelectTrigger>
                <SelectContent>
                  {atividades.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.codigo} · {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
