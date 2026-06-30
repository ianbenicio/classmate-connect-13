// Detecta deploy novo (SPA em cache) e oferece reload.
// Vercel troca os hashes dos assets a cada build. Capturamos um "fingerprint"
// dos assets referenciados em "/" no mount (baseline = versão que o usuário
// carregou) e re-checamos periodicamente + ao focar a aba. Se mudou, há build
// novo no ar → toast persistente com botão "Atualizar" (location.reload()).
// Sem isso, abas já abertas ficam no bundle antigo até reload manual.
import { useEffect } from "react";
import { toast } from "sonner";

const POLL_MS = 60_000;

/** Fingerprint estável dos assets hasheados (/assets/*.js|css) do HTML. */
function fingerprint(html: string): string {
  const matches = html.match(/\/assets\/[^"'\s]+\.(?:js|css)/g) ?? [];
  return Array.from(new Set(matches)).sort().join("|");
}

async function fetchFingerprint(): Promise<string | null> {
  try {
    const res = await fetch("/", { cache: "no-store" });
    if (!res.ok) return null;
    return fingerprint(await res.text());
  } catch {
    return null;
  }
}

export function VersionWatcher() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let baseline: string | null = null;
    let stopped = false;

    const check = async () => {
      if (stopped) return;
      const latest = await fetchFingerprint();
      if (!latest) return;
      if (baseline === null) {
        baseline = latest; // primeira leitura = versão carregada
        return;
      }
      if (latest !== baseline) {
        stopped = true;
        window.removeEventListener("focus", check);
        toast("Nova versão disponível", {
          description: "Atualize para carregar as últimas correções.",
          duration: Infinity,
          action: { label: "Atualizar", onClick: () => window.location.reload() },
        });
      }
    };

    void check(); // estabelece baseline
    const timer = setInterval(() => void check(), POLL_MS);
    window.addEventListener("focus", check);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, []);

  return null;
}
