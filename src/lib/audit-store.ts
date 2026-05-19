// =====================================================================
// audit-store — Queries paginadas em audit_events (A3.3)
// =====================================================================
// Read-only. Não usa reactive store — o dialog controla estado.
// Join com profiles para display_name do usuário.

import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "insert"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "consent"
  | "export"
  | "custom";

export interface AuditEvent {
  id: string;
  ts: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  user_display: string | null; // joined from profiles
  project_id: string | null;
  ip: string | null;
  user_agent: string | null;
  before_json: unknown;
  after_json: unknown;
}

export interface AuditFilter {
  action?: AuditAction | "";
  entity_type?: string;
  date_from?: string; // ISO date YYYY-MM-DD
  date_to?: string; // ISO date YYYY-MM-DD
  user_search?: string;
}

export interface AuditPage {
  rows: AuditEvent[];
  total: number;
}

export const PAGE_SIZE = 50;

export async function fetchAuditPage(page: number, filter: AuditFilter): Promise<AuditPage> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (supabase as any).from("audit_events").select(
    `id, ts, action, entity_type, entity_id, user_id, project_id, ip, user_agent, before_json, after_json,
       profiles!audit_events_user_id_fkey(display_name, email)`,
    { count: "exact" },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = base;

  if (filter.action) {
    q = q.eq("action", filter.action);
  }
  if (filter.entity_type) {
    q = q.ilike("entity_type", `%${filter.entity_type}%`);
  }
  if (filter.date_from) {
    q = q.gte("ts", `${filter.date_from}T00:00:00Z`);
  }
  if (filter.date_to) {
    q = q.lte("ts", `${filter.date_to}T23:59:59Z`);
  }

  q = q.order("ts", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const { data, error, count } = await q;

  if (error) {
    console.error("[audit] fetchAuditPage error", error);
    throw error;
  }

  type RawRow = {
    id: string;
    ts: string;
    action: AuditAction;
    entity_type: string;
    entity_id: string | null;
    user_id: string | null;
    project_id: string | null;
    ip: string | null;
    user_agent: string | null;
    before_json: unknown;
    after_json: unknown;
    profiles: { display_name: string | null; email: string | null } | null;
  };

  const rows: AuditEvent[] = ((data ?? []) as unknown as RawRow[])
    .filter((r) => {
      if (!filter.user_search) return true;
      const q2 = filter.user_search.toLowerCase();
      const name = (r.profiles?.display_name ?? "").toLowerCase();
      const email = (r.profiles?.email ?? "").toLowerCase();
      const uid = (r.user_id ?? "").toLowerCase();
      return name.includes(q2) || email.includes(q2) || uid.includes(q2);
    })
    .map((r) => ({
      id: r.id,
      ts: r.ts,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      user_id: r.user_id,
      user_display:
        r.profiles?.display_name ??
        r.profiles?.email ??
        (r.user_id ? r.user_id.slice(0, 8) + "…" : null),
      project_id: r.project_id,
      ip: r.ip,
      user_agent: r.user_agent,
      before_json: r.before_json,
      after_json: r.after_json,
    }));

  return { rows, total: count ?? 0 };
}

export function auditRowsToCsv(rows: AuditEvent[]): string {
  const headers = ["ts", "action", "entity_type", "entity_id", "user", "ip", "project_id"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [r.ts, r.action, r.entity_type, r.entity_id, r.user_display, r.ip, r.project_id]
        .map(escape)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export function downloadAuditCsv(rows: AuditEvent[]) {
  const csv = auditRowsToCsv(rows);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
