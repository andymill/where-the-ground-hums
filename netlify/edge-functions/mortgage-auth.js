/**
 * HTTP Basic Auth gate for /mortgage.
 *
 * Runs at Netlify's edge before the static file is served. If the
 * Authorization header is missing or wrong, returns 401 with a
 * WWW-Authenticate challenge so the browser pops its native
 * username/password prompt. After a viewer enters credentials once,
 * their browser caches them and re-sends on every subsequent request —
 * no UI to build.
 *
 * Multiple credential pairs supported. The function looks for:
 *   MORTGAGE_USER   / MORTGAGE_PASS    (required — primary viewer, e.g. "zoe")
 *   MORTGAGE_USER_2 / MORTGAGE_PASS_2  (optional — second viewer, e.g. "dad")
 *   MORTGAGE_USER_3 / MORTGAGE_PASS_3  (optional — etc.)
 *
 * Each pair is independent — viewer 1 doesn't know viewer 2's password.
 * Any matching pair grants access.
 *
 * Set them via either:
 *   netlify env:set MORTGAGE_USER zoe
 *   netlify env:set MORTGAGE_PASS <whatever>
 * or in the Netlify dashboard → Site configuration → Environment vars.
 *
 * To take the page down for everyone: delete the MORTGAGE_PASS env var
 * (the function returns 503 when the primary creds are missing).
 * To revoke a single viewer: delete just their MORTGAGE_USER_N /
 * MORTGAGE_PASS_N pair — the others keep working.
 */
export default async (request, context) => {
  // Collect every configured credential pair. Primary is required; any
  // numbered pairs (USER_2/PASS_2, USER_3/PASS_3, ...) are optional
  // additional viewers. Stops scanning at the first gap.
  const allowed = []
  const primaryUser = Netlify.env.get('MORTGAGE_USER')
  const primaryPass = Netlify.env.get('MORTGAGE_PASS')
  if (primaryUser && primaryPass) allowed.push({ user: primaryUser, pass: primaryPass })
  for (let i = 2; i <= 9; i++) {
    const u = Netlify.env.get(`MORTGAGE_USER_${i}`)
    const p = Netlify.env.get(`MORTGAGE_PASS_${i}`)
    if (!u || !p) break
    allowed.push({ user: u, pass: p })
  }

  // If no credentials are configured, fail closed — we never want to
  // accidentally publish without auth.
  if (allowed.length === 0) {
    return new Response('Mortgage page disabled (server creds not set).', {
      status: 503,
      headers: { 'content-type': 'text/plain' },
    })
  }

  const challenge = () =>
    new Response('Authentication required.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Mortgage Calculator", charset="UTF-8"',
        'content-type': 'text/plain',
        'cache-control': 'no-store',
      },
    })

  const auth = request.headers.get('Authorization')
  if (!auth) return challenge()

  const [scheme, encoded] = auth.split(' ')
  if (scheme !== 'Basic' || !encoded) return challenge()

  let decoded
  try {
    decoded = atob(encoded)
  } catch {
    return challenge()
  }
  const colonIdx = decoded.indexOf(':')
  if (colonIdx === -1) return challenge()
  const user = decoded.slice(0, colonIdx)
  const pass = decoded.slice(colonIdx + 1)

  const ok = allowed.some((cred) => cred.user === user && cred.pass === pass)
  if (!ok) return challenge()

  // Auth passed — let the request continue through to the static file
  // at /mortgage/index.html. We also stamp a no-cache header on the
  // way back so edge caches don't accidentally hold the page.
  const response = await context.next()
  response.headers.set('cache-control', 'private, no-store')
  return response
}

export const config = {
  // Apply to /mortgage and anything under it.
  path: ['/mortgage', '/mortgage/*'],
}
