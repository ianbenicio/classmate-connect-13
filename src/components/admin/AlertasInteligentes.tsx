// =====================================================================
// AlertasInteligentes — Card "Alertas" em /coordenacao (#2 da Opção A)
// =====================================================================
// Detecta pendências críticas e exibe lista compacta. Usa stores
// existentes; sem novo modelo. Limita a 5 itens por categoria pra
// não poluir.

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ClipboardX, MessageSquareWarning } from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useTurmas } from "@/lib/turmas-store";
import { useAlunos } from "@/lib/alunos-store";
import { endSlotDate } from "@/lib/academic-types";

const MIN_HORAS_ATRASO_RELATORIO = 24;
const MAX_ITENS_POR_CATEGORIA = 5;
const COBERTURA_BAIXA_THRESHOLD = 0.5; // 50%

export function AlertasInteligentes() {
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();
  const turmas = useTurmas();
  const alunos = useAlunos();

  const data = useMemo(() => {
    const now = new Date();

    // Set de agendamentos com relatorio_prof já feito
    const comRelatorio = new Set(
      avaliacoes
        .filter((a) => a.tipo === "relatorio_prof" && a.agendamentoId)
        .map((a) => a.agendamentoId as string),
    );

    // Map turma -> alunos count
    const turmaAlunoCount = new Map<string, number>();
    for (const aluno of alunos) {
      turmaAlunoCount.set(
        aluno.turmaId,
        (turmaAlunoCount.get(aluno.turmaId) ?? 0) + 1,
      );
    }

    // Map agendamento -> count alunos avaliaram (relatorio_aluno)
    const avalAlunoPorAgend = new Map<string, Set<string>>();
    for (const av of avaliacoes) {
      if (av.tipo !== "relatorio_aluno") continue;
      if (!av.agendamentoId || !av.alunoId) continue;
      if (!avalAlunoPorAgend.has(av.agendamentoId)) {
        avalAlunoPorAgend.set(av.agendamentoId, new Set());
      }
      avalAlunoPorAgend.get(av.agendamentoId)!.add(av.alunoId);
    }

    // Categoria 1 — relatórios atrasados
    const relAtrasados = agendamentos
      .filter((ag) => ag.status === "concluido")
      .filter((ag) => !comRelatorio.has(ag.id))
      .map((ag) => {
        const fim = endSlotDate(ag);
        return {
          ag,
          horas: differenceInHours(now, fim),
        };
      })
      .filter((x) => x.horas >= MIN_HORAS_ATRASO_RELATORIO)
      .sort((a, b) => b.horas - a.horas)
      .slice(0, MAX_ITENS_POR_CATEGORIA);

    // Categoria 2 — aulas com baixa cobertura de avaliação dos alunos
    const cobertura = agendamentos
      .filter((ag) => ag.status === "concluido")
      .map((ag) => {
        const alunosTurma = turmaAlunoCount.get(ag.turmaId) ?? 0;
        if (alunosTurma === 0) return null;
        const avaliaram = avalAlunoPorAgend.get(ag.id)?.size ?? 0;
        const pct = avaliaram / alunosTurma;
        return { ag, alunosTurma, avaliaram, pct };
      })
      .filter(
        (x): x is NonNullable<typeof x> =>
          x !== null && x.pct < COBERTURA_BAIXA_THRESHOLD,
      )
      .sort((a, b) => a.pct - b.pct)
      .slice(0, MAX_ITENS_POR_CATEGORIA);

    return { relAtrasados, cobertura };
  }, [agendamentos, avaliacoes, alunos]);

  const turmaMap = useMemo(
    () => new Map(turmas.map((t) => [t.id, t])),
    [turmas],
  );
  const turmaNome = (id: string) => turmaMap.get(id)?.nome ?? id.slice(0, 8);
  const fmtData = (iso: string) => {
    try {
      return format(parseISO(iso), "dd/MM", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  const totalAlertas = data.relAtrasados.length + data.cobertura.length;

  if (totalAlertas === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-emerald-500" />
            Alertas
          </CardTitle>
          <CardDescription className="text-xs">
            Tudo em dia. Nenhuma pendência crítica detectada.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="ring-1 ring-amber-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base inline-flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Alertas
          <Badge variant="secondary" className="text-[10px]">
            {totalAlertas}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Pendências detectadas — revisar e resolver.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Categoria 1 */}
        {data.relAtrasados.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
              <ClipboardX className="h-3.5 w-3.5 text-amber-500" />
              Relatórios do professor em atraso ({data.relAtrasados.length})
            </div>
            <ul className="divide-y rounded-md border">
              {data.relAtrasados.map(({ ag, horas }) => (
                <li
                  key={ag.id}
                  className="px-3 py-2 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{turmaNome(ag.turmaId)}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {fmtData(ag.data)} {ag.inicio}–{ag.fim}
                    </span>
                    {ag.professor && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {ag.professor}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {horas < 48 ? `${horas}h` : `${Math.round(horas / 24)}d`} atraso
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Categoria 2 */}
        {data.cobertura.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
              <MessageSquareWarning className="h-3.5 w-3.5 text-amber-500" />
              Baixa avaliação dos alunos ({data.cobertura.length})
            </div>
            <ul className="divide-y rounded-md border">
              {data.cobertura.map(({ ag, avaliaram, alunosTurma, pct }) => (
                <li
                  key={ag.id}
                  className="px-3 py-2 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{turmaNome(ag.turmaId)}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {fmtData(ag.data)} {ag.inicio}–{ag.fim}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {avaliaram}/{alunosTurma} ({Math.round(pct * 100)}%)
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
