import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressoCursosTurmasReport } from "@/components/relatorios/ProgressoCursosTurmasReport";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/coordenacao/relatorios/progresso-cursos-turmas")({
  component: ProgressoCursosTurmasRoute,
});

function ProgressoCursosTurmasRoute() {
  const { hasRole, isSuperAdmin } = useAuth();
  const canAccess = hasRole("admin") || hasRole("coordenacao") || isSuperAdmin();

  if (!canAccess) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Este relatorio e exclusivo para usuarios com perfil Admin ou Coordenacao.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/coordenacao">
                <ArrowLeft /> Voltar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/coordenacao" className="flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Coordenacao
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">Progressao por curso e turma</span>
          </div>
        </div>
      </div>
      <main className="container mx-auto max-w-6xl px-4 py-6">
        <ProgressoCursosTurmasReport />
      </main>
    </div>
  );
}
