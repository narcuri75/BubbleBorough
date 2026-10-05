import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function getSupabaseApiKey(request: Request) {
  const requestKey = request.headers.get("apikey")?.trim();
  if (requestKey) return requestKey;

  const singlePublishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")?.trim();
  if (singlePublishableKey) return singlePublishableKey;

  const legacyAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (legacyAnonKey) return legacyAnonKey;

  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")?.trim();
  if (!publishableKeys) return "";
  try {
    const parsed = JSON.parse(publishableKeys) as Record<string, unknown>;
    const defaultKey = typeof parsed.default === "string" ? parsed.default.trim() : "";
    if (defaultKey) return defaultKey;
    const firstKey = Object.values(parsed).find((value) => typeof value === "string" && value.trim());
    return typeof firstKey === "string" ? firstKey.trim() : "";
  } catch {
    return "";
  }
}

Deno.serve(async (request) => {
  // This must run before any auth checks. Browser preflight requests do not
  // include the user's bearer token.
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseApiKey = getSupabaseApiKey(request);
  const supabaseAdminKey = Deno.env.get("SUPABASE_SECRET_KEY")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || "";

  if (!authorization.startsWith("Bearer ")) {
    return json({ error: "Sign in before sending invites." }, 401);
  }
  if (!supabaseUrl || !supabaseApiKey || !supabaseAdminKey) {
    console.error("Friend invite auth validation is not configured.");
    return json({ error: "Invite authentication is not configured." }, 503);
  }

  let userResponse: Response;
  try {
    userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseApiKey, Authorization: authorization },
    });
  } catch (error) {
    console.error("Could not validate friend invite session", error);
    return json({ error: "Could not validate your session. Try again shortly." }, 502);
  }
  if (!userResponse.ok) return json({ error: "Your session expired. Sign in again." }, 401);

  let payload: { emails?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const emails = Array.isArray(payload.emails)
    ? [...new Set(payload.emails.map((value) => String(value).trim().toLowerCase()).filter(Boolean))]
    : [];
  if (!emails.length || emails.length > 20 || emails.some((email) => !isEmail(email))) {
    return json({ error: "Provide between 1 and 20 valid email addresses." }, 400);
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  let sent = 0;
  const failures: string[] = [];
  for (const email of emails) {
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://bubbleborough.com/",
    });
    if (error) {
      console.error("Supabase Auth friend invite failed", error.status, error.code);
      failures.push(email);
    } else {
      sent += 1;
    }
  }

  if (failures.length) {
    const error = sent
      ? `${sent} ${sent === 1 ? "invite was" : "invites were"} sent; ${failures.length} could not be sent.`
      : "Could not send the invites. The addresses may already have Bubble Borough accounts.";
    return json({ error, sent, failed: failures.length }, 502);
  }

  return json({ sent });
});
