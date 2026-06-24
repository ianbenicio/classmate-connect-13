/**
 * AvaliacaoTipoPicker
 * Botão/seletor que aparece nos formulários e permite escolher o tipo de avaliação.
 * O contexto (aula, turma, curso, professor, aluno) é resolvido automaticamente
 * a partir do agendamento ativo.
 *
 * Tipos disponíveis:
 *   - "aluno_professor"  → Aluno avalia Professor (estrelas + perguntas abertas)
 *   - "aluno_aula"       → Aluno avalia a Aula (AvaliacaoAulaDialog existente)
 */

import { useState } from "react";
import { ClipboardCheck, GraduationCap, Star, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvaliacaoAlunoProfessorDialog } from "./AvaliacaoAlunoProfessorDialog";
import { AvaliacaoAulaDialog } from "./AvaliacaoAulaDialog";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useCursos } from "@/lib/cursos-store";
import { useAlunos } from "@/lib/alunos-store";
import { useAuth } from "@/lib/auth";
import type { Agendamento } from "@/lib/academic-types";

interface Props {
  /** Se fornecido, pre-seleciona este agendamento */
  agendamentoId?: string;
  /** Variant visual do botão */
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  /** Label customizado */
  label?: string;
}

type TipoAvaliacao = "aluno_professor" | "aluno_aula";

export function AvaliacaoTipoPicker({
  agendamentoId,
  variant = "outline",
  size = "default",
  label = "Avaliação",
}: Props) {
  const { user, displayName, hasRole } = useAuth();
  const canResponderComoAluno = hasRole("aluno") && !hasRole("professor");
  const agendamentos = useAgendamentos();
  const turmas = useTurmas();
  const cursos = useCursos();
  const alunos = useAlunos();

  const [tipoAberto, setTipoAberto] = useState<TipoAvaliacao | null>(null);

  // Resolve o agendamento ativo (passado por prop ou o mais recente/atual)
  const agendamento: Agendamento | undefined = agendamentoId
    ? agendamentos.find((a) => a.id === agendamentoId)
    : (() => {
        const hoje = new Date().toISOString().split("T")[0];
        return agendamentos
          .filter((a) => a.data === hoje && a.status !== "cancelado")
          .sort((a, b) => a.inicio.localeCompare(b.inicio))
          .at(-1);
      })();

  const turma = turmas.find((t) => t.id === agendamento?.turmaId);
  const curso = cursos.find((c) => c.id === turma?.cursoId);

  // Dados do aluno respondente
  const alunoCorrente = canResponderComoAluno
    ? alunos.find(
        (a) =>
          a.userId === user?.id ||
          a.id === user?.id ||
          a.nome.trim().toLowerCase() === (displayName ?? "").trim().toLowerCase(),
      )
    : undefined;

  const professorUserId = agendamento?.professorUserId ?? "";
  const professorNome = agendamento?.professor ?? "Professor";

  const contextoDisponivel = !!(agendamento && turma && curso);

  const handleSelect = (tipo: TipoAvaliacao) => {
    if (!contextoDisponivel) return;
    setTipoAberto(tipo);
  };

  if (!canResponderComoAluno) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            {label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Selecione o tipo de avaliação
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleSelect("aluno_professor")}
            disabled={!contextoDisponivel}
            className="flex items-start gap-3 py-3 cursor-pointer"
          >
            <Star className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Avaliar Professor</p>
              <p className="text-xs text-muted-foreground leading-snug">
                4 critérios com estrelas + 3 perguntas abertas
              </p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleSelect("aluno_aula")}
            disabled={!contextoDisponivel}
            className="flex items-start gap-3 py-3 cursor-pointer"
          >
            <BookOpen className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Avaliar Aula</p>
              <p className="text-xs text-muted-foreground leading-snug">
                Como foi a aula? Conteúdo, ritmo, engajamento
              </p>
            </div>
          </DropdownMenuItem>

          {!contextoDisponivel && (
            <>
              <DropdownMenuSeparator />
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {!agendamento
                  ? "Nenhuma aula encontrada para hoje."
                  : !turma
                    ? "Turma não encontrada."
                    : "Curso não encontrado."}
              </div>
            </>
          )}

          {contextoDisponivel && agendamento && (
            <>
              <DropdownMenuSeparator />
              <div className="px-3 py-2 space-y-0.5">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  Contexto capturado automaticamente
                </p>
                <p className="text-[11px] text-muted-foreground">
                  📚 {curso!.nome} · {turma!.cod}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  📅 {agendamento.data} · {agendamento.inicio}–{agendamento.fim}
                </p>
                <p className="text-[11px] text-muted-foreground">🎓 Prof. {professorNome}</p>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog: Aluno → Professor */}
      {agendamento && turma && curso && (
        <AvaliacaoAlunoProfessorDialog
          open={tipoAberto === "aluno_professor"}
          onOpenChange={(o) => !o && setTipoAberto(null)}
          agendamento={agendamento}
          turma={turma}
          curso={curso}
          professorUserId={professorUserId}
          professorNome={professorNome}
          alunoNome={alunoCorrente?.nome ?? displayName ?? undefined}
        />
      )}

      {/* Dialog: Aluno → Aula (só abre se o aluno estiver cadastrado) */}
      {agendamento && turma && curso && alunoCorrente && (
        <AvaliacaoAulaDialog
          open={tipoAberto === "aluno_aula"}
          onOpenChange={(o) => !o && setTipoAberto(null)}
          agendamento={agendamento}
          aluno={alunoCorrente}
          turma={turma}
          curso={curso}
        />
      )}
    </>
  );
}
