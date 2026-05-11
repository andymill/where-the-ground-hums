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

// Write an apex placeholder at /. Minimal HTML, brand-adjacent typography.
const apex = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Andy Miller</title>
    <meta name="robots" content="noindex, nofollow" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        background: #0a0908;
        color: #e8e6e1;
        font-family: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
      }
      .wrap {
        min-height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        text-align: center;
      }
      h1 {
        font-weight: 300;
        font-size: clamp(2rem, 6vw, 4rem);
        letter-spacing: -0.02em;
        margin: 0 0 1rem;
      }
      p { color: #9a958a; max-width: 32rem; margin: 0 0 2rem; line-height: 1.6; }
      a {
        color: #e8e6e1;
        text-decoration: none;
        border: 1px solid rgba(232,230,225,0.3);
        padding: 0.6rem 1.2rem;
        font-size: 0.9rem;
        letter-spacing: 0.04em;
        transition: all 0.2s ease;
      }
      a:hover {
        background: rgba(232,230,225,0.08);
        border-color: rgba(232,230,225,0.6);
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>andy-miller.com</h1>
      <p>Side projects in progress. Nothing to see here yet.</p>
      <a href="/hum/">→ Where the Ground Hums</a>
    </div>
  </body>
</html>
`
fs.writeFileSync(path.join(distDir, 'index.html'), apex)

console.log('✓ Reshaped dist/: /hum/ holds the SPA; / holds the apex placeholder.')
