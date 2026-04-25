import { useEffect, useState } from "react";
import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { ClipboardList, Sparkles } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/NotificationsBell";
import { AuthMenu } from "@/components/AuthMenu";
import { SkillsManagerDialog } from "@/components/academic/SkillsManagerDialog";
import { useAgendamentoScanner } from "@/lib/agendamento-scanner";
import { AuthProvider, useAuth } from "@/lib/auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Academia" },
      { name: "description", content: "Academia Flow é um sistema de gestão acadêmica para coordenadores e professores." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Academia" },
      { property: "og:description", content: "Academia Flow é um sistema de gestão acadêmica para coordenadores e professores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Academia" },
      { name: "twitter:description", content: "Academia Flow é um sistema de gestão acadêmica para coordenadores e professores." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/516c9d90-8c48-4eed-9734-213b1de8f03b" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/516c9d90-8c48-4eed-9734-213b1de8f03b" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

// Rotas públicas — não exigem autenticação.
const PUBLIC_ROUTES = new Set<string>(["/auth", "/reset-password"]);

function AppShell() {
  useAgendamentoScanner();
  const { hasRole, isStaff: isStaffFn, isAuthenticated, loading } = useAuth();
  const isStaff = isStaffFn();
  const isCoord = hasRole("admin") || hasRole("coordenacao");
  const [skillsOpen, setSkillsOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  // Auth gate: usuário não autenticado em rota privada → /auth.
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && !isPublic) {
      void navigate({ to: "/auth", replace: true });
    }
  }, [loading, isAuthenticated, isPublic, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!isAuthenticated && !isPublic) {
    // Aguarda o redirect — evita flash do shell autenticado.
    return null;
  }

  if (isPublic) {
    return (
      <>
        <Outlet />
        <Toaster />
      </>
    );
  }
  return (
    <>
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
          <Link to="/" className="font-bold tracking-tight">
            🎓 Acadêmico
          </Link>
          <nav className="flex items-center gap-4 text-sm flex-1">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground font-medium" }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Início
            </Link>
            <Link
              to="/cursos"
              activeProps={{ className: "text-foreground font-medium" }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Cursos
            </Link>
            <Link
              to="/atividades"
              activeProps={{ className: "text-foreground font-medium" }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Atividades
            </Link>
            <Link
              to="/alunos"
              activeProps={{ className: "text-foreground font-medium" }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Alunos
            </Link>
            {isStaff && (
              <Link
                to="/formularios"
                activeProps={{ className: "text-foreground font-medium" }}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Formulários
              </Link>
            )}
            {isStaff && (
              <button
                type="button"
                onClick={() => setSkillsOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Habilidades
              </button>
            )}
            {isCoord && (
              <Link
                to="/coordenacao"
                activeProps={{ className: "text-foreground font-medium" }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Coordenação
              </Link>
            )}
          </nav>
          <NotificationsBell />
          <AuthMenu />
        </div>
      </header>
      <Outlet />
      <Toaster />
      <SkillsManagerDialog open={skillsOpen} onOpenChange={setSkillsOpen} />
    </>
  );
}
