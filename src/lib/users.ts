// Usuários mock do sistema (sem backend ainda).
// Quando ativarmos Lovable Cloud, substituímos por auth real.

export type UserRole = "admin" | "professor" | "coordenacao";

export interface AppUser {
  id: string;
  nome: string;
  role: UserRole;
}

export const USERS: AppUser[] = [
  { id: "u-admin", nome: "Admin", role: "admin" },
  { id: "u-coord", nome: "Coordenação", role: "coordenacao" },
  { id: "u-celso", nome: "Celso", role: "professor" },
  { id: "u-anne", nome: "Anne", role: "professor" },
  { id: "u-gustavo", nome: "Gustavo", role: "professor" },
  { id: "u-manoel", nome: "Manoel", role: "professor" },
];

export const PROFESSOR_NAMES = USERS.filter((u) => u.role === "professor").map(
  (u) => u.nome,
);

/** Usuários com acesso a recursos da coordenação (inclui admin). */
export function isCoordenacao(user: { role: UserRole }): boolean {
  return user.role === "coordenacao" || user.role === "admin";
}
