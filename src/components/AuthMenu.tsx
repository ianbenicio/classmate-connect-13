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
import { LogOut, User, GraduationCap } from "lucide-react";
import { MeuPerfilProfessorDialog } from "@/components/MeuPerfilProfessorDialog";

export function AuthMenu() {
  const { user, displayName, roles, isAuthenticated, hasRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [perfilOpen, setPerfilOpen] = useState(false);

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
          {isProfessor && (
            <>
              <DropdownMenuItem onClick={() => setPerfilOpen(true)}>
                <GraduationCap className="h-4 w-4 mr-2" />
                Meu perfil
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

      {isProfessor && (
        <MeuPerfilProfessorDialog open={perfilOpen} onOpenChange={setPerfilOpen} />
      )}
    </>
  );
}
