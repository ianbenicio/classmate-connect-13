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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillSelector } from "./SkillSelector";
import { toast } from "sonner";
import type {
  Atividade,
  AtividadeTipo,
  Curso,
  Habilidade,
} from "@/lib/academic-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cursos: Curso[];
  grupos: Record<string, string[]>;
  habilidades: Habilidade[];
  /** undefined => criação; com valor => edição */
  editing?: Atividade;
  /** tipo padrão na criação */
  defaultTipo?: AtividadeTipo;
  onSave: (atividade: Atividade) => void;
}

function gerarCodigo(cursoSigla: string, grupo: string, seq: number) {
  const grupoSigla = grupo
    .split(" ")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);
  return `${cursoSigla}-${grupoSigla}-${String(seq).padStart(3, "0")}`;
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

  const [tipo, setTipo] = useState<AtividadeTipo>(defaultTipo);
  const [nome, setNome] = useState("");
  const [cursoId, setCursoId] = useState(cursos[0]?.id ?? "");
  const [grupo, setGrupo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [objetivoResultados, setObjetivoResultados] = useState("");
  const [descricaoConteudo, setDescricaoConteudo] = useState("");
  const [sugestoesPais, setSugestoesPais] = useState("");
  const [instrucoes, setInstrucoes] = useState("");
  const [habilidadeIds, setHabilidadeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTipo(editing.tipo);
      setNome(editing.nome);
      setCursoId(editing.cursoId);
      setGrupo(editing.grupo);
      setPrazo(editing.prazo);
      setDescricao(editing.descricao);
      setObjetivoResultados(editing.objetivoResultados);
      setDescricaoConteudo(editing.descricaoConteudo ?? "");
      setSugestoesPais(editing.sugestoesPais ?? "");
      setInstrucoes(editing.instrucoes ?? "");
      setHabilidadeIds(editing.habilidadeIds);
    } else {
      setTipo(defaultTipo);
      setNome("");
      setCursoId(cursos[0]?.id ?? "");
      setGrupo("");
      setPrazo("");
      setDescricao("");
      setObjetivoResultados("");
      setDescricaoConteudo("");
      setSugestoesPais("");
      setInstrucoes("");
      setHabilidadeIds([]);
    }
  }, [open, editing, defaultTipo, cursos]);

  const cursoSelecionado = cursos.find((c) => c.id === cursoId);
  const gruposDisponiveis = grupos[cursoId] ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !cursoId || !grupo || !descricao) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const atividade: Atividade = isEdit
      ? {
          ...editing!,
          // identificação fica fixa em edição:
          // id, codigo, cursoId, tipo, criadoPor → preservados
          nome,
          grupo: editing!.grupo, // grupo também faz parte da identidade (gera o código)
          prazo,
          descricao,
          objetivoResultados,
          habilidadeIds,
          descricaoConteudo: editing!.tipo === 0 ? descricaoConteudo : undefined,
          sugestoesPais: editing!.tipo === 0 ? sugestoesPais : undefined,
          instrucoes: editing!.tipo === 1 ? instrucoes : undefined,
        }
      : {
          id: crypto.randomUUID(),
          tipo,
          nome,
          codigo: gerarCodigo(
            cursoSelecionado?.cod ?? "XXX",
            grupo,
            Math.floor(Math.random() * 900) + 100,
          ),
          cursoId,
          grupo,
          descricao,
          objetivoResultados,
          prazo,
          criadoPor: "Prof. Logado",
          habilidadeIds,
          descricaoConteudo: tipo === 0 ? descricaoConteudo : undefined,
          sugestoesPais: tipo === 0 ? sugestoesPais : undefined,
          instrucoes: tipo === 1 ? instrucoes : undefined,
        };

    onSave(atividade);
    toast.success(isEdit ? "Atividade atualizada!" : "Atividade criada!");
    onOpenChange(false);
  };

  const tipoAtual = isEdit ? editing!.tipo : tipo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Atividade" : "Nova Atividade"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label>Nome *</Label>
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
              <Label>Grupo *</Label>
              <Select
                value={grupo}
                onValueChange={setGrupo}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {gruposDisponiveis.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEdit && (
              <>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={editing!.codigo} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Criado por</Label>
                  <Input value={editing!.criadoPor} readOnly />
                </div>
              </>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição Geral *</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Objetivo / Resultados Esperados</Label>
            <Textarea
              value={objetivoResultados}
              onChange={(e) => setObjetivoResultados(e.target.value)}
              rows={2}
            />
          </div>

          {tipoAtual === 0 && (
            <div className="rounded-md border-l-4 border-primary bg-muted/40 p-4 space-y-4">
              <h4 className="font-semibold text-sm">🎓 Específico de Aula</h4>
              <div className="space-y-2">
                <Label>Descrição de Conteúdo</Label>
                <Textarea
                  value={descricaoConteudo}
                  onChange={(e) => setDescricaoConteudo(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Sugestões para Pais</Label>
                <Textarea
                  value={sugestoesPais}
                  onChange={(e) => setSugestoesPais(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {tipoAtual === 1 && (
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
          )}

          <div className="space-y-2">
            <Label>Habilidades Relacionadas</Label>
            <SkillSelector
              habilidades={habilidades}
              selectedIds={habilidadeIds}
              onChange={setHabilidadeIds}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">💾 Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
