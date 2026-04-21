// Mini SVG radar/spiderweb chart para habilidades (até 5 eixos).
interface SkillAxis {
  label: string;
  value: number; // 0..1
}

interface Props {
  axes: SkillAxis[]; // máx 5
  size?: number;
}

export function SkillsRadarChart({ axes, size = 220 }: Props) {
  const data = axes.slice(0, 5);
  const n = data.length;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;
  const levels = 4;

  if (n < 3) {
    return (
      <p className="text-xs text-muted-foreground italic">
        São necessários pelo menos 3 eixos para o gráfico.
      </p>
    );
  }

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  // Polígonos dos níveis (grid)
  const gridPolys = Array.from({ length: levels }, (_, l) => {
    const r = (radius * (l + 1)) / levels;
    return data
      .map((_, i) => {
        const p = point(i, r);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  });

  // Polígono do aluno
  const dataPoly = data
    .map((d, i) => {
      const p = point(i, radius * Math.max(0, Math.min(1, d.value)));
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height={size}
      className="max-w-[260px] mx-auto"
      role="img"
      aria-label="Gráfico de habilidades"
    >
      {/* grid */}
      {gridPolys.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1}
          opacity={0.5}
        />
      ))}
      {/* eixos */}
      {data.map((_, i) => {
        const p = point(i, radius);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            opacity={0.5}
          />
        );
      })}
      {/* dados */}
      <polygon
        points={dataPoly}
        fill="hsl(var(--primary) / 0.25)"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
      />
      {/* labels */}
      {data.map((d, i) => {
        const p = point(i, radius + 14);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
