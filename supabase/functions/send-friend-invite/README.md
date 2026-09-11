# Friend invite delivery

This Edge Function sends the in-game friend invitation through Supabase Auth. It validates the caller's Supabase access token itself, then calls `auth.admin.inviteUserByEmail()` once per recipient. Supabase sends the project's configured **Invite user** template through the same Auth email provider used for password resets.

## Why JWT verification is disabled for this function

Browser calls with `Authorization` require a CORS preflight request first. That `OPTIONS` request does not carry the user's bearer token. If Supabase's platform-level `verify_jwt` check is enabled, the gateway can reject the preflight before the function's CORS handler runs.

`supabase/config.toml` therefore contains:

```toml
[functions.send-friend-invite]
verify_jwt = false
```

The function is still protected. The actual `POST` must include a bearer token, and the function validates that token against Supabase Auth before sending any email.

## Configure email delivery

Configure Supabase Auth SMTP and the **Invite user** email template in the Supabase dashboard. No separate `RESEND_API_KEY` Edge Function secret is required. Supabase automatically supplies the hosted function with its server-side project credentials; those credentials must never be exposed to the browser.

## Deploy

From the project root:

```sh
supabase functions deploy send-friend-invite
```

The deploy command reads `supabase/config.toml`, so the browser preflight can reach the function.
