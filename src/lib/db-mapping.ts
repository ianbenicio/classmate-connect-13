// Mapeamento determinístico seed-id (string textual) → UUID v5.
// Permite usar os IDs do SEED preservando relações ao gravar nas tabelas
// que exigem UUID. Idempotente: o mesmo seed-id sempre vira o mesmo UUID.
import { v5 as uuidv5, validate as uuidValidate } from "uuid";

// Namespace fixo (gerado uma vez). NÃO ALTERAR — quebraria os IDs já gravados.
const NAMESPACE = "6f1d7c2e-5b6a-4f3e-9c8d-1a2b3c4d5e6f";

/** Converte um id (seed textual ou já-UUID) em UUID estável. */
export function toUuid(id: string): string {
  if (!id) return id;
  if (uuidValidate(id)) return id;
  return uuidv5(id, NAMESPACE);
}

export function toUuidArray(ids: string[] | undefined | null): string[] {
  return (ids ?? []).map(toUuid);
}
