// =====================================================================
// RelatoriosCoordenacaoDialog — Geração de PDF agregado (Coordenação)
// =====================================================================
// Filtros: curso, turma, aluno, professor, intervalo de datas.
// Quando o filtro é apenas Curso, o PDF agrupa por turma e mostra
// relatórios do professor + dos alunos por data, com síntese estatística
// no final. Outros filtros funcionam como refino.

import { useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCursos } from "@/lib/cursos-store";
import { useTurmas } from "@/lib/turmas-store";
import { useAlunos } from "@/lib/alunos-store";
import { useAtividades } from "@/lib/atividades-store";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useUsersByRole } from "@/lib/users-store";
import {
  filtrarAvaliacoes,
  gerarPdfRelatoriosLote,
  type LoteFiltros,
} from "@/lib/pdf-relatorios";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ANY = "__any__";

export function RelatoriosCoordenacaoDialog({ open, onOpenChange }: Props) {
  const cursos = useCursos();
  const turmas = useTurmas();
  const alunos = useAlunos();
  const atividades = useAtividades();
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();
  const professores = useUsersByRole("professor");

  const [cursoId, setCursoId] = useState<string>(ANY);
  const [turmaId, setTurmaId] = useState<string>(ANY);
  const [alunoId, setAlunoId] = useState<string>(ANY);
  const [professorUserId, setProfessorUserId] = useState<string>(ANY);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [incluirProf, setIncluirProf] = useState(true);
  const [incluirAluno, setIncluirAluno] = useState(true);
  const [gerando, setGerando] = useState(false);

  const turmasFiltradas = useMemo(
    () => (cursoId === ANY ? turmas : turmas.filter((t) => t.cursoId === cursoId)),
    [turmas, cursoId],
  );
  const alunosFiltrados = useMemo(() => {
    let list = alunos;
    if (turmaId !== ANY) list = list.filter((a) => a.turmaId === turmaId);
    else if (cursoId !== ANY) list = list.filter((a) => a.cursoId === cursoId);
    return list.slice().sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, cursoId, turmaId]);

  const filtros: LoteFiltros = {
    cursoId: cursoId === ANY ? undefined : cursoId,
    turmaId: turmaId === ANY ? undefined : turmaId,
    alunoId: alunoId === ANY ? undefined : alunoId,
    professorUserId: professorUserId === ANY ? undefined : professorUserId,
    professorNome:
      professorUserId === ANY
        ? undefined
        : professores.find((p) => p.userId === professorUserId)?.displayName,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    incluirRelatorioProf: incluirProf,
    incluirRelatorioAluno: incluirAluno,
  };

  const preview = useMemo(
    () =>
      filtrarAvaliacoes(avaliacoes, filtros, {
        cursos,
        turmas,
        atividades,
        alunos,
        agendamentos,
      }),
    [avaliacoes, filtros, cursos, turmas, atividades, alunos, agendamentos],
  );

  const totalRel = preview.profs.length + preview.alunos.length;

  const handleGerar = async () => {
    if (totalRel === 0) {
      toast.info("Nenhum relatório bate com os filtros selecionados.");
      return;
    }
    if (!incluirProf && !incluirAluno) {
      toast.error("Marque ao menos um tipo de relatório.");
      return;
    }
    setGerando(true);
    try {
      let titulo = "Relatórios de Aula";
      const subParts: string[] = [];
      if (cursoId !== ANY) {
        const c = cursos.find((x) => x.id === cursoId);
        if (c) subParts.push(`Curso ${c.cod} — ${c.nome}`);
      }
      if (turmaId !== ANY) {
        const t = turmas.find((x) => x.id === turmaId);
        if (t) subParts.push(`Turma ${t.cod}`);
      }
      if (alunoId !== ANY) {
        const al = alunos.find((x) => x.id === alunoId);
        if (al) subParts.push(`Aluno ${al.nome}`);
      }
      if (professorUserId !== ANY) {
        const p = professores.find((x) => x.userId === professorUserId);
        if (p) subParts.push(`Professor ${p.displayName}`);
      }
      if (dataInicio || dataFim) {
        subParts.push(`Período ${dataInicio || "início"} → ${dataFim || "hoje"}`);
      }
      const subtitulo = subParts.join(" · ");

      const result = gerarPdfRelatoriosLote({
        titulo,
        subtitulo: subtitulo || undefined,
        filtros,
        avaliacoes,
        ctx: { cursos, turmas, atividades, alunos, agendamentos },
      });
      toast.success(`PDF gerado: ${result.profs} prof + ${result.alunos} aluno.`);
    } catch (e) {
      console.error(e);
      toast.error(`Falha ao gerar PDF: ${(e as Error).message}`);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Relatórios — Gerar PDF
          </DialogTitle>
          <DialogDescription>
            Filtre por curso, turma, aluno, professor e período. O PDF agrega os relatórios
            organizados por turma e data, com síntese estatística no final.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Curso</Label>
              <Select
                value={cursoId}
                onValueChange={(v) => {
                  setCursoId(v);
                  setTurmaId(ANY);
                  setAlunoId(ANY);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos os cursos</SelectItem>
                  {cursos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cod} — {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Turma</Label>
              <Select
                value={turmaId}
                onValueChange={(v) => {
                  setTurmaId(v);
                  setAlunoId(ANY);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todas as turmas</SelectItem>
                  {turmasFiltradas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.cod} — {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Aluno</Label>
              <Select value={alunoId} onValueChange={setAlunoId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos os alunos</SelectItem>
                  {alunosFiltrados.map((al) => (
                    <SelectItem key={al.id} value={al.id}>
                      {al.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Professor</Label>
              <Select value={professorUserId} onValueChange={setProfessorUserId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Todos os professores</SelectItem>
                  {professores.map((p) => (
                    <SelectItem key={p.userId} value={p.userId}>
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dt-ini">Data inicial</Label>
              <Input
                id="dt-ini"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dt-fim">Data final</Label>
              <Input
                id="dt-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 border rounded-md p-2">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={incluirProf} onCheckedChange={(v) => setIncluirProf(!!v)} />
              Relatórios do professor
            </label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={incluirAluno} onCheckedChange={(v) => setIncluirAluno(!!v)} />
              Relatórios dos alunos
            </label>
          </div>

          <div className="border rounded-md p-3 bg-muted/30 text-sm">
            <div className="font-medium mb-1">Prévia dos filtros</div>
            <div className="text-xs text-muted-foreground">
              Encontrados <strong>{preview.profs.length}</strong> relatório(s) do professor e{" "}
              <strong>{preview.alunos.length}</strong> relatório(s) do aluno.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGerar} disabled={gerando || totalRel === 0}>
            {gerando ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Gerando…
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 mr-1" /> Gerar PDF ({totalRel})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
