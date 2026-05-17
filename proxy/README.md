# twok-lab-proxy

A ~150-line Cloudflare Worker that proxies the static 2K LAB site to the
Anthropic API. The site lives on GitHub Pages (no server), so this Worker
is the smallest possible backend: it holds the API key as a Cloudflare
secret and forwards `POST /v1/messages` to `api.anthropic.com`.

## Why

Anthropic's API blocks browser CORS. A static page can't call it directly
without baking the key into the bundle. This Worker fixes both problems:

- The key lives in CF as a secret, never shipped to the browser.
- Every response includes CORS headers, so the browser accepts them.
- Streaming (`text/event-stream`) is piped through untouched.

## Deploy (three commands)

```bash
cd proxy
npx wrangler@latest login
npx wrangler@latest secret put ANTHROPIC_API_KEY
npx wrangler@latest deploy
```

The deploy step prints the public URL, e.g.

```
Published twok-lab-proxy (1.23 sec)
  https://twok-lab-proxy.<your-cf-subdomain>.workers.dev
```

Copy that URL, open the site's **/connect** page, and paste it into the
**Worker proxy URL** card. The site will use the proxy from that point on
and ignore the in-browser Anthropic key.

## Verify it works

```bash
# health check
curl https://twok-lab-proxy.<your-subdomain>.workers.dev/
# -> ok

# end-to-end probe (uses 1 token)
curl -X POST https://twok-lab-proxy.<your-subdomain>.workers.dev/v1/messages \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-6","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}'
```

## Endpoints

| Method | Path           | Behavior                                                  |
| ------ | -------------- | --------------------------------------------------------- |
| GET    | `/`            | `200 ok` — health check                                   |
| GET    | `/health`      | `200 ok` — alias for `/`                                  |
| OPTIONS| any            | `204` with CORS headers (preflight)                       |
| POST   | `/v1/messages` | Forwards to `api.anthropic.com/v1/messages` with the key  |
| any    | other          | `404` / `405` with CORS headers                           |

## CORS / allowed origin

`wrangler.toml` has:

```toml
[vars]
ALLOWED_ORIGIN = "https://fivetran-jasonchletsos.github.io"
```

You can override at deploy time, including with a comma-separated list to
allow multiple origins:

```bash
npx wrangler@latest deploy \
  --var ALLOWED_ORIGIN:"https://fivetran-jasonchletsos.github.io,https://2klab.example.com"
```

The Worker echoes back the request's `Origin` header if it matches one of
the configured origins; otherwise it falls back to the first one in the
list.

## Custom domain (optional)

If you want a stable URL like `https://api.2klab.example.com` instead of
`*.workers.dev`:

1. Add the domain to your Cloudflare account (or use one already on CF).
2. In the CF dashboard, go to **Workers & Pages → twok-lab-proxy →
   Settings → Triggers → Custom Domains**.
3. Click **Add Custom Domain** and enter the hostname
   (e.g. `api.2klab.example.com`). CF auto-creates the DNS record and the
   cert — usually live in under a minute.
4. Paste the new URL into `/connect` on the site.

You can also configure it in `wrangler.toml` instead:

```toml
[[routes]]
pattern = "api.2klab.example.com/*"
custom_domain = true
```

## Local dev

```bash
npx wrangler@latest dev
```

This runs the Worker on `http://localhost:8787`. You'll still need a real
`ANTHROPIC_API_KEY` — `wrangler dev` reads from `.dev.vars`:

```
# proxy/.dev.vars  (gitignored — do NOT commit)
ANTHROPIC_API_KEY=sk-ant-...
```

## Files

- `wrangler.toml` — Worker name, entrypoint, public vars.
- `src/index.ts` — The Worker itself.
- `package.json` — `deploy`, `dev`, `tail` scripts.
- `tsconfig.json` — Worker-only TS config (isolated from the site).
