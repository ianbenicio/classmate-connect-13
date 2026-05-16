// =====================================================================
// current-project — singleton do projeto/tenant ativo (espelho do auth)
// =====================================================================
// Stores não-hooks (alunos-store, agendamentos-store, etc.) precisam saber
// o `project_id` ativo para stampar em inserts sem dependerem de React
// context. Singleton populado pelo AuthProvider via `setCurrentProjectId`
// e lido por qualquer módulo.
//
// Para super_admin sem vínculo, valor é `null` — stores devem confiar nos
// DEFAULT do DB (javis) ou exigir seleção explícita em UI multi-tenant.

let _currentProjectId: string | null = null;

export function setCurrentProjectId(id: string | null): void {
  _currentProjectId = id;
}

/** Lê o projeto ativo de forma síncrona. Pode ser null antes do login. */
export function getCurrentProjectId(): string | null {
  return _currentProjectId;
}
