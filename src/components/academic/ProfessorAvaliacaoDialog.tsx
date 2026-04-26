// =====================================================================
// ProfessorAvaliacaoDialog — Formulário de avaliação de professor (Fase 5)
// =====================================================================
// Permite que alunos/staff avaliem professores. Integra-se com
// AgendarAtividadeDialog para avaliar após conclusão de aula.
//
// Critérios sugeridos:
//   - clareza: comunicação clara dos conceitos
//   - dominio: domínio do conteúdo
//   - engajamento: capacidade de engajar alunos
//   - pontualidade: cumprimento de horários

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  professoresStore,
  useProfessores,
  type ProfessorAvaliacao,
} from "@/lib/professores-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProfessorId?: string;
}

const CRITERIOS_PADRAO = ["clareza", "dominio", "engajamento", "pontualidade"];

export function ProfessorAvaliacaoDialog({
  open,
  onOpenChange,
  defaultProfessorId,
}: Props) {
  const { user: authUser, roles } = useAuth();
  const professores = useProfessores();

  const [professorId, setProfessorId] = useState(defaultProfessorId ?? "");
  const [criterios, setCriterios] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Inicializa critérios em branco (não avaliado)
  useEffect(() => {
    if (!open) return;
    if (defaultProfessorId) {
      setProfessorId(defaultProfessorId);
    }
    setCriterios({});
    setComentario("");
  }, [open, defaultProfessorId]);

  const handleCriterioChange = (criterio: string, valor: number) => {
    setCriterios((prev) => ({ ...prev, [criterio]: valor }));
  };

  const handleSubmit = async () => {
    if (!professorId) {
      toast.error("Selecione um professor");
      return;
    }

    if (Object.keys(criterios).length === 0) {
      toast.error("Avalie pelo menos um critério");
      return;
    }

    // Detecta tipo de avaliador baseado no role
    let avaliadorTipo: "aluno" | "coordenacao" | "admin" | "autoavaliacao" = "aluno";
    if (roles.includes("admin")) {
      avaliadorTipo = "admin";
    } else if (roles.includes("coordenacao")) {
      avaliadorTipo = "coordenacao";
    } else if (roles.includes("professor")) {
      avaliadorTipo = "autoavaliacao";
    }

    const avaliacao: ProfessorAvaliacao = {
      id: crypto.randomUUID(),
      professorId,
      avaliadorUserId: authUser?.id ?? "",
      avaliadorTipo,
      agendamentoId: null, // Pode ser setado ao chamar de AgendarAtividadeDialog
      notas: criterios,
      comentario: comentario.trim() || null,
      criadoEm: new Date().toISOString(),
    };

    setSalvando(true);
    try {
      await professoresStore.addAvaliacao(avaliacao);
      toast.success("Avaliação registrada com sucesso!");
      onOpenChange(false);
    } catch (err) {
      console.error("[ProfessorAvaliacaoDialog] submit error", err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar avaliação",
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Avaliar Professor</DialogTitle>
          <DialogDescription>
            Sua avaliação ajuda a melhorar a qualidade do ensino (Fase 5)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Select professor */}
          <div className="space-y-2">
            <Label htmlFor="prof-select">Professor *</Label>
            <Select value={professorId} onValueChange={setProfessorId}>
              <SelectTrigger id="prof-select">
                <SelectValue placeholder="Selecione um professor" />
              </SelectTrigger>
              <SelectContent>
                {professores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                    {p.email && ` (${p.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Avaliações por critério */}
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Avalie em cada critério (1-5 estrelas):
            </p>
            {CRITERIOS_PADRAO.map((criterio) => (
              <div key={criterio} className="space-y-1.5">
                <label className="text-xs text-muted-foreground capitalize">
                  {criterio}
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => handleCriterioChange(criterio, valor)}
                      className="p-1 hover:scale-110 transition-transform"
                      title={`${valor}/5`}
                    >
                      <Star
                        className={cn(
                          "h-5 w-5 transition-colors",
                          criterios[criterio] >= valor
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground",
                        )}
                      />
                    </button>
                  ))}
                  {criterios[criterio] !== undefined && (
                    <span className="ml-2 text-xs text-muted-foreground pt-1">
                      {criterios[criterio]}/5
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Comentário opcional */}
          <div className="space-y-2">
            <Label htmlFor="comentario">Comentário (opcional)</Label>
            <Textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Deixe sua opinião e sugestões..."
              rows={3}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Máximo 500 caracteres
            </p>
          </div>

          {/* Info sobre avaliador tipo */}
          <div className="text-xs text-muted-foreground border-l-2 border-primary bg-muted/30 p-2.5">
            Você está avaliando como:{" "}
            <span className="font-medium capitalize">
              {roles.includes("admin")
                ? "Admin"
                : roles.includes("coordenacao")
                  ? "Coordenação"
                  : roles.includes("professor")
                    ? "Professor (autoapreciação)"
                    : "Aluno"}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={salvando}>
            {salvando ? "Salvando..." : "Enviar Avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
