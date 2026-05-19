// =====================================================================
// GoogleDriveStorage — implementação IntegracaoStorage (Sprint E1.1)
// =====================================================================
// Client-side adapter — delega operações de Drive à Edge Function
// check-tarefa-storage (a ser criada em Sprint E1.2).
//
// Operações de baixo nível (autenticação service account, chamadas
// Google API) ficam no servidor para proteger credenciais.

import type {
  IntegracaoStorage,
  FolderEntry,
  StorageCredentialStatus,
  StorageProvider,
} from "./storage-interface";
import { StorageError } from "./storage-interface";
import { settingsStore } from "./settings-store";
import { supabase } from "@/integrations/supabase/client";

export class GoogleDriveStorage implements IntegracaoStorage {
  readonly provider: StorageProvider = "google";

  private get rootFolderId(): string {
    return settingsStore.get<string>("integration.drive.root_folder_id", "");
  }

  async listFiles(folderId: string): Promise<FolderEntry[]> {
    if (!folderId) return [];
    try {
      const { data, error } = await supabase.functions.invoke("check-tarefa-storage", {
        body: { action: "list", folder_id: folderId, provider: "google" },
      });
      if (error) throw error;
      return (data as { files: FolderEntry[] })?.files ?? [];
    } catch (e) {
      throw new StorageError("google", "listFiles falhou", e);
    }
  }

  async navigateFolder(path: string): Promise<FolderEntry | null> {
    const rootId = this.rootFolderId;
    if (!rootId) throw new StorageError("google", "root_folder_id não configurado");
    try {
      const { data, error } = await supabase.functions.invoke("check-tarefa-storage", {
        body: { action: "navigate", path, root_folder_id: rootId, provider: "google" },
      });
      if (error) throw error;
      return (data as { folder: FolderEntry | null })?.folder ?? null;
    } catch (e) {
      throw new StorageError("google", "navigateFolder falhou", e);
    }
  }

  async validateCredentials(): Promise<StorageCredentialStatus> {
    try {
      const { data, error } = await supabase.functions.invoke("check-tarefa-storage", {
        body: { action: "validate", provider: "google" },
      });
      if (error) throw error;
      const result = data as { valid: boolean; validated_at?: string; error?: string };
      return {
        valid: result.valid,
        validatedAt: result.validated_at,
        error: result.error,
      };
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
