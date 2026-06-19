import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileCheck2, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import type { Agendamento, Atividade, Curso, Habilidade, Turma } from "@/lib/academic-types";
import { useAuth } from "@/lib/auth";
import {
  evidenciaEstaValida,
  getCodigoAula,
  getEvidenciaPorTipo,
  getNomeBaseEvidencia,
  getNomeArquivoChamadaUpload,
  getNomesEsperadosEvidencia,
  getPrazoPlanoAula,
  inferirHabilidadesIdsDoPlano,
  isPlanoAulaAtrasado,
  montarDadosDocumentoEstudo,
  montarPlanoAulaInicial,
  type AulaEvidencia,
  type AulaEvidenciaContext,
  type PlanoAulaDados,
} from "@/lib/aula-evidencias";
import { aulaEvidenciasStore, useAulaEvidencias } from "@/lib/aula-evidencias-store";
import { createChamadaSignedUrl, uploadChamadaArquivo } from "@/lib/aula-evidencias-storage";
import { useHabilidades } from "@/lib/habilidades-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: Agendamento | null;
  turma?: Turma;
  curso?: Curso;
  atividades: Atividade[];
}

export function AulaEvidenciasDialog({
  open,
  onOpenChange,
  agendamento,
  turma,
  curso,
  atividades,
}: Props) {
  if (!agendamento || !turma || !curso) return null;
  return (
    <AulaEvidenciasDialogContent
      open={open}
      onOpenChange={onOpenChange}
      agendamento={agendamento}
      turma={turma}
      curso={curso}
      atividades={atividades}
    />
  );
}

interface ContentProps extends Omit<Props, "agendamento" | "turma" | "curso"> {
  agendamento: Agendamento;
  turma: Turma;
  curso: Curso;
}

function AulaEvidenciasDialogContent({
  open,
  onOpenChange,
  agendamento,
  turma,
  curso,
  atividades,
}: ContentProps) {
  const { user, displayName, hasRole } = useAuth();
  const evidencias = useAulaEvidencias();
  const habilidades = useHabilidades();
  const ctx = useMemo<AulaEvidenciaContext>(
    () => ({
      curso,
      turma,
      agendamento,
      atividades,
    }),
    [agendamento, atividades, curso, turma],
  );

  const evidenciasDaAula = useMemo(
    () => evidencias.filter((e) => e.agendamentoId === agendamento.id),
    [evidencias, agendamento.id],
  );
  const plano = getEvidenciaPorTipo(evidenciasDaAula, "plano_aula");
  const chamada = getEvidenciaPorTipo(evidenciasDaAula, "chamada_arquivo");
  const planoOk = evidenciaEstaValida(plano);
  const chamadaOk = evidenciaEstaValida(chamada);
  const isRevisor = hasRole("admin") || hasRole("coordenacao") || hasRole("super_admin");

  const planoInicial = useMemo(() => montarPlanoAulaInicial(ctx), [ctx]);
  const [planoDados, setPlanoDados] = useState<PlanoAulaDados>(planoInicial);
  const [chamadaFile, setChamadaFile] = useState<File | null>(null);
  const [chamadaBusy, setChamadaBusy] = useState(false);
  const [openingChamada, setOpeningChamada] = useState(false);

  const habilidadesDoPlano = useMemo(() => {
    const idsCurso = new Set(curso.habilidadeIds ?? []);
    const idsAula = new Set(
      agendamento.atividadeIds
        .map((atividadeId) => atividades.find((atividade) => atividade.id === atividadeId))
        .filter((atividade): atividade is Atividade => !!atividade)
        .flatMap((atividade) => atividade.habilidadeIds ?? []),
    );
    const filtradas = habilidades.filter(
      (habilidade) => idsCurso.has(habilidade.id) || idsAula.has(habilidade.id),
    );
    return filtradas.length > 0 ? filtradas : habilidades;
  }, [agendamento.atividadeIds, atividades, curso.habilidadeIds, habilidades]);

  const habilidadesSugeridas = useMemo(() => {
    const ids = new Set(inferirHabilidadesIdsDoPlano(ctx, habilidadesDoPlano, planoDados));
    const sugeridas = habilidadesDoPlano.filter((habilidade) => ids.has(habilidade.id));
    return sugeridas.length > 0 ? sugeridas : habilidadesDoPlano;
  }, [ctx, habilidadesDoPlano, planoDados]);

  useEffect(() => {
    if (!open) return;
    const salvo = (plano?.dados ?? {}) as Partial<PlanoAulaDados>;
    const merged: PlanoAulaDados = {
      ...planoInicial,
      ...salvo,
      habilidadesIds: Array.isArray(salvo.habilidadesIds)
        ? salvo.habilidadesIds
        : planoInicial.habilidadesIds,
    };
    if (merged.habilidadesIds.length === 0) {
      merged.habilidadesIds = inferirHabilidadesIdsDoPlano(ctx, habilidadesDoPlano, merged);
    }
    setPlanoDados(merged);
    setChamadaFile(null);
  }, [open, plano?.dados, planoInicial, ctx, habilidadesDoPlano]);

  const codigoAula = getCodigoAula(ctx);
  const planoNome = getNomeBaseEvidencia(ctx, "plano_aula");
  const chamadaNomeEsperado = chamadaFile
    ? getNomeArquivoChamadaUpload(ctx, {
        name: chamadaFile.name,
        mimeType: chamadaFile.type,
      })
    : (chamada?.arquivoNome ?? getNomesEsperadosEvidencia(ctx, "chamada_arquivo")[0]);
  const prazoPlano = getPrazoPlanoAula(ctx);
  const planoAtrasado = isPlanoAulaAtrasado(ctx);

  const updatePlano = <K extends keyof PlanoAulaDados>(key: K, value: PlanoAulaDados[K]) => {
    setPlanoDados((current) => ({ ...current, [key]: value }));
  };

  const camposObrigatorios: Array<keyof PlanoAulaDados> = [
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

  const handleSalvarPlano = async () => {
    const faltando = camposObrigatorios.filter((key) => {
      const value = planoDados[key];
      if (Array.isArray(value)) return value.length === 0;
      return value.trim().length === 0;
    });
    if (faltando.length > 0) {
      toast.error("Preencha os campos obrigatorios do documento de estudo.");
      return;
    }
    await aulaEvidenciasStore.upsert({
      agendamentoId: agendamento.id,
      tipo: "plano_aula",
      status: "valido",
      arquivoNome: planoNome,
      arquivoMimeType: "application/vnd.classmate.plano-aula+json",
      submetidoPorUserId: user?.id,
      submetidoPorNome: displayName ?? agendamento.professor,
      verificadoEm: new Date().toISOString(),
      observacao: "Documento de estudo/plano de aula criado no sistema.",
      dados: montarDadosDocumentoEstudo(ctx, planoDados, displayName ?? agendamento.professor),
    });
    toast.success("Documento de estudo registrado.");
  };

  const handleSalvarChamada = async () => {
    if (!chamadaFile) {
      toast.error("Selecione a foto ou PDF da chamada.");
      return;
    }
    setChamadaBusy(true);
    try {
      const uploaded = await uploadChamadaArquivo(ctx, chamadaFile);
      await aulaEvidenciasStore.upsert({
        agendamentoId: agendamento.id,
        tipo: "chamada_arquivo",
        status: "valido",
        arquivoNome: uploaded.arquivoNome,
        arquivoMimeType: uploaded.mimeType,
        arquivoUrl: uploaded.arquivoUrl,
        submetidoPorUserId: user?.id,
        submetidoPorNome: displayName ?? agendamento.professor,
        verificadoEm: new Date().toISOString(),
        observacao: "Chamada em papel enviada pelo professor.",
        dados: {
          nomeOriginal: chamadaFile.name,
          storageProvider: "supabase_storage",
          storagePath: uploaded.storagePath,
        },
      });
      setChamadaFile(null);
      toast.success("Chamada enviada e registrada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar chamada.");
    } finally {
      setChamadaBusy(false);
    }
  };

  const handleAbrirChamada = async () => {
    if (!chamada?.arquivoUrl) return;
    setOpeningChamada(true);
    try {
      const url = await createChamadaSignedUrl(chamada);
      if (!url) {
        toast.error("Arquivo da chamada sem URL.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao abrir chamada.");
    } finally {
      setOpeningChamada(false);
    }
  };

  const handleAprovar = async (evidencia: AulaEvidencia | undefined) => {
    if (!evidencia) return;
    await aulaEvidenciasStore.aprovarManual(
      evidencia.agendamentoId,
      evidencia.tipo,
      user?.id,
      "Aprovado manualmente pela coordenacao/admin.",
    );
    toast.success("Evidencia aprovada manualmente.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" /> Evidencias da aula
          </DialogTitle>
          <DialogDescription>
            {curso.nome} · {turma.nome} · {agendamento.data} · {agendamento.inicio}-
            {agendamento.fim}
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-md border p-3 space-y-2">
          <div className="text-sm font-medium">Registro da aula</div>
          <div className="grid gap-2 text-xs md:grid-cols-4">
            <RegistroItem label="Codigo" value={codigoAula} />
            <RegistroItem label="Data" value={agendamento.data} />
            <RegistroItem label="Horario" value={`${agendamento.inicio}-${agendamento.fim}`} />
            <RegistroItem label="Professor" value={agendamento.professor ?? "Professor"} />
          </div>
          <p className="text-xs text-muted-foreground">
            O documento de estudo, a chamada e os relatorios ficam ligados a este agendamento no
            banco.
          </p>
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold">Documento de estudo / plano de aula</h3>
              <p className="text-xs text-muted-foreground">
                Criado dentro do sistema. Prazo: {prazoPlano.toLocaleString()} (ate 2h antes da
                aula)
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <StatusBadge ok={planoOk} evidencia={plano} overdue={planoAtrasado} />
              {isRevisor && plano && !planoOk && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleAprovar(plano)}
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Aprovar
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>Identificador interno</Label>
            <Input value={planoNome} readOnly className="font-mono text-xs mt-1" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <PlanoField
              label="Objetivos *"
              value={planoDados.objetivos}
              onChange={(v) => updatePlano("objetivos", v)}
            />
            <PlanoField
              label="Conteudo/ementa *"
              value={planoDados.conteudoEmenta}
              onChange={(v) => updatePlano("conteudoEmenta", v)}
            />
            <PlanoField
              label="Estudo/preparacao do professor *"
              value={planoDados.preparacaoProfessor}
              onChange={(v) => updatePlano("preparacaoProfessor", v)}
            />
            <PlanoField
              label="Roteiro *"
              value={planoDados.roteiro}
              onChange={(v) => updatePlano("roteiro", v)}
            />
            <PlanoField
              label="Materiais *"
              value={planoDados.materiais}
              onChange={(v) => updatePlano("materiais", v)}
            />
            <PlanoField
              label="Dinamica de Habilidades *"
              value={planoDados.habilidades}
              onChange={(v) => updatePlano("habilidades", v)}
            />
            <PlanoHabilidadesCheckboxes
              habilidades={habilidadesSugeridas}
              selectedIds={planoDados.habilidadesIds}
              onChange={(ids) => updatePlano("habilidadesIds", ids)}
            />
            <PlanoField
              label="Forma de avaliacao *"
              value={planoDados.formaAvaliacao}
              onChange={(v) => updatePlano("formaAvaliacao", v)}
            />
            <PlanoField
              label="Observacoes do professor"
              value={planoDados.observacoesProfessor}
              onChange={(v) => updatePlano("observacoesProfessor", v)}
            />
            <PlanoField
              label="Sugestao de interacao com os pais *"
              value={planoDados.sugestaoPais}
              onChange={(v) => updatePlano("sugestaoPais", v)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSalvarPlano}>
              <FileCheck2 className="h-4 w-4 mr-1" /> Registrar documento
            </Button>
          </div>
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold">Arquivo da chamada</h3>
              <p className="text-xs text-muted-foreground">
                Envie a foto ou PDF da chamada em papel. O sistema salva com a nomenclatura
                padronizada.
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <StatusBadge ok={chamadaOk} evidencia={chamada} />
              {isRevisor && chamada && !chamadaOk && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleAprovar(chamada)}
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Aprovar
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <Label>Arquivo da chamada</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(event) => setChamadaFile(event.target.files?.[0] ?? null)}
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Sera salvo como: <span className="font-mono">{chamadaNomeEsperado}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Formatos aceitos: JPG, PNG ou PDF.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSalvarChamada} disabled={chamadaBusy}>
              <Upload className="h-4 w-4 mr-1" />
              {chamadaBusy ? "Enviando..." : "Enviar chamada"}
            </Button>
            {chamada?.arquivoUrl && (
              <Button variant="outline" onClick={handleAbrirChamada} disabled={openingChamada}>
                <ExternalLink className="h-4 w-4 mr-1" />
                {openingChamada ? "Abrindo..." : "Abrir chamada"}
              </Button>
            )}
          </div>
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanoHabilidadesCheckboxes({
  habilidades,
  selectedIds,
  onChange,
}: {
  habilidades: Pick<Habilidade, "id" | "sigla" | "nome" | "descricao">[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
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

function PlanoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function RegistroItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-medium truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({
  ok,
  evidencia,
  overdue,
}: {
  ok: boolean;
  evidencia?: AulaEvidencia;
  overdue?: boolean;
}) {
  if (ok) {
    return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40">OK</Badge>;
  }
  if (evidencia?.status === "invalido") {
    return <Badge variant="destructive">Invalido</Badge>;
  }
  if (overdue) {
    return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40">Atrasado</Badge>;
  }
  return <Badge variant="outline">Pendente</Badge>;
}
