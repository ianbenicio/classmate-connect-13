import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillSelector } from "./SkillSelector";
import { FieldVisibilityBadge } from "./FieldVisibilityBadge";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  formatCodigoAtividade,
  getDuracaoAulaMin,
  DEFAULT_FORMULARIOS,
  FIELD_VISIBILITY,
  MAX_HABILIDADES_POR_ATIVIDADE,
  type Atividade,
  type AtividadeTipo,
  type Curso,
  type Grupo,
  type Habilidade,
  type FormulariosConfig,
  type RoteiroBloco,
  type MaterialAula,
  type CriterioAvaliacao,
  type HabilidadeNivelAlvo,
} from "@/lib/academic-types";
import { useAuth } from "@/lib/auth";
import { useUsersByRole } from "@/lib/users-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cursos: Curso[];
  grupos: Record<string, Grupo[]>;
  habilidades: Habilidade[];
  editing?: Atividade;
  defaultTipo?: AtividadeTipo;
  onSave: (atividade: Atividade) => void;
}

/** Pequeno wrapper: Label + badge de visibilidade. */
function FieldLabel({
  children,
  field,
  required,
}: {
  children: React.ReactNode;
  field: keyof typeof FIELD_VISIBILITY;
  required?: boolean;
}) {
  const vis = FIELD_VISIBILITY[field];
  return (
    <div className="flex items-center gap-2">
      <Label>
        {children}
        {required && " *"}
      </Label>
      {vis && <FieldVisibilityBadge visibility={vis} />}
    </div>
  );
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  cursos,
  grupos,
  habilidades,
  editing,
  defaultTipo = 0,
  onSave,
}: Props) {
  const isEdit = !!editing;
  const { user: authUser, displayName } = useAuth();

  // Identificação
  const [tipo, setTipo] = useState<AtividadeTipo>(defaultTipo);
  const [nome, setNome] = useState("");
  const [cursoId, setCursoId] = useState(cursos[0]?.id ?? "");
  const [grupo, setGrupo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [professor, setProfessor] = useState("");
  const [professorUserId, setProfessorUserId] = useState<string | undefined>();
  const [cargaHoras, setCargaHoras] = useState("0");
  const [cargaMin, setCargaMin] = useState("0");

  // Pedagógico
  const [objetivoResultados, setObjetivoResultados] = useState("");
  const [resultadosEsperados, setResultadosEsperados] = useState("");
  const [notasInstrutor, setNotasInstrutor] = useState("");
  const [habilidadeIds, setHabilidadeIds] = useState<string[]>([]);
  const [niveisAlvo, setNiveisAlvo] = useState<HabilidadeNivelAlvo[]>([]);
  const [preRequisitos, setPreRequisitos] = useState("");
  const [criteriosSucesso, setCriteriosSucesso] = useState("");

  // Conteúdo & Materiais
  const [descricaoConteudo, setDescricaoConteudo] = useState("");
  const [metodologias, setMetodologias] = useState("");
  const [roteiro, setRoteiro] = useState<RoteiroBloco[]>([]);
  const [materiais, setMateriais] = useState<MaterialAula[]>([]);
  const [referencias, setReferencias] = useState("");

  // Avaliação & Formulários
  const [formularios, setFormularios] = useState<FormulariosConfig>(DEFAULT_FORMULARIOS);
  const [rubricas, setRubricas] = useState<CriterioAvaliacao[]>([]);

  // Pais / Tarefa
  const [sugestoesPais, setSugestoesPais] = useState("");
  const [instrucoes, setInstrucoes] = useState("");

  const [tab, setTab] = useState("identificacao");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTipo(editing.tipo);
      setNome(editing.nome);
      setCursoId(editing.cursoId);
      setGrupo(editing.grupo);
      setPrazo(editing.prazo);
      setDescricao(editing.descricao);
      setProfessor(editing.professor ?? "");
      setProfessorUserId(editing.professorUserId ?? undefined);
      const carga = editing.cargaHorariaMin ?? 0;
      setCargaHoras(String(Math.floor(carga / 60)));
      setCargaMin(String(carga % 60));
      setObjetivoResultados(editing.objetivoResultados);
      setResultadosEsperados(editing.resultadosEsperados ?? "");
      setNotasInstrutor(editing.notasInstrutor ?? "");
      setHabilidadeIds(editing.habilidadeIds);
      setNiveisAlvo(editing.niveisAlvo ?? []);
      setPreRequisitos(editing.preRequisitos ?? "");
      setCriteriosSucesso(editing.criteriosSucesso ?? "");
      setDescricaoConteudo(editing.descricaoConteudo ?? "");
      setMetodologias(editing.metodologias ?? "");
      setRoteiro(editing.roteiro ?? []);
      setMateriais(editing.materiais ?? []);
      setReferencias(editing.referencias ?? "");
      setFormularios({
        ...DEFAULT_FORMULARIOS,
        ...(editing.formularios ?? {}),
        // Aulas: forçar sempre ON
        relatorioProfessor: editing.tipo === 0 ? true : (editing.formularios?.relatorioProfessor ?? true),
        autoavaliacaoAluno: editing.tipo === 0 ? true : (editing.formularios?.autoavaliacaoAluno ?? false),
      });
      setRubricas(editing.rubricas ?? []);
      setSugestoesPais(editing.sugestoesPais ?? "");
      setInstrucoes(editing.instrucoes ?? "");
    } else {
      setTipo(defaultTipo);
      setNome("");
      const cursoPadrao = cursos[0];
      setCursoId(cursoPadrao?.id ?? "");
      setGrupo("");
      setPrazo("");
      setDescricao("");
      setProfessor("");
      setProfessorUserId(undefined);
      // Aulas novas: pré-preenche carga com a duração padrão do curso (pode
      // ser alterada). Tarefas continuam com 0 (livre).
      if (defaultTipo === 0 && cursoPadrao) {
        const dur = getDuracaoAulaMin(cursoPadrao);
        setCargaHoras(String(Math.floor(dur / 60)));
        setCargaMin(String(dur % 60));
      } else {
        setCargaHoras("0");
        setCargaMin("0");
      }
      setObjetivoResultados("");
      setResultadosEsperados("");
      setNotasInstrutor("");
      setHabilidadeIds([]);
      setNiveisAlvo([]);
      setPreRequisitos("");
      setCriteriosSucesso("");
      setDescricaoConteudo("");
      setMetodologias("");
      setRoteiro([]);
      setMateriais([]);
      setReferencias("");
      setFormularios({
        ...DEFAULT_FORMULARIOS,
        relatorioProfessor: true,
        autoavaliacaoAluno: defaultTipo === 0 ? true : false,
      });
      setRubricas([]);
      setSugestoesPais("");
      setInstrucoes("");
    }
    setTab("identificacao");
    // ATENÇÃO: NÃO inclua `cursos` nas deps. `useCursos()` retorna novo array
    // a cada emit do store (subscribe), e qualquer ação distante (load de
    // alunos, mudança de turma, etc.) gera um emit. Se `cursos` estiver nas
    // deps, este effect dispara fora do mount/abertura e RESETA tipo, aba,
    // cursoId, todos os campos — o que aparenta "abre e volta pra Ident.",
    // "não muda Aula→Tarefa" e "não reflete o curso selecionado".
    // O effect deve rodar só ao abrir o diálogo ou trocar `editing`/`defaultTipo`.
    // `cursos[0]` é lido dentro do effect, não precisa estar no array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, defaultTipo]);

  // Sincroniza niveisAlvo quando habilidades mudam (mantém o que ainda é válido)
  useEffect(() => {
    setNiveisAlvo((prev) => {
      const filtered = prev.filter((n) => habilidadeIds.includes(n.habilidadeId));
      const novos = habilidadeIds
        .filter((id) => !filtered.some((n) => n.habilidadeId === id))
        .map((id) => ({ habilidadeId: id, nivelAlvo: 3 }));
      return [...filtered, ...novos];
    });
  }, [habilidadeIds]);

  const cursoSelecionado = cursos.find((c) => c.id === cursoId);

  // Quando o usuário muda o curso ou alterna p/ Aula numa atividade nova,
  // pré-preenche a carga horária com a duração padrão de aula do curso.
  // Em edição, não mexemos no que foi salvo.
  useEffect(() => {
    if (!open || isEdit) return;
    if (tipo !== 0 || !cursoSelecionado) return;
    const dur = getDuracaoAulaMin(cursoSelecionado);
    setCargaHoras(String(Math.floor(dur / 60)));
    setCargaMin(String(dur % 60));
  }, [open, isEdit, tipo, cursoSelecionado]);

  // Lookup robusto: tenta curso.cod primeiro (chave canônica), cai pro id
  // como fallback. Necessário porque cursos antigos podem ter UUID arbitrário.
  const gruposDisponiveis =
    (cursoSelecionado && grupos[cursoSelecionado.cod]) ?? grupos[cursoId] ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cursoId || (!isEdit && !grupo) || !descricao) {
      toast.error("Preencha os campos obrigatórios na aba Identificação.");
      setTab("identificacao");
      return;
    }
    if (!isEdit && !cursoSelecionado) {
      toast.error("Curso inválido — selecione um curso da lista.");
      setTab("identificacao");
      return;
    }
    if (habilidadeIds.length > MAX_HABILIDADES_POR_ATIVIDADE) {
      toast.error(
        `Máximo de ${MAX_HABILIDADES_POR_ATIVIDADE} habilidades por atividade.`,
      );
      setTab("pedagogico");
      return;
    }

    const tipoFinal: AtividadeTipo = isEdit ? editing!.tipo : tipo;
    const isAula = tipoFinal === 0;

    const formulariosFinais: FormulariosConfig = isAula
      ? { ...formularios, relatorioProfessor: true, autoavaliacaoAluno: true }
      : formularios;

    const cargaHorariaMinFinal =
      (parseInt(cargaHoras || "0", 10) || 0) * 60 +
      (parseInt(cargaMin || "0", 10) || 0);

    const atividade: Atividade = isEdit
      ? {
          ...editing!,
          nome,
          prazo,
          descricao,
          objetivoResultados,
          professor: professor.trim(),
          professorUserId: professorUserId ?? undefined,
          habilidadeIds,
          cargaHorariaMin: cargaHorariaMinFinal,
          // Aula
          descricaoConteudo: isAula ? descricaoConteudo : undefined,
          sugestoesPais: isAula ? sugestoesPais : undefined,
          resultadosEsperados: isAula ? resultadosEsperados || undefined : undefined,
          notasInstrutor: isAula ? notasInstrutor || undefined : undefined,
          preRequisitos: isAula ? preRequisitos || undefined : undefined,
          niveisAlvo: isAula ? niveisAlvo : undefined,
          criteriosSucesso: isAula ? criteriosSucesso || undefined : undefined,
          metodologias: isAula ? metodologias || undefined : undefined,
          roteiro: isAula ? roteiro : undefined,
          materiais: isAula ? materiais : undefined,
          referencias: isAula ? referencias || undefined : undefined,
          formularios: isAula ? formulariosFinais : undefined,
          rubricas: isAula ? rubricas : undefined,
          // Tarefa
          instrucoes: !isAula ? instrucoes : undefined,
        }
      : {
          id: crypto.randomUUID(),
          tipo: tipoFinal,
          nome,
          codigo: formatCodigoAtividade(
            cursoSelecionado!.cod,
            grupo,
            Math.floor(Math.random() * 90) + 10,
          ),
          cursoId,
          grupo,
          descricao,
          objetivoResultados,
          prazo,
          criadoPor: displayName || authUser?.email || "",
          professor: professor.trim(),
          professorUserId: professorUserId ?? undefined,
          habilidadeIds,
          cargaHorariaMin: cargaHorariaMinFinal,
          descricaoConteudo: isAula ? descricaoConteudo : undefined,
          sugestoesPais: isAula ? sugestoesPais : undefined,
          resultadosEsperados: isAula ? resultadosEsperados || undefined : undefined,
          notasInstrutor: isAula ? notasInstrutor || undefined : undefined,
          preRequisitos: isAula ? preRequisitos || undefined : undefined,
          niveisAlvo: isAula ? niveisAlvo : undefined,
          criteriosSucesso: isAula ? criteriosSucesso || undefined : undefined,
          metodologias: isAula ? metodologias || undefined : undefined,
          roteiro: isAula ? roteiro : undefined,
          materiais: isAula ? materiais : undefined,
          referencias: isAula ? referencias || undefined : undefined,
          formularios: isAula ? formulariosFinais : undefined,
          rubricas: isAula ? rubricas : undefined,
          instrucoes: !isAula ? instrucoes : undefined,
        };

    onSave(atividade);
    toast.success(isEdit ? "Atividade atualizada!" : "Atividade criada!");
    onOpenChange(false);
  };

  const tipoAtual = isEdit ? editing!.tipo : tipo;
  const isAula = tipoAtual === 0;

  // ---------- Helpers de listas dinâmicas ----------
  const addRoteiro = () =>
    setRoteiro((r) => [
      ...r,
      { id: crypto.randomUUID(), titulo: "", duracaoMin: undefined, descricao: "" },
    ]);
  const updRoteiro = (id: string, patch: Partial<RoteiroBloco>) =>
    setRoteiro((r) => r.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const delRoteiro = (id: string) => setRoteiro((r) => r.filter((b) => b.id !== id));

  const addMaterial = () =>
    setMateriais((m) => [
      ...m,
      { id: crypto.randomUUID(), tipo: "link", titulo: "", url: "" },
    ]);
  const updMaterial = (id: string, patch: Partial<MaterialAula>) =>
    setMateriais((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const delMaterial = (id: string) => setMateriais((m) => m.filter((x) => x.id !== id));

  const addRubrica = () =>
    setRubricas((r) => [...r, { id: crypto.randomUUID(), descricao: "", peso: 1 }]);
  const updRubrica = (id: string, patch: Partial<CriterioAvaliacao>) =>
    setRubricas((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const delRubrica = (id: string) => setRubricas((r) => r.filter((x) => x.id !== id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Atividade" : "Nova Atividade"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAula ? (
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="identificacao" className="text-xs">📌 Ident.</TabsTrigger>
                <TabsTrigger value="pedagogico" className="text-xs">🎯 Pedag.</TabsTrigger>
                <TabsTrigger value="conteudo" className="text-xs">📚 Conteúdo</TabsTrigger>
                <TabsTrigger value="avaliacao" className="text-xs">📝 Avaliação</TabsTrigger>
                <TabsTrigger value="pais" className="text-xs">👨‍👩 Pais</TabsTrigger>
              </TabsList>

              {/* ============ IDENTIFICAÇÃO ============ */}
              <TabsContent value="identificacao" className="space-y-4">
                <IdentificacaoFields
                  isEdit={isEdit}
                  editing={editing}
                  tipo={tipo}
                  setTipo={setTipo}
                  nome={nome}
                  setNome={setNome}
                  cursoId={cursoId}
                  setCursoId={setCursoId}
                  grupo={grupo}
                  setGrupo={setGrupo}
                  cursos={cursos}
                  gruposDisponiveis={gruposDisponiveis}
                  professor={professor}
                  setProfessor={setProfessor}
                  professorUserId={professorUserId}
                  setProfessorUserId={setProfessorUserId}
                  prazo={prazo}
                  setPrazo={setPrazo}
                  descricao={descricao}
                  setDescricao={setDescricao}
                  cargaHoras={cargaHoras}
                  setCargaHoras={setCargaHoras}
                  cargaMin={cargaMin}
                  setCargaMin={setCargaMin}
                />
              </TabsContent>

              {/* ============ PEDAGÓGICO ============ */}
              <TabsContent value="pedagogico" className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel field="objetivoResultados">Objetivo</FieldLabel>
                  <Textarea
                    value={objetivoResultados}
                    onChange={(e) => setObjetivoResultados(e.target.value)}
                    rows={2}
                    placeholder="O propósito pedagógico desta aula"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel field="resultadosEsperados">Resultados Esperados e Benefícios</FieldLabel>
                  <Textarea
                    value={resultadosEsperados}
                    onChange={(e) => setResultadosEsperados(e.target.value)}
                    rows={10}
                    placeholder={`Para os alunos:\n- ...\n\nPara os pais/responsáveis:\n- ...\n\nPara a instituição:\n- ...`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use as seções <strong>Para os alunos</strong>, <strong>Para os pais/responsáveis</strong> e <strong>Para a instituição</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <FieldLabel field="preRequisitos">Pré-requisitos</FieldLabel>
                  <Input
                    value={preRequisitos}
                    onChange={(e) => setPreRequisitos(e.target.value)}
                    placeholder="Ex.: GPCA01, GPCA02"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel field="criteriosSucesso">Critérios de Sucesso</FieldLabel>
                  <Textarea
                    value={criteriosSucesso}
                    onChange={(e) => setCriteriosSucesso(e.target.value)}
                    rows={2}
                    placeholder="O que o aluno deve conseguir fazer ao final da aula"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel field="notasInstrutor">Notas para o Instrutor</FieldLabel>
                  <Textarea
                    value={notasInstrutor}
                    onChange={(e) => setNotasInstrutor(e.target.value)}
                    rows={6}
                    placeholder={`Linguagem: ...\nMediação: ...\nSensibilidade: ...\nConexão com família: ...\nRegistro: ...`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Orientações sobre <strong>Linguagem</strong>, <strong>Mediação</strong>, <strong>Sensibilidade</strong>, <strong>Conexão com família</strong> e <strong>Registro</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <FieldLabel field="habilidadeIds">
                    Habilidades Trabalhadas
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Escolha até <strong>{MAX_HABILIDADES_POR_ATIVIDADE}</strong>{" "}
                    habilidades.
                  </p>
                  <SkillSelector
                    habilidades={habilidades}
                    selectedIds={habilidadeIds}
                    onChange={(ids) => {
                      if (ids.length > MAX_HABILIDADES_POR_ATIVIDADE) {
                        toast.error(
                          `Máximo de ${MAX_HABILIDADES_POR_ATIVIDADE} habilidades.`,
                        );
                        return;
                      }
                      setHabilidadeIds(ids);
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {habilidadeIds.length}/{MAX_HABILIDADES_POR_ATIVIDADE}{" "}
                    selecionadas
                  </p>
                </div>

                {habilidadeIds.length > 0 && (
                  <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                    <FieldLabel field="niveisAlvo">Nível-alvo por Habilidade (1–5)</FieldLabel>
                    <p className="text-xs text-muted-foreground">
                      1=Nunca ouvi falar · 2=Conheço · 3=Sei aplicar · 4=Domino · 5=Posso ensinar
                    </p>
                    <div className="space-y-2">
                      {niveisAlvo.map((n) => {
                        const hab = habilidades.find((h) => h.id === n.habilidadeId);
                        return (
                          <div key={n.habilidadeId} className="flex items-center gap-2">
                            <span className="flex-1 text-sm">
                              <span className="font-mono text-xs mr-2">{hab?.sigla}</span>
                              {hab?.descricao}
                            </span>
                            <Select
                              value={String(n.nivelAlvo)}
                              onValueChange={(v) =>
                                setNiveisAlvo((prev) =>
                                  prev.map((x) =>
                                    x.habilidadeId === n.habilidadeId
                                      ? { ...x, nivelAlvo: Number(v) }
                                      : x,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                  <SelectItem key={lvl} value={String(lvl)}>
                                    {lvl}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ============ CONTEÚDO & MATERIAIS ============ */}
              <TabsContent value="conteudo" className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel field="descricaoConteudo">Descrição de Conteúdo</FieldLabel>
                  <Textarea
                    value={descricaoConteudo}
                    onChange={(e) => setDescricaoConteudo(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel field="metodologias">Metodologias</FieldLabel>
                  <Textarea
                    value={metodologias}
                    onChange={(e) => setMetodologias(e.target.value)}
                    rows={4}
                    placeholder="Ex.: aula expositiva dialogada, aprendizagem baseada em problemas, gamificação, estudo de caso, prática supervisionada..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FieldLabel field="roteiro">Roteiro da Aula</FieldLabel>
                    <Button type="button" size="sm" variant="outline" onClick={addRoteiro}>
                      <Plus className="h-3 w-3 mr-1" /> Bloco
                    </Button>
                  </div>
                  {roteiro.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Sem blocos. Adicione etapas com tempo estimado.</p>
                  )}
                  {roteiro.map((b, i) => (
                    <div key={b.id} className="rounded-md border p-3 space-y-2 bg-card">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}.</span>
                        <Input
                          placeholder="Título do bloco"
                          value={b.titulo}
                          onChange={(e) => updRoteiro(b.id, { titulo: e.target.value })}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="min"
                          value={b.duracaoMin ?? ""}
                          onChange={(e) =>
                            updRoteiro(b.id, {
                              duracaoMin: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-20"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => delRoteiro(b.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Descrição (opcional)"
                        value={b.descricao ?? ""}
                        onChange={(e) => updRoteiro(b.id, { descricao: e.target.value })}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FieldLabel field="materiais">Materiais Necessários</FieldLabel>
                    <Button type="button" size="sm" variant="outline" onClick={addMaterial}>
                      <Plus className="h-3 w-3 mr-1" /> Material
                    </Button>
                  </div>
                  {materiais.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 rounded-md border p-2 bg-card">
                      <Select
                        value={m.tipo}
                        onValueChange={(v) => updMaterial(m.id, { tipo: v as MaterialAula["tipo"] })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">🔗 Link</SelectItem>
                          <SelectItem value="arquivo">📄 Arquivo</SelectItem>
                          <SelectItem value="software">💻 Software</SelectItem>
                          <SelectItem value="fisico">📦 Físico</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Título"
                        value={m.titulo}
                        onChange={(e) => updMaterial(m.id, { titulo: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        placeholder="URL (opcional)"
                        value={m.url ?? ""}
                        onChange={(e) => updMaterial(m.id, { url: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => delMaterial(m.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <FieldLabel field="referencias">Referências</FieldLabel>
                  <Textarea
                    value={referencias}
                    onChange={(e) => setReferencias(e.target.value)}
                    rows={2}
                    placeholder="Vídeos, artigos, livros para aprofundar"
                  />
                </div>
              </TabsContent>

              {/* ============ AVALIAÇÃO & FORMULÁRIOS ============ */}
              <TabsContent value="avaliacao" className="space-y-4">
                <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                  <FieldLabel field="formularios">Formulários a disparar nesta aula</FieldLabel>
                  <FormularioCheckbox
                    checked={true}
                    onChange={() => {}}
                    label="📋 Relatório do Professor"
                    desc="Obrigatório em toda aula. Pós-aula, dentro de 24h."
                    locked
                  />
                  <FormularioCheckbox
                    checked={true}
                    onChange={() => {}}
                    label="🎓 Autoavaliação do Aluno"
                    desc="Obrigatório em toda aula. Aluno avalia o que aprendeu (carinha + texto curto)."
                    locked
                  />
                  <FormularioCheckbox
                    checked={formularios.diagnosticoPre}
                    onChange={(v) => setFormularios((f) => ({ ...f, diagnosticoPre: v }))}
                    label="📊 Diagnóstico PRÉ"
                    desc="Marque se for a 1ª aula do módulo. Sugere tarefa para coordenação aprovar."
                  />
                  <FormularioCheckbox
                    checked={formularios.diagnosticoPos}
                    onChange={(v) => setFormularios((f) => ({ ...f, diagnosticoPos: v }))}
                    label="📈 Diagnóstico PÓS"
                    desc="Marque se for a última aula do módulo. Compara com o PRÉ."
                  />
                  <FormularioCheckbox
                    checked={formularios.perfilAluno}
                    onChange={(v) => setFormularios((f) => ({ ...f, perfilAluno: v }))}
                    label="👤 Perfil do Aluno"
                    desc="Disparo manual. Use na entrada do aluno ou quando solicitado."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FieldLabel field="rubricas">Rubricas / Critérios de Avaliação</FieldLabel>
                    <Button type="button" size="sm" variant="outline" onClick={addRubrica}>
                      <Plus className="h-3 w-3 mr-1" /> Critério
                    </Button>
                  </div>
                  {rubricas.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Sem critérios. Adicione descritores que orientam o relatório do professor.
                    </p>
                  )}
                  {rubricas.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-md border p-2 bg-card">
                      <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}.</span>
                      <Input
                        placeholder="Descrição do critério"
                        value={r.descricao}
                        onChange={(e) => updRubrica(r.id, { descricao: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="peso"
                        value={r.peso ?? ""}
                        onChange={(e) =>
                          updRubrica(r.id, {
                            peso: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-20"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => delRubrica(r.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ============ PAIS ============ */}
              <TabsContent value="pais" className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel field="sugestoesPais">Sugestões para Pais</FieldLabel>
                  <Textarea
                    value={sugestoesPais}
                    onChange={(e) => setSugestoesPais(e.target.value)}
                    rows={4}
                    placeholder="O que pais podem fazer em casa para reforçar esta aula"
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            // ===== TIPO = TAREFA — layout simples =====
            <div className="space-y-4">
              <IdentificacaoFields
                isEdit={isEdit}
                editing={editing}
                tipo={tipo}
                setTipo={setTipo}
                nome={nome}
                setNome={setNome}
                cursoId={cursoId}
                setCursoId={setCursoId}
                grupo={grupo}
                setGrupo={setGrupo}
                cursos={cursos}
                gruposDisponiveis={gruposDisponiveis}
                professor={professor}
                setProfessor={setProfessor}
                professorUserId={professorUserId}
                setProfessorUserId={setProfessorUserId}
                prazo={prazo}
                setPrazo={setPrazo}
                descricao={descricao}
                setDescricao={setDescricao}
                cargaHoras={cargaHoras}
                setCargaHoras={setCargaHoras}
                cargaMin={cargaMin}
                setCargaMin={setCargaMin}
              />

              <div className="space-y-2">
                <FieldLabel field="objetivoResultados">Objetivo / Resultados Esperados</FieldLabel>
                <Textarea
                  value={objetivoResultados}
                  onChange={(e) => setObjetivoResultados(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="rounded-md border-l-4 border-primary bg-muted/40 p-4 space-y-4">
                <h4 className="font-semibold text-sm">📝 Específico de Tarefa</h4>
                <div className="space-y-2">
                  <Label>Instruções / Critérios de Entrega</Label>
                  <Textarea
                    value={instrucoes}
                    onChange={(e) => setInstrucoes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Habilidades Relacionadas</Label>
                <SkillSelector
                  habilidades={habilidades}
                  selectedIds={habilidadeIds}
                  onChange={setHabilidadeIds}
                />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3">
            Esta atividade fica disponível na biblioteca do curso. Para que ela
            aconteça em uma turma, use <strong>"Agendar"</strong> na lista de
            atividades.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">💾 Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================
// Subcomponentes
// ===========================================================

interface IdentificacaoFieldsProps {
  isEdit: boolean;
  editing?: Atividade;
  tipo: AtividadeTipo;
  setTipo: (t: AtividadeTipo) => void;
  nome: string;
  setNome: (s: string) => void;
  cursoId: string;
  setCursoId: (s: string) => void;
  grupo: string;
  setGrupo: (s: string) => void;
  cursos: Curso[];
  gruposDisponiveis: Grupo[];
  professor: string;
  setProfessor: (s: string) => void;
  professorUserId?: string;
  setProfessorUserId: (s: string | undefined) => void;
  prazo: string;
  setPrazo: (s: string) => void;
  descricao: string;
  setDescricao: (s: string) => void;
  cargaHoras: string;
  setCargaHoras: (s: string) => void;
  cargaMin: string;
  setCargaMin: (s: string) => void;
}

function IdentificacaoFields({
  isEdit,
  editing,
  tipo,
  setTipo,
  nome,
  setNome,
  cursoId,
  setCursoId,
  grupo,
  setGrupo,
  cursos,
  gruposDisponiveis,
  professor,
  setProfessor,
  professorUserId,
  setProfessorUserId,
  prazo,
  setPrazo,
  descricao,
  setDescricao,
  cargaHoras,
  setCargaHoras,
  cargaMin,
  setCargaMin,
}: IdentificacaoFieldsProps) {
  const tipoAtual = isEdit ? editing!.tipo : tipo;
  // Fase 8: professores são users com role "professor"
  const professores = useUsersByRole("professor");
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select
            value={String(tipoAtual)}
            onValueChange={(v) => setTipo(Number(v) as AtividadeTipo)}
            disabled={isEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Aula</SelectItem>
              <SelectItem value="1">Tarefa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <FieldLabel field="nome" required>Nome</FieldLabel>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Introdução ao Photoshop"
          />
        </div>

        <div className="space-y-2">
          <Label>Curso *</Label>
          <Select
            value={cursoId}
            onValueChange={(v) => {
              setCursoId(v);
              setGrupo("");
            }}
            disabled={isEdit}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {cursos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Grupo / Módulo{isEdit ? "" : " *"}</Label>
          <Select value={grupo || ""} onValueChange={(v) => setGrupo(v || "")} disabled={isEdit}>
            <SelectTrigger>
              <SelectValue placeholder={gruposDisponiveis.length === 0 ? "Nenhum grupo disponível" : "Selecione"} />
            </SelectTrigger>
            <SelectContent>
              {gruposDisponiveis.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  Nenhum grupo disponível para este curso
                </SelectItem>
              ) : (
                gruposDisponiveis.map((g) => (
                  <SelectItem key={g.cod} value={g.cod}>
                    <span className="font-mono text-xs mr-2">{g.cod}</span>
                    {g.nome}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {isEdit && (
          <>
            <div className="space-y-2">
              <FieldLabel field="codigo">Código</FieldLabel>
              <Input value={editing!.codigo} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Criado por</Label>
              <Input value={editing!.criadoPor} readOnly />
            </div>
          </>
        )}
        <div className="space-y-2">
          <FieldLabel field="prazo">Prazo de referência</FieldLabel>
          <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FieldLabel field="cargaHorariaMin">Carga horária da atividade</FieldLabel>
          <div className="flex items-end gap-2 max-w-md">
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Horas</Label>
              <Input
                type="number"
                min={0}
                value={cargaHoras}
                onChange={(e) => setCargaHoras(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] text-muted-foreground">Minutos</Label>
              <Input
                type="number"
                min={0}
                max={59}
                value={cargaMin}
                onChange={(e) => setCargaMin(e.target.value)}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Tempo que esta atividade ocupa quando agendada. <strong>0</strong> = livre (não consome blocos).
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel field="descricao" required>Descrição Geral</FieldLabel>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
        />
      </div>

      {/* Professor - identificação (string) e vínculo FK (Fase 6) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Professor Responsável (nome)</Label>
          <Input
            value={professor}
            onChange={(e) => setProfessor(e.target.value)}
            placeholder="Ex.: João Silva"
          />
          <p className="text-[10px] text-muted-foreground">
            Identificação do professor (compatibilidade).
          </p>
        </div>

        <div className="space-y-2">
          <Label>Vínculo com Professor (Fase 6)</Label>
          <Select value={professorUserId ?? "_none"} onValueChange={(v) => setProfessorUserId(v === "_none" ? undefined : v)}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  professores.length === 0
                    ? "Sem professores cadastrados"
                    : "Selecionar professor..."
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">(Sem vínculo)</SelectItem>
              {professores.map((p) => (
                <SelectItem key={p.userId} value={p.userId}>
                  {p.displayName} {p.email ? `(${p.email})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Vínculo com registro de professor (Fase 6 - novo).
          </p>
        </div>
      </div>
    </>
  );
}

function FormularioCheckbox({
  checked,
  onChange,
  label,
  desc,
  locked,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
  locked?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 rounded-md p-2 transition-colors ${locked ? "opacity-90 cursor-not-allowed bg-muted/40" : "cursor-pointer hover:bg-muted/50"}`}>
      <Checkbox
        checked={checked}
        disabled={locked}
        onCheckedChange={(v) => !locked && onChange(v === true)}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className="text-sm font-medium flex items-center gap-2">
          {label}
          {locked && <span className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1 py-0.5">obrigatório</span>}
        </div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </label>
  );
}
