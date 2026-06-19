import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "ensure_folder" | "create_plan_doc" | "verify";
type EvidenceType = "plano_aula" | "chamada_arquivo";

type RequestBody = {
  action: Action;
  agendamentoId: string;
  planoDados?: Record<string, string>;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
};

type AgendamentoRow = {
  id: string;
  turma_id: string;
  data: string;
  inicio: string;
  fim: string;
  atividade_ids: unknown;
  professor: string | null;
  professor_user_id: string | null;
  project_id: string;
};

type TurmaRow = {
  id: string;
  cod: string;
  nome: string;
  curso_id: string;
};

type CursoRow = {
  id: string;
  cod: string;
  nome: string;
};

type AtividadeRow = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  descricao_conteudo: string | null;
  objetivo_resultados: string | null;
  roteiro: unknown;
  materiais: unknown;
  habilidade_ids: unknown;
  rubricas: unknown;
  sugestoes_pais: string | null;
  criterios_sucesso: string | null;
};

type AulaContext = {
  agendamento: AgendamentoRow;
  turma: TurmaRow;
  curso: CursoRow;
  atividades: AtividadeRow[];
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function base64Url(bytes: Uint8Array | string) {
  const text = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pathSafe(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeDriveQuery(input: string) {
  return input.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function getAtividadeIds(agendamento: AgendamentoRow): string[] {
  return Array.isArray(agendamento.atividade_ids)
    ? agendamento.atividade_ids.filter((id): id is string => typeof id === "string")
    : [];
}

function getAtividadePrincipal(ctx: AulaContext): AtividadeRow | null {
  const ids = getAtividadeIds(ctx.agendamento);
  return ids.map((id) => ctx.atividades.find((a) => a.id === id)).find(Boolean) ?? null;
}

function getCodigoAula(ctx: AulaContext): string {
  return getAtividadePrincipal(ctx)?.codigo ?? "AULA";
}

function getPastaAulaDrivePath(ctx: AulaContext): string {
  const curso = pathSafe(ctx.curso.cod || ctx.curso.nome || "curso");
  const turma = pathSafe(ctx.turma.cod || ctx.turma.nome || "turma");
  const aula = pathSafe(`${getCodigoAula(ctx)}_${ctx.agendamento.data}`);
  return `${curso}/${turma}/${aula}/${ctx.agendamento.id}/`;
}

function getNomeBase(ctx: AulaContext, tipo: EvidenceType) {
  const suffix = tipo === "plano_aula" ? "plano-aula" : "chamada";
  return `${pathSafe(getCodigoAula(ctx))}_${ctx.agendamento.data}_${suffix}`;
}

function getExpectedNames(ctx: AulaContext, tipo: EvidenceType) {
  const base = getNomeBase(ctx, tipo);
  if (tipo === "plano_aula") return [base, `${base}.docx`];
  return [`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.pdf`];
}

function isValidMime(tipo: EvidenceType, mimeType: string) {
  if (tipo === "plano_aula") {
    return (
      mimeType === "application/vnd.google-apps.document" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }
  return ["image/jpeg", "image/png", "application/pdf"].includes(mimeType);
}

function makePlanHtml(ctx: AulaContext, dados: Record<string, string>) {
  const title = `${getCodigoAula(ctx)} - Plano de aula - ${ctx.agendamento.data}`;
  const fields: Array<[string, string]> = [
    ["Curso", `${ctx.curso.cod} - ${ctx.curso.nome}`],
    ["Turma", `${ctx.turma.cod} - ${ctx.turma.nome}`],
    ["Data/Horario", `${ctx.agendamento.data} ${ctx.agendamento.inicio}-${ctx.agendamento.fim}`],
    ["Professor", ctx.agendamento.professor ?? ""],
    ["Objetivos", dados.objetivos ?? ""],
    ["Conteudo/Ementa", dados.conteudoEmenta ?? ""],
    ["Roteiro", dados.roteiro ?? ""],
    ["Materiais", dados.materiais ?? ""],
    ["Habilidades trabalhadas", dados.habilidades ?? ""],
    ["Forma de avaliacao", dados.formaAvaliacao ?? ""],
    ["Observacoes do professor", dados.observacoesProfessor ?? ""],
    ["Sugestao de interacao com os pais", dados.sugestaoPais ?? ""],
  ];

  const sections = fields
    .map(
      ([label, value]) =>
        `<h2>${escapeHtml(label)}</h2><p>${escapeHtml(value || "-").replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
<h1>${escapeHtml(title)}</h1>
${sections}
</body>
</html>`;
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: serviceAccount.token_uri || GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const pem = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(serviceAccount.token_uri || GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`google_token_failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("google_token_missing");
  return data.access_token;
}

async function driveFetch<T>(accessToken: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`drive_failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function findFolder(accessToken: string, parentId: string, name: string) {
  const q = [
    "mimeType='application/vnd.google-apps.folder'",
    `name='${escapeDriveQuery(name)}'`,
    `'${escapeDriveQuery(parentId)}' in parents`,
    "trashed=false",
  ].join(" and ");
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const data = await driveFetch<{ files: DriveFile[] }>(accessToken, url);
  return data.files[0] ?? null;
}

async function createFolder(accessToken: string, parentId: string, name: string) {
  return driveFetch<DriveFile>(
    accessToken,
    `${DRIVE_API}/files?fields=id,name,mimeType,webViewLink&supportsAllDrives=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    },
  );
}

async function ensureFolderPath(accessToken: string, rootFolderId: string, path: string) {
  const parts = path
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  let parentId = rootFolderId;
  let current: DriveFile | null = null;
  for (const part of parts) {
    current = await findFolder(accessToken, parentId, part);
    if (!current) current = await createFolder(accessToken, parentId, part);
    parentId = current.id;
  }
  if (!current) throw new Error("folder_path_empty");
  return current;
}

async function navigateFolderPath(accessToken: string, rootFolderId: string, path: string) {
  const parts = path
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  let parentId = rootFolderId;
  let current: DriveFile | null = null;
  for (const part of parts) {
    current = await findFolder(accessToken, parentId, part);
    if (!current) return null;
    parentId = current.id;
  }
  return current;
}

async function listFiles(accessToken: string, folderId: string) {
  const q = [`'${escapeDriveQuery(folderId)}' in parents`, "trashed=false"].join(" and ");
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const data = await driveFetch<{ files: DriveFile[] }>(accessToken, url);
  return data.files ?? [];
}

async function createGoogleDoc(accessToken: string, folderId: string, name: string, html: string) {
  const boundary = `aula-evidencias-${crypto.randomUUID()}`;
  const metadata = {
    name,
    mimeType: "application/vnd.google-apps.document",
    parents: [folderId],
  };
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return driveFetch<DriveFile>(
    accessToken,
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink&supportsAllDrives=true`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
}

async function readSettings(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("system_settings")
    .select("key,value")
    .in("key", ["integration.drive.service_account_json", "integration.drive.root_folder_id"]);
  if (error) throw new Error(`settings_failed: ${error.message}`);

  const map = new Map(
    (data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]),
  );
  const rootFolderId = String(map.get("integration.drive.root_folder_id") ?? "").trim();
  const rawSa = map.get("integration.drive.service_account_json");
  const serviceAccountJson = typeof rawSa === "string" ? rawSa : JSON.stringify(rawSa ?? "");
  if (!rootFolderId) throw new Error("drive_root_folder_missing");
  if (!serviceAccountJson || serviceAccountJson === '""') {
    throw new Error("drive_service_account_missing");
  }
  const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("drive_service_account_invalid");
  }
  return { rootFolderId, serviceAccount };
}

async function loadContext(supabase: ReturnType<typeof createClient>, agendamentoId: string) {
  const { data: agendamento, error: agError } = await supabase
    .from("agendamentos")
    .select("id,turma_id,data,inicio,fim,atividade_ids,professor,professor_user_id,project_id")
    .eq("id", agendamentoId)
    .maybeSingle();
  if (agError || !agendamento) throw new Error("agendamento_not_found");

  const { data: turma, error: turmaError } = await supabase
    .from("turmas")
    .select("id,cod,nome,curso_id")
    .eq("id", (agendamento as AgendamentoRow).turma_id)
    .maybeSingle();
  if (turmaError || !turma) throw new Error("turma_not_found");

  const { data: curso, error: cursoError } = await supabase
    .from("cursos")
    .select("id,cod,nome")
    .eq("id", (turma as TurmaRow).curso_id)
    .maybeSingle();
  if (cursoError || !curso) throw new Error("curso_not_found");

  const atividadeIds = getAtividadeIds(agendamento as AgendamentoRow);
  const { data: atividades, error: atividadesError } =
    atividadeIds.length > 0
      ? await supabase
          .from("atividades")
          .select(
            "id,codigo,nome,descricao,descricao_conteudo,objetivo_resultados,roteiro,materiais,habilidade_ids,rubricas,sugestoes_pais,criterios_sucesso",
          )
          .in("id", atividadeIds)
      : { data: [], error: null };
  if (atividadesError) throw new Error("atividades_failed");

  return {
    agendamento: agendamento as AgendamentoRow,
    turma: turma as TurmaRow,
    curso: curso as CursoRow,
    atividades: (atividades ?? []) as AtividadeRow[],
  };
}

async function assertAuthorized(
  supabase: ReturnType<typeof createClient>,
  authHeader: string,
  agendamento: AgendamentoRow,
) {
  const jwt = authHeader.replace("Bearer ", "");
  const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !authData?.user) throw json({ error: "Unauthorized" }, 401);

  const callerId = authData.user.id;
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  if (rolesError) throw new Error("role_check_failed");

  const roleList = ((roles ?? []) as Array<{ role: string }>).map((r) => r.role);
  const privileged = roleList.some((role) =>
    ["super_admin", "admin", "coordenacao"].includes(role),
  );
  const professorDaAula =
    !!agendamento.professor_user_id && agendamento.professor_user_id === callerId;
  if (!privileged && !professorDaAula) throw json({ error: "Forbidden" }, 403);
  return { callerId, roleList };
}

async function upsertEvidence(
  supabase: ReturnType<typeof createClient>,
  patch: {
    agendamento_id: string;
    tipo: EvidenceType;
    status: string;
    arquivo_nome?: string | null;
    arquivo_mime_type?: string | null;
    arquivo_url?: string | null;
    drive_file_id?: string | null;
    drive_folder_id?: string | null;
    submetido_por_user_id?: string | null;
    submetido_por_nome?: string | null;
    verificado_em?: string | null;
    observacao?: string | null;
    dados?: unknown;
    project_id: string;
  },
) {
  const { data: existing } = await supabase
    .from("aula_evidencias")
    .select("id,dados")
    .eq("agendamento_id", patch.agendamento_id)
    .eq("tipo", patch.tipo)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("aula_evidencias")
      .update({ ...patch, dados: patch.dados ?? existing.dados ?? {} })
      .eq("id", existing.id);
    if (error) throw new Error(`evidence_update_failed: ${error.message}`);
    return;
  }

  const { error } = await supabase.from("aula_evidencias").insert({
    ...patch,
    dados: patch.dados ?? {},
  });
  if (error) throw new Error(`evidence_insert_failed: ${error.message}`);
}

async function verifyEvidenceFiles(
  supabase: ReturnType<typeof createClient>,
  ctx: AulaContext,
  folder: DriveFile,
  files: DriveFile[],
  callerId: string,
) {
  const results = [];
  for (const tipo of ["plano_aula", "chamada_arquivo"] as EvidenceType[]) {
    const expectedNames = getExpectedNames(ctx, tipo).map((name) => name.toLowerCase());
    const foundByName = files.find((file) => expectedNames.includes(file.name.toLowerCase()));
    const valid = foundByName ? isValidMime(tipo, foundByName.mimeType) : false;
    const status = foundByName ? (valid ? "valido" : "invalido") : "pendente";
    const observacao = foundByName
      ? valid
        ? null
        : "Arquivo encontrado com tipo invalido."
      : "Arquivo esperado nao encontrado na pasta da aula.";

    await upsertEvidence(supabase, {
      agendamento_id: ctx.agendamento.id,
      tipo,
      status,
      arquivo_nome: foundByName?.name ?? null,
      arquivo_mime_type: foundByName?.mimeType ?? null,
      arquivo_url: foundByName?.webViewLink ?? null,
      drive_file_id: foundByName?.id ?? null,
      drive_folder_id: folder.id,
      submetido_por_user_id: foundByName ? callerId : null,
      verificado_em: new Date().toISOString(),
      observacao,
      project_id: ctx.agendamento.project_id,
    });

    results.push({
      tipo,
      status,
      expectedNames,
      file: foundByName ?? null,
      observacao,
    });
  }
  return results;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.action || !body.agendamentoId) {
    return json({ error: "action e agendamentoId sao obrigatorios" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const ctx = await loadContext(supabase, body.agendamentoId);
    const { callerId } = await assertAuthorized(supabase, authHeader, ctx.agendamento);
    const { rootFolderId, serviceAccount } = await readSettings(supabase);
    const accessToken = await getAccessToken(serviceAccount);
    const path = getPastaAulaDrivePath(ctx);

    if (body.action === "ensure_folder") {
      const folder = await ensureFolderPath(accessToken, rootFolderId, path);
      return json({ ok: true, path, folder });
    }

    if (body.action === "create_plan_doc") {
      const folder = await ensureFolderPath(accessToken, rootFolderId, path);
      const name = getNomeBase(ctx, "plano_aula");
      const existing = (await listFiles(accessToken, folder.id)).find(
        (file) =>
          file.name.toLowerCase() === name.toLowerCase() &&
          file.mimeType === "application/vnd.google-apps.document",
      );
      const doc =
        existing ??
        (await createGoogleDoc(
          accessToken,
          folder.id,
          name,
          makePlanHtml(ctx, body.planoDados ?? {}),
        ));

      await upsertEvidence(supabase, {
        agendamento_id: ctx.agendamento.id,
        tipo: "plano_aula",
        status: "valido",
        arquivo_nome: doc.name,
        arquivo_mime_type: doc.mimeType,
        arquivo_url: doc.webViewLink ?? null,
        drive_file_id: doc.id,
        drive_folder_id: folder.id,
        submetido_por_user_id: callerId,
        verificado_em: new Date().toISOString(),
        observacao: existing
          ? "Google Docs existente reutilizado."
          : "Google Docs criado pelo sistema.",
        dados: body.planoDados ?? {},
        project_id: ctx.agendamento.project_id,
      });

      return json({ ok: true, path, folder, file: doc, reused: !!existing });
    }

    if (body.action === "verify") {
      const folder = await navigateFolderPath(accessToken, rootFolderId, path);
      if (!folder) {
        return json({ ok: false, error: "folder_not_found", path });
      }
      const files = await listFiles(accessToken, folder.id);
      const results = await verifyEvidenceFiles(supabase, ctx, folder, files, callerId);
      return json({ ok: true, path, folder, files, results });
    }

    return json({ error: "acao_desconhecida" }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : String(error);
    console.error("[aula-evidencias-drive]", message);
    return json({ ok: false, error: message }, 200);
  }
});
