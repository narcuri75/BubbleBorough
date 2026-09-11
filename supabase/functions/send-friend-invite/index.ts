const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("INVITE_FROM_EMAIL") || "Bubble Borough <noreply@bubbleborough.com>";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Sign in before sending invites." }, 401);
  if (!supabaseUrl || !supabaseAnonKey || !resendApiKey) return json({ error: "Invite delivery is not configured." }, 503);

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, Authorization: authorization },
  });
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
  const resendResponse = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  const resendText = await resendResponse.text();
  if (!resendResponse.ok) {
    console.error("Resend invite delivery failed", resendResponse.status, resendText);
    return json({ error: "Could not deliver the invites. Try again shortly." }, 502);
  }
  return json({ sent: emails.length });
});
