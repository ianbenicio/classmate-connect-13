// =====================================================================
// MeusRelatoriosDialog — Janela "Meus relatórios" (professor / aluno)
// =====================================================================
// Lista os relatórios que o usuário logado gerou/respondeu, com botão
// de PDF individual por item.
//
// Modos:
//   mode="professor" → relatorio_prof onde agendamento.professorUserId
//                      === auth.user.id  (ou professor === displayName legado)
//   mode="aluno"     → relatorio_aluno onde av.alunoId === aluno.id
//                      do user (matched via alunos.user_id)

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useCursos } from "@/lib/cursos-store";
import { useAlunos } from "@/lib/alunos-store";
import { useAtividades } from "@/lib/atividades-store";
import {
  gerarPdfRelatorioAluno,
  gerarPdfRelatorioProf,
  type PdfCtx,
} from "@/lib/pdf-relatorios";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "professor" | "aluno";
}

export function MeusRelatoriosDialog({ open, onOpenChange, mode }: Props) {
  const { user, displayName } = useAuth();
  const avaliacoes = useAvaliacoes();
  const agendamentos = useAgendamentos();
  const turmas = useTurmas();
  const cursos = useCursos();
  const alunos = useAlunos();
  const atividades = useAtividades();

  const ctx: PdfCtx = { cursos, turmas, atividades, alunos, agendamentos };

  const meuAluno = useMemo(
    () => (user ? alunos.find((a) => a.userId === user.id) : null),
    [user, alunos],
  );

  const meusRelatorios = useMemo(() => {
    if (mode === "professor") {
      const meuId = user?.id;
      const meuNome = (displayName ?? "").trim().toLowerCase();
      return avaliacoes
        .filter((av) => av.tipo === "relatorio_prof")
        .filter((av) => {
          if (!av.agendamentoId) return false;
          const ag = agendamentos.find((g) => g.id === av.agendamentoId);
          if (!ag) return false;
          if (meuId && ag.professorUserId === meuId) return true;
          if (meuNome && (ag.professor ?? "").trim().toLowerCase() === meuNome) return true;
          return false;
        })
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    }
    if (!meuAluno) return [];
    return avaliacoes
      .filter((av) => av.tipo === "relatorio_aluno" && av.alunoId === meuAluno.id)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [mode, avaliacoes, agendamentos, user, displayName, meuAluno]);

  const labelTitle = mode === "professor" ? "Meus Relatórios (Professor)" : "Meus Relatórios";

  const handlePdf = (recId: string) => {
    const rec = avaliacoes.find((a) => a.id === recId);
    if (!rec) return;
    try {
      if (rec.tipo === "relatorio_prof") {
        gerarPdfRelatorioProf(rec, ctx);
      } else if (rec.tipo === "relatorio_aluno") {
        gerarPdfRelatorioAluno(rec, ctx);
      }
      toast.success("PDF gerado.");
    } catch (e) {
      console.error(e);
      toast.error(`Erro ao gerar PDF: ${(e as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> {labelTitle}
          </DialogTitle>
          <DialogDescription>
            {mode === "professor"
              ? "Relatórios de aula que você registrou. Clique em PDF para baixar."
              : "Suas respostas aos formulários de aula. Clique em PDF para baixar."}
          </DialogDescription>
        </DialogHeader>

        {mode === "aluno" && !meuAluno && (
          <p className="text-sm text-muted-foreground border rounded-md p-3">
            Sua conta de aluno ainda não foi vinculada a um cadastro.
          </p>
        )}

        {meusRelatorios.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-md p-6 text-center">
            Nenhum relatório ainda.
          </p>
        ) : (
          <ul className="divide-y border rounded-md max-h-[60vh] overflow-y-auto">
            {meusRelatorios.map((rec) => {
              const ag = agendamentos.find((a) => a.id === rec.agendamentoId);
              const turma = ag ? turmas.find((t) => t.id === ag.turmaId) : null;
              const curso = turma ? cursos.find((c) => c.id === turma.cursoId) : null;
              const dataAula = ag
                ? format(parseISO(`${ag.data}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })
                : "—";
              const dataResp = format(parseISO(rec.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR });
              return (
                <li key={rec.id} className="p-3 flex items-start gap-3 hover:bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {curso && <Badge variant="outline">{curso.cod}</Badge>}
                      {turma && (
                        <Badge variant="secondary" className="text-[10px]">
                          {turma.cod}
                        </Badge>
                      )}
                      <span className="text-sm font-medium">
                        Aula de {dataAula}
                        {ag ? ` · ${ag.inicio}–${ag.fim}` : ""}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Registrado em {dataResp}
                      {ag?.professor && mode === "aluno" && ` · Professor: ${ag.professor}`}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handlePdf(rec.id)}>
                    <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
