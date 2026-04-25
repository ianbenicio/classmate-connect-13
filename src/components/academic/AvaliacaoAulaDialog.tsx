// Relatório do Aluno (substitui o antigo AvaliacaoAulaDialog).
// 4 blocos curtos: validação do conteúdo + a aula + o professor + você.
// Janela: até 24h após o fim do slot.

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles, Send, Lock } from "lucide-react";
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
import { toast } from "sonner";
import { FaceRating } from "./FaceRating";
import { avaliacoesStore } from "@/lib/avaliacoes-store";
import {
  endSlotPlus24h,
  type Agendamento,
  type Aluno,
  type Curso,
  type Turma,
} from "@/lib/academic-types";
import type {
  Nota1a5,
  RelatorioAlunoDados,
} from "@/lib/formularios-types";
import type { Nota } from "@/lib/avaliacoes-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: Agendamento;
  aluno: Aluno;
  turma: Turma;
  curso: Curso;
}

const initialAula = () => ({
  interessante: null as Nota | null,
  ritmoBom: null as Nota | null,
  materiaisOk: null as Nota | null,
});
const initialProf = () => ({
  explicaBem: null as Nota | null,
  ajudaQuandoTrava: null as Nota | null,
  respeito: null as Nota | null,
});
const initialEu = () => ({
  participei: null as Nota | null,
  aprendiAlgoNovo: null as Nota | null,
});

export function AvaliacaoAulaDialog({
  open,
  onOpenChange,
  agendamento,
  aluno,
  turma,
  curso,
}: Props) {
  const existing = avaliacoesStore.find<RelatorioAlunoDados>(
    "relatorio_aluno",
    agendamento.id,
    aluno.id,
  );

  const [entendeu, setEntendeu] = useState<Nota | null>(null);
  const [aula, setAula] = useState(initialAula());
  const [prof, setProf] = useState(initialProf());
  const [eu, setEu] = useState(initialEu());
  const [destaque, setDestaque] = useState("");
  const [mudaria, setMudaria] = useState("");

  useEffect(() => {
    if (!open) return;
    const d = existing?.dados;
    setEntendeu((d?.entendeuConteudo as Nota | null) ?? null);
    setAula({
      interessante: (d?.aula?.interessante as Nota | null) ?? null,
      ritmoBom: (d?.aula?.ritmoBom as Nota | null) ?? null,
      materiaisOk: (d?.aula?.materiaisOk as Nota | null) ?? null,
    });
    setProf({
      explicaBem: (d?.professor?.explicaBem as Nota | null) ?? null,
      ajudaQuandoTrava: (d?.professor?.ajudaQuandoTrava as Nota | null) ?? null,
      respeito: (d?.professor?.respeito as Nota | null) ?? null,
    });
    setEu({
      participei: (d?.euNaAula?.participei as Nota | null) ?? null,
      aprendiAlgoNovo: (d?.euNaAula?.aprendiAlgoNovo as Nota | null) ?? null,
    });
    setDestaque(d?.destaqueDoDia ?? "");
    setMudaria(d?.oQueMudaria ?? "");
    // Intencional: reset apenas quando o diálogo abre ou o alvo muda.
    // `existing` é derivado e mudaria a cada render, refazendo o reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agendamento.id, aluno.id]);

  const dataFmt = format(new Date(`${agendamento.data}T00:00:00`), "PPP", {
    locale: ptBR,
  });
  const expirado = new Date() > endSlotPlus24h(agendamento);

  const handleSubmit = async () => {
    const dados: RelatorioAlunoDados = {
      entendeuConteudo: entendeu as Nota1a5 | null,
      aula: {
        interessante: aula.interessante as Nota1a5 | null,
        ritmoBom: aula.ritmoBom as Nota1a5 | null,
        materiaisOk: aula.materiaisOk as Nota1a5 | null,
      },
      professor: {
        explicaBem: prof.explicaBem as Nota1a5 | null,
        ajudaQuandoTrava: prof.ajudaQuandoTrava as Nota1a5 | null,
        respeito: prof.respeito as Nota1a5 | null,
      },
      euNaAula: {
        participei: eu.participei as Nota1a5 | null,
        aprendiAlgoNovo: eu.aprendiAlgoNovo as Nota1a5 | null,
      },
      destaqueDoDia: destaque.trim() || undefined,
      oQueMudaria: mudaria.trim() || undefined,
    };
    await avaliacoesStore.saveRelatorioAluno(agendamento.id, aluno.id, dados);
    toast.success("Avaliação enviada — obrigado! ✨");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Como foi sua aula?
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
            {/* Validação de conteúdo */}
            <section className="space-y-1.5">
              <Label>📚 Você entendeu o conteúdo da aula?</Label>
              <FaceRating value={entendeu} onChange={setEntendeu} />
            </section>

            {/* Bloco: A aula */}
            <section className="space-y-3 border-t pt-3">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">
                A aula
              </Label>
              <div className="space-y-1.5">
                <p className="text-sm">🎯 A aula foi interessante?</p>
                <FaceRating
                  value={aula.interessante}
                  onChange={(n) => setAula((p) => ({ ...p, interessante: n }))}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm">⏱️ O ritmo foi bom?</p>
                <FaceRating
                  value={aula.ritmoBom}
                  onChange={(n) => setAula((p) => ({ ...p, ritmoBom: n }))}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm">💻 Os materiais ajudaram?</p>
                <FaceRating
                  value={aula.materiaisOk}
                  onChange={(n) => setAula((p) => ({ ...p, materiaisOk: n }))}
                />
              </div>
            </section>

            {/* Bloco: O professor */}
            <section className="space-y-3 border-t pt-3">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">
                O professor
              </Label>
              <div className="space-y-1.5">
                <p className="text-sm">💙 Explicou de um jeito que entendi?</p>
                <FaceRating
                  value={prof.explicaBem}
                  onChange={(n) => setProf((p) => ({ ...p, explicaBem: n }))}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm">🙋 Me ajudou quando travei?</p>
                <FaceRating
                  value={prof.ajudaQuandoTrava}
                  onChange={(n) =>
                    setProf((p) => ({ ...p, ajudaQuandoTrava: n }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm">🤝 Foi paciente e respeitoso?</p>
                <FaceRating
                  value={prof.respeito}
                  onChange={(n) => setProf((p) => ({ ...p, respeito: n }))}
                />
              </div>
            </section>

            {/* Bloco: Você na aula */}
            <section className="space-y-3 border-t pt-3">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">
                Você na aula
              </Label>
              <div className="space-y-1.5">
                <p className="text-sm">🙌 Você participou?</p>
                <FaceRating
                  value={eu.participei}
                  onChange={(n) => setEu((p) => ({ ...p, participei: n }))}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm">🌱 Aprendeu algo novo?</p>
                <FaceRating
                  value={eu.aprendiAlgoNovo}
                  onChange={(n) =>
                    setEu((p) => ({ ...p, aprendiAlgoNovo: n }))
                  }
                />
              </div>
            </section>

            {/* Bloco: aberta */}
            <section className="space-y-3 border-t pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="ra-dest">✨ Destaque do dia (opcional)</Label>
                <Textarea
                  id="ra-dest"
                  rows={2}
                  value={destaque}
                  onChange={(e) => setDestaque(e.target.value)}
                  placeholder="O que foi mais legal hoje?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ra-mud">💡 O que você mudaria? (opcional)</Label>
                <Textarea
                  id="ra-mud"
                  rows={2}
                  value={mudaria}
                  onChange={(e) => setMudaria(e.target.value)}
                  placeholder="Se você fosse o professor..."
                />
              </div>
            </section>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                <Send /> Enviar avaliação
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
