import { useMemo, useState } from "react";
import { Download, Filter, GraduationCap, Layers, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAlunos } from "@/lib/alunos-store";
import { useAtividades } from "@/lib/atividades-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useCursos } from "@/lib/cursos-store";
import { gerarProgressoCursos, type ProgressoCurso } from "@/lib/progresso-cursos";
import { useTurmas } from "@/lib/turmas-store";

const TODOS = "__todos__";

export function ProgressoCursosTurmasReport() {
  const cursos = useCursos();
  const turmas = useTurmas();
  const alunos = useAlunos();
  const atividades = useAtividades();
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();
  const [cursoFiltro, setCursoFiltro] = useState(TODOS);

  const payload = useMemo(
    () =>
      gerarProgressoCursos({
        cursos,
        turmas,
        alunos,
        atividades,
        agendamentos,
        avaliacoes,
      }),
    [cursos, turmas, alunos, atividades, agendamentos, avaliacoes],
  );

  const cursosVisiveis = useMemo(
    () =>
      cursoFiltro === TODOS
        ? payload.cursos
        : payload.cursos.filter((curso) => curso.cursoId === cursoFiltro),
    [payload.cursos, cursoFiltro],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Progressao por curso e turma
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visao consolidada para coordenacao e admin: execucao, relatorios, avaliacoes e alunos
            sem usuario.
          </p>
        </div>
        <Button variant="outline" onClick={() => exportCursosCsv(cursosVisiveis)}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ResumoCard
          label="Cursos"
          value={payload.totalCursos}
          icon={<Layers className="h-4 w-4" />}
        />
        <ResumoCard
          label="Turmas"
          value={payload.totalTurmas}
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <ResumoCard
          label="Alunos sem usuario"
          value={payload.alunosSemUsuario}
          icon={<Users className="h-4 w-4" />}
          tone={payload.alunosSemUsuario > 0 ? "warn" : "good"}
        />
        <ResumoCard
          label="Relatorios pendentes"
          value={payload.relatoriosProfPendentes}
          icon={<Filter className="h-4 w-4" />}
          tone={payload.relatoriosProfPendentes > 0 ? "warn" : "good"}
        />
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtro</CardTitle>
          <CardDescription className="text-xs">
            Filtre um curso para extrair o relatorio geral dele.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={cursoFiltro} onValueChange={setCursoFiltro}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os cursos</SelectItem>
              {payload.cursos.map((curso) => (
                <SelectItem key={curso.cursoId} value={curso.cursoId}>
                  {curso.cursoCod} - {curso.cursoNome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {cursosVisiveis.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum curso encontrado.
          </CardContent>
        </Card>
      ) : (
        cursosVisiveis.map((curso) => <CursoProgressCard key={curso.cursoId} curso={curso} />)
      )}
    </div>
  );
}

function CursoProgressCard({ curso }: { curso: ProgressoCurso }) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base inline-flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {curso.cursoCod}
              </Badge>
              {curso.cursoNome}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {curso.turmas.length} turma(s), {curso.alunosUsuarios} aluno(s) com usuario e{" "}
              {curso.alunosSemUsuario} sem usuario.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => exportCursosCsv([curso])}>
            <Download className="h-3.5 w-3.5" />
            Exportar curso
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Metric label="Atividades executadas" value={`${curso.progressoAtividadesPct}%`} />
          <Metric
            label="Aulas concluidas"
            value={`${curso.aulasConcluidas}/${curso.aulasAgendadas}`}
          />
          <Metric label="Relatorios prof." value={`${curso.relatoriosProfPct}%`} />
          <Metric label="Avaliacoes alunos" value={`${curso.avaliacoesAlunoPct}%`} />
          <Metric label="Checklists" value={`${curso.checklistsAlunoPct}%`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progressao geral de atividades</span>
            <span className="font-medium">{curso.progressoAtividadesPct}%</span>
          </div>
          <Progress value={curso.progressoAtividadesPct} />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Turma</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Aulas</TableHead>
                <TableHead>Atividades</TableHead>
                <TableHead>Rel. prof.</TableHead>
                <TableHead>Aval. alunos</TableHead>
                <TableHead>Checklists</TableHead>
                <TableHead>Pendencias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {curso.turmas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma turma cadastrada neste curso.
                  </TableCell>
                </TableRow>
              ) : (
                curso.turmas.map((turma) => (
                  <TableRow key={turma.turmaId}>
                    <TableCell>
                      <div className="font-medium">{turma.turmaCod}</div>
                      <div className="text-xs text-muted-foreground">{turma.turmaNome}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{turma.alunosUsuarios} com usuario</div>
                      {turma.alunosSemUsuario > 0 && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/40">
                          {turma.alunosSemUsuario} sem usuario
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {turma.aulasConcluidas}/{turma.aulasAgendadas}
                    </TableCell>
                    <PercentCell value={turma.progressoAtividadesPct} />
                    <PercentCell value={turma.relatoriosProfPct} />
                    <PercentCell value={turma.avaliacoesAlunoPct} />
                    <PercentCell value={turma.checklistsAlunoPct} />
                    <TableCell>
                      {turma.pendencias.length === 0 ? (
                        <Badge variant="secondary" className="text-[10px]">
                          em dia
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {turma.pendencias.map((pendencia) => (
                            <Badge
                              key={pendencia}
                              variant="outline"
                              className="text-[10px] border-amber-500/40"
                            >
                              {pendencia}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ResumoCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: "good" | "warn";
}) {
  return (
    <Card className={tone === "warn" ? "ring-1 ring-amber-500/30" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </div>
          <div className={tone === "good" ? "text-emerald-600" : "text-muted-foreground"}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PercentCell({ value }: { value: number }) {
  const tone =
    value >= 80
      ? "text-emerald-700 dark:text-emerald-300"
      : value >= 50
        ? "text-amber-700 dark:text-amber-300"
        : "text-destructive";
  return <TableCell className={`text-sm font-medium tabular-nums ${tone}`}>{value}%</TableCell>;
}

function exportCursosCsv(cursos: ProgressoCurso[]) {
  const header = [
    "curso_cod",
    "curso_nome",
    "turma_cod",
    "turma_nome",
    "alunos_total",
    "alunos_usuarios",
    "alunos_sem_usuario",
    "aulas_agendadas",
    "aulas_concluidas",
    "atividades_planejadas",
    "atividades_executadas",
    "progresso_atividades_pct",
    "relatorios_prof_pct",
    "avaliacoes_alunos_pct",
    "checklists_pct",
    "pendencias",
  ];
  const rows = cursos.flatMap((curso) =>
    curso.turmas.map((turma) => [
      curso.cursoCod,
      curso.cursoNome,
      turma.turmaCod,
      turma.turmaNome,
      turma.alunosTotal,
      turma.alunosUsuarios,
      turma.alunosSemUsuario,
      turma.aulasAgendadas,
      turma.aulasConcluidas,
      turma.atividadesPlanejadas,
      turma.atividadesExecutadas,
      turma.progressoAtividadesPct,
      turma.relatoriosProfPct,
      turma.avaliacoesAlunoPct,
      turma.checklistsAlunoPct,
      turma.pendencias.join(" | "),
    ]),
  );
  const escape = (value: string | number) => {
    const text = String(value);
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...rows].map((row) => row.map(escape).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const suffix = cursos.length === 1 ? cursos[0].cursoCod : "todos";
  link.href = url;
  link.download = `progressao-cursos-turmas-${suffix}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
