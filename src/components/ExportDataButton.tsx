import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadExportJSON } from "@/lib/data-export";
import { toast } from "sonner";

export function ExportDataButton() {
  const handleClick = () => {
    const { sizeBytes, filename } = downloadExportJSON();
    const kb = (sizeBytes / 1024).toFixed(1);
    toast.success(`Exportado: ${filename}`, {
      description: `${kb} KB · contém cursos, turmas, alunos, atividades, agendamentos, notificações e avaliações.`,
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Exportar dados (JSON)"
      title="Exportar dados (JSON)"
      onClick={handleClick}
    >
      <Download className="h-5 w-5" />
    </Button>
  );
}
