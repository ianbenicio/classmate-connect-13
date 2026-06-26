import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SkillSelector } from "./SkillSelector";
import {
  ATIVIDADE_AVULSA_GRUPO,
  DEFAULT_FORMULARIOS,
  diaSemanaFromDate,
  type Agendamento,
  type Atividade,
  type Curso,
  type Notificacao,
  type Turma,
} from "@/lib/academic-types";
import { agendamentosStore } from "@/lib/agendamentos-store";
import { alunosStore } from "@/lib/alunos-store";
import { atividadesStore } from "@/lib/atividades-store";
import { useAuth } from "@/lib/auth";
import { useHabilidades } from "@/lib/habilidades-store";
import { notificacoesStore } from "@/lib/notificacoes-store";
import { useUsersByRole, type UserRow } from "@/lib/users-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cursos: Curso[];
  turmas: Turma[];
  agendamentos: Agendamento[];
}

const TIPOS_AVULSOS = [
  "Aula de reposição",
  "Reforço",
  "Oficina extra",
  "Avaliação",
  "Encontro com responsáveis",
  "Outro",
];

function toLocalIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function timeToMinutes(value: string): number {
  const [hh, mm] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return Number.NaN;
  return hh * 60 + mm;
}

function durationMinutes(inicio: string, fim: string): number {
  return timeToMinutes(fim) - timeToMinutes(inicio);
}

function overlaps(aInicio: string, aFim: string, bInicio: string, bFim: string): boolean {
  const startA = timeToMinutes(aInicio);
  const endA = timeToMinutes(aFim);
  const startB = timeToMinutes(bInicio);
  const endB = timeToMinutes(bFim);
  return startA < endB && startB < endA;
}

function buildCodigoAvulso(curso: Curso, data: string): string {
  const compactDate = data.replaceAll("-", "");
  const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
  return `AV-${curso.cod}-${compactDate}-${suffix}`;
}

function formatDataLabel(data: string): string {
  const [year, month, day] = data.split("-");
  return `${day}/${month}/${year}`;
}

export function AtividadeAvulsaDialog({ open, onOpenChange, cursos, turmas, agendamentos }: Props) {
  const { user, displayName, hasRole } = useAuth();
  const habilidades = useHabilidades();
  const canCreate = hasRole("admin") || hasRole("coordenacao") || hasRole("professor");
  const professorOnly = hasRole("professor") && !hasRole("admin") && !hasRole("coordenacao");
  const professoresDoBanco = useUsersByRole("professor", { enabled: open && !professorOnly });
  const professorLogado = useMemo<UserRow | null>(() => {
    if (!professorOnly || !user?.id) return null;
    return {
      userId: user.id,
      displayName: displayName || user.email || "Professor",
      email: user.email ?? null,
      roles: ["professor"],
      criadoEm: "",
      ativo: true,
    };
  }, [displayName, professorOnly, user?.email, user?.id]);
  const professores = useMemo(
    () => (professorOnly && professorLogado ? [professorLogado] : professoresDoBanco),
    [professorLogado, professorOnly, professoresDoBanco],
  );
  const firstProfessorUserId = professores[0]?.userId ?? "";
  const today = toLocalIsoDate(new Date());

  const [cursoId, setCursoId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [professorUserId, setProfessorUserId] = useState("");
  const [tipo, setTipo] = useState(TIPOS_AVULSOS[0]);
  const [titulo, setTitulo] = useState("Aula de reposição");
  const [descricao, setDescricao] = useState("");
  const [dataInput, setDataInput] = useState(today);
  const [datas, setDatas] = useState<string[]>([today]);
  const [inicio, setInicio] = useState("09:00");
  const [fim, setFim] = useState("10:00");
  const [habilidadeIds, setHabilidadeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const cursoSelecionado = useMemo(
    () => cursos.find((curso) => curso.id === cursoId) ?? null,
    [cursoId, cursos],
  );

  const turmasDoCurso = useMemo(
    () =>
      cursoSelecionado
        ? turmas
            .filter((turma) => turma.cursoId === cursoSelecionado.id)
            .sort((a, b) => a.cod.localeCompare(b.cod))
        : [],
    [cursoSelecionado, turmas],
  );

  const turmaSelecionada = useMemo(
    () => turmasDoCurso.find((turma) => turma.id === turmaId) ?? null,
    [turmaId, turmasDoCurso],
  );

  const professorSelecionado = useMemo(
    () => professores.find((professor) => professor.userId === professorUserId) ?? null,
    [professorUserId, professores],
  );
  const professorResponsavel = useMemo(() => {
    if (professorSelecionado) {
      return {
        userId: professorSelecionado.userId,
        displayName: professorSelecionado.displayName,
      };
    }
    if (professorOnly && user?.id) {
      return {
        userId: user.id,
        displayName: displayName || user.email || "Professor",
      };
    }
    return null;
  }, [displayName, professorOnly, professorSelecionado, user?.email, user?.id]);

  const habilidadesDoCurso = useMemo(() => {
    const ids = new Set(cursoSelecionado?.habilidadeIds ?? []);
    const filtradas = habilidades.filter((habilidade) => ids.has(habilidade.id));
    return filtradas.length > 0 ? filtradas : habilidades;
  }, [cursoSelecionado?.habilidadeIds, habilidades]);

  useEffect(() => {
    if (!open) return;
    const firstCursoId = cursos[0]?.id ?? "";
    const firstTurma = turmas.find((turma) => turma.cursoId === firstCursoId);
    setCursoId(firstCursoId);
    setTurmaId(firstTurma?.id ?? "");
    setProfessorUserId(professorOnly && user?.id ? user.id : firstProfessorUserId);
    setTipo(TIPOS_AVULSOS[0]);
    setTitulo("Aula de reposição");
    setDescricao("");
    setDataInput(today);
    setDatas([today]);
    setInicio(firstTurma?.horarios[0]?.inicio ?? "09:00");
    setFim(firstTurma?.horarios[0]?.fim ?? "10:00");
    setHabilidadeIds([]);
    setSaving(false);
  }, [cursos, firstProfessorUserId, open, professorOnly, today, turmas, user?.id]);

  useEffect(() => {
    if (!open || professorUserId) return;
    if (professorOnly && user?.id) {
      setProfessorUserId(user.id);
      return;
    }
    if (firstProfessorUserId) setProfessorUserId(firstProfessorUserId);
  }, [firstProfessorUserId, open, professorOnly, professorUserId, user?.id]);

  useEffect(() => {
    if (!open || !cursoSelecionado) return;
    setTurmaId((current) =>
      turmasDoCurso.some((turma) => turma.id === current) ? current : (turmasDoCurso[0]?.id ?? ""),
    );
  }, [cursoSelecionado, open, turmasDoCurso]);

  useEffect(() => {
    if (!open || !turmaSelecionada) return;
    const firstSlot = turmaSelecionada.horarios[0];
    if (!firstSlot) return;
    setInicio((current) => current || firstSlot.inicio);
    setFim((current) => current || firstSlot.fim);
  }, [open, turmaSelecionada]);

  const addData = () => {
    if (!dataInput) {
      toast.error("Selecione uma data.");
      return;
    }
    if (dataInput < today) {
      toast.error("Não é possível agendar em datas passadas.");
      return;
    }
    if (datas.includes(dataInput)) {
      toast.info("Esta data já foi adicionada.");
      return;
    }
    setDatas((current) => [...current, dataInput].sort());
  };

  const removeData = (data: string) => {
    setDatas((current) => current.filter((item) => item !== data));
  };

  const findConflict = () => {
    if (!turmaSelecionada) return null;
    return agendamentos.find(
      (agendamento) =>
        agendamento.turmaId === turmaSelecionada.id &&
        datas.includes(agendamento.data) &&
        overlaps(inicio, fim, agendamento.inicio, agendamento.fim),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate) {
      toast.error("Você não tem permissão para criar atividade avulsa.");
      return;
    }
    if (!cursoSelecionado || !turmaSelecionada) {
      toast.error("Selecione curso e turma.");
      return;
    }
    if (!professorResponsavel) {
      toast.error("Selecione o professor responsável.");
      return;
    }
    const cleanTitulo = titulo.trim();
    if (!cleanTitulo) {
      toast.error("Informe o título da atividade.");
      return;
    }
    if (datas.length === 0) {
      toast.error("Adicione ao menos uma data.");
      return;
    }
    const duracao = durationMinutes(inicio, fim);
    if (!Number.isFinite(duracao) || duracao <= 0) {
      toast.error("O horário final deve ser maior que o inicial.");
      return;
    }
    const conflict = findConflict();
    if (conflict) {
      toast.error(
        `Já existe agendamento para esta turma em ${conflict.data} ${conflict.inicio}-${conflict.fim}.`,
      );
      return;
    }

    setSaving(true);
    try {
      await alunosStore.ensureInit();
      await notificacoesStore.ensureInit();

      const criadoEm = new Date().toISOString();
      const criadoPorNome = displayName || user?.email || "";
      const alunosDaTurma = alunosStore
        .getAll()
        .filter((aluno) => aluno.turmaId === turmaSelecionada.id);
      const created: Array<{ atividade: Atividade; agendamento: Agendamento }> = [];

      for (const data of datas) {
        const atividadeId = crypto.randomUUID();
        const codigo = buildCodigoAvulso(cursoSelecionado, data);
        const atividade: Atividade = {
          id: atividadeId,
          tipo: 0,
          nome: cleanTitulo,
          codigo,
          cursoId: cursoSelecionado.id,
          grupo: ATIVIDADE_AVULSA_GRUPO,
          descricao: descricao.trim() || `${tipo} avulsa registrada no calendario.`,
          objetivoResultados: descricao.trim() || cleanTitulo,
          prazo: data,
          criadoPor: criadoPorNome,
          professor: professorResponsavel.displayName,
          professorUserId: professorResponsavel.userId,
          habilidadeIds,
          descricaoConteudo: descricao.trim() || undefined,
          sugestoesPais: descricao.trim() || undefined,
          resultadosEsperados: descricao.trim() || undefined,
          notasInstrutor: `${tipo} criada pelo calendario como atividade avulsa.`,
          formularios: DEFAULT_FORMULARIOS,
          cargaHorariaMin: duracao,
        };
        const agendamento: Agendamento = {
          id: crypto.randomUUID(),
          turmaId: turmaSelecionada.id,
          data,
          diaSemana: diaSemanaFromDate(new Date(`${data}T00:00:00`)),
          inicio,
          fim,
          slotInicio: inicio,
          slotFim: fim,
          blocoIndex: 0,
          blocosTotal: 1,
          atividadeIds: [atividadeId],
          habilidadeIds: habilidadeIds.length > 0 ? habilidadeIds : undefined,
          status: "pendente",
          criadoEm,
          observacao: `${tipo}: ${descricao.trim() || cleanTitulo}`,
          professor: professorResponsavel.displayName,
          professorUserId: professorResponsavel.userId,
          criadoPorUserId: user?.id,
          criadoPorNome,
          origem: "professor",
        };

        await atividadesStore.upsert(atividade);
        await agendamentosStore.add(agendamento);
        created.push({ atividade, agendamento });
      }

      const notificacoes: Notificacao[] = [];
      for (const { atividade, agendamento } of created) {
        const mensagemBase = `${cursoSelecionado.nome} · ${turmaSelecionada.nome} · ${formatDataLabel(
          agendamento.data,
        )} ${agendamento.inicio}-${agendamento.fim} · ${atividade.nome}`;
        for (const aluno of alunosDaTurma) {
          notificacoes.push({
            id: crypto.randomUUID(),
            destinatarioTipo: "aluno",
            destinatarioId: aluno.id,
            destinatarioUserId: aluno.userId,
            titulo: `${tipo} agendada`,
            mensagem: mensagemBase,
            cursoId: cursoSelecionado.id,
            turmaId: turmaSelecionada.id,
            data: agendamento.data,
            inicio: agendamento.inicio,
            fim: agendamento.fim,
            professor: agendamento.professor,
            atividadeIds: agendamento.atividadeIds,
            criadoEm,
            lida: false,
            agendamentoId: agendamento.id,
          });
        }
        notificacoes.push({
          id: crypto.randomUUID(),
          destinatarioTipo: "professor",
          destinatarioId: professorResponsavel.userId,
          destinatarioUserId: professorResponsavel.userId,
          titulo: `${tipo} agendada`,
          mensagem: mensagemBase,
          cursoId: cursoSelecionado.id,
          turmaId: turmaSelecionada.id,
          data: agendamento.data,
          inicio: agendamento.inicio,
          fim: agendamento.fim,
          professor: agendamento.professor,
          atividadeIds: agendamento.atividadeIds,
          criadoEm,
          lida: false,
          kind: "agendado",
          agendamentoId: agendamento.id,
        });
      }
      await notificacoesStore.addMany(notificacoes);

      toast.success(
        created.length === 1
          ? "Atividade avulsa agendada."
          : `${created.length} atividades avulsas agendadas.`,
      );
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Atividade avulsa
          </DialogTitle>
          <DialogDescription>
            Crie reposições, reforços ou encontros extras sem alterar o cronograma oficial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Curso *</Label>
              <Select value={cursoId} onValueChange={setCursoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {cursos.map((curso) => (
                    <SelectItem key={curso.id} value={curso.id}>
                      {curso.cod} - {curso.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Turma *</Label>
              <Select
                value={turmaId}
                onValueChange={setTurmaId}
                disabled={turmasDoCurso.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {turmasDoCurso.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.cod} - {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_AVULSOS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Professor responsável *</Label>
              {professorOnly && professorUserId ? (
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  {professorResponsavel?.displayName ?? displayName}
                </div>
              ) : (
                <Select value={professorUserId} onValueChange={setProfessorUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {professores.map((professor) => (
                      <SelectItem key={professor.userId} value={professor.userId}>
                        {professor.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ex.: Reposição de fundamentos"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label>Datas *</Label>
              <Input
                type="date"
                value={dataInput}
                min={today}
                onChange={(event) => setDataInput(event.target.value)}
              />
            </div>
            <Button type="button" variant="outline" onClick={addData}>
              Adicionar data
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {datas.map((data) => (
              <Badge key={data} variant="secondary" className="gap-1">
                {formatDataLabel(data)}
                <button
                  type="button"
                  onClick={() => removeData(data)}
                  className="hover:text-destructive"
                  aria-label={`Remover ${formatDataLabel(data)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {datas.length === 0 && (
              <span className="text-sm text-muted-foreground">Nenhuma data adicionada</span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Início *</Label>
              <Input
                type="time"
                value={inicio}
                onChange={(event) => setInicio(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fim *</Label>
              <Input type="time" value={fim} onChange={(event) => setFim(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Habilidades trabalhadas</Label>
            <SkillSelector
              habilidades={habilidadesDoCurso}
              selectedIds={habilidadeIds}
              onChange={setHabilidadeIds}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              rows={3}
              placeholder="Objetivo, contexto da reposição, conteúdo ou observações para o professor."
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5" />
              Resumo
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {datas.length} data(s) · {durationMinutes(inicio, fim)} min ·{" "}
              {turmaSelecionada?.nome ?? "turma não selecionada"}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !canCreate}>
              {saving ? "Salvando..." : "Agendar atividade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
