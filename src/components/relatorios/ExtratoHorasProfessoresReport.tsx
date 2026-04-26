// =====================================================================
// Extrato de Horas por Professores - Relatório Completo (Fase B)
// =====================================================================
// Exibe tabela de aulas concluídas e avaliadas com totalizações por professor.
// Permite filtro por data, sorting, e export para PDF.

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Calendar } from "lucide-react";
import { useAgendamentos } from "@/lib/agendamentos-store";
import { useAvaliacoes } from "@/lib/avaliacoes-store";
import { useProfessores } from "@/lib/professores-store";
import {
  gerarExtratoHoras,
  formatarHoras,
  type ExtratoHorasPayload,
} from "@/lib/relatorio-extrato-horas";
import { toast } from "sonner";

export function ExtratoHorasProfessoresReport() {
  const agendamentos = useAgendamentos();
  const avaliacoes = useAvaliacoes();
  const professores = useProfessores();

  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [filterNome, setFilterNome] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "horas" | "classes">("nome");
  const [descending, setDescending] = useState(false);

  // Gera relatório baseado em filtros
  const relatorio = useMemo(() => {
    return gerarExtratoHoras(agendamentos, avaliacoes, professores, dataInicio, dataFim);
  }, [agendamentos, avaliacoes, professores, dataInicio, dataFim]);

  // Filtra e ordena professores
  const professoresFiltrados = useMemo(() => {
    let lista = [...relatorio.professores];

    // Filtro por nome
    if (filterNome.trim()) {
      const q = filterNome.toLowerCase();
      lista = lista.filter((p) => p.professorNome.toLowerCase().includes(q));
    }

    // Ordenação
    lista.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "nome") {
        cmp = a.professorNome.localeCompare(b.professorNome);
      } else if (sortBy === "horas") {
        cmp = a.totalHoras - b.totalHoras;
      } else if (sortBy === "classes") {
        cmp = a.totalClasses - b.totalClasses;
      }
      return descending ? -cmp : cmp;
    });

    return lista;
  }, [relatorio, filterNome, sortBy, descending]);

  // Exportar para PDF
  const handleExportPDF = async () => {
    try {
      // Lazy load jsPDF + html2canvas apenas quando necessário
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const element = document.getElementById("report-content");
      if (!element) {
        toast.error("Não foi possível gerar PDF");
        return;
      }

      toast.loading("Gerando PDF...");

      // Captura conteúdo da tabela como imagem
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = pdf.internal.pageSize.getWidth() - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 5;

      // Adiciona imagem ao PDF, quebrando para múltiplas páginas se necessário
      pdf.addImage(imgData, "PNG", 5, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 5, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      // Filename com datas do filtro
      const dataInicioStr = dataInicio || "inicio";
      const dataFimStr = dataFim || "fim";
      const filename = `extrato_horas_${dataInicioStr}_${dataFimStr}.pdf`;

      pdf.save(filename);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error("[ExtratoHoras] PDF export error", err);
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Extrato de Horas - Professores</h1>
        <p className="text-sm text-muted-foreground">
          Relatório de aulas concluídas e avaliadas por professor. Apenas aulas com
          pelo menos uma avaliação são incluídas no total.
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data-inicio" className="text-xs">
                <Calendar className="inline h-3 w-3 mr-1" />
                Data Início
              </Label>
              <Input
                id="data-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-fim" className="text-xs">
                <Calendar className="inline h-3 w-3 mr-1" />
                Data Fim
              </Label>
              <Input
                id="data-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-nome" className="text-xs">
                Professor
              </Label>
              <Input
                id="filter-nome"
                placeholder="Buscar por nome..."
                value={filterNome}
                onChange={(e) => setFilterNome(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDataInicio("");
                  setDataFim("");
                  setFilterNome("");
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{relatorio.totalProfessores}</div>
            <p className="text-xs text-muted-foreground">Professores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{relatorio.totalClasses}</div>
            <p className="text-xs text-muted-foreground">Aulas Avaliadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatarHoras(relatorio.totalHoras)}</div>
            <p className="text-xs text-muted-foreground">Total de Horas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex gap-2">
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={relatorio.totalClasses === 0}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {professoresFiltrados.length} Professor(es)
          </CardTitle>
          <CardDescription className="text-xs">
            Clique na coluna para ordenar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {professoresFiltrados.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum professor encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="space-y-6">
              {professoresFiltrados.map((prof) => (
                <div key={prof.professorId || prof.professorNome} className="space-y-3">
                  {/* Cabeçalho do professor */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-semibold">{prof.professorNome}</p>
                      {prof.professorId && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {prof.professorId}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-2xl font-bold">
                          {formatarHoras(prof.totalHoras)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{prof.totalClasses}</p>
                        <p className="text-xs text-muted-foreground">Aulas</p>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de aulas do professor */}
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-8">Data</TableHead>
                          <TableHead className="h-8">Horário</TableHead>
                          <TableHead className="h-8">Duração</TableHead>
                          <TableHead className="h-8">Avaliação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prof.classes.map((cls) => (
                          <TableRow key={cls.agendamentoId} className="text-xs">
                            <TableCell>{cls.data}</TableCell>
                            <TableCell>
                              {cls.inicio} - {cls.fim}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatarHoras(cls.duracaoHoras)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  cls.avaliacaoStatus === "com_avaliacao"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {cls.avaliacaoStatus === "com_avaliacao"
                                  ? "✓ Avaliada"
                                  : "○ Pendente"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conteúdo oculto para PDF */}
      <div id="report-content" className="hidden print:block">
        <div className="p-6 bg-white">
          <h1 className="text-2xl font-bold mb-2">Extrato de Horas - Professores</h1>
          <p className="text-sm text-gray-600 mb-6">
            Gerado em {new Date(relatorio.geradoEm).toLocaleString("pt-BR")}
            {dataInicio && ` | Período: ${dataInicio} a ${dataFim}`}
          </p>

          <table className="w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Professor</th>
                <th className="border border-gray-300 p-2 text-right">Aulas</th>
                <th className="border border-gray-300 p-2 text-right">Horas</th>
              </tr>
            </thead>
            <tbody>
              {professoresFiltrados.map((prof) => (
                <tr key={prof.professorId || prof.professorNome}>
                  <td className="border border-gray-300 p-2">{prof.professorNome}</td>
                  <td className="border border-gray-300 p-2 text-right">
                    {prof.totalClasses}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    {prof.totalHoras}
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50">
                <td className="border border-gray-300 p-2">TOTAL</td>
                <td className="border border-gray-300 p-2 text-right">
                  {relatorio.totalClasses}
                </td>
                <td className="border border-gray-300 p-2 text-right">
                  {relatorio.totalHoras}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
