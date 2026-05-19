// =====================================================================
// CursoTemplatesDialog — Templates de Curso pré-prontos (B3)
// =====================================================================
// Exibe 3 templates: Anos Iniciais, Fundamental II, Médio.
// Botão "Clonar" faz INSERT novo no tenant ativo — edição local, isolada.

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CURSO_TEMPLATES, cloneTemplate, type CursoTemplate } from "@/lib/curso-templates";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TAG_BADGE: Record<CursoTemplate["tag"], string> = {
  anos_iniciais: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  fundamental2: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  medio: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

const TAG_LABEL: Record<CursoTemplate["tag"], string> = {
  anos_iniciais: "Fundamental I",
  fundamental2: "Fundamental II",
  medio: "Ensino Médio",
};

export function CursoTemplatesDialog({ open, onOpenChange }: Props) {
  const [cloning, setCloning] = useState<string | null>(null);
  const [cloned, setCloned] = useState<Set<string>>(new Set());

  const handleClone = async (tpl: CursoTemplate) => {
    setCloning(tpl.id);
    try {
      const curso = await cloneTemplate(tpl);
      setCloned((prev) => new Set([...prev, tpl.id]));
      toast.success(`Curso "${curso.nome}" criado com código ${curso.cod}.`, {
        description: "Edite em Cursos para personalizar.",
      });
    } catch (e) {
      toast.error("Erro ao clonar: " + (e instanceof Error ? e.message : ""));
    } finally {
      setCloning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Templates de Curso
          </DialogTitle>
          <DialogDescription>
            Crie um curso a partir de um template pré-configurado para o seu segmento.
            Os cursos clonados são independentes — você pode editá-los livremente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 mt-2">
          {CURSO_TEMPLATES.map((tpl) => {
            const isCloning = cloning === tpl.id;
            const wasCloned = cloned.has(tpl.id);
            return (
              <Card key={tpl.id} className={wasCloned ? "opacity-75" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{tpl.nome}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {tpl.descricao}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${TAG_BADGE[tpl.tag]}`}
                    >
                      {TAG_LABEL[tpl.tag]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        Aula: <b>{tpl.duracaoAulaMin} min</b>
                      </span>
                      <span>
                        Turno: <b>{tpl.turnoDiarioMin} min</b>
                      </span>
                      <span>
                        Carga: <b>{(tpl.cargaHorariaTotalMin / 60).toFixed(0)} h</b>
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={wasCloned ? "outline" : "default"}
                      className="h-7 text-xs"
                      onClick={() => void handleClone(tpl)}
                      disabled={isCloning}
                    >
                      {isCloning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : wasCloned ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {wasCloned ? "Clonado" : "Clonar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Após clonar, acesse <b>Cursos</b> para ajustar nome, código e carga horária.
        </p>
      </DialogContent>
    </Dialog>
  );
}
