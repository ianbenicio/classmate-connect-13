// Seletor de projeto-alvo do super_admin, visível no header.
// Super_admin é cross-projeto: escolhe aqui qual tenant manipular. A escolha
// persiste via setSuperAdminOverride (localStorage) e o app recarrega para
// re-inicializar as stores com o novo project_id. Usuários normais não veem
// este controle — o tenant deles vem de profiles.project_id.
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProjetos } from "@/lib/projetos-store";
import { getSuperAdminOverride, setSuperAdminOverride } from "@/lib/current-project";

export function ProjectSwitcher() {
  const { isSuperAdmin, currentProject } = useAuth();
  const projetos = useProjetos();

  // Só super_admin troca de tenant.
  if (!isSuperAdmin()) return null;

  const activeId = currentProject?.id ?? getSuperAdminOverride();
  const label = currentProject?.nome ?? "Escolher projeto";

  function selecionar(id: string) {
    if (id === activeId) return;
    setSuperAdminOverride(id);
    // Reload p/ re-inicializar as stores (singletons) com o novo project_id.
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 max-w-[180px]"
          title="Projeto-alvo (super-admin)"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
          Projeto-alvo (super)
        </DropdownMenuLabel>
        {projetos.length === 0 ? (
          <DropdownMenuItem disabled>Nenhum projeto disponível</DropdownMenuItem>
        ) : (
          projetos.map((p) => {
            const active = p.id === activeId;
            return (
              <DropdownMenuItem key={p.id} onClick={() => selecionar(p.id)}>
                <Building2 className="h-4 w-4 mr-2" />
                <span className="flex-1 truncate">{p.nome}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
