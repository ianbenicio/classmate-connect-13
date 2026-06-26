// =====================================================================
// MinhasAtividadesTable — Tabela-controle do professor (Fase D)
// =====================================================================
// Equivalente à planilha "Anne - Aulas Maio 2026". Lista os agendamentos
// do professor logado (ou de qualquer professor quando admin/coord abre o
// perfil dele) e mostra 5 status pós-aula como checkmarks:
//
//   DE         — existe avaliacao tipo=relatorio_prof?
//   RECURSOS   — agendamento.recursosEntreguesEm? (toggle manual)
//   Frequência — DE OK (mesma fonte; resposta 5a do usuário)
//   Pais       — agendamento.paisNotificadosEm? (auto via relatório)
//   Trab.      — existe row em tarefas_alunos (só se atividade tipo=1)
//
// Filtros: mês/ano + turma. 1 linha por agendamento (resposta A).

import { useCallback, useMemo, useState } from "react";
import { endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  Clock,
  FileText,
  Send,
  Minus,
  CalendarDays,
  Download,
  RefreshCw,
  Loader2,
  FileCheck2,
  CircleAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgendamentos, agendamentosStore } from "@/lib/agendamentos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useCursos } from "@/lib/cursos-store";
import { useAtividades } from "@/lib/atividades-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useTarefasAlunos, tarefasAlunosStore } from "@/lib/tarefas-alunos-store";
import { useAulaEvidencias } from "@/lib/aula-evidencias-store";
import {
  evidenciaEstaValida,
  getEvidenciaPorTipo,
  isPlanoAulaAtrasado,
  type AulaEvidencia,
  type AulaEvidenciaContext,
} from "@/lib/aula-evidencias";
import { useAuth } from "@/lib/auth";
import {
  agendamentoDispensaRequisitos,
  type Agendamento,
  type Curso,
  type Turma,
} from "@/lib/academic-types";
import { cn } from "@/lib/utils";
import { AulaEvidenciasDialog } from "@/components/academic/AulaEvidenciasDialog";

interface Props {
  /** Professor cujas aulas listar. Default: usuário logado. */
  professorUserId?: string;
  /** Nome legado do professor, usado para aulas antigas sem professorUserId. */
  professorNome?: string;
  /** Callback ao clicar em "Lançar relatório" — pai abre RelatorioProfessorDialog. */
  onAbrirRelatorio?: (info: { agendamento: Agendamento; turma: Turma; curso: Curso }) => void;
}

type AtividadesFiltro = "hoje" | "semana" | "proxima" | "dadas" | "mes";

const FILTROS_ATIVIDADES: Array<{ value: AtividadesFiltro; label: string }> = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "proxima", label: "Proxima aula" },
  { value: "dadas", label: "Dadas" },
  { value: "mes", label: "Todas do mes" },
];

const FILTRO_EMPTY_TEXT: Record<AtividadesFiltro, string> = {
  hoje: "Nenhuma aula hoje.",
  semana: "Nenhuma aula nesta semana.",
  proxima: "Nenhuma proxima aula encontrada.",
  dadas: "Nenhuma aula dada no mes selecionado.",
  mes: "Nenhuma aula no periodo selecionado.",
};

const sortAgendamentosAsc = (a: Agendamento, b: Agendamento) =>
  `${a.data} ${a.inicio}`.localeCompare(`${b.data} ${b.inicio}`);

const sortAgendamentosDesc = (a: Agendamento, b: Agendamento) => sortAgendamentosAsc(b, a);

const isAgendamentoConcluido = (ag: Agendamento) => ag.status === "concluido";

export function MinhasAtividadesTable({ professorUserId, professorNome, onAbrirRelatorio }: Props) {
  const { user, hasRole, displayName } = useAuth();
  const agendamentos = useAgendamentos();
  const turmas = useTurmas();
  const cursos = useCursos();
  const atividades = useAtividades();
  const avaliacoes = useAvaliacoes();
  const tarefasAlunos = useTarefasAlunos();
  const evidencias = useAulaEvidencias();

  const targetUserId = professorUserId ?? user?.id ?? null;
  const targetNomeKey = useMemo(() => {
    const nome = professorNome ?? (!professorUserId ? displayName || user?.email : "");
    return nome.trim().toLowerCase();
  }, [displayName, professorNome, professorUserId, user?.email]);

  const pertenceAoProfessor = useCallback(
    (ag: Agendamento) => {
      if (targetUserId && ag.professorUserId === targetUserId) return true;
      if (ag.professorUserId) return false;
      return !!targetNomeKey && (ag.professor ?? "").trim().toLowerCase() === targetNomeKey;
    },
    [targetNomeKey, targetUserId],
  );
  const [evidenciaCtx, setEvidenciaCtx] = useState<{
    agendamento: Agendamento;
    turma: Turma;
    curso: Curso;
  } | null>(null);

  // Filtros
  const hoje = new Date();
  const [mesAno, setMesAno] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`,
  );
  const [turmaFiltro, setTurmaFiltro] = useState<string>("__all__");
  const [atividadesFiltro, setAtividadesFiltro] = useState<AtividadesFiltro>("semana");

  const turmaMap = useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);
  const cursoMap = useMemo(() => new Map(cursos.map((c) => [c.id, c])), [cursos]);
  const ativMap = useMemo(() => new Map(atividades.map((a) => [a.id, a])), [atividades]);
  const evidenciasPorAgendamento = useMemo(() => {
    const map = new Map<string, AulaEvidencia[]>();
    for (const evidencia of evidencias) {
      const list = map.get(evidencia.agendamentoId) ?? [];
      list.push(evidencia);
      map.set(evidencia.agendamentoId, list);
    }
    return map;
  }, [evidencias]);

  // Agendamentos do professor no mês selecionado
  const hojeIso = format(hoje, "yyyy-MM-dd");
  const semanaInicioIso = format(startOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const semanaFimIso = format(endOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const agoraKey = `${hojeIso} ${format(hoje, "HH:mm")}`;

  const linhasDoProfessor = useMemo(() => {
    if (!targetUserId && !targetNomeKey) return [];
    return agendamentos
      .filter(pertenceAoProfessor)
      .filter((ag) => turmaFiltro === "__all__" || ag.turmaId === turmaFiltro)
      .sort(sortAgendamentosAsc);
  }, [agendamentos, pertenceAoProfessor, targetNomeKey, targetUserId, turmaFiltro]);

  const linhasMes = useMemo(() => {
    const [ano, mes] = mesAno.split("-").map(Number);
    const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const proxMes =
      mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
    return linhasDoProfessor.filter((ag) => ag.data >= inicioMes && ag.data < proxMes);
  }, [linhasDoProfessor, mesAno]);

  const linhasSemana = useMemo(
    () => linhasDoProfessor.filter((ag) => ag.data >= semanaInicioIso && ag.data <= semanaFimIso),
    [linhasDoProfessor, semanaFimIso, semanaInicioIso],
  );

  const linhasHoje = useMemo(
    () => linhasDoProfessor.filter((ag) => ag.data === hojeIso),
    [hojeIso, linhasDoProfessor],
  );

  const linhasProxima = useMemo(() => {
    const proxima = linhasDoProfessor.find(
      (ag) => !isAgendamentoConcluido(ag) && `${ag.data} ${ag.inicio}` >= agoraKey,
    );
    return proxima ? [proxima] : [];
  }, [agoraKey, linhasDoProfessor]);

  const linhasDadas = useMemo(
    () => linhasMes.filter((ag) => isAgendamentoConcluido(ag)).sort(sortAgendamentosDesc),
    [linhasMes],
  );

  const linhas = useMemo(() => {
    switch (atividadesFiltro) {
      case "hoje":
        return linhasHoje;
      case "semana":
        return linhasSemana;
      case "proxima":
        return linhasProxima;
      case "dadas":
        return linhasDadas;
      case "mes":
        return linhasMes;
    }
  }, [atividadesFiltro, linhasDadas, linhasHoje, linhasMes, linhasProxima, linhasSemana]);

  const filtroCounts = useMemo(
    () => ({
      hoje: linhasHoje.length,
      semana: linhasSemana.length,
      proxima: linhasProxima.length,
      dadas: linhasDadas.length,
      mes: linhasMes.length,
    }),
    [
      linhasDadas.length,
      linhasHoje.length,
      linhasMes.length,
      linhasProxima.length,
      linhasSemana.length,
    ],
  );

  // Turmas distintas do professor
  const turmasDoProfessor = useMemo(() => {
    if (!targetUserId && !targetNomeKey) return [];
    const ids = new Set<string>();
    for (const ag of agendamentos) {
      if (pertenceAoProfessor(ag)) ids.add(ag.turmaId);
    }
    return Array.from(ids)
      .map((id) => turmas.find((t) => t.id === id))
      .filter((t): t is Turma => !!t)
      .sort((a, b) => a.cod.localeCompare(b.cod));
  }, [agendamentos, turmas, pertenceAoProfessor, targetNomeKey, targetUserId]);

  // Opções mês — derivadas dos agendamentos + mês atual
  const mesesOpcoes = useMemo(() => {
    const set = new Set<string>();
    if (targetUserId || targetNomeKey) {
      for (const ag of agendamentos) {
        if (!pertenceAoProfessor(ag)) continue;
        set.add(ag.data.slice(0, 7));
      }
    }
    set.add(mesAno);
    return Array.from(set).sort().reverse();
  }, [agendamentos, targetNomeKey, targetUserId, mesAno, pertenceAoProfessor]);

  const statusFor = (ag: Agendamento) => {
    const de = avaliacoes.some((a) => a.tipo === "relatorio_prof" && a.agendamentoId === ag.id);
    const recursos = !!ag.recursosEntreguesEm;
    const freq = de;
    const pais = !!ag.paisNotificadosEm;
    const temTarefa = ag.atividadeIds.some((id) => ativMap.get(id)?.tipo === 1);
    const trab = temTarefa ? tarefasAlunos.some((t) => t.agendamentoId === ag.id) : null;
    return { de, recursos, freq, pais, trab, temTarefa };
  };

  const podeEditar = (ag: Agendamento) => {
    if (hasRole("admin") || hasRole("coordenacao")) return true;
    return pertenceAoProfessor(ag);
  };

  const statusEvidencias = (ag: Agendamento) => {
    const turma = turmaMap.get(ag.turmaId);
    const curso = turma ? cursoMap.get(turma.cursoId) : undefined;
    const evs = evidenciasPorAgendamento.get(ag.id) ?? [];
    const plano = getEvidenciaPorTipo(evs, "plano_aula");
    const chamada = getEvidenciaPorTipo(evs, "chamada_arquivo");
    const planoOk = evidenciaEstaValida(plano);
    const chamadaOk = evidenciaEstaValida(chamada);
    const temAula = ag.atividadeIds.some((atividadeId) => ativMap.get(atividadeId)?.tipo === 0);
    const exigePlano = temAula && !agendamentoDispensaRequisitos(ag);
    let planoAtrasado = false;
    if (exigePlano && turma && curso) {
      const ctx: AulaEvidenciaContext = { curso, turma, agendamento: ag, atividades };
      planoAtrasado = !planoOk && isPlanoAulaAtrasado(ctx);
    }
    return {
      planoOk,
      chamadaOk,
      planoPendente: exigePlano && !planoOk,
      planoCritico: planoAtrasado,
      planoAtrasado,
      totalOk: Number(planoOk) + Number(chamadaOk),
      turma,
      curso,
    };
  };

  const handleToggleRecursos = (ag: Agendamento, novo: boolean) => {
    void agendamentosStore.marcarRecursos(ag.id, novo);
  };

  const handleAbrirRelatorio = (ag: Agendamento) => {
    if (!onAbrirRelatorio) return;
    const turma = turmaMap.get(ag.turmaId);
    if (!turma) return;
    const curso = cursoMap.get(turma.cursoId);
    if (!curso) return;
    onAbrirRelatorio({ agendamento: ag, turma, curso });
  };

  // Batch: verifica Drive para todos agendamentos do mês que têm atividade tipo=tarefa
  const [verificandoDrive, setVerificandoDrive] = useState(false);
  const agendamentosComTarefa = useMemo(
    () => linhas.filter((ag) => ag.atividadeIds.some((id) => ativMap.get(id)?.tipo === 1)),
    [linhas, ativMap],
  );
  const handleVerificarMes = async () => {
    if (agendamentosComTarefa.length === 0) {
      toast.info("Nenhuma aula com atividade tipo=tarefa neste mês.");
      return;
    }
    setVerificandoDrive(true);
    let okTotal = 0;
    let failTotal = 0;
    let errTotal = 0;
    let primeiroErro: string | null = null;
    try {
      for (const ag of agendamentosComTarefa) {
        try {
          const { data, error } = await supabase.functions.invoke("check-drive-tarefa", {
            body: { agendamentoId: ag.id },
          });
          if (error) {
            errTotal++;
            primeiroErro = primeiroErro ?? error.message;
            continue;
          }
          if (!data?.ok && data?.error) {
            errTotal++;
            primeiroErro =
              primeiroErro ??
              (data.error === "drive_not_configured"
                ? "Service Account não configurada (Coordenação → Configurações → Service Google)"
                : (data.detail ?? data.error));
            // Se Drive não configurado, aborta loop — todas falharão igual.
            if (data.error === "drive_not_configured") break;
            continue;
          }
          const results = (data?.results ?? []) as Array<{
            completou: boolean;
            error?: string;
          }>;
          okTotal += results.filter((r) => r.completou).length;
          failTotal += results.filter((r) => !r.completou && !r.error).length;
          errTotal += results.filter((r) => r.error).length;
        } catch (e) {
          errTotal++;
          primeiroErro = primeiroErro ?? String(e);
        }
      }
      // Refresh store após batch — UI das linhas reflete trab=true/false
      await tarefasAlunosStore.ensureInit();
      if (errTotal > 0 && okTotal + failTotal === 0) {
        toast.error(`Verificação Drive falhou: ${primeiroErro ?? "erro desconhecido"}`);
      } else {
        toast.success(
          `Drive: ${okTotal} entregue(s), ${failTotal} pendente(s)${errTotal ? `, ${errTotal} erro(s)` : ""}.`,
        );
      }
    } finally {
      setVerificandoDrive(false);
    }
  };

  // Export CSV — espelha colunas da planilha "Anne - Aulas Maio 2026".
  // Separador `;` + BOM UTF-8 pra Excel pt-BR detectar corretamente.
  const handleExportarCsv = () => {
    const header = [
      "Data",
      "Dia",
      "Turmas",
      "Código da aula",
      "Nome",
      "DE",
      "RECURSOS",
      "Frequência",
      "Pais",
      "Trab. Alunos",
    ];
    const rows = linhas.map((ag) => {
      const turma = turmaMap.get(ag.turmaId);
      const ativsAg = ag.atividadeIds.map((id) => ativMap.get(id)).filter(Boolean);
      const codigos = ativsAg.map((a) => a?.codigo ?? "").join(" / ");
      const nomes = ativsAg.map((a) => a?.nome ?? "").join(" / ");
      const dataObj = parseISO(`${ag.data}T00:00:00`);
      const dia = format(dataObj, "EEE", { locale: ptBR }).replace(/^./, (c) => c.toUpperCase());
      const s = statusFor(ag);
      return [
        format(dataObj, "dd/MM/yyyy"),
        dia,
        turma?.cod ?? "",
        codigos,
        nomes,
        s.de ? "OK" : "",
        s.recursos ? "OK" : "",
        s.freq ? "OK" : "",
        s.pais ? "OK" : "",
        s.trab === null ? "" : s.trab ? "OK" : "",
      ];
    });
    const escape = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [header, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `minhas-atividades-${mesAno}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filtroUsaMesSelecionado = atividadesFiltro === "dadas" || atividadesFiltro === "mes";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" /> Minhas Atividades
        </div>
        <div className="flex-1" />
        <Select value={mesAno} onValueChange={setMesAno} disabled={!filtroUsaMesSelecionado}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {mesesOpcoes.map((m) => {
              const [a, mm] = m.split("-").map(Number);
              const label = format(new Date(a, mm - 1, 1), "MMMM yyyy", { locale: ptBR });
              return (
                <SelectItem key={m} value={m} className="capitalize">
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas turmas</SelectItem>
            {turmasDoProfessor.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.cod}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleVerificarMes}
          disabled={agendamentosComTarefa.length === 0 || verificandoDrive}
          title={
            agendamentosComTarefa.length === 0
              ? "Nenhuma aula com atividade tipo=tarefa neste mês"
              : `Verifica no Drive entrega de tarefas em ${agendamentosComTarefa.length} aula(s)`
          }
        >
          {verificandoDrive ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          {verificandoDrive ? "Verificando…" : "Verificar Drive"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleExportarCsv}
          disabled={linhas.length === 0}
          title="Exportar para CSV (abre no Excel/Sheets)"
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Exportar
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTROS_ATIVIDADES.map((filtro) => (
          <Button
            key={filtro.value}
            type="button"
            size="sm"
            variant={atividadesFiltro === filtro.value ? "default" : "outline"}
            className="h-8 px-2.5 text-xs"
            onClick={() => setAtividadesFiltro(filtro.value)}
          >
            {filtro.label}
            <Badge
              variant={atividadesFiltro === filtro.value ? "secondary" : "outline"}
              className="ml-1.5 h-5 px-1.5 text-[10px]"
            >
              {filtroCounts[filtro.value]}
            </Badge>
          </Button>
        ))}
      </div>

      {linhas.length === 0 ? (
        <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">
          {FILTRO_EMPTY_TEXT[atividadesFiltro]}
        </div>
      ) : (
        <div className="border rounded-md overflow-auto max-h-[360px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px] text-xs">Data</TableHead>
                <TableHead className="w-[50px] text-xs">Dia</TableHead>
                <TableHead className="w-[120px] text-xs">Turma</TableHead>
                <TableHead className="w-[110px] text-xs">Código</TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="w-[95px] text-center text-xs">Evid.</TableHead>
                <TableHead className="w-[55px] text-center text-xs">DE</TableHead>
                <TableHead className="w-[80px] text-center text-xs">Recursos</TableHead>
                <TableHead className="w-[60px] text-center text-xs">Freq</TableHead>
                <TableHead className="w-[55px] text-center text-xs">Pais</TableHead>
                <TableHead className="w-[55px] text-center text-xs">Trab</TableHead>
                <TableHead className="w-[110px] text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((ag) => {
                const turma = turmaMap.get(ag.turmaId);
                const ativsAg = ag.atividadeIds.map((id) => ativMap.get(id)).filter(Boolean);
                const codigos = ativsAg.map((a) => a?.codigo ?? "").join(" / ");
                const nomes = ativsAg.map((a) => a?.nome ?? "").join(" / ");
                const dataObj = parseISO(`${ag.data}T00:00:00`);
                const dia = format(dataObj, "EEE", { locale: ptBR }).slice(0, 3);
                const status = statusFor(ag);
                const evidStatus = statusEvidencias(ag);
                const editavel = podeEditar(ag);
                const tudoOk =
                  status.de &&
                  status.recursos &&
                  status.freq &&
                  status.pais &&
                  (status.trab ?? true);

                return (
                  <TableRow key={ag.id} className={cn(tudoOk && "bg-emerald-500/5")}>
                    <TableCell className="text-xs tabular-nums">
                      {format(dataObj, "dd/MM")}
                    </TableCell>
                    <TableCell className="text-xs capitalize">{dia}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {turma?.cod ?? "?"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] truncate">{codigos}</TableCell>
                    <TableCell className="text-xs truncate max-w-[280px]">
                      <span className="inline-flex max-w-full items-center gap-1" title={nomes}>
                        <span className="truncate">{nomes}</span>
                        {evidStatus.planoPendente && (
                          <CircleAlert
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              evidStatus.planoCritico ? "text-destructive" : "text-amber-600",
                            )}
                            aria-label={
                              evidStatus.planoCritico
                                ? "Plano ausente com critica"
                                : "Plano pendente"
                            }
                          />
                        )}
                      </span>
                      <div className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5 ml-1">
                        <Clock className="h-2.5 w-2.5" /> {ag.inicio}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant={evidStatus.totalOk === 2 ? "ghost" : "outline"}
                        className={cn(
                          "h-6 text-[10px] px-2",
                          evidStatus.planoPendente && "border-amber-500 text-amber-700",
                          evidStatus.planoCritico && "border-destructive text-destructive",
                        )}
                        disabled={!evidStatus.turma || !evidStatus.curso}
                        onClick={() => {
                          if (!evidStatus.turma || !evidStatus.curso) return;
                          setEvidenciaCtx({
                            agendamento: ag,
                            turma: evidStatus.turma,
                            curso: evidStatus.curso,
                          });
                        }}
                        title="Abrir evidencias da aula"
                      >
                        <FileCheck2 className="h-3 w-3 mr-1" />
                        {evidStatus.totalOk}/2
                      </Button>
                    </TableCell>
                    <StatusCell ok={status.de} />
                    <TableCell className="text-center">
                      {editavel ? (
                        <Checkbox
                          checked={status.recursos}
                          onCheckedChange={(v) => handleToggleRecursos(ag, !!v)}
                          aria-label="Recursos entregues"
                        />
                      ) : status.recursos ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600 mx-auto" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <StatusCell ok={status.freq} />
                    <StatusCell ok={status.pais} />
                    <StatusCell ok={status.trab} />
                    <TableCell>
                      {editavel && !status.de && onAbrirRelatorio && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          onClick={() => handleAbrirRelatorio(ag)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Relatório
                        </Button>
                      )}
                      {status.de && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-2"
                          onClick={() => handleAbrirRelatorio(ag)}
                          title="Editar relatório"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AulaEvidenciasDialog
        open={!!evidenciaCtx}
        onOpenChange={(open) => !open && setEvidenciaCtx(null)}
        agendamento={evidenciaCtx?.agendamento ?? null}
        turma={evidenciaCtx?.turma}
        curso={evidenciaCtx?.curso}
        atividades={atividades}
      />
    </div>
  );
}

function StatusCell({ ok }: { ok: boolean | null }) {
  return (
    <TableCell className="text-center">
      {ok === null ? (
        <span className="text-muted-foreground text-xs">—</span>
      ) : ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 mx-auto" />
      ) : (
        <Minus className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
      )}
    </TableCell>
  );
}
