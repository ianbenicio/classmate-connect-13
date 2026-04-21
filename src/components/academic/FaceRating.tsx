// Seletor de nota 1–5 com emojis (carinhas). Funciona pra todas as idades.
import { cn } from "@/lib/utils";
import type { Nota } from "@/lib/avaliacoes-types";

const FACES: { value: Nota; emoji: string; label: string }[] = [
  { value: 1, emoji: "😢", label: "Muito ruim" },
  { value: 2, emoji: "😐", label: "Ruim" },
  { value: 3, emoji: "🙂", label: "Ok" },
  { value: 4, emoji: "😊", label: "Bom" },
  { value: 5, emoji: "🤩", label: "Demais" },
];

interface Props {
  value: Nota | null;
  onChange: (n: Nota | null) => void;
  /** Mostra botão "Não se aplica" para neutralizar a pergunta */
  allowSkip?: boolean;
}

export function FaceRating({ value, onChange, allowSkip = true }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        {FACES.map((f) => {
          const selected = value === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange(f.value)}
              aria-label={f.label}
              title={f.label}
              className={cn(
                "flex-1 aspect-square rounded-lg border text-2xl flex items-center justify-center transition-all",
                "hover:scale-110 hover:border-primary",
                selected
                  ? "border-primary bg-primary/10 scale-110 shadow"
                  : "border-border bg-muted/30 grayscale opacity-60",
              )}
            >
              {f.emoji}
            </button>
          );
        })}
      </div>
      {allowSkip && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "text-[11px] underline-offset-2 hover:underline",
            value === null ? "text-primary font-medium" : "text-muted-foreground",
          )}
        >
          Não se aplica / pular
        </button>
      )}
    </div>
  );
}
