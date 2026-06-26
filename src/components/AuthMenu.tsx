// Header user menu — sessão real (Supabase) com logout.
import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, FileText, Building2, Check } from "lucide-react";
import { MeuPerfilProfessorDialog } from "@/components/MeuPerfilProfessorDialog";
import { MeusRelatoriosDialog } from "@/components/MeusRelatoriosDialog";
import { useProjetos } from "@/lib/projetos-store";
import { getSuperAdminOverride, setSuperAdminOverride } from "@/lib/current-project";

export function AuthMenu() {
  const { user, displayName, roles, isAuthenticated, hasRole, isSuperAdmin, signOut, loading } =
    useAuth();
  const navigate = useNavigate();
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <Button asChild size="sm" variant="default">
        <Link to="/auth">Entrar</Link>
      </Button>
    );
  }

  const name = displayName || user?.email || "Usuário";
  const role = roles[0] ?? "sem papel";
  const isProfessor = hasRole("professor");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
              <span className="text-xs text-muted-foreground capitalize mt-1">Papel: {role}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isSuperAdmin() && <SuperAdminProjectItems />}
          <DropdownMenuItem onClick={() => setPerfilOpen(true)}>
            <User className="h-4 w-4 mr-2" />
            Meu perfil
          </DropdownMenuItem>
          {isProfessor && (
            <>
              <DropdownMenuItem onClick={() => setRelatoriosOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Meus relatórios
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={async () => {
              await signOut();
              void navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {perfilOpen && <MeuPerfilProfessorDialog open={perfilOpen} onOpenChange={setPerfilOpen} />}
      {isProfessor && relatoriosOpen && (
        <>
          <MeusRelatoriosDialog
            open={relatoriosOpen}
            onOpenChange={setRelatoriosOpen}
            mode="professor"
          />
        </>
      )}
    </>
  );
}

function SuperAdminProjectItems() {
  const projetos = useProjetos();
  const [override, setOverride] = useState<string | null>(getSuperAdminOverride());

  if (projetos.length === 0) return null;

  return (
    <>
      <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
        Projeto-alvo (super)
      </DropdownMenuLabel>
      {projetos.map((p) => {
        const active = override === p.id;
        return (
          <DropdownMenuItem
            key={p.id}
            onClick={() => {
              const next = active ? null : p.id;
              setSuperAdminOverride(next);
              setOverride(next);
              // Reload para re-stampar stores com novo project_id.
              window.location.reload();
            }}
          >
            <Building2 className="h-4 w-4 mr-2" />
            <span className="flex-1 truncate">{p.nome}</span>
            {active && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuSeparator />
    </>
  );
}
