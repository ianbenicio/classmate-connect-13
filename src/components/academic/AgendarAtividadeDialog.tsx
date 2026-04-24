import { useEffect, useMemo, useState } from "react";
import { addDays, format, parse, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  atividadeBlocos,
  blocoFim,
  blocoInicio,
  diaSemanaFromDate,
  formatHorarioSlot,
  formatMinutos,
  getDuracaoAulaMin,
  getGrupoNome,
  slotBlocosCount,
  type Agendamento,
  type Atividade,
  type Curso,
  type HorarioSlot,
  type Turma,
} from "@/lib/academic-types";
import { agendamentosStore, useAgendamentos } from "@/lib/agendamentos-store";
import { notificacoesStore } from "@/lib/notificacoes-store";
import { SEED_GRUPOS } from "@/lib/academic-seed";
import { alunosStore } from "@/lib/alunos-store";
import { authStore } from "@/lib/auth-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso: Curso;
  atividades: Atividade[];
  turmas: Turma[];
  defaultAtividadeIds?: string[];
  defaultTurmaId?: string;
  defaultData?: string;
  defaultSlot?: HorarioSlot;
  /** Quando true (origem: calendário), trava turma, data e horário. */
  lockTurmaEHorario?: boolean;
}

/** Bloco proposto/sugerido em uma data específica. */
interface ParteSugestao {
  data: string; // YYYY-MM-DD
  slot: HorarioSlot;
  blocoIndex: number;
  blocosTotal: number;
  inicio: string;
  fim: string;
}

export function AgendarAtividadeDialog({
  open,
  onOpenChange,
  curso,
  atividades,
  turmas,
  defaultAtividadeIds = [],
  defaultTurmaId,
  defaultData,
  defaultSlot,
  lockTurmaEHorario = false,
}: Props) {
  const [turmaId, setTurmaId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  const [slotIdx, setSlotIdx] = useState<string>("");
  const [grupo, setGrupo] = useState<string>("");
  const [atividadeIds, setAtividadeIds] = useState<string[]>(defaultAtividadeIds);
  const [observacao, setObservacao] = useState("");
  const [blocoSelecionado, setBlocoSelecionado] = useState<string>("");

  const todosAgendamentos = useAgendamentos();
  const duracaoAulaMin = getDuracaoAulaMin(curso);

  useEffect(() => {
    if (!open) return;
    setTurmaId(defaultTurmaId ?? turmas[0]?.id ?? "");
    setDate(defaultData ? parse(defaultData, "yyyy-MM-dd", new Date()) : undefined);
    setSlotIdx("");
    setGrupo("");
    setAtividadeIds(defaultAtividadeIds);
    setObservacao("");
    setBlocoSelecionado("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTurmaId, defaultData, turmas]);

  const turmaSelecionada = turmas.find((t) => t.id === turmaId);

  const slotsDisponiveis = useMemo(() => {
    if (!turmaSelecionada || !date) return [];
    const dia = diaSemanaFromDate(date);
    return turmaSelecionada.horarios
      .map((h, i) => ({ slot: h, idx: i }))
      .filter(({ slot }) => slot.diaSemana === dia);
  }, [turmaSelecionada, date]);

  useEffect(() => {
    if (!open || !defaultSlot || !turmaSelecionada) return;
    // 1) Match exato (diaSemana + inicio + fim)
    let idx = turmaSelecionada.horarios.findIndex(
      (h) =>
        h.diaSemana === defaultSlot.diaSemana &&
        h.inicio === defaultSlot.inicio &&
        h.fim === defaultSlot.fim,
    );
    // 2) Fallback: match por diaSemana + inicio (a turma pode ter o slot
    //    com fim ligeiramente diferente do que veio do calendário/curso)
    if (idx < 0) {
      idx = turmaSelecionada.horarios.findIndex(
        (h) =>
          h.diaSemana === defaultSlot.diaSemana &&
          h.inicio === defaultSlot.inicio,
      );
    }
    // 3) Fallback final: primeiro slot do mesmo diaSemana
    if (idx < 0) {
      idx = turmaSelecionada.horarios.findIndex(
        (h) => h.diaSemana === defaultSlot.diaSemana,
      );
    }
    if (idx >= 0) setSlotIdx(String(idx));
  }, [open, defaultSlot, turmaSelecionada]);

  useEffect(() => {
    if (slotsDisponiveis.length === 1) {
      setSlotIdx(String(slotsDisponiveis[0].idx));
    }
  }, [slotsDisponiveis]);

  const ativsDoCurso = useMemo(
    () => atividades.filter((a) => a.cursoId === curso.id),
    [atividades, curso.id],
  );

  const grupos = useMemo(() => {
    const set = new Set<string>();
    for (const a of ativsDoCurso) if (a.grupo) set.add(a.grupo);
    return Array.from(set).sort();
  }, [ativsDoCurso]);

  const ativsDoGrupo = useMemo(
    () => (grupo ? ativsDoCurso.filter((a) => a.grupo === grupo) : []),
    [ativsDoCurso, grupo],
  );

  const aulasDoGrupo = useMemo(
    () => ativsDoGrupo.filter((a) => a.tipo === 0),
    [ativsDoGrupo],
  );
  const tarefasDoGrupo = useMemo(
    () => ativsDoGrupo.filter((a) => a.tipo === 1),
    [ativsDoGrupo],
  );

  const aulaId = atividadeIds.find((id) => aulasDoGrupo.some((a) => a.id === id)) ?? "";
  const tarefaId = atividadeIds.find((id) => tarefasDoGrupo.some((a) => a.id === id)) ?? "";

  useEffect(() => {
    setAtividadeIds([]);
    setBlocoSelecionado("");
  }, [grupo]);

  const setAula = (id: string) => {
    setAtividadeIds((prev) => {
      const semAulas = prev.filter((x) => !aulasDoGrupo.some((a) => a.id === x));
      return id ? [...semAulas, id] : semAulas;
    });
    setBlocoSelecionado("");
  };
  const setTarefa = (id: string) => {
    setAtividadeIds((prev) => {
      const semTarefas = prev.filter((x) => !tarefasDoGrupo.some((a) => a.id === x));
      return id ? [...semTarefas, id] : semTarefas;
    });
    setBlocoSelecionado("");
  };

  // ---------- Cálculo de blocos ----------
  const ativsSelecionadas = useMemo(
    () => atividades.filter((a) => atividadeIds.includes(a.id)),
    [atividades, atividadeIds],
  );

  /** Carga horária total da seleção. */
  const cargaTotalMin = useMemo(
    () => ativsSelecionadas.reduce((s, a) => s + (a.cargaHorariaMin ?? 0), 0),
    [ativsSelecionadas],
  );

  /** Quantos blocos a seleção precisa ocupar (0 = livre). */
  const blocosNecessarios = useMemo(
    () => atividadeBlocos(cargaTotalMin, duracaoAulaMin),
    [cargaTotalMin, duracaoAulaMin],
  );

  const slotAtual = slotIdx !== "" && turmaSelecionada
    ? turmaSelecionada.horarios[Number(slotIdx)]
    : undefined;

  /** Blocos já ocupados em uma data+slot específicos. */
  const ocupacaoNoSlot = (
    data: string,
    slot: HorarioSlot,
    turma: Turma,
  ): Set<number> => {
    const ocupados = new Set<number>();
    for (const ag of todosAgendamentos) {
      if (ag.turmaId !== turma.id) continue;
      if (ag.data !== data) continue;
      if (ag.slotInicio !== slot.inicio || ag.slotFim !== slot.fim) {
        // Compatibilidade: agendamentos antigos sem slotInicio usam inicio/fim do slot inteiro
        if (ag.inicio === slot.inicio && ag.fim === slot.fim && ag.blocoIndex === undefined) {
          // ocupa todos os blocos
          const total = slotBlocosCount(slot, duracaoAulaMin);
          for (let i = 0; i < total; i++) ocupados.add(i);
        }
        continue;
      }
      const startB = ag.blocoIndex ?? 0;
      const lenB = ag.blocosTotal ?? 1;
      for (let i = 0; i < lenB; i++) ocupados.add(startB + i);
    }
    return ocupados;
  };

  /** Lista de blocos livres no slot atual. */
  const blocosLivresAtual = useMemo(() => {
    if (!turmaSelecionada || !slotAtual || !date) return [];
    const total = slotBlocosCount(slotAtual, duracaoAulaMin);
    const dataIso = format(date, "yyyy-MM-dd");
    const ocupados = ocupacaoNoSlot(dataIso, slotAtual, turmaSelecionada);
    const livres: number[] = [];
    for (let i = 0; i < total; i++) if (!ocupados.has(i)) livres.push(i);
    return livres;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaSelecionada, slotAtual, date, todosAgendamentos, duracaoAulaMin]);

  const totalBlocosSlot = slotAtual ? slotBlocosCount(slotAtual, duracaoAulaMin) : 0;

  /** Encontra a maior sequência consecutiva de blocos livres começando em cada índice. */
  const opcoesDeBlocoInicial = useMemo(() => {
    if (!slotAtual) return [];
    const livreSet = new Set(blocosLivresAtual);
    const opcoes: { idx: number; cabe: boolean; restantes: number }[] = [];
    for (const idx of blocosLivresAtual) {
      let cabem = 0;
      for (let i = 0; i < blocosNecessarios; i++) {
        if (livreSet.has(idx + i)) cabem++;
        else break;
      }
      opcoes.push({
        idx,
        cabe: cabem >= blocosNecessarios,
        restantes: blocosNecessarios > 0 ? Math.min(cabem, blocosNecessarios) : 1,
      });
    }
    return opcoes;
  }, [blocosLivresAtual, slotAtual, blocosNecessarios]);

  // Auto-selecionar o primeiro bloco livre ao trocar de slot/atividade
  useEffect(() => {
    if (!slotAtual || blocoSelecionado !== "") return;
    if (blocosLivresAtual.length > 0) {
      setBlocoSelecionado(String(blocosLivresAtual[0]));
    }
  }, [slotAtual, blocosLivresAtual, blocoSelecionado]);

  /** Sugere partes adicionais em dias futuros se a atividade não couber neste dia. */
  const sugestaoMultidia = useMemo((): ParteSugestao[] | null => {
    if (!turmaSelecionada || !slotAtual || !date || blocosNecessarios === 0) return null;
    const blocoIdx = blocoSelecionado !== "" ? Number(blocoSelecionado) : -1;
    if (blocoIdx < 0) return null;

    // Quantos blocos cabem a partir do bloco selecionado neste dia?
    const livreSet = new Set(blocosLivresAtual);
    let consecutivos = 0;
    for (let i = 0; i < blocosNecessarios; i++) {
      if (livreSet.has(blocoIdx + i)) consecutivos++;
      else break;
    }
    if (consecutivos >= blocosNecessarios) return null; // cabe inteiro

    const dataIso = format(date, "yyyy-MM-dd");
    const partes: ParteSugestao[] = [
      {
        data: dataIso,
        slot: slotAtual,
        blocoIndex: blocoIdx,
        blocosTotal: consecutivos,
        inicio: blocoInicio(slotAtual, blocoIdx, duracaoAulaMin),
        fim: blocoFim(slotAtual, blocoIdx + consecutivos - 1, duracaoAulaMin),
      },
    ];
    let restantes = blocosNecessarios - consecutivos;

    // Procurar próximos dias da turma com blocos livres (até 60 dias)
    let cursor = addDays(date, 1);
    const limite = addDays(date, 60);
    while (restantes > 0 && cursor <= limite) {
      const ds = diaSemanaFromDate(cursor);
      const dataC = format(cursor, "yyyy-MM-dd");
      for (const slot of turmaSelecionada.horarios) {
        if (slot.diaSemana !== ds) continue;
        const total = slotBlocosCount(slot, duracaoAulaMin);
        const ocup = ocupacaoNoSlot(dataC, slot, turmaSelecionada);
        // Maior sequência livre começando do início
        let melhor = { idx: 0, len: 0 };
        let cur = { idx: 0, len: 0 };
        for (let i = 0; i < total; i++) {
          if (!ocup.has(i)) {
            if (cur.len === 0) cur.idx = i;
            cur.len++;
            if (cur.len > melhor.len) melhor = { ...cur };
          } else cur = { idx: 0, len: 0 };
        }
        if (melhor.len > 0) {
          const usar = Math.min(melhor.len, restantes);
          partes.push({
            data: dataC,
            slot,
            blocoIndex: melhor.idx,
            blocosTotal: usar,
            inicio: blocoInicio(slot, melhor.idx, duracaoAulaMin),
            fim: blocoFim(slot, melhor.idx + usar - 1, duracaoAulaMin),
          });
          restantes -= usar;
          if (restantes <= 0) break;
        }
      }
      cursor = addDays(cursor, 1);
    }
    return partes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    turmaSelecionada,
    slotAtual,
    date,
    blocosNecessarios,
    blocoSelecionado,
    blocosLivresAtual,
    duracaoAulaMin,
    todosAgendamentos,
  ]);

  const cobreCargaCompleta = sugestaoMultidia
    ? sugestaoMultidia.reduce((s, p) => s + p.blocosTotal, 0) >= blocosNecessarios
    : true;

  // ---------- Submit ----------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaSelecionada) return toast.error("Selecione uma turma.");
    if (!date) return toast.error("Selecione uma data.");
    if (date < startOfDay(new Date()))
      return toast.error("Não é possível agendar em datas passadas.");
    if (slotIdx === "" || !slotAtual) return toast.error("Selecione um horário.");
    if (!grupo) return toast.error("Selecione um grupo.");
    if (atividadeIds.length === 0)
      return toast.error("Escolha ao menos uma atividade.");

    const dataIso = format(date, "yyyy-MM-dd");
    const professoresUnicos = Array.from(
      new Set(ativsSelecionadas.map((a) => a.professor).filter(Boolean)),
    ) as string[];
    const professor = professoresUnicos.join(" / ") || undefined;
    const currentUser = authStore.get();
    const criadoEm = new Date().toISOString();

    // ----- Caso 1: atividade livre (cargaHoraria=0) -----
    if (blocosNecessarios === 0) {
      const novo: Agendamento = {
        id: crypto.randomUUID(),
        turmaId: turmaSelecionada.id,
        data: dataIso,
        diaSemana: slotAtual.diaSemana,
        inicio: slotAtual.inicio,
        fim: slotAtual.fim,
        slotInicio: slotAtual.inicio,
        slotFim: slotAtual.fim,
        blocoIndex: 0,
        blocosTotal: totalBlocosSlot || 1,
        atividadeIds,
        status: "pendente",
        criadoEm,
        observacao: observacao.trim() || undefined,
        professor,
        criadoPorUserId: currentUser.id,
        criadoPorNome: currentUser.nome,
      };
      agendamentosStore.add(novo);
      gerarNotificacoes([novo]);
      toast.success("Atividade agendada (livre).");
      onOpenChange(false);
      return;
    }

    // ----- Caso 2: usa blocos -----
    if (blocoSelecionado === "") return toast.error("Selecione um bloco.");
    if (!sugestaoMultidia) return toast.error("Não foi possível calcular o agendamento.");
    if (!cobreCargaCompleta)
      return toast.error(
        `Faltam blocos livres nos próximos 60 dias para cobrir a carga horária. Reduza a carga ou crie mais slots na turma.`,
      );

    const parteGrupoId = sugestaoMultidia.length > 1 ? crypto.randomUUID() : undefined;
    const novos: Agendamento[] = sugestaoMultidia.map((p, i) => ({
      id: crypto.randomUUID(),
      turmaId: turmaSelecionada.id,
      data: p.data,
      diaSemana: p.slot.diaSemana,
      inicio: p.inicio,
      fim: p.fim,
      slotInicio: p.slot.inicio,
      slotFim: p.slot.fim,
      blocoIndex: p.blocoIndex,
      blocosTotal: p.blocosTotal,
      atividadeIds,
      status: "pendente",
      criadoEm,
      observacao: observacao.trim() || undefined,
      professor,
      criadoPorUserId: currentUser.id,
      criadoPorNome: currentUser.nome,
      parteGrupoId,
      parteNum: i + 1,
      partesTotal: sugestaoMultidia.length,
    }));
    novos.forEach((a) => agendamentosStore.add(a));
    gerarNotificacoes(novos);
    toast.success(
      sugestaoMultidia.length > 1
        ? `Agendado em ${sugestaoMultidia.length} partes.`
        : "Atividade agendada.",
    );
    onOpenChange(false);
  };

  const gerarNotificacoes = (novos: Agendamento[]) => {
    if (!turmaSelecionada) return;
    const ativs = atividades.filter((a) => atividadeIds.includes(a.id));
    const partes = ativs
      .map((a) => `${a.tipo === 0 ? "Aula" : "Tarefa"}: ${a.nome}`)
      .join(" · ");
    const professoresUnicos = Array.from(
      new Set(ativs.map((a) => a.professor).filter(Boolean)),
    ) as string[];
    const professor = professoresUnicos.join(" / ") || undefined;

    const alunosDaTurma = alunosStore.getAll().filter(
      (al) => al.turmaId === turmaSelecionada.id,
    );
    const allNotifs = [];
    for (const ag of novos) {
      const sufixo =
        novos.length > 1 ? ` (parte ${ag.parteNum}/${ag.partesTotal})` : "";
      const titulo = `Atividade agendada — ${turmaSelecionada.cod}${sufixo}`;
      const dataFmt = format(parse(ag.data, "yyyy-MM-dd", new Date()), "PPP", {
        locale: ptBR,
      });
      const mensagem = `${curso.nome} · ${turmaSelecionada.nome} · ${dataFmt} ${
        ag.inicio
      }–${ag.fim}${professor ? ` · ${professor}` : ""}${partes ? ` — ${partes}` : ""}`;
      const base = {
        titulo,
        mensagem,
        cursoId: curso.id,
        turmaId: turmaSelecionada.id,
        data: ag.data,
        inicio: ag.inicio,
        fim: ag.fim,
        professor,
        atividadeIds,
        criadoEm: new Date().toISOString(),
        lida: false,
      };
      for (const al of alunosDaTurma) {
        allNotifs.push({
          ...base,
          id: crypto.randomUUID(),
          destinatarioTipo: "aluno" as const,
          destinatarioId: al.id,
        });
      }
      if (professor) {
        allNotifs.push({
          ...base,
          id: crypto.randomUUID(),
          destinatarioTipo: "professor" as const,
          destinatarioId: professor,
        });
      }
    }
    notificacoesStore.addMany(allNotifs);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar atividade</DialogTitle>
          <DialogDescription>
            Curso: <strong>{curso.nome}</strong> · Bloco padrão: {formatMinutos(duracaoAulaMin)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Turma *</Label>
            <Select value={turmaId} onValueChange={setTurmaId} disabled={lockTurmaEHorario}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome} · {t.cod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {turmas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Este curso ainda não possui turmas cadastradas.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={lockTurmaEHorario}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon />
                    {date
                      ? format(date, "PPP", { locale: ptBR })
                      : "Escolher data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < startOfDay(new Date())}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Horário *</Label>
              {!turmaSelecionada ? (
                <p className="text-xs text-muted-foreground">Selecione a turma.</p>
              ) : !date ? (
                <p className="text-xs text-muted-foreground">Selecione a data.</p>
              ) : slotsDisponiveis.length === 0 ? (
                <p className="text-xs text-destructive">
                  A turma não tem horário neste dia.
                </p>
              ) : lockTurmaEHorario && slotAtual ? (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                  <Clock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  {formatHorarioSlot(slotAtual)}
                </div>
              ) : (
                <Select value={slotIdx} onValueChange={(v) => { setSlotIdx(v); setBlocoSelecionado(""); }} disabled={lockTurmaEHorario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {slotsDisponiveis.map(({ slot, idx }) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {formatHorarioSlot(slot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Grupo *</Label>
            {ativsDoCurso.length === 0 ? (
              <p className="text-xs text-muted-foreground border rounded-md p-3">
                Nenhuma atividade cadastrada neste curso ainda.
              </p>
            ) : grupos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum grupo disponível.</p>
            ) : (
              <Select value={grupo} onValueChange={setGrupo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((g) => (
                    <SelectItem key={g} value={g}>
                      <span className="font-mono text-xs mr-2">{g}</span>
                      {getGrupoNome(SEED_GRUPOS, curso.cod, g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {grupo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Aula</Label>
                <Select
                  value={aulaId || "__none__"}
                  onValueChange={(v) => setAula(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem aula" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {aulasDoGrupo.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.codigo} · {a.nome}
                        {a.cargaHorariaMin
                          ? ` (${formatMinutos(a.cargaHorariaMin)})`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tarefa</Label>
                <Select
                  value={tarefaId || "__none__"}
                  onValueChange={(v) => setTarefa(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem tarefa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {tarefasDoGrupo.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.codigo} · {a.nome}
                        {a.cargaHorariaMin
                          ? ` (${formatMinutos(a.cargaHorariaMin)})`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Bloco picker */}
          {slotAtual && atividadeIds.length > 0 && blocosNecessarios > 0 && (
            <div className="space-y-2 rounded-md border p-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <Label className="m-0">
                  Bloco inicial · precisa de {blocosNecessarios} bloco(s) ={" "}
                  {formatMinutos(blocosNecessarios * duracaoAulaMin)}
                </Label>
              </div>
              {blocosLivresAtual.length === 0 ? (
                <p className="text-xs text-destructive">
                  Todos os blocos deste horário já estão ocupados.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {Array.from({ length: totalBlocosSlot }).map((_, idx) => {
                    const livre = blocosLivresAtual.includes(idx);
                    const opt = opcoesDeBlocoInicial.find((o) => o.idx === idx);
                    const isSel = blocoSelecionado === String(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!livre}
                        onClick={() => setBlocoSelecionado(String(idx))}
                        className={cn(
                          "text-xs rounded border px-2 py-1.5 text-left transition-colors",
                          !livre && "opacity-40 cursor-not-allowed bg-muted",
                          livre && !isSel && "hover:bg-accent",
                          isSel && "border-primary bg-primary/10 font-medium",
                        )}
                      >
                        <div className="font-mono">
                          {blocoInicio(slotAtual, idx, duracaoAulaMin)}–
                          {blocoFim(slotAtual, idx, duracaoAulaMin)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {!livre
                            ? "ocupado"
                            : opt && !opt.cabe
                              ? `cabe ${opt.restantes}/${blocosNecessarios}`
                              : "livre"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {sugestaoMultidia && sugestaoMultidia.length > 1 && (
                <div className="rounded-md border-l-2 border-primary bg-primary/5 p-2 text-xs space-y-1">
                  <div className="font-medium text-primary">
                    🔀 Atividade será dividida em {sugestaoMultidia.length} partes:
                  </div>
                  {sugestaoMultidia.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 font-mono">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span>{format(parse(p.data, "yyyy-MM-dd", new Date()), "dd/MM")}</span>
                      <span>{p.inicio}–{p.fim}</span>
                      <span className="text-muted-foreground">
                        ({formatMinutos(p.blocosTotal * duracaoAulaMin)})
                      </span>
                    </div>
                  ))}
                  {!cobreCargaCompleta && (
                    <div className="text-destructive font-medium pt-1">
                      ⚠️ Não há blocos livres suficientes nos próximos 60 dias.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Opcional"
            />
          </div>

          {turmaSelecionada && date && slotIdx !== "" && (
            <div className="rounded-md bg-muted/40 border p-3 text-sm">
              <div className="text-xs uppercase text-muted-foreground mb-1">
                Resumo
              </div>
              <div className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(date, "PPP", { locale: ptBR })} ·{" "}
                {formatHorarioSlot(turmaSelecionada.horarios[Number(slotIdx)])} ·{" "}
                {turmaSelecionada.nome}
                {blocosNecessarios > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    · carga: {formatMinutos(cargaTotalMin)}
                  </span>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">📅 Agendar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
