// =====================================================================
// AlunoInsights — Timeline (#6) + Gráfico de habilidades (#12)
// =====================================================================
// Componentes auxiliares montados no AlunoDetailDialog. Não criam
// stores próprias; recebem os dados já carregados por props.

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, ClipboardCheck, Star, MessageSquare } from "lucide-react";
import type { Agendamento, Aluno, Habilidade } from "@/lib/academic-types";
import type { AvaliacaoRecord } from "@/lib/avaliacoes-store";

// ---------------------------------------------------------------------
// #6 — Timeline cronológica de eventos do aluno
// ---------------------------------------------------------------------
interface TimelineProps {
  aluno: Aluno;
  agendamentos: Agendamento[];
  avaliacoes: AvaliacaoRecord[];
}

type Evento = {
  id: string;
  data: Date;
  tipo: "aula" | "checklist" | "relatorio_aluno" | "tag";
  titulo: string;
  detalhe?: string;
};

export function AlunoTimeline({ aluno, agendamentos, avaliacoes }: TimelineProps) {
  const eventos = useMemo<Evento[]>(() => {
    const out: Evento[] = [];

    // Aulas concluídas da turma do aluno
    for (const ag of agendamentos) {
      if (ag.turmaId !== aluno.turmaId) continue;
      if (ag.status !== "concluido") continue;
      let d: Date | null = null;
      try {
        d = parseISO(ag.data);
      } catch {
        continue;
      }
      out.push({
        id: `aula-${ag.id}`,
        data: d,
        tipo: "aula",
        titulo: `Aula concluída · ${ag.inicio}–${ag.fim}`,
        detalhe: ag.professor ? `com ${ag.professor}` : undefined,
      });
    }

    // Avaliações desse aluno
    for (const av of avaliacoes) {
      if (av.alunoId !== aluno.id) continue;
      let d: Date | null = null;
      try {
        d = parseISO(av.criadoEm);
      } catch {
        continue;
      }
      if (av.tipo === "checklist_aluno") {
        const dados = av.dados as { comportamento?: string[] } | null;
        const tags = dados?.comportamento ?? [];
        out.push({
          id: `chk-${av.id}`,
          data: d,
          tipo: "checklist",
          titulo: "Checklist do professor",
          detalhe:
            tags.length > 0
              ? `${tags.length} tag(s) atribuída(s)`
              : "sem tags",
        });
      } else if (av.tipo === "relatorio_aluno") {
        out.push({
          id: `ral-${av.id}`,
          data: d,
          tipo: "relatorio_aluno",
          titulo: "Aluno enviou avaliação da aula",
        });
      }
    }

    return out.sort((a, b) => b.data.getTime() - a.data.getTime());
  }, [aluno, agendamentos, avaliacoes]);

  if (eventos.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Sem eventos registrados ainda.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-border pl-4 space-y-3 max-h-80 overflow-y-auto">
      {eventos.slice(0, 50).map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
          <div className="flex items-center gap-2 flex-wrap">
            <TipoIcon tipo={e.tipo} />
            <span className="text-xs font-medium">{e.titulo}</span>
            <Badge variant="outline" className="text-[10px]">
              {format(e.data, "dd/MM/yy HH:mm", { locale: ptBR })}
            </Badge>
          </div>
          {e.detalhe && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {e.detalhe}
            </p>
          )}
        </li>
      ))}
      {eventos.length > 50 && (
        <li className="text-[10px] text-muted-foreground italic pl-1">
          + {eventos.length - 50} evento(s) anterior(es).
        </li>
      )}
    </ol>
  );
}

function TipoIcon({ tipo }: { tipo: Evento["tipo"] }) {
  const className = "h-3.5 w-3.5";
  switch (tipo) {
    case "aula":
      return <CalendarCheck className={`${className} text-emerald-500`} />;
    case "checklist":
      return <ClipboardCheck className={`${className} text-blue-500`} />;
    case "relatorio_aluno":
      return <MessageSquare className={`${className} text-purple-500`} />;
    case "tag":
      return <Star className={`${className} text-amber-500`} />;
  }
}

// ---------------------------------------------------------------------
// #12 — Gráfico de habilidades ao longo do tempo
// ---------------------------------------------------------------------
interface ChartProps {
  aluno: Aluno;
  habilidadesCurso: Habilidade[];
  avaliacoes: AvaliacaoRecord[];
}

const PALETA = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

export function AlunoHabilidadesChart({
  aluno,
  habilidadesCurso,
  avaliacoes,
}: ChartProps) {
  const dados = useMemo(() => {
    if (habilidadesCurso.length === 0) return [];
    // Filtra checklists deste aluno, ordena por data crescente
    const checklists = avaliacoes
      .filter((av) => av.alunoId === aluno.id && av.tipo === "checklist_aluno")
      .map((av) => {
        let d: Date | null = null;
        try {
          d = parseISO(av.criadoEm);
        } catch {
          return null;
        }
        const dados = av.dados as { habilidadesNotas?: Record<string, number> } | null;
        return {
          data: d,
          notas: dados?.habilidadesNotas ?? {},
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.data !== null)
      .sort((a, b) => a.data!.getTime() - b.data!.getTime());

    // Para cada checklist, monta um ponto com colunas = sigla da habilidade
    return checklists.map((c) => {
      const ponto: Record<string, number | string> = {
        x: format(c.data!, "dd/MM", { locale: ptBR }),
      };
      for (const h of habilidadesCurso) {
        const nota = c.notas[h.id];
        if (typeof nota === "number") ponto[h.sigla] = nota;
      }
      return ponto;
    });
  }, [aluno, habilidadesCurso, avaliacoes]);

  if (habilidadesCurso.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Curso do aluno não tem habilidades cadastradas.
      </p>
    );
  }
  if (dados.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Sem checklists registrados ainda. Após o professor avaliar o
        aluno em uma aula, o gráfico mostra a evolução.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="x"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={20}
          />
          <Tooltip
            contentStyle={{
              fontSize: "11px",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "10px" }} iconType="line" />
          {habilidadesCurso.map((h, i) => (
            <Line
              key={h.id}
              type="monotone"
              dataKey={h.sigla}
              stroke={PALETA[i % PALETA.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
