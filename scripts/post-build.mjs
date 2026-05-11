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

// Write Netlify redirects: SPA fallback for /hum/*, no rules at apex.
fs.writeFileSync(
  path.join(distDir, '_redirects'),
  `# SPA fallback so deep links under /hum/ load the app shell.
/hum         /hum/index.html   200
/hum/*       /hum/index.html   200
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

console.log('✓ Reshaped dist/: /hum/ holds the SPA; / holds the apex homepage.')
