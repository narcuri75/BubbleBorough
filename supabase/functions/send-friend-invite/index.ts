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
  const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("INVITE_FROM_EMAIL") || "Bubble Borough <noreply@bubbleborough.com>";

  if (!authorization.startsWith("Bearer ")) {
    return json({ error: "Sign in before sending invites." }, 401);
  }
  if (!supabaseUrl || !supabaseApiKey) {
    console.error("Friend invite auth validation is not configured.");
    return json({ error: "Invite authentication is not configured." }, 503);
  }
  if (!resendApiKey) {
    console.error("RESEND_API_KEY is missing from Edge Function secrets.");
    return json({ error: "Invite delivery is not configured." }, 503);
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

  const subject = "A friend invited you to Bubble Borough";
  const text = "A friend thinks you'd like Bubble Borough, a browser aquarium game where you build and care for your own underwater world.\n\nPlay here: https://bubbleborough.com/";
  const html = '<p>A friend thinks you\'d like <strong>Bubble Borough</strong>, a browser aquarium game where you build and care for your own underwater world.</p><p><a href="https://bubbleborough.com/">Play Bubble Borough</a></p>';
  const messages = emails.map((email) => ({ from, to: [email], subject, text, html }));

  let resendResponse: Response;
  try {
    resendResponse = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error("Could not reach Resend invite delivery", error);
    return json({ error: "Could not reach the invite delivery service. Try again shortly." }, 502);
  }

  const resendText = await resendResponse.text();
  if (!resendResponse.ok) {
    console.error("Resend invite delivery failed", resendResponse.status, resendText);
    return json({ error: "Could not deliver the invites. Try again shortly." }, 502);
  }

  return json({ sent: emails.length });
});
