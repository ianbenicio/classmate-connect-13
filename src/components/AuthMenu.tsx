// Header user menu — sessão real (Supabase) com logout.
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
import { LogOut, User } from "lucide-react";

export function AuthMenu() {
  const { user, displayName, roles, isAuthenticated, signOut, loading } = useAuth();
  const navigate = useNavigate();

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

  return (
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
  );
}
