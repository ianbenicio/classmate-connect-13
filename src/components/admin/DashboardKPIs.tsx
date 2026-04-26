// =====================================================================
// DashboardKPIs — Visão Geral em /coordenacao (#1 da Opção A)
// =====================================================================
// Lê stores existentes e mostra métricas agregadas em grid de cards.
// Sem novos modelos: tudo computado on-the-fly via useMemo.

import { useMemo } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  Users,
  GraduationCap,
  ClipboardCheck,
  Star,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useCursos } from "@/lib/cursos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useAlunos } from "@/lib/alunos-store";
import { useProfessores } from "@/lib/professores-store";
import { cn } from "@/lib/utils";

export function DashboardKPIs() {
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();
  const cursos = useCursos();
  const turmas = useTurmas();
  const alunos = useAlunos();
  const professores = useProfessores();

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Helpers
    const inInterval = (
      isoDate: string,
      start: Date,
      end: Date,
    ): boolean => {
      try {
        return isWithinInterval(parseISO(isoDate), { start, end });
      } catch {
        return false;
      }
    };

    // Aulas hoje
    const hoje = agendamentos.filter((a) => inInterval(a.data, todayStart, todayEnd));
    const hojeConcluidas = hoje.filter((a) => a.status === "concluido").length;
    const hojeAgendadas = hoje.filter((a) => a.status === "agendado").length;
    const hojeCanceladas = hoje.filter((a) => a.status === "cancelado").length;

    // Aulas semana / mês
    const semana = agendamentos.filter((a) => inInterval(a.data, weekStart, weekEnd));
    const semanaConcluidas = semana.filter((a) => a.status === "concluido").length;
    const semanaTotal = semana.length;
    const mes = agendamentos.filter((a) => inInterval(a.data, monthStart, monthEnd));
    const mesConcluidas = mes.filter((a) => a.status === "concluido").length;

    // Relatórios do professor pendentes:
    // = agendamentos concluídos no mês SEM avaliacao tipo='relatorio_prof'
    const relProfFeitas = new Set(
      avaliacoes
        .filter((av) => av.tipo === "relatorio_prof" && av.agendamentoId)
        .map((av) => av.agendamentoId as string),
    );
    const concluidasMes = mes.filter((a) => a.status === "concluido");
    const relPendentes = concluidasMes.filter(
      (a) => !relProfFeitas.has(a.id),
    ).length;
    const relCobertura =
      concluidasMes.length > 0
        ? Math.round(
            ((concluidasMes.length - relPendentes) / concluidasMes.length) * 100,
          )
        : 100;

    // Avaliações dos alunos no mês — quantos agendamentos do mês têm pelo
    // menos um relatorio_aluno
    const aulasComAvalAluno = new Set(
      avaliacoes
        .filter(
          (av) =>
            av.tipo === "relatorio_aluno" &&
            av.agendamentoId &&
            inInterval(av.criadoEm, monthStart, monthEnd),
        )
        .map((av) => av.agendamentoId as string),
    );
    const concluidasMesIds = new Set(concluidasMes.map((a) => a.id));
    const aulasComAvalAlunoCount = Array.from(aulasComAvalAluno).filter((id) =>
      concluidasMesIds.has(id),
    ).length;
    const avalAlunoCobertura =
      concluidasMes.length > 0
        ? Math.round((aulasComAvalAlunoCount / concluidasMes.length) * 100)
        : 0;

    // Counts
    const cursosAtivos = cursos.length; // Curso não tem campo `ativo` no modelo atual
    const turmasAtivas = turmas.length;
    const alunosTotal = alunos.length;
    const professoresAtivos = professores.filter((p) => p.ativo).length;

    return {
      hojeConcluidas,
      hojeAgendadas,
      hojeCanceladas,
      hojeTotal: hoje.length,
      semanaConcluidas,
      semanaTotal,
      mesConcluidas,
      mesTotal: mes.length,
      relPendentes,
      relCobertura,
      avalAlunoCobertura,
      aulasComAvalAlunoCount,
      cursosAtivos,
      turmasAtivas,
      alunosTotal,
      professoresAtivos,
    };
  }, [agendamentos, avaliacoes, cursos, turmas, alunos, professores]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <KPI
        icon={<CalendarClock className="h-4 w-4" />}
        label="Aulas hoje"
        value={stats.hojeTotal}
        sub={
          <div className="flex flex-wrap gap-1">
            {stats.hojeConcluidas > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {stats.hojeConcluidas} concluídas
              </Badge>
            )}
            {stats.hojeAgendadas > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {stats.hojeAgendadas} agendadas
              </Badge>
            )}
            {stats.hojeCanceladas > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {stats.hojeCanceladas} canc.
              </Badge>
            )}
            {stats.hojeTotal === 0 && (
              <span className="text-[11px] text-muted-foreground">—</span>
            )}
          </div>
        }
      />

      <KPI
        icon={<CalendarDays className="h-4 w-4" />}
        label="Aulas esta semana"
        value={stats.semanaConcluidas}
        sub={
          <span className="text-xs text-muted-foreground">
            de {stats.semanaTotal} agendadas
          </span>
        }
      />

      <KPI
        icon={<CalendarCheck className="h-4 w-4" />}
        label="Concluídas no mês"
        value={stats.mesConcluidas}
        sub={
          <span className="text-xs text-muted-foreground">
            de {stats.mesTotal} agendadas
          </span>
        }
      />

      <KPI
        icon={<ClipboardCheck className="h-4 w-4" />}
        label="Relatórios prof. (mês)"
        value={`${stats.relCobertura}%`}
        sub={
          <span
            className={cn(
              "text-xs",
              stats.relPendentes > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {stats.relPendentes > 0
              ? `${stats.relPendentes} pendente(s)`
              : "Tudo em dia"}
          </span>
        }
        tone={stats.relPendentes > 0 ? "warn" : "good"}
      />

      <KPI
        icon={<Star className="h-4 w-4" />}
        label="Avaliações alunos (mês)"
        value={`${stats.avalAlunoCobertura}%`}
        sub={
          <span className="text-xs text-muted-foreground">
            {stats.aulasComAvalAlunoCount} aula(s) avaliadas
          </span>
        }
      />

      <KPI
        icon={<Users className="h-4 w-4" />}
        label="Cursos / Turmas"
        value={`${stats.cursosAtivos} / ${stats.turmasAtivas}`}
      />

      <KPI
        icon={<Users className="h-4 w-4" />}
        label="Alunos cadastrados"
        value={stats.alunosTotal}
      />

      <KPI
        icon={<GraduationCap className="h-4 w-4" />}
        label="Professores ativos"
        value={stats.professoresAtivos}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Card individual
// ---------------------------------------------------------------------
function KPI({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: React.ReactNode;
  tone?: "good" | "warn" | "bad";
}) {
  const toneRing =
    tone === "warn"
      ? "ring-amber-500/30"
      : tone === "bad"
        ? "ring-destructive/30"
        : tone === "good"
          ? "ring-emerald-500/30"
          : "";
  return (
    <Card className={cn(tone && "ring-1", toneRing)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          {icon}
          <span className="truncate">{label}</span>
          {tone === "warn" && (
            <AlertTriangle className="h-3 w-3 text-amber-500 ml-auto" />
          )}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <div className="mt-1.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
