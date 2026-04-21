// Wizard de Avaliação da Aula (preenchido pelo aluno).
// 3 passos: Aula → Professor → Abertas + Área de interesse.
// Janela: até 24h após o fim do slot.

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles, ChevronLeft, ChevronRight, Send, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FaceRating } from "./FaceRating";
import {
  AREAS_INTERESSE,
  PERGUNTAS_AULA,
  PERGUNTAS_PROFESSOR,
  sortearAbertas,
  type AreaInteresse,
  type AvaliacaoAula,
  type Nota,
  type PerguntaAulaId,
  type PerguntaProfId,
  type RespostaAberta,
} from "@/lib/avaliacoes-types";
import { avaliacoesStore } from "@/lib/avaliacoes-store";
import {
  endSlotPlus24h,
  type Agendamento,
  type Aluno,
  type Curso,
  type Turma,
} from "@/lib/academic-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: Agendamento;
  aluno: Aluno;
  turma: Turma;
  curso: Curso;
}

const emptyAula = (): Record<PerguntaAulaId, Nota | null> => ({
  objetivo: null,
  pratica: null,
  diversao: null,
  ritmo: null,
  materiais: null,
});

const emptyProf = (): Record<PerguntaProfId, Nota | null> => ({
  explica: null,
  ajuda: null,
  respeito: null,
  energia: null,
  evolucao: null,
});

export function AvaliacaoAulaDialog({
  open,
  onOpenChange,
  agendamento,
  aluno,
  turma,
  curso,
}: Props) {
  const existente = avaliacoesStore.byAgendamentoAluno(agendamento.id, aluno.id);
  const [step, setStep] = useState(0);
  const [aula, setAula] = useState<Record<PerguntaAulaId, Nota | null>>(
    existente?.aula ?? emptyAula(),
  );
  const [profNotas, setProfNotas] = useState<Record<PerguntaProfId, Nota | null>>(
    existente?.professor_notas ?? emptyProf(),
  );
  const [abertas, setAbertas] = useState<Record<string, string>>(
    Object.fromEntries(
      (existente?.abertas ?? []).map((r) => [r.perguntaId, r.texto]),
    ),
  );
  const [area, setArea] = useState<AreaInteresse | undefined>(
    existente?.areaInteresse,
  );

  const sorteio = useMemo(
    () => sortearAbertas(agendamento.id, aluno.id),
    [agendamento.id, aluno.id],
  );

  const dataFmt = format(new Date(`${agendamento.data}T00:00:00`), "PPP", {
    locale: ptBR,
  });

  const expiraEm = endSlotPlus24h(agendamento);
  const expirado = new Date() > expiraEm;

  const totalSteps = 3;
  const stepLabel = ["A Aula", "O Professor", "Suas palavras"][step];

  const handleSubmit = () => {
    const av: AvaliacaoAula = {
      id: existente?.id ?? crypto.randomUUID(),
      agendamentoId: agendamento.id,
      alunoId: aluno.id,
      turmaId: turma.id,
      cursoId: curso.id,
      professor: agendamento.professor,
      enviadoEm: new Date().toISOString(),
      aula,
      professor_notas: profNotas,
      abertas: Object.entries(abertas)
        .filter(([, texto]) => texto.trim().length > 0)
        .map(
          ([perguntaId, texto]): RespostaAberta => ({
            perguntaId,
            texto: texto.trim(),
          }),
        ),
      areaInteresse: area,
    };
    avaliacoesStore.upsert(av);
    toast.success("Avaliação enviada — obrigado! ✨");
    onOpenChange(false);
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Avaliação da aula
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">
              {curso.nome} · {turma.nome} · {dataFmt}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> O professor não vê suas respostas
              individuais — só a média da turma.
            </span>
          </DialogDescription>
        </DialogHeader>

        {expirado ? (
          <div className="rounded-md border border-muted bg-muted/30 px-3 py-4 text-sm text-muted-foreground text-center">
            Esta avaliação expirou (mais de 24h após o fim da aula).
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Passo {step + 1} de {totalSteps} — {stepLabel}
                </span>
                <span>~2 min</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Step 1: Aula */}
            {step === 0 && (
              <div className="space-y-4">
                {PERGUNTAS_AULA.map((p) => (
                  <div key={p.id} className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base">{p.emoji}</span>
                      <span className="text-sm font-medium">{p.titulo}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.pergunta}</p>
                    <FaceRating
                      value={aula[p.id]}
                      onChange={(n) =>
                        setAula((prev) => ({ ...prev, [p.id]: n }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Professor */}
            {step === 1 && (
              <div className="space-y-4">
                {agendamento.professor && (
                  <Badge variant="outline" className="text-xs">
                    Sobre: {agendamento.professor}
                  </Badge>
                )}
                {PERGUNTAS_PROFESSOR.map((p) => (
                  <div key={p.id} className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base">{p.emoji}</span>
                      <span className="text-sm font-medium">{p.titulo}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.pergunta}</p>
                    <FaceRating
                      value={profNotas[p.id]}
                      onChange={(n) =>
                        setProfNotas((prev) => ({ ...prev, [p.id]: n }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Abertas + Área */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground italic">
                  Responder é opcional — escreva só se quiser.
                </p>

                {sorteio.aula.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <label className="text-sm font-medium">{p.pergunta}</label>
                    <Textarea
                      rows={2}
                      value={abertas[p.id] ?? ""}
                      onChange={(e) =>
                        setAbertas((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      placeholder="Escreva aqui..."
                    />
                  </div>
                ))}

                {sorteio.prof.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <label className="text-sm font-medium">{p.pergunta}</label>
                    <Textarea
                      rows={2}
                      value={abertas[p.id] ?? ""}
                      onChange={(e) =>
                        setAbertas((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      placeholder="Escreva aqui..."
                    />
                  </div>
                ))}

                <div className="space-y-2 pt-2 border-t">
                  <label className="text-sm font-medium">
                    Qual área você quer ver mais na próxima aula?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AREAS_INTERESSE.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() =>
                          setArea((prev) => (prev === a.value ? undefined : a.value))
                        }
                        className={cn(
                          "rounded-md border px-3 py-2 text-sm flex items-center gap-2 transition-all",
                          area === a.value
                            ? "border-primary bg-primary/10 font-medium"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <span>{a.emoji}</span>
                        <span>{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer nav */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ChevronLeft /> Voltar
              </Button>
              {step < totalSteps - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>
                  Continuar <ChevronRight />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>
                  <Send /> Enviar avaliação
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
