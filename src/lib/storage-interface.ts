// =====================================================================
// IntegracaoStorage — Interface comum de armazenamento (Sprint E1.1)
// =====================================================================
// Abstrai Google Drive e OneDrive atrás de uma interface unificada.
// Permite troca de provider sem alterar callers.
//
// Provider ativo: system_settings key "integration.storage.provider"
// Valores: "google" | "onedrive" | "none"

// ---------------------------------------------------------------------------
// Interface pública
// ---------------------------------------------------------------------------

export type StorageProvider = "google" | "onedrive" | "none";

export interface FolderEntry {
  id: string;
  name: string;
  type: "folder" | "file";
  mimeType?: string;
  webViewLink?: string;
}

export interface StorageCredentialStatus {
  valid: boolean;
  validatedAt?: string;
  error?: string;
}

/**
 * Interface comum para backends de armazenamento (Google Drive, OneDrive).
 * Cada método pode lançar `StorageError` em caso de falha.
 */
export interface IntegracaoStorage {
  readonly provider: StorageProvider;

  /**
   * Lista arquivos/subpastas dentro de `folderId`.
   * Retorna [] se a pasta estiver vazia ou não encontrada.
   */
  listFiles(folderId: string): Promise<FolderEntry[]>;

  /**
   * Navega em `path` relativo à pasta raiz configurada.
   * Ex.: navigateFolder("professor/turma/2025-01-10-AD01") → FolderEntry | null
   */
  navigateFolder(path: string): Promise<FolderEntry | null>;

  /**
   * Valida as credenciais configuradas.
   * Retorna status com flag `valid` e timestamp se OK.
   */
  validateCredentials(): Promise<StorageCredentialStatus>;
}

// ---------------------------------------------------------------------------
// StorageError
// ---------------------------------------------------------------------------

export class StorageError extends Error {
  constructor(
    public readonly provider: StorageProvider,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "StorageError";
  }
}

// ---------------------------------------------------------------------------
// NoneStorage — provider "none" (escola não usa storage)
// ---------------------------------------------------------------------------

export class NoneStorage implements IntegracaoStorage {
  readonly provider: StorageProvider = "none";

  listFiles(_folderId: string): Promise<FolderEntry[]> {
    return Promise.resolve([]);
  }

  navigateFolder(_path: string): Promise<FolderEntry | null> {
    return Promise.resolve(null);
  }

  validateCredentials(): Promise<StorageCredentialStatus> {
    return Promise.resolve({ valid: true, validatedAt: new Date().toISOString() });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Devolve a implementação correta de IntegracaoStorage baseada no provider.
 * GoogleDriveStorage e OneDriveStorage são importados dinamicamente para
 * evitar bundling desnecessário quando o provider não é usado.
 */
export async function createStorage(provider: StorageProvider): Promise<IntegracaoStorage> {
  switch (provider) {
    case "google": {
      const { GoogleDriveStorage } = await import("./storage-google-drive");
      return new GoogleDriveStorage();
    }
    case "onedrive": {
      const { OneDriveStorage } = await import("./storage-onedrive");
      return new OneDriveStorage();
    }
    case "none":
    default:
      return new NoneStorage();
  }
}
