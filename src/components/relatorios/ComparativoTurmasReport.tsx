// =====================================================================
// ComparativoTurmasReport (#7) — comparativo de KPIs entre turmas
// =====================================================================
// Tabela com uma linha por turma, mostrando:
// - Total de alunos
// - Aulas concluídas (mês)
// - Cobertura de relatório do professor
// - Cobertura de avaliação dos alunos
// - Média de habilidades (1-5) — quando há checklists
// - Média comportamental (positivos vs negativos)
//
// Filtros: curso. Ordenação: clique no header da coluna.

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUpDown, BarChart3 } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useCursos } from "@/lib/cursos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useAlunos } from "@/lib/alunos-store";
import { useComportamentoTags } from "@/lib/comportamento-tags-store";
import { cn } from "@/lib/utils";

type SortKey = "nome" | "alunos" | "aulas" | "relProf" | "avalAluno" | "media" | "comportamento";

interface Linha {
  turmaId: string;
  turmaNome: string;
  cursoId: string;
  alunos: number;
  aulasConcluidas: number;
  relProfPct: number; // 0..100
  avalAlunoPct: number; // 0..100
  mediaHabilidades: number | null; // 1..5
  saldoComportamento: number; // pos - neg
}

export function ComparativoTurmasReport() {
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();
  const cursos = useCursos();
  const turmas = useTurmas();
  const alunos = useAlunos();
  const tagsMeta = useComportamentoTags();

  const [cursoFiltro, setCursoFiltro] = useState<string>("__all__");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [desc, setDesc] = useState(false);

  const linhas = useMemo<Linha[]>(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const inMonth = (iso: string) => {
      try {
        return isWithinInterval(parseISO(iso), {
          start: monthStart,
          end: monthEnd,
        });
      } catch {
        return false;
      }
    };

    // Cache: tom por slug
    const tomBySlug = new Map(tagsMeta.map((t) => [t.value, t.tom]));

    const out: Linha[] = [];
    for (const t of turmas) {
      if (cursoFiltro !== "__all__" && t.cursoId !== cursoFiltro) continue;

      const alunosTurma = alunos.filter((a) => a.turmaId === t.id);
      const agsTurmaMes = agendamentos.filter((ag) => ag.turmaId === t.id && inMonth(ag.data));
      const concluidas = agsTurmaMes.filter((ag) => ag.status === "concluido");
      const concluidasIds = new Set(concluidas.map((ag) => ag.id));

      // Relatórios prof
      const comRelatorio = avaliacoes.filter(
        (av) =>
          av.tipo === "relatorio_prof" && av.agendamentoId && concluidasIds.has(av.agendamentoId),
      ).length;
      const relProfPct = concluidas.length > 0 ? (comRelatorio / concluidas.length) * 100 : 0;

      // Avaliação alunos: count de aulas concluídas com pelo menos um relatorio_aluno
      const agsComAval = new Set<string>();
      for (const av of avaliacoes) {
        if (av.tipo !== "relatorio_aluno") continue;
        if (!av.agendamentoId) continue;
        if (!concluidasIds.has(av.agendamentoId)) continue;
        agsComAval.add(av.agendamentoId);
      }
      const avalAlunoPct = concluidas.length > 0 ? (agsComAval.size / concluidas.length) * 100 : 0;

      // Média de habilidades + comportamento, agregando checklists desta turma
      const checklistsTurma = avaliacoes.filter((av) => {
        if (av.tipo !== "checklist_aluno") return false;
        if (!av.alunoId) return false;
        return alunosTurma.some((x) => x.id === av.alunoId);
      });
      let somaNotas = 0;
      let countNotas = 0;
      let pos = 0;
      let neg = 0;
      for (const av of checklistsTurma) {
        const dados = av.dados as {
          habilidadesNotas?: Record<string, number>;
          comportamento?: string[];
        } | null;
        const notas = dados?.habilidadesNotas;
        if (notas) {
          for (const v of Object.values(notas)) {
            if (typeof v === "number") {
              somaNotas += v;
              countNotas++;
            }
          }
        }
        const tags = dados?.comportamento;
        if (Array.isArray(tags)) {
          for (const slug of tags) {
            const tom = tomBySlug.get(slug);
            if (tom === "pos") pos++;
            else if (tom === "neg") neg++;
          }
        }
      }
      const mediaHabilidades = countNotas > 0 ? somaNotas / countNotas : null;
      const saldoComportamento = pos - neg;

      out.push({
        turmaId: t.id,
        turmaNome: t.nome,
        cursoId: t.cursoId,
        alunos: alunosTurma.length,
        aulasConcluidas: concluidas.length,
        relProfPct: Math.round(relProfPct),
        avalAlunoPct: Math.round(avalAlunoPct),
        mediaHabilidades: mediaHabilidades !== null ? Math.round(mediaHabilidades * 10) / 10 : null,
        saldoComportamento,
      });
    }

    return out;
  }, [agendamentos, avaliacoes, turmas, alunos, tagsMeta, cursoFiltro]);

  const linhasOrd = useMemo(() => {
    const arr = [...linhas];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "nome":
          cmp = a.turmaNome.localeCompare(b.turmaNome);
          break;
        case "alunos":
          cmp = a.alunos - b.alunos;
          break;
        case "aulas":
          cmp = a.aulasConcluidas - b.aulasConcluidas;
          break;
        case "relProf":
          cmp = a.relProfPct - b.relProfPct;
          break;
        case "avalAluno":
          cmp = a.avalAlunoPct - b.avalAlunoPct;
          break;
        case "media":
          cmp = (a.mediaHabilidades ?? -1) - (b.mediaHabilidades ?? -1);
          break;
        case "comportamento":
          cmp = a.saldoComportamento - b.saldoComportamento;
          break;
      }
      return desc ? -cmp : cmp;
    });
    return arr;
  }, [linhas, sortKey, desc]);

  const cursoMap = useMemo(() => new Map(cursos.map((c) => [c.id, c])), [cursos]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setDesc(!desc);
    else {
      setSortKey(k);
      setDesc(false);
    }
  };

  const exportCSV = () => {
    const header = [
      "turma",
      "curso",
      "alunos",
      "aulas_concluidas",
      "relatorio_prof_pct",
      "aval_aluno_pct",
      "media_habilidades",
      "saldo_comportamento",
    ];
    const rows = linhasOrd.map((l) => [
      l.turmaNome,
      cursoMap.get(l.cursoId)?.nome ?? l.cursoId,
      l.alunos,
      l.aulasConcluidas,
      l.relProfPct,
      l.avalAlunoPct,
      l.mediaHabilidades ?? "",
      l.saldoComportamento,
    ]);
    const csv = [
      header.join(","),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparativo-turmas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base inline-flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Comparativo de Turmas
        </CardTitle>
        <CardDescription className="text-xs">
          KPIs do mês corrente. Clique no header pra ordenar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={cursoFiltro} onValueChange={setCursoFiltro}>
            <SelectTrigger className="w-[220px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os cursos</SelectItem>
              {cursos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={exportCSV}
            disabled={linhasOrd.length === 0}
          >
            Exportar CSV
          </Button>
          <span className="text-[11px] text-muted-foreground ml-auto">
            {linhasOrd.length} turma(s)
          </span>
        </div>

        {linhasOrd.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            Nenhuma turma encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <ThSort
                    label="Turma"
                    active={sortKey === "nome"}
                    desc={desc}
                    onClick={() => toggleSort("nome")}
                  />
                  <ThSort
                    label="Alunos"
                    align="right"
                    active={sortKey === "alunos"}
                    desc={desc}
                    onClick={() => toggleSort("alunos")}
                  />
                  <ThSort
                    label="Aulas (mês)"
                    align="right"
                    active={sortKey === "aulas"}
                    desc={desc}
                    onClick={() => toggleSort("aulas")}
                  />
                  <ThSort
                    label="Rel. Prof."
                    align="right"
                    active={sortKey === "relProf"}
                    desc={desc}
                    onClick={() => toggleSort("relProf")}
                  />
                  <ThSort
                    label="Aval. Aluno"
                    align="right"
                    active={sortKey === "avalAluno"}
                    desc={desc}
                    onClick={() => toggleSort("avalAluno")}
                  />
                  <ThSort
                    label="Habilidades"
                    align="right"
                    active={sortKey === "media"}
                    desc={desc}
                    onClick={() => toggleSort("media")}
                  />
                  <ThSort
                    label="Comportamento"
                    align="right"
                    active={sortKey === "comportamento"}
                    desc={desc}
                    onClick={() => toggleSort("comportamento")}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasOrd.map((l) => (
                  <TableRow key={l.turmaId}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{l.turmaNome}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {cursoMap.get(l.cursoId)?.nome ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{l.alunos}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.aulasConcluidas}</TableCell>
                    <TableCell className="text-right">
                      <PctBar value={l.relProfPct} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PctBar value={l.avalAlunoPct} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.mediaHabilidades !== null ? `${l.mediaHabilidades}/5` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          l.saldoComportamento > 0
                            ? "default"
                            : l.saldoComportamento < 0
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] tabular-nums"
                      >
                        {l.saldoComportamento > 0
                          ? `+${l.saldoComportamento}`
                          : l.saldoComportamento}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ThSort({
  label,
  active,
  desc,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-xs hover:text-foreground transition-colors",
          align === "right" && "ml-auto",
        )}
      >
        {label}
        <ArrowUpDown className={cn("h-3 w-3", active ? "text-primary" : "opacity-50")} />
        {active && <span className="text-[10px] text-muted-foreground">{desc ? "↓" : "↑"}</span>}
      </button>
    </TableHead>
  );
}

function PctBar({ value }: { value: number }) {
  const tone = value >= 80 ? "good" : value >= 50 ? "warn" : "bad";
  const color =
    tone === "good"
      ? "[&>div]:bg-emerald-500"
      : tone === "warn"
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-rose-500";
  return (
    <div className="flex items-center justify-end gap-2">
      <Progress value={value} className={cn("h-1.5 w-16", color)} />
      <span className="text-xs tabular-nums w-10 text-right">{value}%</span>
    </div>
  );
}
