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

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Clock, FileText, Send, Minus, CalendarDays, Download } from "lucide-react";
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
import { useTarefasAlunos } from "@/lib/tarefas-alunos-store";
import { useAuth } from "@/lib/auth";
import type { Agendamento, Curso, Turma } from "@/lib/academic-types";
import { cn } from "@/lib/utils";

interface Props {
  /** Professor cujas aulas listar. Default: usuário logado. */
  professorUserId?: string;
  /** Callback ao clicar em "Lançar relatório" — pai abre RelatorioProfessorDialog. */
  onAbrirRelatorio?: (info: { agendamento: Agendamento; turma: Turma; curso: Curso }) => void;
}

export function MinhasAtividadesTable({ professorUserId, onAbrirRelatorio }: Props) {
  const { user, hasRole } = useAuth();
  const agendamentos = useAgendamentos();
  const turmas = useTurmas();
  const cursos = useCursos();
  const atividades = useAtividades();
  const avaliacoes = useAvaliacoes();
  const tarefasAlunos = useTarefasAlunos();

  const targetUserId = professorUserId ?? user?.id ?? null;

  // Filtros
  const hoje = new Date();
  const [mesAno, setMesAno] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`,
  );
  const [turmaFiltro, setTurmaFiltro] = useState<string>("__all__");

  const turmaMap = useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);
  const cursoMap = useMemo(() => new Map(cursos.map((c) => [c.id, c])), [cursos]);
  const ativMap = useMemo(() => new Map(atividades.map((a) => [a.id, a])), [atividades]);

  // Agendamentos do professor no mês selecionado
  const linhas = useMemo(() => {
    if (!targetUserId) return [];
    const [ano, mes] = mesAno.split("-").map(Number);
    const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const proxMes =
      mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
    return agendamentos
      .filter((ag) => ag.professorUserId === targetUserId)
      .filter((ag) => ag.data >= inicioMes && ag.data < proxMes)
      .filter((ag) => turmaFiltro === "__all__" || ag.turmaId === turmaFiltro)
      .sort((a, b) => `${a.data} ${a.inicio}`.localeCompare(`${b.data} ${b.inicio}`));
  }, [agendamentos, targetUserId, mesAno, turmaFiltro]);

  // Turmas distintas do professor
  const turmasDoProfessor = useMemo(() => {
    if (!targetUserId) return [];
    const ids = new Set<string>();
    for (const ag of agendamentos) {
      if (ag.professorUserId === targetUserId) ids.add(ag.turmaId);
    }
    return Array.from(ids)
      .map((id) => turmas.find((t) => t.id === id))
      .filter((t): t is Turma => !!t)
      .sort((a, b) => a.cod.localeCompare(b.cod));
  }, [agendamentos, turmas, targetUserId]);

  // Opções mês — derivadas dos agendamentos + mês atual
  const mesesOpcoes = useMemo(() => {
    const set = new Set<string>();
    if (targetUserId) {
      for (const ag of agendamentos) {
        if (ag.professorUserId !== targetUserId) continue;
        set.add(ag.data.slice(0, 7));
      }
    }
    set.add(mesAno);
    return Array.from(set).sort().reverse();
  }, [agendamentos, targetUserId, mesAno]);

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
    return ag.professorUserId === user?.id;
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
    const escape = (v: string) =>
      /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" /> Minhas Atividades
        </div>
        <div className="flex-1" />
        <Select value={mesAno} onValueChange={setMesAno}>
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
          onClick={handleExportarCsv}
          disabled={linhas.length === 0}
          title="Exportar para CSV (abre no Excel/Sheets)"
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          Exportar
        </Button>
      </div>

      {linhas.length === 0 ? (
        <div className="border rounded-md p-6 text-center text-sm text-muted-foreground">
          Nenhuma aula no período selecionado.
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px] text-xs">Data</TableHead>
                <TableHead className="w-[50px] text-xs">Dia</TableHead>
                <TableHead className="w-[120px] text-xs">Turma</TableHead>
                <TableHead className="w-[110px] text-xs">Código</TableHead>
                <TableHead className="text-xs">Nome</TableHead>
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
                      <span title={nomes}>{nomes}</span>
                      <div className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5 ml-1">
                        <Clock className="h-2.5 w-2.5" /> {ag.inicio}
                      </div>
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
