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

# Clean URLs for the mortgage calculators. Source lives in mortgage/ at the
# project root (a picker at /mortgage plus one page per house); the whole
# tree is copied to dist/mortgage/ below. Now public — the basic-auth edge
# function has been removed.
/mortgage              /mortgage/index.html             200
/mortgage/gingko       /mortgage/gingko/index.html      200
/mortgage/deer-park    /mortgage/deer-park/index.html   200
/mortgage/newfane      /mortgage/newfane/index.html     200

# Clean URL for the renovation review page. Source lives in renovation/ at
# the project root; copied to dist/renovation/ below.
/renovation    /renovation/index.html   200

# Clean URL for the omnichannel P&L builder. Source lives in omnichannel/ at
# the project root; the whole tree (compiled index.html + self-hosted React in
# vendor/) is copied to dist/omnichannel/ below. Public.
/omnichannel    /omnichannel/index.html   200
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

// Copy the mortgage calculators (standalone HTML files, no build step) into
// dist/mortgage/. The whole tree comes along: the picker at mortgage/index.html,
// one page per house (gingko/, deer-park/), and the shared img/ folder the
// Gingko page references at /mortgage/img/. Now public — the basic-auth edge
// function (netlify/edge-functions/mortgage-auth.js) has been removed.
const mortgageSrc = path.resolve(__dirname, '..', 'mortgage')
if (fs.existsSync(mortgageSrc)) {
  fs.cpSync(mortgageSrc, path.join(distDir, 'mortgage'), { recursive: true })
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

// Copy the omnichannel P&L builder (standalone, self-hosted React + pre-compiled
// JSX, no build step) into dist/omnichannel/. Public — served at
// andy-miller.com/omnichannel. The readable JSX source is index.src.html;
// index.html is the compiled, served page.
const omniSrc = path.resolve(__dirname, '..', 'omnichannel')
if (fs.existsSync(omniSrc)) {
  fs.cpSync(omniSrc, path.join(distDir, 'omnichannel'), { recursive: true })
}

console.log('✓ Reshaped dist/: /hum/ holds the SPA; / holds the apex homepage; /mortgage/ holds the house picker + calculators; /renovation/ holds the renovation review; /omnichannel/ holds the P&L builder.')
