import { useEffect, useMemo, useState } from "react";
import { format, parse, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Check, Clock, Pencil, Trash2 } from "lucide-react";
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
  type Notificacao,
  type Turma,
} from "@/lib/academic-types";
import { agendamentosStore, useAgendamentos } from "@/lib/agendamentos-store";
import { notificacoesStore } from "@/lib/notificacoes-store";
import { useGruposByCursoCod } from "@/lib/grupos-store";
import { alunosStore } from "@/lib/alunos-store";
import { useAuth } from "@/lib/auth";
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

/** Atribuição local (não persistida) de um bloco. */
interface BlocoAssignment {
  grupo: string;
  aulaId: string;
  tarefaId: string;
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
  const [observacao, setObservacao] = useState("");

  /** Map blocoIndex → assignment confirmado (local). */
  const [assignments, setAssignments] = useState<Record<number, BlocoAssignment>>({});
  /** blocoIndex sendo editado (-1 = nenhum). */
  const [editingBloco, setEditingBloco] = useState<number | null>(null);
  /** Estado do formulário inline. */
  const [draftGrupo, setDraftGrupo] = useState<string>("");
  const [draftAulaId, setDraftAulaId] = useState<string>("");
  const [draftTarefaId, setDraftTarefaId] = useState<string>("");

  const todosAgendamentos = useAgendamentos();
  const gruposByCursoCod = useGruposByCursoCod();
  const { user: authUser, displayName } = useAuth();
  const duracaoAulaMin = getDuracaoAulaMin(curso);

  // ---------- Reset ao abrir ----------
  useEffect(() => {
    if (!open) return;
    setTurmaId(defaultTurmaId ?? turmas[0]?.id ?? "");
    setDate(defaultData ? parse(defaultData, "yyyy-MM-dd", new Date()) : undefined);
    setSlotIdx("");
    setObservacao("");
    setAssignments({});
    setEditingBloco(null);
    setDraftGrupo("");
    setDraftAulaId("");
    setDraftTarefaId("");
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

  // Match defaultSlot quando vem do calendário
  useEffect(() => {
    if (!open || !defaultSlot || !turmaSelecionada) return;
    let idx = turmaSelecionada.horarios.findIndex(
      (h) =>
        h.diaSemana === defaultSlot.diaSemana &&
        h.inicio === defaultSlot.inicio &&
        h.fim === defaultSlot.fim,
    );
    if (idx < 0) {
      idx = turmaSelecionada.horarios.findIndex(
        (h) =>
          h.diaSemana === defaultSlot.diaSemana &&
          h.inicio === defaultSlot.inicio,
      );
    }
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

  const slotAtual = slotIdx !== "" && turmaSelecionada
    ? turmaSelecionada.horarios[Number(slotIdx)]
    : undefined;

  const totalBlocosSlot = slotAtual ? slotBlocosCount(slotAtual, duracaoAulaMin) : 0;

  // Reset assignments quando muda turma/data/slot
  useEffect(() => {
    setAssignments({});
    setEditingBloco(null);
  }, [turmaId, slotIdx, date]);

  // ---------- Atividades / grupos do curso ----------
  const ativsDoCurso = useMemo(
    () => atividades.filter((a) => a.cursoId === curso.id),
    [atividades, curso.id],
  );

  const grupos = useMemo(() => {
    const set = new Set<string>();
    for (const a of ativsDoCurso) if (a.grupo) set.add(a.grupo);
    return Array.from(set).sort();
  }, [ativsDoCurso]);

  const ativsDoGrupoDraft = useMemo(
    () => (draftGrupo ? ativsDoCurso.filter((a) => a.grupo === draftGrupo) : []),
    [ativsDoCurso, draftGrupo],
  );
  const aulasDoGrupoDraft = useMemo(
    () => ativsDoGrupoDraft.filter((a) => a.tipo === 0),
    [ativsDoGrupoDraft],
  );
  const tarefasDoGrupoDraft = useMemo(
    () => ativsDoGrupoDraft.filter((a) => a.tipo === 1),
    [ativsDoGrupoDraft],
  );

  // Quando muda o grupo do draft, limpa aula/tarefa
  useEffect(() => {
    setDraftAulaId("");
    setDraftTarefaId("");
  }, [draftGrupo]);

  // ---------- Ocupação de blocos por agendamentos pré-existentes ----------
  const blocosOcupadosExistentes = useMemo((): Set<number> => {
    const ocupados = new Set<number>();
    if (!turmaSelecionada || !slotAtual || !date) return ocupados;
    const dataIso = format(date, "yyyy-MM-dd");
    for (const ag of todosAgendamentos) {
      if (ag.turmaId !== turmaSelecionada.id) continue;
      if (ag.data !== dataIso) continue;
      const matchesSlot =
        (ag.slotInicio === slotAtual.inicio && ag.slotFim === slotAtual.fim) ||
        (ag.slotInicio === undefined &&
          ag.inicio === slotAtual.inicio &&
          ag.fim === slotAtual.fim);
      if (!matchesSlot) {
        // Compat: agendamento antigo sem slot* mas que cobre o slot inteiro
        if (
          ag.slotInicio === undefined &&
          ag.inicio === slotAtual.inicio &&
          ag.fim === slotAtual.fim &&
          ag.blocoIndex === undefined
        ) {
          for (let i = 0; i < totalBlocosSlot; i++) ocupados.add(i);
        }
        continue;
      }
      const startB = ag.blocoIndex ?? 0;
      const lenB = ag.blocosTotal ?? 1;
      for (let i = 0; i < lenB; i++) ocupados.add(startB + i);
    }
    return ocupados;
  }, [todosAgendamentos, turmaSelecionada, slotAtual, date, totalBlocosSlot]);

  // ---------- Pre-selecionar primeiro bloco a partir de defaultAtividadeIds ----------
  useEffect(() => {
    if (!open) return;
    if (!slotAtual || totalBlocosSlot === 0) return;
    if (defaultAtividadeIds.length === 0) return;
    if (Object.keys(assignments).length > 0) return;
    const primeiraAtiv = atividades.find((a) => defaultAtividadeIds.includes(a.id));
    if (!primeiraAtiv) return;
    // achar primeiro bloco livre
    let firstFree = -1;
    for (let i = 0; i < totalBlocosSlot; i++) {
      if (!blocosOcupadosExistentes.has(i)) {
        firstFree = i;
        break;
      }
    }
    if (firstFree < 0) return;
    const grupo = primeiraAtiv.grupo;
    const aulaCandidate = atividades.find(
      (a) => defaultAtividadeIds.includes(a.id) && a.tipo === 0 && a.grupo === grupo,
    );
    const tarefaCandidate = atividades.find(
      (a) => defaultAtividadeIds.includes(a.id) && a.tipo === 1 && a.grupo === grupo,
    );
    setAssignments({
      [firstFree]: {
        grupo,
        aulaId: aulaCandidate?.id ?? "",
        tarefaId: tarefaCandidate?.id ?? "",
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slotAtual, totalBlocosSlot, defaultAtividadeIds, atividades, blocosOcupadosExistentes]);

  // ---------- Handlers do editor inline ----------
  const openEditor = (blocoIdx: number) => {
    if (blocosOcupadosExistentes.has(blocoIdx)) return;
    const existing = assignments[blocoIdx];
    if (existing) {
      setDraftGrupo(existing.grupo);
      setDraftAulaId(existing.aulaId);
      setDraftTarefaId(existing.tarefaId);
    } else {
      setDraftGrupo("");
      setDraftAulaId("");
      setDraftTarefaId("");
    }
    setEditingBloco(blocoIdx);
  };

  const cancelEditor = () => {
    setEditingBloco(null);
    setDraftGrupo("");
    setDraftAulaId("");
    setDraftTarefaId("");
  };

  const confirmEditor = () => {
    if (editingBloco === null) return;
    if (!draftGrupo) {
      toast.error("Selecione um grupo.");
      return;
    }
    if (!draftAulaId && !draftTarefaId) {
      toast.error("Selecione ao menos uma aula ou tarefa.");
      return;
    }
    setAssignments((prev) => ({
      ...prev,
      [editingBloco]: {
        grupo: draftGrupo,
        aulaId: draftAulaId,
        tarefaId: draftTarefaId,
      },
    }));
    cancelEditor();
  };

  const removeAssignment = (blocoIdx: number) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[blocoIdx];
      return next;
    });
    if (editingBloco === blocoIdx) cancelEditor();
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaSelecionada) {
      toast.error("Selecione uma turma.");
      return;
    }
    if (!date) {
      toast.error("Selecione uma data.");
      return;
    }
    if (date < startOfDay(new Date())) {
      toast.error("Não é possível agendar em datas passadas.");
      return;
    }
    if (slotIdx === "" || !slotAtual) {
      toast.error("Selecione um horário.");
      return;
    }
    const entries = Object.entries(assignments)
      .map(([k, v]) => ({ blocoIndex: Number(k), assign: v }))
      .sort((a, b) => a.blocoIndex - b.blocoIndex);
    if (entries.length === 0) {
      toast.error("Atribua ao menos um bloco.");
      return;
    }

    const dataIso = format(date, "yyyy-MM-dd");
    const criadoEm = new Date().toISOString();
    const criadoPorNome = displayName || authUser?.email || "";

    const novos: Agendamento[] = entries.map(({ blocoIndex, assign }) => {
      const ativIds = [assign.aulaId, assign.tarefaId].filter(Boolean) as string[];
      const ativs = atividades.filter((a) => ativIds.includes(a.id));
      const profs = Array.from(
        new Set(ativs.map((a) => a.professor).filter(Boolean)),
      ) as string[];
      const professor = profs.join(" / ") || undefined;
      return {
        id: crypto.randomUUID(),
        turmaId: turmaSelecionada.id,
        data: dataIso,
        diaSemana: slotAtual.diaSemana,
        inicio: blocoInicio(slotAtual, blocoIndex, duracaoAulaMin),
        fim: blocoFim(slotAtual, blocoIndex, duracaoAulaMin),
        slotInicio: slotAtual.inicio,
        slotFim: slotAtual.fim,
        blocoIndex,
        blocosTotal: 1,
        atividadeIds: ativIds,
        status: "pendente",
        criadoEm,
        observacao: observacao.trim() || undefined,
        professor,
        criadoPorUserId: authUser?.id,
        criadoPorNome,
      };
    });

    // Persistir agendamentos
    const results = await Promise.allSettled(
      novos.map((n) => agendamentosStore.add(n)),
    );
    const failures = results.filter((r) => r.status === "rejected").length;

    if (failures > 0) {
      toast.error(
        `${failures} de ${novos.length} agendamento(s) falharam ao salvar.`,
      );
      return;
    }

    // Notificações: por agendamento, gera para cada aluno; agrupa por professor
    await gerarNotificacoes(novos);

    toast.success(
      novos.length > 1
        ? `${novos.length} blocos agendados.`
        : "Atividade agendada.",
    );
    onOpenChange(false);
  };

  const gerarNotificacoes = async (novos: Agendamento[]) => {
    if (!turmaSelecionada || novos.length === 0) return;
    const alunosDaTurma = alunosStore.getAll().filter(
      (al) => al.turmaId === turmaSelecionada.id,
    );
    const dataFmt = format(parse(novos[0].data, "yyyy-MM-dd", new Date()), "PPP", {
      locale: ptBR,
    });
    const criadoEm = new Date().toISOString();
    const allNotifs: Notificacao[] = [];

    // Por agendamento → notificação individual para cada aluno
    for (const ag of novos) {
      const ativs = atividades.filter((a) => ag.atividadeIds.includes(a.id));
      const partes = ativs
        .map((a) => `${a.tipo === 0 ? "Aula" : "Tarefa"}: ${a.nome}`)
        .join(" · ");
      const titulo = `Atividade agendada — ${turmaSelecionada.cod}`;
      const mensagem = `${curso.nome} · ${turmaSelecionada.nome} · ${dataFmt} ${ag.inicio}–${ag.fim}${
        ag.professor ? ` · ${ag.professor}` : ""
      }${partes ? ` — ${partes}` : ""}`;
      const base = {
        titulo,
        mensagem,
        cursoId: curso.id,
        turmaId: turmaSelecionada.id,
        data: ag.data,
        inicio: ag.inicio,
        fim: ag.fim,
        professor: ag.professor,
        atividadeIds: ag.atividadeIds,
        criadoEm,
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
    }

    // Agrupa por professor: uma notificação por professor listando todas as aulas
    const porProfessor = new Map<string, Agendamento[]>();
    for (const ag of novos) {
      if (!ag.professor) continue;
      const list = porProfessor.get(ag.professor) ?? [];
      list.push(ag);
      porProfessor.set(ag.professor, list);
    }
    for (const [prof, ags] of porProfessor.entries()) {
      const linhas = ags.map((ag) => {
        const ativs = atividades.filter((a) => ag.atividadeIds.includes(a.id));
        const partes = ativs
          .map((a) => `${a.tipo === 0 ? "Aula" : "Tarefa"}: ${a.nome}`)
          .join(" · ");
        return `${ag.inicio}–${ag.fim}${partes ? ` — ${partes}` : ""}`;
      });
      const titulo = `Atividades agendadas — ${turmaSelecionada.cod}`;
      const mensagem = `${curso.nome} · ${turmaSelecionada.nome} · ${dataFmt}\n${linhas.join("\n")}`;
      allNotifs.push({
        id: crypto.randomUUID(),
        destinatarioTipo: "professor",
        destinatarioId: prof,
        titulo,
        mensagem,
        cursoId: curso.id,
        turmaId: turmaSelecionada.id,
        data: ags[0].data,
        inicio: ags[0].inicio,
        fim: ags[ags.length - 1].fim,
        professor: prof,
        atividadeIds: Array.from(new Set(ags.flatMap((a) => a.atividadeIds))),
        criadoEm,
        lida: false,
      });
    }

    await notificacoesStore.addMany(allNotifs);
  };

  // ---------- Helper: render do nome de uma atividade ----------
  const ativById = (id: string) => atividades.find((a) => a.id === id);

  const draftAulaSelecionada = ativById(draftAulaId);
  const draftCarga = draftAulaSelecionada?.cargaHorariaMin ?? 0;
  const draftCargaWarning =
    draftCarga > duracaoAulaMin
      ? `Esta aula tem carga de ${formatMinutos(draftCarga)}; será encaixada em 1 bloco de ${formatMinutos(duracaoAulaMin)}.`
      : null;

  const totalAssigned = Object.keys(assignments).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar atividade</DialogTitle>
          <DialogDescription>
            Curso: <strong>{curso.nome}</strong> · Bloco: {formatMinutos(duracaoAulaMin)}
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
                <Select
                  value={slotIdx}
                  onValueChange={(v) => setSlotIdx(v)}
                  disabled={lockTurmaEHorario}
                >
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

          {/* Lista de blocos */}
          {slotAtual && totalBlocosSlot > 0 && (
            <div className="space-y-2">
              <Label>Blocos do horário</Label>
              <p className="text-xs text-muted-foreground">
                Clique em um bloco para atribuir uma aula/tarefa. Cada bloco recebe
                uma atribuição independente.
              </p>
              <div className="space-y-2">
                {Array.from({ length: totalBlocosSlot }).map((_, idx) => {
                  const ocupadoExistente = blocosOcupadosExistentes.has(idx);
                  const assigned = assignments[idx];
                  const isEditing = editingBloco === idx;
                  const inicioH = blocoInicio(slotAtual, idx, duracaoAulaMin);
                  const fimH = blocoFim(slotAtual, idx, duracaoAulaMin);
                  const aulaA = assigned ? ativById(assigned.aulaId) : undefined;
                  const tarefaA = assigned ? ativById(assigned.tarefaId) : undefined;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-md border transition-colors",
                        ocupadoExistente && "opacity-60 bg-muted",
                        !ocupadoExistente && assigned && !isEditing &&
                          "border-emerald-500/50 bg-emerald-500/10",
                        !ocupadoExistente && !assigned && !isEditing &&
                          "hover:bg-accent",
                        isEditing && "border-primary bg-primary/5",
                      )}
                    >
                      <button
                        type="button"
                        disabled={ocupadoExistente}
                        onClick={() => !ocupadoExistente && openEditor(idx)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 p-3 text-left",
                          ocupadoExistente && "cursor-not-allowed",
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="font-mono text-sm tabular-nums">
                            {inicioH}–{fimH}
                          </div>
                          <div className="text-sm min-w-0 truncate">
                            {ocupadoExistente ? (
                              <span className="text-muted-foreground">
                                ocupado
                              </span>
                            ) : assigned ? (
                              <span className="flex items-center gap-1.5 truncate">
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">
                                  {aulaA && (
                                    <span className="font-mono text-xs mr-1">
                                      {aulaA.codigo}
                                    </span>
                                  )}
                                  {aulaA?.nome ?? tarefaA?.nome ?? "(sem nome)"}
                                  {aulaA && tarefaA && (
                                    <span className="text-muted-foreground">
                                      {" "}+ {tarefaA.codigo}
                                    </span>
                                  )}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                livre — clique para atribuir
                              </span>
                            )}
                          </div>
                        </div>
                        {!ocupadoExistente && assigned && !isEditing && (
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {isEditing && (
                        <div className="border-t p-3 space-y-3 bg-background">
                          <div className="space-y-2">
                            <Label className="text-xs">Grupo *</Label>
                            {grupos.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Nenhum grupo disponível.
                              </p>
                            ) : (
                              <Select value={draftGrupo} onValueChange={setDraftGrupo}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o grupo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {grupos.map((g) => (
                                    <SelectItem key={g} value={g}>
                                      <span className="font-mono text-xs mr-2">{g}</span>
                                      {getGrupoNome(gruposByCursoCod, curso.cod, g)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          {draftGrupo && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Aula</Label>
                                <Select
                                  value={draftAulaId || "__none__"}
                                  onValueChange={(v) =>
                                    setDraftAulaId(v === "__none__" ? "" : v)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sem aula" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                                    {aulasDoGrupoDraft.map((a) => (
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
                                <Label className="text-xs">Tarefa</Label>
                                <Select
                                  value={draftTarefaId || "__none__"}
                                  onValueChange={(v) =>
                                    setDraftTarefaId(v === "__none__" ? "" : v)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sem tarefa" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                                    {tarefasDoGrupoDraft.map((a) => (
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

                          {draftCargaWarning && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              {draftCargaWarning}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 justify-end">
                            {assigned && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeAssignment(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Remover
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditor}
                            >
                              Cancelar
                            </Button>
                            <Button type="button" size="sm" onClick={confirmEditor}>
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Confirmar bloco
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Aplica-se a todos os blocos atribuídos. Opcional."
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
                <span className="ml-2 text-muted-foreground">
                  · {totalAssigned} de {totalBlocosSlot} bloco(s) atribuído(s)
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={totalAssigned === 0}>
              Agendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
