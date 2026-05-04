import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComparativoTurmasReport } from "@/components/relatorios/ComparativoTurmasReport";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/coordenacao/relatorios/comparativo-turmas")({
  component: ComparativoTurmasRoute,
});

function ComparativoTurmasRoute() {
  const { hasRole } = useAuth();
  const canAccess = hasRole("admin") || hasRole("coordenacao");

  if (!canAccess) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Este relatório é exclusivo para usuários com perfil Admin ou Coordenação.
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
                Coordenação
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">Comparativo de Turmas</span>
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <ComparativoTurmasReport />
      </div>
    </div>
  );
}
