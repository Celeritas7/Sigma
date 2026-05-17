// supabase/functions/cross-check/index.ts
//
// Supabase Edge Function — proxies a prompt to the Anthropic Messages API
// and returns the text. Keeps your ANTHROPIC_API_KEY off the client.
//
// Setup (once):
//   1. Install the Supabase CLI: https://supabase.com/docs/guides/cli
//   2. From your project root:
//        supabase login
//        supabase link --project-ref wylxvmkcrexwfpjpbhyy
//   3. Put this file at:  supabase/functions/cross-check/index.ts
//   4. Set the secret (paste the value, no quotes):
//        supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   5. Deploy:
//        supabase functions deploy cross-check --no-verify-jwt
//
//      (the --no-verify-jwt flag lets your anon-key client call it without a
//       user session; the function itself is rate-limited by your anon key
//       and by Anthropic's API quota. If you want stricter auth, remove the
//       flag and pass a user JWT in the Authorization header.)
//
// Usage from the browser:
//   POST <SUPABASE_URL>/functions/v1/cross-check
//   headers: { apikey: <anon-key>, Authorization: Bearer <anon-key> }
//   body:    { prompt: "..." }
//   returns: { text: "..." }

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")
const MODEL = "claude-haiku-4-5"  // fast + cheap; swap for sonnet if you want sharper push-back
const MAX_TOKENS = 1024

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",  // tighten to your domain in production
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: CORS_HEADERS })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  }

  let body: { prompt?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid JSON body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  }

  const prompt = (body.prompt ?? "").trim()
  if (!prompt) {
    return new Response(
      JSON.stringify({ error: "prompt required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  }

  // Optional: very rough size guard so a runaway client can't burn your quota.
  if (prompt.length > 12_000) {
    return new Response(
      JSON.stringify({ error: "prompt too long" }),
      { status: 413, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return new Response(
        JSON.stringify({ error: `anthropic ${resp.status}`, detail: errText }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      )
    }

    const data = await resp.json()
    const text = (data?.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")

    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "proxy failed", detail: String(e?.message ?? e) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  }
})
