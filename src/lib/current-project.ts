// =====================================================================
// current-project — singleton do projeto/tenant ativo (espelho do auth)
// =====================================================================
// Stores não-hooks (alunos-store, agendamentos-store, etc.) precisam saber
// o `project_id` ativo para stampar em inserts sem dependerem de React
// context. Singleton populado pelo AuthProvider via `setCurrentProjectId`
// e lido por qualquer módulo.
//
// Para super_admin: pode escolher manualmente um projeto-alvo via
// `setSuperAdminOverride(id)`. Override persiste em localStorage e
// tem prioridade sobre o projeto do auth.
//
// H2: stores que precisam stampar `project_id` em INSERT devem chamar
// `requireProjectIdForWrite()` em vez de `getCurrentProjectId()`:
// dispara toast para super sem override em vez de gravar sem tenant.

import { toast } from "sonner";

const LS_KEY = "javis:super_project_override";

let _currentProjectId: string | null = null;
let _superOverride: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY) : null;
let _isSuperAdmin = false;

export function setCurrentProjectId(id: string | null): void {
  _currentProjectId = id;
}

export function setIsSuperAdmin(v: boolean): void {
  _isSuperAdmin = v;
}

/** Define o projeto que o super_admin escolheu manipular (persistido). */
export function setSuperAdminOverride(id: string | null): void {
  _superOverride = id;
  if (typeof localStorage !== "undefined") {
    if (id) localStorage.setItem(LS_KEY, id);
    else localStorage.removeItem(LS_KEY);
  }
}

export function getSuperAdminOverride(): string | null {
  return _superOverride;
}

/** Lê o projeto ativo de forma síncrona. Override do super tem prioridade. */
export function getCurrentProjectId(): string | null {
  if (_isSuperAdmin && _superOverride) return _superOverride;
  return _currentProjectId;
}

/**
 * Versão para INSERT que **exige** projeto definido.
 * Retorna o id se houver. Para super sem override, dispara toast e
 * retorna null — caller deve abortar o write em vez de gravar órfão.
 */
export function requireProjectIdForWrite(): string | null {
  const id = getCurrentProjectId();
  if (!id && _isSuperAdmin) {
    toast.error(
      "Super-admin: escolha um projeto-alvo antes de gravar (header → seletor de projeto).",
    );
  }
  return id;
}
