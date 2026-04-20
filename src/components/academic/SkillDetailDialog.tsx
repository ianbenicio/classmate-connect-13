import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Habilidade } from "@/lib/academic-types";

interface Props {
  habilidade: Habilidade | null;
  onOpenChange: (open: boolean) => void;
}

export function SkillDetailDialog({ habilidade, onOpenChange }: Props) {
  return (
    <Dialog open={!!habilidade} onOpenChange={onOpenChange}>
      <DialogContent>
        {habilidade && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge variant="secondary">{habilidade.sigla}</Badge>
                {habilidade.grupo && (
                  <span className="text-sm text-muted-foreground font-normal">
                    {habilidade.grupo}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="pt-2 text-foreground leading-relaxed whitespace-pre-line">
                {habilidade.descricao}
              </DialogDescription>
            </DialogHeader>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
