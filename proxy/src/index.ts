// twok-lab-proxy — a tiny Cloudflare Worker that proxies browser requests
// from the static 2K LAB site (GitHub Pages) to the Anthropic API.
//
// Why this exists:
//   1. Anthropic's API blocks browser CORS by default — a static site can't
//      call it directly without baking the API key into the page bundle.
//   2. The site is deployed as static HTML to GitHub Pages, so there's no
//      app server. This Worker is the smallest possible backend: it holds
//      the API key as a CF secret and forwards POST /v1/messages.
//
// Endpoints:
//   GET  /            -> 200 "ok"   (health check)
//   OPTIONS *         -> 204        (CORS preflight, any path)
//   POST /v1/messages -> forwards body to api.anthropic.com/v1/messages,
//                       injects x-api-key + anthropic-version, streams the
//                       response body straight back to the browser.
//   anything else     -> 404 / 405
//
// All responses include CORS headers so the browser will accept them.
//
// Streaming: when the client sends { "stream": true } in the body,
// Anthropic returns SSE (text/event-stream). We pipe `upstream.body`
// directly into a new Response — Cloudflare Workers stream this through
// without buffering, so the browser sees deltas in real time.

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION_DEFAULT = "2023-06-01";

/**
 * Resolve which origin to echo back in `Access-Control-Allow-Origin`.
 *
 * `ALLOWED_ORIGIN` can be a single origin or a comma-separated list. If the
 * request's `Origin` header matches one in the list, we echo it back. If
 * not, we fall back to the first entry — that gives a deterministic value
 * for non-browser callers (curl, server-to-server tests) without leaking a
 * wildcard.
 */
function pickOrigin(env: Env, requestOrigin: string | null): string {
  const list = (env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return "*";
  if (requestOrigin && list.includes(requestOrigin)) return requestOrigin;
  return list[0];
}

function corsHeaders(env: Env, requestOrigin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": pickOrigin(env, requestOrigin),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type, x-api-key, anthropic-version",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonError(
  status: number,
  message: string,
  env: Env,
  requestOrigin: string | null,
): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(env, requestOrigin),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestOrigin = request.headers.get("Origin");
    const url = new URL(request.url);

    // ---- CORS preflight -----------------------------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env, requestOrigin),
      });
    }

    // ---- Health check --------------------------------------------------
    // GET / (and GET /health, for habit) both return 200 "ok" so the
    // /connect "Test" button can verify the worker is reachable without
    // burning Anthropic quota.
    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/health")
    ) {
      return new Response("ok", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          ...corsHeaders(env, requestOrigin),
        },
      });
    }

    // ---- Proxy: POST /v1/messages -------------------------------------
    if (request.method === "POST" && url.pathname === "/v1/messages") {
      if (!env.ANTHROPIC_API_KEY) {
        return jsonError(
          500,
          "Worker is missing ANTHROPIC_API_KEY secret. Run `wrangler secret put ANTHROPIC_API_KEY`.",
          env,
          requestOrigin,
        );
      }

      // Use the request's anthropic-version header if present, else default.
      // The api key is always injected from the secret — we deliberately
      // ignore any x-api-key the browser might send.
      const anthropicVersion =
        request.headers.get("anthropic-version") || ANTHROPIC_VERSION_DEFAULT;

      let upstream: Response;
      try {
        upstream = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": anthropicVersion,
          },
          // Forward the raw body. Don't parse — preserves streaming flags
          // and any future fields exactly as the client sent them.
          body: request.body,
          // Required for streaming uploads on Workers when forwarding a
          // ReadableStream body.
          // @ts-expect-error -- `duplex` is a valid fetch init field in
          // Workers but isn't in the older lib.dom types.
          duplex: "half",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "upstream fetch failed";
        return jsonError(502, `Upstream error: ${message}`, env, requestOrigin);
      }

      // Build response headers: copy upstream content-type (so SSE stays
      // SSE), drop hop-by-hop headers, layer CORS on top.
      const headers = new Headers();
      const contentType = upstream.headers.get("content-type");
      if (contentType) headers.set("content-type", contentType);
      const cacheControl = upstream.headers.get("cache-control");
      if (cacheControl) headers.set("cache-control", cacheControl);
      // Pass through Anthropic's request id if present — useful for debugging.
      const requestId = upstream.headers.get("request-id");
      if (requestId) headers.set("request-id", requestId);
      for (const [k, v] of Object.entries(corsHeaders(env, requestOrigin))) {
        headers.set(k, v as string);
      }

      // Stream the upstream body straight through. For SSE this means the
      // browser sees `event: content_block_delta` chunks as they arrive.
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }

    // ---- Method / path not allowed ------------------------------------
    if (url.pathname === "/v1/messages") {
      return jsonError(
        405,
        `Method ${request.method} not allowed on /v1/messages (use POST)`,
        env,
        requestOrigin,
      );
    }

    return jsonError(
      404,
      `No route for ${request.method} ${url.pathname}`,
      env,
      requestOrigin,
    );
  },
};
