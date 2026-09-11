# Supabase authentication redirects

Bubble Borough uses `index.html` and the existing REST auth helper in
`public/app-src/core/cloud-save.js`. No SDK client, auth listener, magic-link
button, or separate callback document is needed.

Configure the hosted Supabase project with Site URL `https://bubbleborough.com/`
and these allowed redirect URLs:

- https://bubbleborough.com/
- https://bubbleborough.com/?auth=signup-confirmed
- https://bubbleborough.com/?auth=email-changed
- https://bubbleborough.com/?auth=recovery

Signup, email change, and recovery requests supply their respective redirect.
Keep authentication email links using Supabase's `{{ .ConfirmationURL }}` so
Supabase verifies the token before returning to the requested destination.
Secure Email Change can remain enabled; the UI tells users to complete every
required verification and does not claim completion while `new_email` remains.

Administrative invitations should use `redirectTo: 'https://bubbleborough.com/'`
and the Supabase confirmation link. Invite callbacks open ordinary Sign In /
Create Account / Forgot Password. Player invitations must not use admin auth APIs.

For Password Changed and Email Address Changed security notifications, link to
`https://bubbleborough.com/` for sign-in/account access. A plain recovery URL is
not a recovery credential: it shows instructions to request a fresh email using
Forgot Password. Never link to reset.html, confirm.html, or other absent files.

`handleAuthRoute()` is the only callback URL reader. It accepts the existing
implicit-flow hash credentials and query auth states. It validates callback
sessions with `/auth/v1/user`, isolates temporary sessions from cloud-save login,
and removes callback parameters using history.replaceState. A bare success URL
cannot assert that verification happened. `password-changed` success is issued
only after a successful authenticated password update. `reauth` requires a
pending action and is never sufficient to send a code on its own. Reauthentication
uses GET /auth/v1/reauthenticate only after `reauthentication_needed`, and retries
the password update with the nonce. Tokens/passwords are not written to URLs.

Return to Login clears the local auth session and temporary state, preserving
local aquarium saves. Submitting Change Email in Settings preserves the ordinary
session. Existing mobile gameplay restrictions remain, but auth cards can open
on small screens.

Validation: `npm test` includes mocked callback, session, request, rate limit,
reauthentication and duplicate-submission tests in `scripts/auth-flows.test.cjs`.
The hosted redirect allowlist, templates, email delivery, and both Secure Email
Change links still require an end-to-end check with a Supabase test account;
those dashboard settings are not stored in this repository.

Supabase references:
- https://supabase.com/docs/reference/javascript/auth-updateuser
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/auth/auth-email-templates
