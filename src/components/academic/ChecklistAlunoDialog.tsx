// Checklist Individual do Aluno — preenchido pelo professor, 1 por aluno.
// 5 habilidades gerais (curso) + 5 específicas (atividade) + comportamento + engajamento.
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { FaceRating } from "./FaceRating";
import { avaliacoesStore } from "@/lib/avaliacoes-store";
import { useHabilidades } from "@/lib/habilidades-store";
import {
  type ChecklistAlunoDados,
  type ComportamentoTag,
  type Nota1a5,
} from "@/lib/formularios-types";
import { useComportamentoTags } from "@/lib/comportamento-tags-store";
import type { Nota } from "@/lib/avaliacoes-types";
import type {
  Agendamento,
  Aluno,
  Atividade,
  Curso,
} from "@/lib/academic-types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: Agendamento;
  aluno: Aluno;
  curso: Curso;
  atividades: Atividade[];
}

export function ChecklistAlunoDialog({
  open,
  onOpenChange,
  agendamento,
  aluno,
  curso,
  atividades,
}: Props) {
  const todasHabilidades = useHabilidades();
  const todasTags = useComportamentoTags();
  // Mostra apenas tags ativas, ordenadas por `ordem`.
  const tagsAtivas = todasTags.filter((t) => t.ativo);

  const habilidadesGerais = useMemo(() => {
    const ids = new Set(curso.habilidadeIds ?? []);
    return todasHabilidades.filter((h) => ids.has(h.id));
  }, [todasHabilidades, curso.habilidadeIds]);

  const habilidadesEspecificas = useMemo(() => {
    const ativs = atividades.filter((a) =>
      agendamento.atividadeIds.includes(a.id),
    );
    const ids = new Set<string>();
    for (const a of ativs) for (const id of a.habilidadeIds ?? []) ids.add(id);
    return todasHabilidades.filter((h) => ids.has(h.id));
  }, [todasHabilidades, agendamento.atividadeIds, atividades]);

  const existing = avaliacoesStore.find<ChecklistAlunoDados>(
    "checklist_aluno",
    agendamento.id,
    aluno.id,
  );

  const [notas, setNotas] = useState<Record<string, Nota1a5>>({});
  const [comp, setComp] = useState<ComportamentoTag[]>([]);
  const [engajamento, setEngajamento] = useState<Nota | null>(null);
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (!open) return;
    const d = existing?.dados;
    setNotas(d?.habilidadesNotas ?? {});
    setComp(d?.comportamento ?? []);
    setEngajamento((d?.engajamento as Nota | null) ?? null);
    setObservacao(d?.observacao ?? "");
    // Intencional: reset apenas ao abrir/mudar alvo. `existing` é derivado
    // e re-cria a cada render — incluí-lo clobbar entrada do usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agendamento.id, aluno.id]);

  const setNota = (habId: string, n: Nota | null) => {
    setNotas((prev) => {
      const next = { ...prev };
      if (n === null) delete next[habId];
      else next[habId] = n as Nota1a5;
      return next;
    });
  };

  const toggleComp = (t: ComportamentoTag) => {
    setComp((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const handleSubmit = async () => {
    const dados: ChecklistAlunoDados = {
      habilidadesNotas: notas,
      comportamento: comp,
      engajamento: engajamento as Nota1a5 | null,
      observacao: observacao.trim() || undefined,
    };
    await avaliacoesStore.saveChecklistAluno(agendamento.id, aluno.id, dados);
    toast.success(`Checklist de ${aluno.nome} salvo.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" /> Checklist —{" "}
            {aluno.nome}
          </DialogTitle>
          <DialogDescription>
            {curso.nome} · Avaliação individual da aula.
          </DialogDescription>
        </DialogHeader>

        {/* Engajamento */}
        <section className="space-y-1.5">
          <Label>📊 Engajamento na aula</Label>
          <FaceRating value={engajamento} onChange={setEngajamento} />
        </section>

        {/* Habilidades gerais */}
        {habilidadesGerais.length > 0 && (
          <section className="space-y-2 border-t pt-3">
            <Label className="flex items-center gap-2">
              Habilidades gerais{" "}
              <Badge variant="outline" className="text-[10px]">
                Curso
              </Badge>
            </Label>
            <div className="space-y-3">
              {habilidadesGerais.map((h) => (
                <div key={h.id} className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {h.sigla}
                    </Badge>
                    <span className="text-xs">{h.descricao}</span>
                  </div>
                  <FaceRating
                    value={notas[h.id] ?? null}
                    onChange={(n) => setNota(h.id, n)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Habilidades específicas */}
        {habilidadesEspecificas.length > 0 && (
          <section className="space-y-2 border-t pt-3">
            <Label className="flex items-center gap-2">
              Habilidades específicas{" "}
              <Badge variant="outline" className="text-[10px]">
                Atividade
              </Badge>
            </Label>
            <div className="space-y-3">
              {habilidadesEspecificas.map((h) => (
                <div key={h.id} className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {h.sigla}
                    </Badge>
                    <span className="text-xs">{h.descricao}</span>
                  </div>
                  <FaceRating
                    value={notas[h.id] ?? null}
                    onChange={(n) => setNota(h.id, n)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {habilidadesGerais.length === 0 && habilidadesEspecificas.length === 0 && (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Nenhuma habilidade cadastrada para este curso/atividade. Cadastre em
            "Habilidades" no header.
          </div>
        )}

        {/* Comportamento */}
        <section className="space-y-2 border-t pt-3">
          <Label>Comportamento na aula (multi-seleção)</Label>
          <div className="flex flex-wrap gap-2">
            {tagsAtivas.map((t) => {
              const sel = comp.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleComp(t.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all",
                    sel
                      ? t.tom === "pos"
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-amber-500 bg-amber-500/10 font-medium"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {t.emoji && <span>{t.emoji}</span>}
                  <span>{t.label}</span>
                </button>
              );
            })}
            {tagsAtivas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma tag de comportamento cadastrada.
              </p>
            )}
          </div>
        </section>

        {/* Observação */}
        <section className="space-y-1.5 border-t pt-3">
          <Label htmlFor="ck-obs">Observação (opcional)</Label>
          <Textarea
            id="ck-obs"
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Algo específico sobre o aluno hoje?"
          />
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            <Send /> Salvar checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
