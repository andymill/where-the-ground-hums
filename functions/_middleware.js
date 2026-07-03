// Cloudflare Pages Function — Basic-auth gate for the /160akley home hub
// (finances, resources, to-do) and the legacy /mortgage paths that redirect
// into it. Runs on every request; non-gated paths pass straight through.
//
// This is the Cloudflare port of the old Netlify edge function
// (netlify/edge-functions/akley-auth.js). Light gate for personal info, not
// real security — the credentials are source-visible.

const USER = "family";
const PASS = "hesper";
const REALM = "160 Akley";

function isGated(pathname) {
  return (
    pathname === "/160akley" || pathname.startsWith("/160akley/") ||
    pathname === "/mortgage" || pathname.startsWith("/mortgage/")
  );
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  if (!isGated(url.pathname)) return next();

  const header = request.headers.get("Authorization") || "";
  const [scheme, encoded] = header.split(" ");

  let ok = false;
  if (scheme === "Basic" && encoded) {
    try {
      const decoded = atob(encoded); // "user:pass"
      const idx = decoded.indexOf(":");
      ok = decoded.slice(0, idx) === USER && decoded.slice(idx + 1) === PASS;
    } catch {
      ok = false;
    }
  }

  if (!ok) {
    return new Response("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return next();
}
