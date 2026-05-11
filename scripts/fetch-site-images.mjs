// One-time fetcher that pulls a Wikipedia thumbnail for each sacred site
// into src/assets/sites/<slug>.jpg. Run with: `node scripts/fetch-site-images.mjs`
// Re-running is safe — existing files are skipped unless --force is passed.
//
// After this script runs, images are still ~330px wide. Resize them to ~240
// with `sips` (see the README in src/assets/sites/).

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'sites')

// Filename slug (kebab-case) → Wikipedia article title
const SITES = {
  'sedona':              'Sedona,_Arizona',
  'mt-shasta':           'Mount_Shasta',
  'taos-pueblo':         'Taos_Pueblo',
  'yellowstone':         'Yellowstone_National_Park',
  'joshua-tree':         'Joshua_Tree_National_Park',
  'mt-tamalpais':        'Mount_Tamalpais',
  'crater-lake':         'Crater_Lake',
  'devils-tower':        'Devils_Tower',
  'bear-butte':          'Bear_Butte',
  'chaco-canyon':        'Chaco_Culture_National_Historical_Park',
  'mesa-verde':          'Mesa_Verde_National_Park',
  'shiprock':            'Shiprock',
  'mt-rainier':          'Mount_Rainier',
  'san-francisco-peaks': 'San_Francisco_Peaks',
  'cahokia-mounds':      'Cahokia',
  'serpent-mound':       'Serpent_Mound',
  'mt-katahdin':         'Mount_Katahdin',
  'mt-hood':             'Mount_Hood',
  'lake-tahoe':          'Lake_Tahoe',
  'mono-lake':           'Mono_Lake',
  'canyon-de-chelly':    'Canyon_de_Chelly_National_Monument',
  'hot-springs':         'Hot_Springs_National_Park',
  'avi-kwa-ame':         'Avi_Kwa_Ame_National_Monument',
  'bandelier':           'Bandelier_National_Monument',
  'black-hills':         'Black_Hills',
  'mount-mitchell':      'Mount_Mitchell',
  'mount-toby':          'Mount_Toby',
  'brattleboro':         'Brattleboro,_Vermont',
}

const FORCE = process.argv.includes('--force')

await fs.mkdir(OUT_DIR, { recursive: true })

const UA = 'where-the-ground-hums-build/1.0 (https://github.com/andymill/where-the-ground-hums)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getThumbUrl(title) {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: { Accept: 'application/json', 'User-Agent': UA } }
  )
  if (!res.ok) throw new Error(`summary ${title}: HTTP ${res.status}`)
  const data = await res.json()
  // Prefer the larger "originalimage" if present (usually the full image);
  // otherwise fall back to the API-generated thumbnail (~220-330px wide,
  // pre-rendered by Wikipedia, always exists).
  const original = data?.originalimage?.source
  const thumb = data?.thumbnail?.source
  return original ?? thumb ?? null
}

async function download(url, dest, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(dest, buf)
      return buf.length
    }
    if (res.status === 429 && attempt < retries - 1) {
      const backoff = 2000 * (attempt + 1)
      console.log(`  ↳ 429, backing off ${backoff}ms…`)
      await sleep(backoff)
      continue
    }
    throw new Error(`download ${url}: HTTP ${res.status}`)
  }
}

const summary = { ok: [], skip: [], fail: [] }

for (const [slug, title] of Object.entries(SITES)) {
  const dest = path.join(OUT_DIR, `${slug}.jpg`)
  try {
    const exists = await fs.access(dest).then(() => true, () => false)
    if (exists && !FORCE) {
      summary.skip.push(slug)
      console.log(`skip  ${slug}`)
      continue
    }
    const thumb = await getThumbUrl(title)
    if (!thumb) {
      summary.fail.push({ slug, reason: 'no thumbnail in Wikipedia summary' })
      console.log(`FAIL  ${slug} — no thumbnail (title=${title})`)
      continue
    }
    const bytes = await download(thumb, dest)
    summary.ok.push({ slug, bytes })
    console.log(`OK    ${slug}  ${Math.round(bytes / 1024)}KB`)
    // Be polite to Wikipedia's upload.wikimedia.org — small throttle
    await sleep(250)
  } catch (err) {
    summary.fail.push({ slug, reason: err.message })
    console.log(`FAIL  ${slug} — ${err.message}`)
  }
}

console.log(
  `\nDone. ${summary.ok.length} downloaded, ${summary.skip.length} skipped, ${summary.fail.length} failed.`
)
if (summary.fail.length > 0) {
  console.log('\nFailures:')
  for (const f of summary.fail) console.log(`  ${f.slug}: ${f.reason}`)
}
