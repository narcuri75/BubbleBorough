# Friend invite delivery

This Edge Function sends the in-game friend invitation through Resend. It validates the caller's Supabase access token and sends one private message per recipient.

Configure the function secrets before deployment:

```sh
supabase secrets set RESEND_API_KEY=re_... INVITE_FROM_EMAIL="Bubble Borough <noreply@bubbleborough.com>"
supabase functions deploy send-friend-invite
```

The sender address must use a domain verified in Resend. Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to hosted Edge Functions.
