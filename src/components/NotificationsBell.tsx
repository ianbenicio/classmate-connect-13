import { Bell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  notificacoesStore,
  useNotificacoes,
} from "@/lib/notificacoes-store";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const notifs = useNotificacoes();
  const naoLidas = notifs.filter((n) => !n.lida).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificações"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
              {naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold text-sm">Notificações</div>
          {notifs.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => notificacoesStore.marcarTodasLidas()}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {notifs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {notifs.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "p-3 text-sm hover:bg-muted/40 cursor-pointer",
                    !n.lida && "bg-primary/5",
                  )}
                  onClick={() => notificacoesStore.marcarLida(n.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-medium text-xs">{n.titulo}</div>
                    <Badge
                      variant={n.destinatarioTipo === "professor" ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {n.destinatarioTipo === "professor" ? "Professor" : "Aluno"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    {n.mensagem}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(n.criadoEm), "dd/MM HH:mm", { locale: ptBR })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
