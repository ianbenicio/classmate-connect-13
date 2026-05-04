import { Star, StarHalf } from "lucide-react";

interface Props {
  /** Nota na escala 0–10 (será convertida para 0–5 estrelas) */
  value: number;
  max?: number; // padrão 10
}

export function StarRating({ value, max = 10 }: Props) {
  const stars = Math.max(0, Math.min(5, (value / max) * 5));
  const full = Math.floor(stars);
  const half = stars - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div
      className="inline-flex items-center gap-0.5"
      title={`${value.toFixed(1)} / ${max}`}
      aria-label={`Nota ${value} de ${max}`}
    >
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
      {half && <StarHalf className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className="h-3.5 w-3.5 text-muted-foreground/40" />
      ))}
    </div>
  );
}
