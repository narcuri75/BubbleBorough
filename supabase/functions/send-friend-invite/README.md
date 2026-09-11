# Friend invite delivery

This Edge Function sends the in-game friend invitation through Resend. It validates the caller's Supabase access token itself and sends one private message per recipient.

## Why JWT verification is disabled for this function

Browser calls with `Authorization` require a CORS preflight request first. That `OPTIONS` request does not carry the user's bearer token. If Supabase's platform-level `verify_jwt` check is enabled, the gateway can reject the preflight before the function's CORS handler runs.

`supabase/config.toml` therefore contains:

```toml
[functions.send-friend-invite]
verify_jwt = false
```

The function is still protected. The actual `POST` must include a bearer token, and the function validates that token against Supabase Auth before sending any email.

## Configure Resend

Supabase Auth using Resend SMTP does not automatically expose that Resend API key to Edge Functions. Add the same Resend API key separately as an Edge Function secret:

```sh
supabase secrets set RESEND_API_KEY=re_... INVITE_FROM_EMAIL="Bubble Borough <noreply@bubbleborough.com>"
```

`INVITE_FROM_EMAIL` is optional because the function already defaults to `Bubble Borough <noreply@bubbleborough.com>`. The sender domain must be verified in Resend.

## Deploy

From the project root:

```sh
supabase functions deploy send-friend-invite
```

The deploy command reads `supabase/config.toml`, so the browser preflight can reach the function.
