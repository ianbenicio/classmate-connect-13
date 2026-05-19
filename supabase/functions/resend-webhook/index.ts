// =====================================================================
// resend-webhook — Bounce/complaint handler (C1.3)
// =====================================================================
// Recebe eventos do Resend, verifica assinatura Svix, atualiza
// responsaveis.email_status.
//
// Eventos tratados:
//   email.bounced    → email_status = 'bounced'
//   email.complained → email_status = 'complained'
//   email.delivered  → email_status = 'valid'
//   outros           → log only

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ---------------------------------------------------------------------------
// Svix signature verification
// See: https://docs.resend.com/changelog/2024/webhooks-signing
// ---------------------------------------------------------------------------
async function verifySignature(payload: string, headers: Headers): Promise<boolean> {
  if (!RESEND_WEBHOOK_SECRET) {
    console.warn("[resend-webhook] RESEND_WEBHOOK_SECRET não configurado — skip verify");
    return true; // dev mode
  }

  const svixId        = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Rejeita timestamps > 5 minutos
  const ts = parseInt(svixTimestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

  // Secret = "whsec_<base64>"
  const base64Secret = RESEND_WEBHOOK_SECRET.replace(/^whsec_/, "");
  const secretBytes = Uint8Array.from(atob(base64Secret), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent),
  );

  const computed = "v1," + btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  return svixSignature.split(" ").some((s) => s === computed);
}

// ---------------------------------------------------------------------------
// Event → status map
// ---------------------------------------------------------------------------
const EVENT_STATUS: Record<string, string> = {
  "email.bounced":   "bounced",
  "email.complained": "complained",
  "email.delivered": "valid",
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const rawBody = await req.text();

  const valid = await verifySignature(rawBody, req.headers);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  let event: {
    type: string;
    data: { email_id?: string; to?: string[] };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const newStatus = EVENT_STATUS[event.type];
  const toEmail   = event.data?.to?.[0];

  console.log(`[resend-webhook] event=${event.type} to=${toEmail} → status=${newStatus ?? "skip"}`);

  if (newStatus && toEmail) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase
      .from("responsaveis")
      .update({ email_status: newStatus })
      .eq("email", toEmail);

    if (error) {
      // Log mas retorna 200: Resend não deve fazer retry por erro interno
      console.error("[resend-webhook] update error", error);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
