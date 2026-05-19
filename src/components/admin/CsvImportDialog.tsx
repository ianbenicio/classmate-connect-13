// =====================================================================
// CsvImportDialog — Import CSV de alunos e turmas (B2)
// =====================================================================
// Tabs: Alunos | Turmas
// Fluxo: download template → upload → validação preview → import com progresso

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  parseAlunoCsv,
  parseTurmaCsv,
  importAlunos,
  importTurmas,
  downloadTemplate,
  exportAlunosCsv,
  type ParseResult,
  type AlunoRowParsed,
  type TurmaRowParsed,
  type ImportProgress,
  ALUNO_TEMPLATE_HEADERS,
  TURMA_TEMPLATE_HEADERS,
} from "@/lib/csv-import";
import { getCurrentProjectId } from "@/lib/current-project";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "alunos" | "turmas";

export function CsvImportDialog({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("alunos");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse state
  const [alunosResult, setAlunosResult] = useState<ParseResult<AlunoRowParsed> | null>(null);
  const [turmasResult, setTurmasResult] = useState<ParseResult<TurmaRowParsed> | null>(null);
  const [fileName, setFileName] = useState<string>("");

  // Import state
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importDone, setImportDone] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);

  const currentResult = tab === "alunos" ? alunosResult : turmasResult;
  const headers = tab === "alunos" ? ALUNO_TEMPLATE_HEADERS : TURMA_TEMPLATE_HEADERS;

  const reset = () => {
    setAlunosResult(null);
    setTurmasResult(null);
    setFileName("");
    setProgress(null);
    setImportDone(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTabChange = (t: string) => {
    setTab(t as Tab);
    reset();
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Arquivo deve ser .csv");
      return;
    }
    setFileName(file.name);
    setProgress(null);
    setImportDone(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (tab === "alunos") {
        setAlunosResult(parseAlunoCsv(text));
      } else {
        setTurmasResult(parseTurmaCsv(text));
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    const result = currentResult;
    if (!result || result.valid.length === 0) return;

    setImporting(true);
    setProgress({ done: 0, total: result.valid.length, errors: 0 });

    try {
      const onProgress = (p: ImportProgress) => setProgress(p);

      let outcome: { done: number; errors: number };
      if (tab === "alunos" && alunosResult) {
        const validRows = alunosResult.valid.map((r) => r.data!);
        outcome = await importAlunos(validRows, onProgress);
      } else if (tab === "turmas" && turmasResult) {
        const validRows = turmasResult.valid.map((r) => r.data!);
        outcome = await importTurmas(validRows, onProgress);
      } else {
        outcome = { done: 0, errors: 0 };
      }

      setImportDone(true);
      if (outcome.errors === 0) {
        toast.success(`${outcome.done} registro(s) importado(s) com sucesso.`);
      } else {
        toast.warning(`${outcome.done} importado(s), ${outcome.errors} com erro.`);
      }
    } catch (e) {
      toast.error("Erro na importação: " + (e instanceof Error ? e.message : ""));
    } finally {
      setImporting(false);
    }
  };

  const handleExportAlunos = async () => {
    const projectId = getCurrentProjectId();
    if (!projectId) {
      toast.error("Nenhum projeto ativo.");
      return;
    }
    setExporting(true);
    try {
      await exportAlunosCsv(projectId);
    } catch (e) {
      toast.error("Erro ao exportar: " + (e instanceof Error ? e.message : ""));
    } finally {
      setExporting(false);
    }
  };

  const hasErrors = currentResult ? currentResult.invalid.length > 0 : false;
  const hasValid = currentResult ? currentResult.valid.length > 0 : false;
  const progressPct = progress
    ? Math.round((progress.done / Math.max(progress.total, 1)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar via CSV
          </DialogTitle>
          <DialogDescription>
            Importe alunos e turmas em massa. Baixe o template, preencha e faça o upload.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 pt-3 border-b">
            <TabsList className="h-8">
              <TabsTrigger value="alunos" className="text-xs">
                Alunos
              </TabsTrigger>
              <TabsTrigger value="turmas" className="text-xs">
                Turmas
              </TabsTrigger>
            </TabsList>
          </div>

          {(["alunos", "turmas"] as Tab[]).map((t) => (
            <TabsContent key={t} value={t} className="flex-1 flex flex-col min-h-0 mt-0">
              {/* Ações */}
              <div className="px-6 py-3 border-b flex flex-wrap gap-2 items-center bg-muted/20">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => downloadTemplate(t)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Template {t === "alunos" ? "Alunos" : "Turmas"} CSV
                </Button>

                {t === "alunos" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => void handleExportAlunos()}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Exportar Alunos Atuais
                  </Button>
                )}

                <div className="ml-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    Selecionar CSV
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
                {/* Drop zone / preview */}
                {!currentResult ? (
                  <div
                    className="flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors min-h-[160px]"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Arraste um .csv ou clique para selecionar</p>
                    <p className="text-xs opacity-70">
                      Colunas: {headers.join(", ")}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Resumo */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm font-medium truncate max-w-[200px]"
                        title={fileName}
                      >
                        {fileName}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {currentResult.valid.length} válidos
                      </Badge>
                      {hasErrors && (
                        <Badge
                          variant="outline"
                          className="bg-red-500/15 text-red-700 dark:text-red-300 text-xs gap-1"
                        >
                          <AlertCircle className="h-3 w-3" />
                          {currentResult.invalid.length} inválidos
                        </Badge>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 ml-auto"
                        onClick={reset}
                        title="Limpar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Tabela preview */}
                    <ScrollArea className="flex-1 min-h-0 border rounded-md max-h-72">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted border-b">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-10">
                              #
                            </th>
                            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-14">
                              Status
                            </th>
                            {headers.map((h) => (
                              <th
                                key={h}
                                className="px-3 py-1.5 text-left font-medium text-muted-foreground"
                              >
                                {h}
                              </th>
                            ))}
                            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                              Erros
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentResult.all.map((r) => (
                            <tr
                              key={r.row}
                              className={
                                r.errors.length > 0
                                  ? "bg-red-500/5 hover:bg-red-500/10"
                                  : "hover:bg-muted/30"
                              }
                            >
                              <td className="px-3 py-1 tabular-nums text-muted-foreground">
                                {r.row}
                              </td>
                              <td className="px-3 py-1">
                                {r.errors.length === 0 ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                )}
                              </td>
                              {headers.map((h) => (
                                <td
                                  key={h}
                                  className="px-3 py-1 max-w-[120px] truncate"
                                  title={r.raw[h]}
                                >
                                  {r.raw[h] || (
                                    <span className="text-muted-foreground/40">—</span>
                                  )}
                                </td>
                              ))}
                              <td className="px-3 py-1 text-red-600 dark:text-red-400 max-w-[200px] truncate">
                                {r.errors.join(" · ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>

                    {/* Progresso */}
                    {(importing || importDone) && progress && (
                      <div className="space-y-1">
                        <Progress value={progressPct} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">
                          {progress.done} de {progress.total} processados
                          {progress.errors > 0 && ` · ${progress.errors} erros`}
                        </p>
                      </div>
                    )}

                    {/* Botão importar */}
                    {!importDone ? (
                      <div className="flex justify-end items-center gap-3">
                        {hasErrors && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Linhas inválidas serão ignoradas.
                          </p>
                        )}
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => void handleImport()}
                          disabled={importing || !hasValid}
                        >
                          {importing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          Importar {currentResult.valid.length} registro(s)
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ Importação concluída
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={reset}
                        >
                          Nova importação
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
