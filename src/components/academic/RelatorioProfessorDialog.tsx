// Relatório do Professor — preenchido após a aula.
// Inclui chamada da turma + avaliação geral da aula + observações.
//
// Ao salvar:
// 1) Persiste em `avaliacoes` via avaliacoesStore.saveRelatorioProf
//    (que internamente sincroniza presenças com a tabela `presencas`).
// 2) Marca o agendamento como concluído.
// 3) Emite notificações + tarefas-formulário (relatório aluno + checklist).
//
// Substituiu o antigo RegistrarRelatorioDialog (placeholder sem chamada).
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardCheck, Send, Users } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FaceRating } from "./FaceRating";
import { avaliacoesStore } from "@/lib/avaliacoes-store";
import { agendamentosStore } from "@/lib/agendamentos-store";
import { notificacoesStore } from "@/lib/notificacoes-store";
import { useAlunos } from "@/lib/alunos-store";
import { toast } from "sonner";
import type { Agendamento, Curso, Turma } from "@/lib/academic-types";
import type { Nota1a5, RelatorioProfessorDados } from "@/lib/formularios-types";
import type { Nota } from "@/lib/avaliacoes-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Nullables para casar com o padrão dos call sites (turma_dia / pendentes),
  // que setam um contexto que pode ser null entre aberturas. Early-return
  // abaixo evita render incompleto.
  agendamento: Agendamento | null;
  turma?: Turma;
  curso?: Curso;
  /**
   * Chamado após salvar com sucesso, recebe a lista de alunos com
   * `presente=true`. Usado pelo orquestrador (routes/index.tsx) para
   * encadear o ChecklistAlunoDialog para cada aluno presente.
   */
  onSaved?: (info: {
    agendamento: Agendamento;
    turma: Turma;
    curso: Curso;
    alunosPresentes: { id: string; nome: string }[];
  }) => void;
}

export function RelatorioProfessorDialog(props: Props) {
  // Early return ANTES dos hooks (Rules of Hooks).
  if (!props.agendamento || !props.turma || !props.curso) return null;
  return (
    <RelatorioProfessorDialogContent
      {...props}
      agendamento={props.agendamento}
      turma={props.turma}
      curso={props.curso}
    />
  );
}

interface ContentProps extends Omit<Props, "agendamento" | "turma" | "curso"> {
  agendamento: NonNullable<Props["agendamento"]>;
  turma: NonNullable<Props["turma"]>;
  curso: NonNullable<Props["curso"]>;
}

function RelatorioProfessorDialogContent({
  open,
  onOpenChange,
  agendamento,
  turma,
  curso,
  onSaved,
}: ContentProps) {
  const todosAlunos = useAlunos();
  const alunosTurma = useMemo(
    () => todosAlunos.filter((a) => a.turmaId === turma.id),
    [todosAlunos, turma.id],
  );

  const existing = avaliacoesStore.find<RelatorioProfessorDados>("relatorio_prof", agendamento.id);

  const [resumo, setResumo] = useState("");
  const [engajamento, setEngajamento] = useState<Nota | null>(null);
  const [cumprimento, setCumprimento] = useState<Nota | null>(null);
  const [destaques, setDestaques] = useState("");
  const [dificuldades, setDificuldades] = useState("");
  const [sugestoes, setSugestoes] = useState("");
  const [presencas, setPresencas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    const d = existing?.dados;
    setResumo(d?.resumo ?? "");
    setEngajamento((d?.engajamentoTurma as Nota | null) ?? null);
    setCumprimento((d?.cumprimentoPlano as Nota | null) ?? null);
    setDestaques(d?.destaques ?? "");
    setDificuldades(d?.dificuldades ?? "");
    setSugestoes(d?.sugestoes ?? "");
    // default: todos presentes
    const initialPres: Record<string, boolean> = {};
    alunosTurma.forEach((a) => {
      initialPres[a.id] = d?.presencas?.[a.id] ?? true;
    });
    setPresencas(initialPres);
    // Intencional: reset apenas ao abrir/mudar agendamento. `existing` e
    // `alunosTurma` mudam de referência a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agendamento.id]);

  const dataFmt = format(new Date(`${agendamento.data}T00:00:00`), "PPP", {
    locale: ptBR,
  });

  const presentes = Object.values(presencas).filter(Boolean).length;
  const total = alunosTurma.length;

  const handleSubmit = async () => {
    if (!resumo.trim()) {
      toast.error("Escreva um resumo da aula.");
      return;
    }
    if (alunosTurma.length > 0 && agendamento.atividadeIds.length === 0) {
      // Sem atividades vinculadas, syncPresencas faz early-return silencioso —
      // alerta o professor para evitar "salvou mas frequência não registrou".
      toast.warning(
        "Esta aula não tem atividades vinculadas. As presenças não serão registradas no histórico de frequência.",
      );
    }
    const dados: RelatorioProfessorDados = {
      resumo: resumo.trim(),
      engajamentoTurma: engajamento as Nota1a5 | null,
      cumprimentoPlano: cumprimento as Nota1a5 | null,
      destaques: destaques.trim() || undefined,
      dificuldades: dificuldades.trim() || undefined,
      sugestoes: sugestoes.trim() || undefined,
      presencas,
    };
    // 1) Salva avaliação + sincroniza tabela `presencas`.
    await avaliacoesStore.saveRelatorioProf(agendamento.id, dados);

    // 2) Marca o agendamento como concluído.
    await agendamentosStore.marcarConcluido(agendamento.id);

    // 3) Notificações + tarefas-formulário (porteado de RegistrarRelatorioDialog).
    const baseSlot = {
      cursoId: curso.id,
      turmaId: turma.id,
      data: agendamento.data,
      inicio: agendamento.inicio,
      fim: agendamento.fim,
      professor: agendamento.professor,
      atividadeIds: agendamento.atividadeIds,
      // agendamentoId é o que permite o NotificationsBell deep-linkar para
      // o AvaliacaoAulaDialog do aluno e dedup no banco.
      agendamentoId: agendamento.id,
      criadoEm: new Date().toISOString(),
      lida: false,
    };
    const notifConcluido = {
      ...baseSlot,
      titulo: `Relatório registrado — ${turma.cod}`,
      mensagem: `${curso.nome} · ${turma.nome} · ${dataFmt} ${agendamento.inicio}–${agendamento.fim} — relatório registrado.`,
      kind: "concluido" as const,
    };
    const tarefaProf = agendamento.professor
      ? [
          {
            ...baseSlot,
            id: crypto.randomUUID(),
            destinatarioTipo: "professor" as const,
            destinatarioId: agendamento.professor,
            titulo: `📋 Relatório registrado — ${turma.cod}`,
            mensagem: `Aula de ${dataFmt} marcada como concluída.`,
            kind: "concluido" as const,
          },
        ]
      : [];
    const tarefasChecklist = agendamento.professor
      ? alunosTurma.map((al) => ({
          ...baseSlot,
          id: crypto.randomUUID(),
          destinatarioTipo: "professor" as const,
          destinatarioId: agendamento.professor!,
          titulo: `✅ Checklist pendente — ${al.nome}`,
          mensagem: `Avalie ${al.nome} na aula de ${dataFmt}.`,
          kind: "agendado" as const,
        }))
      : [];
    const tarefasAluno = alunosTurma.map((al) => ({
      ...baseSlot,
      id: crypto.randomUUID(),
      destinatarioTipo: "aluno" as const,
      destinatarioId: al.id,
      titulo: `✨ Como foi sua aula?`,
      mensagem: `Conte como foi a aula de ${dataFmt} (até 24h).`,
      kind: "agendado" as const,
    }));
    notificacoesStore.addMany([
      ...alunosTurma.map((al) => ({
        ...notifConcluido,
        id: crypto.randomUUID(),
        destinatarioTipo: "aluno" as const,
        destinatarioId: al.id,
      })),
      ...tarefaProf,
      ...tarefasChecklist,
      ...tarefasAluno,
    ]);

    toast.success("Relatório registrado e frequência atualizada.");
    onOpenChange(false);

    // Encadeia o checklist individual para cada aluno presente.
    if (onSaved) {
      const presentes = alunosTurma
        .filter((a) => presencas[a.id] !== false)
        .map((a) => ({ id: a.id, nome: a.nome }));
      onSaved({ agendamento, turma, curso, alunosPresentes: presentes });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Relatório da aula
          </DialogTitle>
          <DialogDescription>
            {curso.nome} · {turma.nome} · {dataFmt} · {agendamento.inicio}–{agendamento.fim}
          </DialogDescription>
        </DialogHeader>

        {/* Chamada */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" /> Chamada
            </Label>
            <Badge variant="secondary">
              {presentes}/{total} presentes
            </Badge>
          </div>
          <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
            {alunosTurma.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">
                Nenhum aluno cadastrado nesta turma.
              </p>
            ) : (
              alunosTurma.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={presencas[a.id] ?? true}
                    onCheckedChange={(v) => setPresencas((p) => ({ ...p, [a.id]: !!v }))}
                  />
                  <span className="text-sm flex-1">{a.nome}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {presencas[a.id] ? "Presente" : "Faltou"}
                  </span>
                </label>
              ))
            )}
          </div>
        </section>

        {/* Avaliação geral */}
        <section className="space-y-3 border-t pt-3">
          <div className="space-y-1.5">
            <Label>📊 Engajamento da turma</Label>
            <FaceRating value={engajamento} onChange={setEngajamento} />
          </div>
          <div className="space-y-1.5">
            <Label>🎯 Cumprimento do plano de aula</Label>
            <FaceRating value={cumprimento} onChange={setCumprimento} />
          </div>
        </section>

        {/* Texto */}
        <section className="space-y-3 border-t pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="rp-resumo">Resumo da aula *</Label>
            <Textarea
              id="rp-resumo"
              rows={3}
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="O que foi feito hoje, em poucas linhas."
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rp-dest">✅ Destaques</Label>
              <Textarea
                id="rp-dest"
                rows={2}
                value={destaques}
                onChange={(e) => setDestaques(e.target.value)}
                placeholder="O que funcionou bem"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-dif">⚠️ Dificuldades</Label>
              <Textarea
                id="rp-dif"
                rows={2}
                value={dificuldades}
                onChange={(e) => setDificuldades(e.target.value)}
                placeholder="O que travou"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-sug">💡 Sugestões para próxima aula</Label>
            <Textarea
              id="rp-sug"
              rows={2}
              value={sugestoes}
              onChange={(e) => setSugestoes(e.target.value)}
            />
          </div>
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            <Send /> Salvar relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
