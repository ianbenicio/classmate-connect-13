import { useEffect, useMemo, useState } from "react";
import { format, parse, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookOpen, CalendarIcon, Check, Clock, FileCheck2, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  isAtividadeAvulsa,
  slotBlocosCount,
  type Agendamento,
  type Atividade,
  type Curso,
  type HorarioSlot,
  type Notificacao,
  type Turma,
} from "@/lib/academic-types";
import { agendamentosStore, useAgendamentos } from "@/lib/agendamentos-store";
import { aulaEvidenciasStore } from "@/lib/aula-evidencias-store";
import { agendamentoPertenceATurma, getStatusAulasDaTurma } from "@/lib/cronograma-aulas";
import {
  getNomeBaseEvidencia,
  inferirHabilidadesIdsDoPlano,
  montarDadosDocumentoEstudo,
  montarPlanoAulaInicial,
  type AulaEvidenciaContext,
  type PlanoAulaDados,
} from "@/lib/aula-evidencias";
import { notificacoesStore } from "@/lib/notificacoes-store";
import { useGruposByCursoCod } from "@/lib/grupos-store";
import { alunosStore } from "@/lib/alunos-store";
import { useUsersByRole } from "@/lib/users-store";
import { useHabilidades } from "@/lib/habilidades-store";
import { useAuth } from "@/lib/auth";
import { QuadroAulasPicker } from "./QuadroAulasPicker";
import { SkillSelector } from "./SkillSelector";
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
  /** @deprecated usar defaultProfessorUserId. Mantido p/ compat. */
  defaultProfessorId?: string;
  /** UserID auth.users do professor para auto-seleção (Fase 7). */
  defaultProfessorUserId?: string;
  /** Quando true (origem: calendário), trava turma, data e horário. */
  lockTurmaEHorario?: boolean;
}

/** Atribuição local (não persistida) de um bloco. */
interface BlocoAssignment {
  grupo: string;
  aulaId: string;
  tarefaId: string;
}

const EMPTY_PLANO_DADOS: PlanoAulaDados = {
  objetivos: "",
  conteudoEmenta: "",
  preparacaoProfessor: "",
  roteiro: "",
  materiais: "",
  habilidadesIds: [],
  habilidades: "",
  formaAvaliacao: "",
  observacoesProfessor: "",
  sugestaoPais: "",
};

const CAMPOS_PLANO_OBRIGATORIOS: Array<keyof PlanoAulaDados> = [
  "objetivos",
  "conteudoEmenta",
  "preparacaoProfessor",
  "roteiro",
  "materiais",
  "habilidadesIds",
  "habilidades",
  "formaAvaliacao",
  "sugestaoPais",
];

function planoCampoPreenchido(plano: PlanoAulaDados, key: keyof PlanoAulaDados) {
  const value = plano[key];
  if (Array.isArray(value)) return value.length > 0;
  return value.trim().length > 0;
}

function camposPlanoFaltando(plano: PlanoAulaDados) {
  return CAMPOS_PLANO_OBRIGATORIOS.filter((key) => !planoCampoPreenchido(plano, key));
}

function mergePlanoPreservandoEdicoes(sugerido: PlanoAulaDados, atual: PlanoAulaDados) {
  const out: PlanoAulaDados = { ...sugerido };
  for (const key of Object.keys(atual) as Array<keyof PlanoAulaDados>) {
    const value = atual[key];
    if (Array.isArray(value)) {
      if (value.length > 0) out[key] = value as never;
      continue;
    }
    if (value.trim()) out[key] = value as never;
  }
  return out;
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
  defaultProfessorId,
  defaultProfessorUserId,
  lockTurmaEHorario = false,
}: Props) {
  const [turmaId, setTurmaId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  const [slotIdx, setSlotIdx] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [selectedProfessorUserId, setSelectedProfessorUserId] = useState<string>("");
  /** Habilidades trabalhadas na aula agendada (aplica a todos os blocos). */
  const [habilidadeIds, setHabilidadeIds] = useState<string[]>([]);

  /** Map blocoIndex → assignment confirmado (local). */
  const [assignments, setAssignments] = useState<Record<number, BlocoAssignment>>({});
  /** blocoIndex sendo editado (-1 = nenhum). */
  const [editingBloco, setEditingBloco] = useState<number | null>(null);
  /** Picker em grade (quadro de aulas) aberto para o bloco em edição. */
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Estado do formulário inline. */
  const [draftGrupo, setDraftGrupo] = useState<string>("");
  const [draftAulaId, setDraftAulaId] = useState<string>("");
  const [draftTarefaId, setDraftTarefaId] = useState<string>("");
  /** Texto do campo "código da aula" (digitação manual). */
  const [draftCodigoText, setDraftCodigoText] = useState<string>("");
  const [planoOpen, setPlanoOpen] = useState(false);
  const [planoDados, setPlanoDados] = useState<PlanoAulaDados>(EMPTY_PLANO_DADOS);
  const [planoSubmetido, setPlanoSubmetido] = useState(false);

  const todosAgendamentos = useAgendamentos();
  const gruposByCursoCod = useGruposByCursoCod();
  const { user: authUser, displayName, hasRole } = useAuth();
  // Professor users see their own slot locked; admins/coordenacao can change it
  const isProfessorOnly = hasRole("professor") && !hasRole("admin") && !hasRole("coordenacao");
  const duracaoAulaMin = getDuracaoAulaMin(curso);
  // Professores são usuários com role "professor" (Fase 8 — fonte única).
  const professores = useUsersByRole("professor");
  // Habilidades do curso (fallback: todas) para o seletor de habilidades.
  const todasHabilidades = useHabilidades();
  const habilidadesDoCurso = useMemo(() => {
    const ids = new Set(curso.habilidadeIds ?? []);
    const doCurso = todasHabilidades.filter((h) => ids.has(h.id));
    return doCurso.length > 0 ? doCurso : todasHabilidades;
  }, [todasHabilidades, curso.habilidadeIds]);
  const dateIsoSelecionada = date ? format(date, "yyyy-MM-dd") : "";
  const professorSelecionado = selectedProfessorUserId
    ? professores.find((p) => p.userId === selectedProfessorUserId)
    : undefined;
  const professorNomeSelecionado = professorSelecionado?.displayName || displayName || undefined;

  // ---------- Reset ao abrir ----------
  // ⚠️ Não dependa de `turmas` (prop array) aqui — chamadores frequentemente
  // passam `turmas.filter(...)` inline, que vira referência nova a cada
  // render do pai. Se um re-render do pai (ex.: useAgendamentos refletindo
  // store) disparasse este effect, ele resetaria `editingBloco`/draft e
  // fecharia o editor inline no meio de um clique no Select — exatamente
  // o sintoma "abre e fecha rápido" antes de F5.
  const fallbackTurmaId = turmas[0]?.id ?? "";
  useEffect(() => {
    if (!open) return;
    setTurmaId(defaultTurmaId ?? fallbackTurmaId);
    setDate(defaultData ? parse(defaultData, "yyyy-MM-dd", new Date()) : undefined);
    setSlotIdx("");
    setObservacao("");
    setSelectedProfessorUserId(defaultProfessorUserId ?? defaultProfessorId ?? "");
    setHabilidadeIds([]);
    setAssignments({});
    setEditingBloco(null);
    setDraftGrupo("");
    setDraftAulaId("");
    setDraftTarefaId("");
    setDraftCodigoText("");
    setPlanoOpen(false);
    setPlanoDados(EMPTY_PLANO_DADOS);
    setPlanoSubmetido(false);
    // Intencional: reset apenas quando o diálogo abre ou o contexto-padrão
    // muda. `fallbackTurmaId` é uma string estável (não array).
  }, [
    open,
    defaultTurmaId,
    defaultData,
    defaultProfessorId,
    defaultProfessorUserId,
    fallbackTurmaId,
  ]);

  // Memoizado para estabilizar referência — evita disparar useEffects em loop
  // (que resetariam editingBloco e fechariam o editor inline ao clicar num bloco).
  const turmaSelecionada = useMemo(() => turmas.find((t) => t.id === turmaId), [turmas, turmaId]);

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
        (h) => h.diaSemana === defaultSlot.diaSemana && h.inicio === defaultSlot.inicio,
      );
    }
    if (idx < 0) {
      idx = turmaSelecionada.horarios.findIndex((h) => h.diaSemana === defaultSlot.diaSemana);
    }
    if (idx >= 0) setSlotIdx(String(idx));
  }, [open, defaultSlot, turmaSelecionada]);

  useEffect(() => {
    if (slotsDisponiveis.length === 1) {
      setSlotIdx(String(slotsDisponiveis[0].idx));
    }
  }, [slotsDisponiveis]);

  const slotAtual =
    slotIdx !== "" && turmaSelecionada ? turmaSelecionada.horarios[Number(slotIdx)] : undefined;

  const totalBlocosSlot = slotAtual ? slotBlocosCount(slotAtual, duracaoAulaMin) : 0;

  // Reset assignments quando muda turma/data/slot
  useEffect(() => {
    setAssignments({});
    setEditingBloco(null);
    setPlanoDados(EMPTY_PLANO_DADOS);
    setPlanoSubmetido(false);
  }, [turmaId, slotIdx, date]);

  const assignmentEntries = useMemo(
    () =>
      Object.entries(assignments)
        .map(([key, assign]) => ({ blocoIndex: Number(key), assign }))
        .sort((a, b) => a.blocoIndex - b.blocoIndex),
    [assignments],
  );

  const aulaIdsDoPlano = useMemo(
    () =>
      Array.from(
        new Set(
          assignmentEntries.map(({ assign }) => assign.aulaId).filter((id): id is string => !!id),
        ),
      ),
    [assignmentEntries],
  );
  const aulaIdsDoPlanoKey = aulaIdsDoPlano.join("|");

  const habilidadesDraftContext = useMemo<AulaEvidenciaContext | null>(() => {
    if (!turmaSelecionada || aulaIdsDoPlano.length === 0) return null;
    return {
      curso,
      turma: turmaSelecionada,
      agendamento: {
        id: "pre-agendamento",
        data: "",
        inicio: "",
        fim: "",
        atividadeIds: aulaIdsDoPlano,
      },
      atividades,
    };
  }, [atividades, aulaIdsDoPlano, curso, turmaSelecionada]);

  const habilidadesSugeridasIds = useMemo(
    () =>
      habilidadesDraftContext
        ? inferirHabilidadesIdsDoPlano(habilidadesDraftContext, habilidadesDoCurso)
        : [],
    [habilidadesDoCurso, habilidadesDraftContext],
  );

  useEffect(() => {
    setHabilidadeIds(habilidadesSugeridasIds);
  }, [aulaIdsDoPlanoKey, habilidadesSugeridasIds]);

  const assignmentKey = useMemo(
    () =>
      assignmentEntries
        .map(({ blocoIndex, assign }) => `${blocoIndex}:${assign.aulaId}:${assign.tarefaId}`)
        .join("|"),
    [assignmentEntries],
  );

  const planoDraftContext = useMemo<AulaEvidenciaContext | null>(() => {
    if (
      !turmaSelecionada ||
      !slotAtual ||
      !dateIsoSelecionada ||
      !selectedProfessorUserId ||
      aulaIdsDoPlano.length === 0
    ) {
      return null;
    }
    const blocosComAula = assignmentEntries.filter(({ assign }) => !!assign.aulaId);
    const firstBloco = blocosComAula[0]?.blocoIndex ?? 0;
    const lastBloco = blocosComAula[blocosComAula.length - 1]?.blocoIndex ?? firstBloco;
    return {
      curso,
      turma: turmaSelecionada,
      agendamento: {
        id: "pre-agendamento",
        data: dateIsoSelecionada,
        inicio: blocoInicio(slotAtual, firstBloco, duracaoAulaMin),
        fim: blocoFim(slotAtual, lastBloco, duracaoAulaMin),
        atividadeIds: aulaIdsDoPlano,
        professor: professorNomeSelecionado,
        professorUserId: selectedProfessorUserId || undefined,
      },
      atividades,
    };
  }, [
    aulaIdsDoPlano,
    assignmentEntries,
    atividades,
    curso,
    dateIsoSelecionada,
    duracaoAulaMin,
    professorNomeSelecionado,
    selectedProfessorUserId,
    slotAtual,
    turmaSelecionada,
  ]);

  useEffect(() => {
    setPlanoSubmetido(false);
  }, [assignmentKey, turmaId, slotIdx, dateIsoSelecionada, selectedProfessorUserId, habilidadeIds]);

  const planoPodeAbrir = aulaIdsDoPlano.length > 0 && habilidadeIds.length > 0;

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

  // IDs de aulas já agendadas/concluídas para a turma selecionada — não
  // devem aparecer no dropdown (uma aula só é dada uma vez por turma).
  // Cancelados não bloqueiam: a aula volta a ficar disponível.
  const aulasIndisponiveisParaTurma = useMemo((): Set<string> => {
    return getStatusAulasDaTurma(todosAgendamentos, turmaSelecionada?.id, atividades)
      .aulasIndisponiveisIds;
  }, [atividades, todosAgendamentos, turmaSelecionada?.id]);

  const aulasDoGrupoDraft = useMemo(
    () =>
      ativsDoGrupoDraft.filter(
        (a) => a.tipo === 0 && !isAtividadeAvulsa(a) && !aulasIndisponiveisParaTurma.has(a.id),
      ),
    [ativsDoGrupoDraft, aulasIndisponiveisParaTurma],
  );
  const tarefasDoGrupoDraft = useMemo(
    () => ativsDoGrupoDraft.filter((a) => a.tipo === 1),
    [ativsDoGrupoDraft],
  );

  // NOTA: removido o effect `[draftGrupo] → limpa aula/tarefa`.
  // Ele apagava draftAulaId um tick depois do picker/código definirem
  // grupo+aula juntos (grupo mudava → effect disparava → aula sumia).
  // applyCodigoText e o onSelect do picker já limpam a tarefa inline
  // quando o grupo muda, então o effect era redundante e nocivo
  // (causava o bug "primeira seleção falha, segunda funciona").

  // ---------- Ocupação de blocos por agendamentos pré-existentes ----------
  const blocosOcupadosExistentes = useMemo((): Set<number> => {
    const ocupados = new Set<number>();
    if (!turmaSelecionada || !slotAtual || !date) return ocupados;
    const dataIso = format(date, "yyyy-MM-dd");
    for (const ag of todosAgendamentos) {
      if (!agendamentoPertenceATurma(ag, turmaSelecionada.id)) continue;
      if (ag.data !== dataIso) continue;
      const matchesSlot =
        (ag.slotInicio === slotAtual.inicio && ag.slotFim === slotAtual.fim) ||
        (ag.slotInicio === undefined && ag.inicio === slotAtual.inicio && ag.fim === slotAtual.fim);
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
    // Intencional: pré-popular `assignments` apenas quando muda o slot-alvo.
    // Re-disparar em mudanças de `assignments` faria o estado oscilar.
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
      setDraftCodigoText(atividades.find((a) => a.id === existing.aulaId)?.codigo ?? "");
    } else {
      setDraftGrupo("");
      setDraftAulaId("");
      setDraftTarefaId("");
      setDraftCodigoText("");
    }
    setEditingBloco(blocoIdx);
  };

  const cancelEditor = () => {
    setEditingBloco(null);
    setDraftGrupo("");
    setDraftAulaId("");
    setDraftTarefaId("");
    setDraftCodigoText("");
  };

  // Resolve o código digitado → aula disponível do curso.
  // Aula concluída/agendada na turma não pode (mesma regra do quadro).
  const applyCodigoText = (raw: string) => {
    const text = raw.toUpperCase();
    setDraftCodigoText(text);
    const match = atividades.find(
      (a) =>
        a.cursoId === curso.id &&
        a.tipo === 0 &&
        !isAtividadeAvulsa(a) &&
        a.codigo.toUpperCase() === text.trim(),
    );
    if (!match) {
      // Sem correspondência exata — limpa seleção (mantém o texto digitado).
      setDraftAulaId("");
      return;
    }
    if (aulasIndisponiveisParaTurma.has(match.id)) {
      toast.error(`Aula ${match.codigo} já está agendada/concluída nesta turma.`);
      setDraftAulaId("");
      return;
    }
    if (match.grupo !== draftGrupo) setDraftTarefaId("");
    setDraftGrupo(match.grupo);
    setDraftAulaId(match.id);
  };

  const confirmEditor = () => {
    if (editingBloco === null) return;
    // Usa a aula resolvida (id OU código) — não depende só de draftAulaId.
    const aulaResolvidaId = draftAulaSelecionada?.id ?? "";
    const grupoFinal = draftGrupo || draftAulaSelecionada?.grupo || "";
    if (!grupoFinal) {
      toast.error("Selecione um grupo.");
      return;
    }
    if (!aulaResolvidaId && !draftTarefaId) {
      toast.error("Selecione ao menos uma aula ou tarefa.");
      return;
    }
    setAssignments((prev) => ({
      ...prev,
      [editingBloco]: {
        grupo: grupoFinal,
        aulaId: aulaResolvidaId,
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

  const openPlanoDialog = () => {
    if (!planoDraftContext) {
      toast.error("Atribua uma aula, data, horario e professor antes de preencher o plano.");
      return;
    }
    if (habilidadeIds.length === 0) {
      toast.error("Selecione ao menos uma habilidade antes de preencher o plano.");
      return;
    }
    const sugerido = montarPlanoAulaInicial(planoDraftContext);
    setPlanoDados((current) => {
      const merged = mergePlanoPreservandoEdicoes(sugerido, current);
      merged.habilidadesIds = habilidadeIds;
      return merged;
    });
    setPlanoOpen(true);
  };

  const salvarPlanosDosAgendamentos = async (novos: Agendamento[]) => {
    if (!turmaSelecionada) return;
    if (!planoSubmetido || camposPlanoFaltando(planoDados).length > 0) return;
    const aulaIds = new Set(
      atividades.filter((atividade) => atividade.tipo === 0).map((atividade) => atividade.id),
    );
    const agendamentosComAula = novos.filter((agendamento) =>
      agendamento.atividadeIds.some((atividadeId) => aulaIds.has(atividadeId)),
    );
    const submetidoPorNome = displayName || authUser?.email || professorNomeSelecionado;

    await Promise.all(
      agendamentosComAula.map((agendamento) => {
        const ctx: AulaEvidenciaContext = {
          curso,
          turma: turmaSelecionada,
          agendamento,
          atividades,
        };
        return aulaEvidenciasStore.upsert({
          agendamentoId: agendamento.id,
          tipo: "plano_aula",
          status: "valido",
          arquivoNome: getNomeBaseEvidencia(ctx, "plano_aula"),
          arquivoMimeType: "application/vnd.classmate.plano-aula+json",
          submetidoPorUserId: authUser?.id,
          submetidoPorNome,
          verificadoEm: new Date().toISOString(),
          observacao: "Documento de estudo/plano de aula criado no agendamento.",
          dados: montarDadosDocumentoEstudo(ctx, planoDados, submetidoPorNome),
        });
      }),
    );
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
    if (!selectedProfessorUserId) {
      toast.error("Selecione um professor.");
      return;
    }
    const entries = assignmentEntries;
    if (entries.length === 0) {
      toast.error("Atribua ao menos um bloco.");
      return;
    }
    const possuiAula = entries.some(({ assign }) => !!assign.aulaId);
    if (possuiAula && habilidadeIds.length === 0) {
      toast.error("Selecione ao menos uma habilidade antes de preencher o plano.");
      return;
    }

    const dataIso = format(date, "yyyy-MM-dd");
    const criadoEm = new Date().toISOString();
    const criadoPorNome = displayName || authUser?.email || "";

    const novos: Agendamento[] = entries.map(({ blocoIndex, assign }) => {
      const ativIds = [assign.aulaId, assign.tarefaId].filter(Boolean) as string[];
      // Fase 8: professor é apenas um User com role "professor".
      // selectedProfessorUserId === userId; nome vai p/ campo `professor` (legado).
      const professor = professorSelecionado?.displayName || undefined;
      const professorUserId = selectedProfessorUserId || defaultProfessorUserId || undefined;
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
        habilidadeIds: habilidadeIds.length ? habilidadeIds : undefined,
        status: "pendente",
        criadoEm,
        observacao: observacao.trim() || undefined,
        professor,
        professorUserId,
        criadoPorUserId: authUser?.id,
        criadoPorNome,
      };
    });

    // Persistir agendamentos
    const results = await Promise.allSettled(novos.map((n) => agendamentosStore.add(n)));
    const failures = results.filter((r) => r.status === "rejected").length;

    if (failures > 0) {
      toast.error(`${failures} de ${novos.length} agendamento(s) falharam ao salvar.`);
      return;
    }

    // Notificações: por agendamento, gera para cada aluno; agrupa por professor
    await salvarPlanosDosAgendamentos(novos);
    await gerarNotificacoes(novos);

    toast.success(novos.length > 1 ? `${novos.length} blocos agendados.` : "Atividade agendada.");
    onOpenChange(false);
  };

  const gerarNotificacoes = async (novos: Agendamento[]) => {
    if (!turmaSelecionada || novos.length === 0) return;
    const alunosDaTurma = alunosStore.getAll().filter((al) => al.turmaId === turmaSelecionada.id);
    const dataFmt = format(parse(novos[0].data, "yyyy-MM-dd", new Date()), "PPP", {
      locale: ptBR,
    });
    const criadoEm = new Date().toISOString();
    const allNotifs: Notificacao[] = [];
    const aulaIds = new Set(
      atividades.filter((atividade) => atividade.tipo === 0).map((atividade) => atividade.id),
    );
    const planoPendente = !planoSubmetido || camposPlanoFaltando(planoDados).length > 0;

    // Por agendamento → notificação individual para cada aluno
    for (const ag of novos) {
      const ativs = atividades.filter((a) => ag.atividadeIds.includes(a.id));
      const partes = ativs.map((a) => `${a.tipo === 0 ? "Aula" : "Tarefa"}: ${a.nome}`).join(" · ");
      const titulo = `Atividade agendada — ${turmaSelecionada.cod}`;
      const mensagem = `${curso.nome} · ${turmaSelecionada.nome} · ${dataFmt} ${ag.inicio}–${ag.fim}${
        ag.professor ? ` · ${ag.professor}` : ""
      }${partes ? ` — ${partes}` : ""}`;
      // `agendamentoId` alimenta o índice único parcial
      // `uq_notificacoes_dedup_scanner` — sem ele, o scanner que roda a
      // cada 60s pode recriar notificações duplicadas.
      //
      // OBS importante sobre `kind`:
      // - Aluno NÃO recebe `kind: "agendado"` aqui. O fluxo é sequencial:
      //   só vira actionable depois que o professor fecha o relatório
      //   (RelatorioProfessorDialog faz o upsert com kind=agendado).
      //   Dar kind=agendado já no agendar permitiria o aluno avaliar a aula
      //   antes dela acontecer.
      // - Professor recebe `kind: "agendado"` para o NotificationsBell
      //   abrir o RelatorioProfessorDialog quando ele clicar.
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
        agendamentoId: ag.id,
      };
      for (const al of alunosDaTurma) {
        allNotifs.push({
          ...base,
          id: crypto.randomUUID(),
          destinatarioTipo: "aluno" as const,
          destinatarioId: al.id,
          destinatarioUserId: al.userId,
        });
      }
      if (
        planoPendente &&
        ag.professorUserId &&
        ag.atividadeIds.some((atividadeId) => aulaIds.has(atividadeId))
      ) {
        allNotifs.push({
          ...base,
          id: crypto.randomUUID(),
          destinatarioTipo: "professor" as const,
          destinatarioId: ag.professorUserId,
          destinatarioUserId: ag.professorUserId,
          titulo: "Plano de aula pendente",
          mensagem: `${mensagem} - o agendamento foi salvo sem plano. Envie ate o dia da aula para evitar critica.`,
          kind: "plano_pendente" as const,
        });
      }
    }

    // Agrupa por professor: uma notificação por professor listando todas as aulas.
    // Usa professorUserId como chave canônica — evita ambiguidade por nome.
    const porProfessorUserId = new Map<string, Agendamento[]>();
    for (const ag of novos) {
      if (!ag.professorUserId) continue;
      const list = porProfessorUserId.get(ag.professorUserId) ?? [];
      list.push(ag);
      porProfessorUserId.set(ag.professorUserId, list);
    }
    for (const [profUserId, ags] of porProfessorUserId.entries()) {
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
        // destinatarioId = userId para roteamento canônico;
        // NotificationsBell já aceita ref === userId (linha: ref === userId).
        destinatarioId: profUserId,
        destinatarioUserId: profUserId,
        titulo,
        mensagem,
        cursoId: curso.id,
        turmaId: turmaSelecionada.id,
        data: ags[0].data,
        inicio: ags[0].inicio,
        fim: ags[ags.length - 1].fim,
        professor: ags[0].professor,
        atividadeIds: Array.from(new Set(ags.flatMap((a) => a.atividadeIds))),
        criadoEm,
        lida: false,
        kind: "agendado" as const,
        // Notificação do professor é agrupada (várias aulas no mesmo dia
        // viram 1 notificação). Usamos o primeiro agendamentoId como âncora
        // de dedup; basta para evitar dupla criação no mesmo lote.
        agendamentoId: ags[0].id,
      });
    }

    await notificacoesStore.addMany(allNotifs);
  };

  // ---------- Helper: render do nome de uma atividade ----------
  const ativById = (id: string) => atividades.find((a) => a.id === id);

  // Resolve a aula do draft por ID e, como fallback, pelo código digitado.
  // Fallback torna o display/confirm imunes a qualquer race que zere
  // draftAulaId enquanto draftCodigoText ainda aponta uma aula válida.
  const draftAulaSelecionada =
    ativById(draftAulaId) ??
    atividades.find(
      (a) =>
        a.cursoId === curso.id &&
        a.tipo === 0 &&
        !isAtividadeAvulsa(a) &&
        a.codigo.toUpperCase() === draftCodigoText.trim().toUpperCase() &&
        !aulasIndisponiveisParaTurma.has(a.id),
    );
  const draftCarga = draftAulaSelecionada?.cargaHorariaMin ?? 0;
  const draftCargaWarning =
    draftCarga > duracaoAulaMin
      ? `Esta aula tem carga de ${formatMinutos(draftCarga)}; será encaixada em 1 bloco de ${formatMinutos(duracaoAulaMin)}.`
      : null;

  const totalAssigned = Object.keys(assignments).length;

  return (
    <>
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
                      {date ? format(date, "PPP", { locale: ptBR }) : "Escolher data"}
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
                  <p className="text-xs text-destructive">A turma não tem horário neste dia.</p>
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

            <div className="space-y-2">
              <Label>Professor *</Label>
              {isProfessorOnly && selectedProfessorUserId ? (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                  {professores.find((p) => p.userId === selectedProfessorUserId)?.displayName ||
                    "Professor desconhecido"}
                </div>
              ) : (
                <Select value={selectedProfessorUserId} onValueChange={setSelectedProfessorUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o professor" />
                  </SelectTrigger>
                  <SelectContent>
                    {professores.map((p) => (
                      <SelectItem key={p.userId} value={p.userId}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {professores.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum professor cadastrado.</p>
              )}
            </div>

            {/* Lista de blocos */}
            {slotAtual && totalBlocosSlot > 0 && (
              <div className="space-y-2">
                <Label>Blocos do horário</Label>
                <p className="text-xs text-muted-foreground">
                  Clique em um bloco para atribuir uma aula/tarefa. Cada bloco recebe uma atribuição
                  independente.
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
                          !ocupadoExistente &&
                            assigned &&
                            !isEditing &&
                            "border-emerald-500/50 bg-emerald-500/10",
                          !ocupadoExistente && !assigned && !isEditing && "hover:bg-accent",
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
                                <span className="text-muted-foreground">ocupado</span>
                              ) : assigned ? (
                                <span className="flex items-center gap-1.5 truncate">
                                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">
                                    {aulaA && (
                                      <span className="font-mono text-xs mr-1">{aulaA.codigo}</span>
                                    )}
                                    {aulaA?.nome ?? tarefaA?.nome ?? "(sem nome)"}
                                    {aulaA && tarefaA && (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        + {tarefaA.codigo}
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
                            {/* Seleção da aula: digitar código OU escolher no quadro */}
                            <div className="space-y-2">
                              <Label className="text-xs">Código da aula</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={draftCodigoText}
                                  onChange={(e) => applyCodigoText(e.target.value)}
                                  placeholder="Ex.: GDGD35"
                                  className="font-mono uppercase"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="shrink-0"
                                  onClick={() => setPickerOpen(true)}
                                >
                                  <BookOpen className="h-4 w-4 mr-1" />
                                  Quadro
                                </Button>
                              </div>
                              {draftAulaSelecionada ? (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                                  ✓ {draftAulaSelecionada.nome}
                                  {draftAulaSelecionada.cargaHorariaMin
                                    ? ` (${formatMinutos(draftAulaSelecionada.cargaHorariaMin)})`
                                    : ""}
                                </p>
                              ) : draftCodigoText.trim() ? (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                  Nenhuma aula disponível com este código.
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Digite o código ou clique em “Quadro” para escolher.
                                </p>
                              )}
                            </div>

                            {/* Tarefa opcional do mesmo grupo */}
                            {draftGrupo && (
                              <div className="space-y-2">
                                <Label className="text-xs">Tarefa (opcional)</Label>
                                <Select
                                  value={draftTarefaId || "__none__"}
                                  onValueChange={(v) => setDraftTarefaId(v === "__none__" ? "" : v)}
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
              <Label>Habilidades trabalhadas</Label>
              <p className="text-xs text-muted-foreground">
                Uma ou mais habilidades trabalhadas nesta aula. Aparecem no relatorio, no historico
                e na janela da turma.
              </p>
              <SkillSelector
                habilidades={habilidadesDoCurso}
                selectedIds={habilidadeIds}
                onChange={setHabilidadeIds}
              />
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <Label>Plano de aula</Label>
                  <p className="text-xs text-muted-foreground">
                    Opcional no agendamento. Se ficar pendente, o professor recebe notificacao e
                    deve enviar ate o dia da aula.
                  </p>
                </div>
                <Badge variant={planoSubmetido ? "secondary" : "outline"}>
                  {planoSubmetido
                    ? "Preenchido"
                    : aulaIdsDoPlano.length === 0
                      ? "Atribua uma aula"
                      : habilidadeIds.length === 0
                        ? "Selecione habilidades"
                        : "Pode enviar depois"}
                </Badge>
              </div>
              <Button
                type="button"
                variant={planoSubmetido ? "outline" : "default"}
                onClick={openPlanoDialog}
                disabled={!planoPodeAbrir}
              >
                <FileCheck2 className="h-4 w-4 mr-1" />
                {planoSubmetido ? "Editar plano" : "Preencher agora"}
              </Button>
            </div>

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
                <div className="text-xs uppercase text-muted-foreground mb-1">Resumo</div>
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

      {/* Picker renderizado FORA do Dialog de agendamento — Dialogs Radix
          aninhados (modal) podem engolir cliques/foco do interno. */}
      <AgendamentoPlanoDialog
        open={planoOpen}
        onOpenChange={setPlanoOpen}
        plano={planoDados}
        onPlanoChange={setPlanoDados}
        contexto={planoDraftContext}
        habilidades={habilidadesDoCurso}
        onHabilidadesChange={setHabilidadeIds}
        onSubmit={() => {
          const faltando = camposPlanoFaltando(planoDados);
          if (faltando.length > 0) {
            toast.error("Preencha os campos obrigatorios do plano.");
            return;
          }
          setPlanoSubmetido(true);
          setPlanoOpen(false);
          toast.success("Plano de aula vinculado ao agendamento.");
        }}
      />

      <QuadroAulasPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        curso={curso}
        atividades={atividades}
        turmaId={turmaSelecionada?.id}
        onSelect={(aulaId) => {
          const aula = ativById(aulaId);
          if (!aula) return;
          // Define grupo a partir da aula escolhida (mantém tarefa filtrada
          // pelo mesmo grupo). Limpa tarefa se mudou de grupo.
          if (aula.grupo !== draftGrupo) setDraftTarefaId("");
          setDraftGrupo(aula.grupo);
          setDraftAulaId(aulaId);
          setDraftCodigoText(aula.codigo);
        }}
      />
    </>
  );
}

interface AgendamentoPlanoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: PlanoAulaDados;
  onPlanoChange: (plano: PlanoAulaDados) => void;
  contexto: AulaEvidenciaContext | null;
  habilidades: ReturnType<typeof useHabilidades>;
  onHabilidadesChange: (ids: string[]) => void;
  onSubmit: () => void;
}

function AgendamentoPlanoDialog({
  open,
  onOpenChange,
  plano,
  onPlanoChange,
  contexto,
  habilidades,
  onHabilidadesChange,
  onSubmit,
}: AgendamentoPlanoDialogProps) {
  const atividadesResumo =
    contexto?.agendamento.atividadeIds
      .map((atividadeId) => contexto.atividades.find((atividade) => atividade.id === atividadeId))
      .filter((atividade): atividade is NonNullable<typeof atividade> => !!atividade)
      .map((atividade) => `${atividade.codigo} - ${atividade.nome}`)
      .join(" | ") || "Aula nao definida";

  const habilidadesSugeridas = useMemo(() => {
    if (!contexto) return habilidades;
    const ids = new Set(inferirHabilidadesIdsDoPlano(contexto, habilidades, plano));
    for (const id of plano.habilidadesIds) ids.add(id);
    const sugeridas = habilidades.filter((habilidade) => ids.has(habilidade.id));
    return sugeridas.length > 0 ? sugeridas : habilidades;
  }, [contexto, habilidades, plano]);

  const updatePlano = <K extends keyof PlanoAulaDados>(key: K, value: PlanoAulaDados[K]) => {
    onPlanoChange({ ...plano, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plano de aula</DialogTitle>
          <DialogDescription>
            Documento de estudo vinculado ao agendamento. Pode ser enviado agora ou ate o dia da
            aula.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-medium">{atividadesResumo}</div>
          {contexto && (
            <div className="mt-1 text-xs text-muted-foreground">
              {contexto.curso.nome} | {contexto.turma.nome} | {contexto.agendamento.data}{" "}
              {contexto.agendamento.inicio}-{contexto.agendamento.fim}
              {contexto.agendamento.professor ? ` | ${contexto.agendamento.professor}` : ""}
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <PlanoAgendamentoField
            id="plano-objetivos"
            label="Objetivos *"
            value={plano.objetivos}
            onChange={(value) => updatePlano("objetivos", value)}
          />
          <PlanoAgendamentoField
            id="plano-conteudo"
            label="Conteudo / ementa *"
            value={plano.conteudoEmenta}
            onChange={(value) => updatePlano("conteudoEmenta", value)}
          />
          <PlanoAgendamentoField
            id="plano-preparacao"
            label="Estudo / preparacao do professor *"
            value={plano.preparacaoProfessor}
            onChange={(value) => updatePlano("preparacaoProfessor", value)}
          />
          <PlanoAgendamentoField
            id="plano-roteiro"
            label="Roteiro *"
            value={plano.roteiro}
            onChange={(value) => updatePlano("roteiro", value)}
          />
          <PlanoAgendamentoField
            id="plano-materiais"
            label="Materiais *"
            value={plano.materiais}
            onChange={(value) => updatePlano("materiais", value)}
          />
          <PlanoAgendamentoField
            id="plano-habilidades"
            label="Dinamica de Habilidades *"
            value={plano.habilidades}
            onChange={(value) => updatePlano("habilidades", value)}
          />
          <PlanoHabilidadesCheckboxes
            habilidades={habilidadesSugeridas}
            selectedIds={plano.habilidadesIds}
            onChange={(ids) => {
              updatePlano("habilidadesIds", ids);
              onHabilidadesChange(ids);
            }}
          />
          <PlanoAgendamentoField
            id="plano-avaliacao"
            label="Forma de avaliacao *"
            value={plano.formaAvaliacao}
            onChange={(value) => updatePlano("formaAvaliacao", value)}
          />
          <PlanoAgendamentoField
            id="plano-pais"
            label="Sugestao aos pais *"
            value={plano.sugestaoPais}
            onChange={(value) => updatePlano("sugestaoPais", value)}
          />
          <div className="md:col-span-2">
            <PlanoAgendamentoField
              id="plano-observacoes"
              label="Observacoes do professor"
              value={plano.observacoesProfessor}
              onChange={(value) => updatePlano("observacoesProfessor", value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button type="button" onClick={onSubmit}>
            <FileCheck2 className="h-4 w-4 mr-1" />
            Salvar plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PlanoHabilidadesCheckboxesProps {
  habilidades: ReturnType<typeof useHabilidades>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function PlanoHabilidadesCheckboxes({
  habilidades,
  selectedIds,
  onChange,
}: PlanoHabilidadesCheckboxesProps) {
  const selected = new Set(selectedIds);

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...selectedIds, id])));
      return;
    }
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Label>Habilidades *</Label>
      {habilidades.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma habilidade foi encontrada na ementa desta aula.
        </p>
      ) : (
        <div className="grid gap-2">
          {habilidades.map((habilidade) => (
            <label
              key={habilidade.id}
              className="flex items-start gap-2 rounded-sm border bg-background/60 p-2 text-xs"
            >
              <Checkbox
                checked={selected.has(habilidade.id)}
                onCheckedChange={(value) => toggle(habilidade.id, value === true)}
                aria-label={`Selecionar habilidade ${habilidade.sigla}`}
              />
              <span className="min-w-0">
                <span className="font-medium">
                  {habilidade.sigla}
                  {habilidade.nome ? ` - ${habilidade.nome}` : ""}
                </span>
                <span className="mt-0.5 block text-muted-foreground">{habilidade.descricao}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Pre-selecionado a partir das habilidades vinculadas ou mencionadas na ementa da aula.
      </p>
    </div>
  );
}

interface PlanoAgendamentoFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

function PlanoAgendamentoField({
  id,
  label,
  value,
  onChange,
  rows = 4,
}: PlanoAgendamentoFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
      />
    </div>
  );
}
