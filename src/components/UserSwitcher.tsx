import { UserCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { authStore, useCurrentUser } from "@/lib/auth-store";
import { USERS } from "@/lib/users";

export function UserSwitcher() {
  const user = useCurrentUser();
  return (
    <div className="flex items-center gap-2">
      <UserCircle className="h-4 w-4 text-muted-foreground" />
      <Select value={user.id} onValueChange={(v) => authStore.setById(v)}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {USERS.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <span className="inline-flex items-center gap-2">
                {u.nome}
                <Badge
                  variant={u.role === "admin" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {u.role}
                </Badge>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
