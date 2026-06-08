/**
 * HTTP Basic Auth gate for /mortgage.
 *
 * Runs at Netlify's edge before the static file is served. If the
 * Authorization header is missing or wrong, returns 401 with a
 * WWW-Authenticate challenge so the browser pops its native
 * username/password prompt. After Zoë enters credentials once, her
 * browser caches them and re-sends on every subsequent request — no
 * UI to build.
 *
 * Credentials come from Netlify environment variables:
 *   MORTGAGE_USER  — username (e.g. "zoe")
 *   MORTGAGE_PASS  — password (free-form)
 *
 * Set them once via either:
 *   netlify env:set MORTGAGE_USER zoe
 *   netlify env:set MORTGAGE_PASS <whatever>
 * or in the Netlify dashboard → Site configuration → Environment vars.
 *
 * To take the page down: delete the MORTGAGE_PASS env var (the function
 * returns 401 when either var is missing) or remove the
 * /mortgage* path from the config block below.
 */
export default async (request, context) => {
  const expectedUser = Netlify.env.get('MORTGAGE_USER')
  const expectedPass = Netlify.env.get('MORTGAGE_PASS')

  // If credentials aren't configured on the Netlify side, fail closed —
  // we never want to accidentally publish without auth.
  if (!expectedUser || !expectedPass) {
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

  if (user !== expectedUser || pass !== expectedPass) return challenge()

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
