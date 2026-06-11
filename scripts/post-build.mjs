// Post-build: reshape the Vite output so /hum/ serves the SPA and / serves an apex placeholder.
//
// Vite (with base: '/hum/') emits dist/index.html + dist/assets/* with absolute URLs to /hum/*.
// We move those into dist/hum/ so they actually live at /hum/, and put a simple apex page at dist/index.html.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')
const humDir = path.join(distDir, 'hum')

if (!fs.existsSync(distDir)) {
  console.error('No dist/ directory — did you forget to run vite build first?')
  process.exit(1)
}

fs.mkdirSync(humDir, { recursive: true })

// Move every top-level entry in dist (except the hum dir itself) into dist/hum/.
for (const entry of fs.readdirSync(distDir)) {
  if (entry === 'hum') continue
  fs.renameSync(path.join(distDir, entry), path.join(humDir, entry))
}

// Write Netlify redirects: SPA fallback for /hum/*, friendly route for
// /mortgage so the URL stays clean (the edge function at
// netlify/edge-functions/mortgage-auth.js gates access with Basic Auth
// before this rewrite resolves).
fs.writeFileSync(
  path.join(distDir, '_redirects'),
  `# SPA fallback so deep links under /hum/ load the app shell.
/hum         /hum/index.html   200
/hum/*       /hum/index.html   200

# Clean URL for the (basic-auth-gated) mortgage calculator. Source lives
# in mortgage/index.html at the project root; copied below.
/mortgage    /mortgage/index.html   200

# Clean URL for the (public, no-auth) renovation review page. Source lives
# in renovation/ at the project root; copied to dist/renovation/ below.
# Unlike /mortgage, this path is NOT covered by the basic-auth edge function
# (which matches only /mortgage*), so it's publicly viewable at
# andy-miller.com/renovation.
/renovation    /renovation/index.html   200
`,
)

// Copy the apex homepage (a separately-maintained static HTML file) into dist/.
// The page lives at apex/index.html so it's easier to edit than an inline
// template literal in this script.
const apexDir = path.resolve(__dirname, '..', 'apex')
fs.copyFileSync(path.join(apexDir, 'index.html'), path.join(distDir, 'index.html'))

// Copy apex/images/ (portfolio thumbnails) → dist/images/
const apexImagesSrc = path.join(apexDir, 'images')
if (fs.existsSync(apexImagesSrc)) {
  fs.cpSync(apexImagesSrc, path.join(distDir, 'images'), { recursive: true })
}

// Copy apex/favicon.svg → dist/favicon.svg
const faviconSrc = path.join(apexDir, 'favicon.svg')
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, path.join(distDir, 'favicon.svg'))
}

// Copy the mortgage calculator (a standalone HTML file, no build step)
// into dist/mortgage/. Access is gated by basic auth via
// netlify/edge-functions/mortgage-auth.js — the static file itself is
// public if you know the path, but the edge function intercepts every
// request to /mortgage* and rejects without credentials.
const mortgageSrc = path.resolve(__dirname, '..', 'mortgage', 'index.html')
if (fs.existsSync(mortgageSrc)) {
  const mortgageDest = path.join(distDir, 'mortgage')
  fs.mkdirSync(mortgageDest, { recursive: true })
  fs.copyFileSync(mortgageSrc, path.join(mortgageDest, 'index.html'))
}

// Copy mortgage/img/ → dist/mortgage/img/ so the property photos load.
const mortgageImgSrc = path.resolve(__dirname, '..', 'mortgage', 'img')
if (fs.existsSync(mortgageImgSrc)) {
  fs.cpSync(mortgageImgSrc, path.join(distDir, 'mortgage', 'img'), { recursive: true })
}

// Copy the renovation review page (a standalone, self-contained static app —
// index.html + data.js + the source .xlsx + assets/, no build step) into
// dist/renovation/. It uses relative asset paths and hash routing, so the
// whole folder just needs to land under that base. This path is public (no
// basic-auth edge function covers it) — served at andy-miller.com/renovation.
const renoSrc = path.resolve(__dirname, '..', 'renovation')
if (fs.existsSync(renoSrc)) {
  const renoDest = path.join(distDir, 'renovation')
  fs.cpSync(renoSrc, renoDest, { recursive: true })
}

console.log('✓ Reshaped dist/: /hum/ holds the SPA; / holds the apex homepage; /mortgage/ holds the calculator; /renovation/ holds the renovation review.')
