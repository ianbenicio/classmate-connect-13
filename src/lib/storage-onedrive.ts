// =====================================================================
// OneDriveStorage — implementação IntegracaoStorage (Sprint E2, placeholder)
// =====================================================================
// TODO Sprint E2: implementar OAuth2 MS Graph + operações reais.
// Por enquanto lança StorageError para indicar "não disponível".

import type {
  IntegracaoStorage,
  FolderEntry,
  StorageCredentialStatus,
  StorageProvider,
} from "./storage-interface";
import { StorageError } from "./storage-interface";

export class OneDriveStorage implements IntegracaoStorage {
  readonly provider: StorageProvider = "onedrive";

  listFiles(_folderId: string): Promise<FolderEntry[]> {
    throw new StorageError("onedrive", "Sprint E2 pendente — OneDrive não implementado ainda.");
  }

  navigateFolder(_path: string): Promise<FolderEntry | null> {
    throw new StorageError("onedrive", "Sprint E2 pendente — OneDrive não implementado ainda.");
  }

  validateCredentials(): Promise<StorageCredentialStatus> {
    return Promise.resolve({
      valid: false,
      error: "Sprint E2 pendente — conecte via Configurações → OneDrive quando disponível.",
    });
  }
}
