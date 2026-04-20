import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Plus, X } from "lucide-react";
import type { Habilidade } from "@/lib/academic-types";

interface Props {
  habilidades: Habilidade[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function SkillSelector({ habilidades, selectedIds, onChange }: Props) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selected = habilidades.filter((h) => selectedIds.includes(h.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        {selected.length === 0 && (
          <span className="text-sm text-muted-foreground">
            Nenhuma habilidade vinculada
          </span>
        )}
        {selected.map((h) => (
          <Badge key={h.id} variant="secondary" className="gap-1">
            {h.sigla}
            <button
              type="button"
              onClick={() => toggle(h.id)}
              className="hover:text-destructive"
              aria-label={`Remover ${h.sigla}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Vincular habilidade
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="start">
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {habilidades.map((h) => {
              const isSelected = selectedIds.includes(h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => toggle(h.id)}
                  className="w-full flex items-start gap-2 p-2 rounded-md hover:bg-accent text-left"
                >
                  <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{h.sigla}</span>
                      {h.grupo && (
                        <span className="text-xs text-muted-foreground">
                          {h.grupo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {h.descricao}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
