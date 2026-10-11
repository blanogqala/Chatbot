# Chat functionality repair — appearance retained

## Activate

1. Create a Free-plan Groq key at https://console.groq.com/keys. Free-plan quotas apply. No paid fallback is configured.
2. Set `GROQ_API_KEY` and optionally `GROQ_MODEL=llama-3.3-70b-versatile` in the Supabase project's Edge Function secrets. Do not add these to VITE_ variables or source control.
3. Set frontend `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` if using a different project. The existing public project identifiers remain the default for compatibility. The server service-role key is supplied by Supabase only.
4. Deploy the `chat` Edge Function using the root `supabase/config.toml`. Public visitor chat is supported; signed-in JWTs are verified inside the handler. The server ignores client-supplied user IDs.
5. Ensure existing `scraped_content` contains reviewed CAPACITI reference information, and that `chat_history` exists. Verify its row-level security allows users to read only their own history. This change does not overwrite database policies or manufacture programme facts.
6. Build with `npm install` then `npm run build`; deploy `dist`. The included Netlify SPA redirect supports `/auth` and other client routes.

## Fixed

- OpenAI subscription dependency replaced with server-side Groq.
- Input validation, timeout, free-quota/configuration failures and response validation.
- Exactly one server-side history write per conversation turn; no duplicate frontend write.
- User identity comes from verified JWT, not an arbitrary body.userId.
- Recent saved context included in signed-in conversations; old conversations cleared on account change.
- Failed messages remain available to retry; history-save failure does not discard a valid answer.
- Function JWT configuration moved to the correct root location.
- Basic per-instance rate guard. Use platform/shared rate controls for a larger public deployment; account-wide provider quotas still apply.

## Verification

`node --test tests/*.test.mjs` covers mocked anonymous/signed-in chat, spoofed IDs, invalid sessions, invalid input, missing configuration, quota, rate limiting and failed history saving. `npm run build` compiles the frontend. Real Supabase availability, reference content, RLS, account configuration and live Groq generation need verification after deployment; no real credentials or messages were used in tests.

Browser verification also passed: Start Chatting opens the widget; a mocked answer renders; a mocked quota error preserves the question for retry. The existing hero buttons are now connected to the chat widget. No appearance redesign was performed.
