import type { PerfilAcesso } from "@/lib/academic-types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ICONS: Record<PerfilAcesso, { icon: string; label: string }> = {
  professor: { icon: "👨‍🏫", label: "Professor" },
  coordenacao: { icon: "🎓", label: "Coordenação" },
  aluno: { icon: "👨‍🎓", label: "Aluno" },
  pais: { icon: "👨‍👩", label: "Pais" },
};

interface Props {
  visibility: PerfilAcesso[];
  className?: string;
}

/**
 * Mostra ícones discretos indicando quais perfis enxergam o campo.
 * Uso: ao lado do <Label>.
 */
export function FieldVisibilityBadge({ visibility, className }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-0.5 text-xs leading-none opacity-60 hover:opacity-100 transition-opacity cursor-help ${className ?? ""}`}
          >
            {visibility.map((p) => (
              <span key={p} aria-hidden>
                {ICONS[p].icon}
              </span>
            ))}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Visível para: {visibility.map((p) => ICONS[p].label).join(", ")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
