/**
 * AvaliacaoAlunoProfessorDialog
 * Formulário de avaliação feito pelo aluno sobre o professor e a aula.
 * Contexto (curso, turma, horário, professor, aluno) é capturado automaticamente.
 *
 * Estrutura:
 *  - 4 critérios com estrelas (clareza, domínio, engajamento, pontualidade)
 *  - 3 perguntas abertas (o que gostou, o que melhorar, sugestão)
 */

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { professoresStore, type ProfessorAvaliacao } from "@/lib/professores-store";
import type { Agendamento } from "@/lib/academic-types";
import type { Turma } from "@/lib/academic-types";
import type { Curso } from "@/lib/academic-types";

// ── Critérios com estrelas ──────────────────────────────────────────────────
const CRITERIOS: { id: string; label: string; descricao: string }[] = [
  {
    id: "clareza",
    label: "Clareza",
    descricao: "O professor explicou de forma fácil de entender?",
  },
  {
    id: "dominio",
    label: "Domínio do Conteúdo",
    descricao: "O professor demonstrou conhecimento do assunto?",
  },
  {
    id: "engajamento",
    label: "Engajamento",
    descricao: "O professor manteve a turma interessada e participativa?",
  },
  {
    id: "pontualidade",
    label: "Pontualidade",
    descricao: "O professor foi pontual e respeitou os horários?",
  },
];

// ── Perguntas abertas ────────────────────────────────────────────────────────
const PERGUNTAS_ABERTAS: { id: string; label: string; placeholder: string }[] = [
  {
    id: "gostou",
    label: "O que você mais gostou?",
    placeholder: "Pode ser sobre a aula, o professor, o conteúdo...",
  },
  {
    id: "melhorar",
    label: "O que poderia melhorar?",
    placeholder: "Sugestões sobre o ritmo, a explicação, o ambiente...",
  },
  {
    id: "sugestao",
    label: "Alguma sugestão para o professor?",
    placeholder: "Dica, pedido, feedback direto para o professor...",
  },
];

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Agendamento da aula sendo avaliada */
  agendamento: Agendamento;
  /** Turma associada */
  turma: Turma;
  /** Curso associado */
  curso: Curso;
  /** userId do professor que ministrou a aula */
  professorUserId: string;
  /** Nome exibido do professor */
  professorNome: string;
  /** Nome exibido do aluno que está avaliando */
  alunoNome?: string;
}

// ── Componente StarInput ─────────────────────────────────────────────────────
function StarInput({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover ?? value ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}
            className="p-0.5 hover:scale-110 transition-transform focus-visible:outline-none"
            title={`${n} / 5`}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
      {value !== null && (
        <span className="ml-1 text-xs text-muted-foreground self-center">{value}/5</span>
      )}
    </div>
  );
}

// ── Dialog Principal ─────────────────────────────────────────────────────────
export function AvaliacaoAlunoProfessorDialog({
  open,
  onOpenChange,
  agendamento,
  turma,
  curso,
  professorUserId,
  professorNome,
  alunoNome,
}: Props) {
  const { user: authUser } = useAuth();

  const [notas, setNotas] = useState<Record<string, number | null>>(
    Object.fromEntries(CRITERIOS.map((c) => [c.id, null])),
  );
  const [respostas, setRespostas] = useState<Record<string, string>>(
    Object.fromEntries(PERGUNTAS_ABERTAS.map((p) => [p.id, ""])),
  );
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNotas(Object.fromEntries(CRITERIOS.map((c) => [c.id, 3])));
    setRespostas(Object.fromEntries(PERGUNTAS_ABERTAS.map((p) => [p.id, ""])));
  }, [open]);

  const algumaCriterioPreenchida = Object.values(notas).some((v) => v !== null);

  const handleSubmit = async () => {
    if (!algumaCriterioPreenchida) {
      toast.error("Avalie pelo menos um critério antes de enviar.");
      return;
    }

    // Monta o comentário concatenando as respostas abertas preenchidas
    const partes: string[] = [];
    for (const p of PERGUNTAS_ABERTAS) {
      const texto = respostas[p.id].trim();
      if (texto) partes.push(`**${p.label}**: ${texto}`);
    }
    const comentarioFinal = partes.join("\n\n") || null;

    // Apenas critérios preenchidos
    const notasFinal: Record<string, number> = {};
    for (const [k, v] of Object.entries(notas)) {
      if (v !== null) notasFinal[k] = v;
    }

    const avaliacao: ProfessorAvaliacao = {
      id: crypto.randomUUID(),
      professorId: professorUserId,
      professorUserId,
      avaliadorUserId: authUser?.id ?? "",
      avaliadorTipo: "aluno",
      agendamentoId: agendamento.id,
      notas: notasFinal,
      comentario: comentarioFinal,
      tags: [],
      criadoEm: new Date().toISOString(),
    };

    setSalvando(true);
    try {
      await professoresStore.addAvaliacao(avaliacao);
      toast.success("Avaliação enviada! Obrigado pelo feedback.");
      onOpenChange(false);
    } catch (err) {
      console.error("[AvaliacaoAlunoProfessor] submit error", err);
      toast.error(err instanceof Error ? err.message : "Erro ao salvar avaliação");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliação do Professor</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Avalie <strong>{professorNome}</strong> na aula de hoje.
              </p>
              {/* Contexto invisível para o usuário final, visível como metadados */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="secondary" className="text-[10px]">
                  {curso.nome}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {turma.cod ?? turma.id}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {agendamento.data} · {agendamento.inicio}–{agendamento.fim}
                </Badge>
                {alunoNome && (
                  <Badge variant="outline" className="text-[10px]">
                    {alunoNome}
                  </Badge>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── Bloco 1: Critérios com estrelas ─────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Avalie o professor (1 – 5 estrelas)</h3>
            {CRITERIOS.map((c) => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <Label className="text-sm font-medium">{c.label}</Label>
                </div>
                <p className="text-xs text-muted-foreground">{c.descricao}</p>
                <StarInput
                  value={notas[c.id]}
                  onChange={(v) => setNotas((prev) => ({ ...prev, [c.id]: v }))}
                />
              </div>
            ))}
          </section>

          <div className="border-t" />

          {/* ── Bloco 2: Perguntas abertas ───────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Conte um pouco mais (opcional)</h3>
            {PERGUNTAS_ABERTAS.map((p) => (
              <div key={p.id} className="space-y-1.5">
                <Label htmlFor={`resp-${p.id}`} className="text-sm">
                  {p.label}
                </Label>
                <Textarea
                  id={`resp-${p.id}`}
                  value={respostas[p.id]}
                  onChange={(e) => setRespostas((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder={p.placeholder}
                  rows={2}
                  className="text-sm resize-none"
                  maxLength={300}
                />
              </div>
            ))}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={salvando || !algumaCriterioPreenchida}>
            {salvando ? "Enviando…" : "Enviar Avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
