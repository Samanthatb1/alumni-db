// Refresh every member's current company end-to-end (pure JavaScript), reading
// and writing the member data in MongoDB Atlas.
//
// Step 1: re-fetch each member's Google LinkedIn snippet via Serper (fresh every
//         run, so people who change jobs get picked up).
// Step 2: re-derive current_company from those snippets with the heuristics,
//         falling back to the member's last known company when the heuristic
//         can't confidently parse one.
//
// Only members whose values actually change are written back, in a single bulk
// update keyed by each document's _id.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { extract } from './heuristics.js'
import { SnippetSearcher } from './snippets.js'
import { getMembersCollection, closeClient } from './db.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH = path.join(HERE, '.env')

// Edge cases: strings that were mis-extracted into current_company but are not
// actually companies (skills, majors, taglines, or internal team names). These
// are never counted as a Current Company. Matching is whitespace/case-insensitive.
const COMPANY_BLOCKLIST = new Set([
  '3x icpc regional finalist',
  'computer science and linguistics',
  'computer science, statistics, finance',
  'improving training delivery',
  'air liquide digital and it risk management',
  'buffalo'
])

// Mis-parsed company strings mapped to the correct company name.
const COMPANY_OVERRIDES = new Map([
  ['(formerly twenty percent games, llc)', 'Up at Night'],
])

function normalizeCompany(company) {
  return String(company || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function isBlockedCompany(company) {
  return COMPANY_BLOCKLIST.has(normalizeCompany(company))
}

function applyCompanyOverride(company) {
  if (!company) return company
  return COMPANY_OVERRIDES.get(normalizeCompany(company)) ?? company
}

export function loadEnv(envPath = ENV_PATH) {
  // Load KEY=VALUE pairs from a .env file into process.env (no overrides).
  if (!fs.existsSync(envPath)) return
  for (let line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    line = line.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const idx = line.indexOf('=')
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    value = value.replace(/^["']|["']$/g, '')
    if (key && !(key in process.env)) process.env[key] = value
  }
}

async function pMap(items, concurrency, worker) {
  // Run `worker` over `items` with at most `concurrency` in flight at once.
  let cursor = 0
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor
        cursor += 1
        await worker(items[index], index)
      }
    },
  )
  await Promise.all(runners)
}

export async function runRefresh({
  envPath = ENV_PATH,
  // How many member lookups run at once. The global request spacing below is
  // what actually protects the rate limit; concurrency just hides per-request
  // latency so the run finishes faster.
  concurrency = 6,
  // Minimum gap between *any* two Serper requests (ms). 200ms ≈ 5 req/s.
  minIntervalMs = 200,
  log = console.log,
} = {}) {
  loadEnv(envPath)
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new Error(`Missing SERPER_API_KEY (set it in ${envPath})`)

  const collection = await getMembersCollection()
  const members = await collection.find({}).toArray()
  const searcher = new SnippetSearcher(apiKey, { minIntervalMs })

  // Track which fields actually change per document so we only write the diff.
  const updates = new Map() // key: _id string -> { _id, fields: {...} }
  const change = (record, field, value) => {
    if (String(record[field] ?? '') === String(value ?? '')) return
    record[field] = value
    const key = String(record._id)
    if (!updates.has(key)) updates.set(key, { _id: record._id, fields: {} })
    updates.get(key).fields[field] = value
  }

  // Wipe known non-company values from unverified members up front (no network);
  // trusted verified records are left untouched.
  let cleared = 0
  for (const record of members) {
    if (record.verified === false && isBlockedCompany(record.current_company)) {
      change(record, 'current_company', '')
      cleared += 1
    }
  }

  // Step 1: re-fetch every member's snippet fresh from the web (concurrently,
  // but globally rate-limited) so anyone who changed companies gets an updated
  // snippet.
  log('[1/2] Fetching LinkedIn snippets…')
  const targets = members.filter((r) => String(r.linkedin_url || '').trim())
  let snippetFound = 0
  let processed = 0
  await pMap(targets, concurrency, async (record) => {
    const snippet = await searcher.findSnippet(record)
    change(record, 'linkedin_snippet', snippet)
    if (snippet) snippetFound += 1
    processed += 1
    if (processed % 25 === 0) log(`  …${processed}/${targets.length} members`)
  })

  // Step 2: derive current company from the snippets, with fallback + only-changed.
  log('[2/2] Extracting current companies from snippets…')
  let found = 0
  let usedFallback = 0
  let blank = 0
  for (const record of members) {
    const result = extract(
      String(record.linkedin_snippet || ''),
      String(record.name || ''),
      String(record.university || ''),
    )
    let company = result.company
    const position = result.position

    // Never accept a heuristic result that's a known non-company (skills,
    // majors, taglines, etc.) — treat it as if nothing was found.
    if (company && isBlockedCompany(company)) company = ''

    if (company) {
      found += 1
    } else {
      // Prefer the last known-good company over a blank value, but never fall
      // back to a blocked value.
      const fallback = String(record.fallback || '').trim()
      if (fallback && !isBlockedCompany(fallback)) {
        company = fallback
        usedFallback += 1
      } else {
        blank += 1
      }
    }

    company = applyCompanyOverride(company)

    change(record, 'current_company', company)
    if (position && !String(record.current_position || '').trim()) {
      change(record, 'current_position', position)
    }
  }

  // Persist only the changed documents, in one round-trip.
  const changed = updates.size
  if (changed) {
    const ops = []
    for (const { _id, fields } of updates.values()) {
      ops.push({ updateOne: { filter: { _id }, update: { $set: fields } } })
    }
    await collection.bulkWrite(ops)
  }

  log(
    `Companies: ${found} from snippet, ${usedFallback} from fallback, ` +
      `${blank} left blank; ${changed} entries changed (out of ${members.length}).`,
  )
  log('Refresh complete.')

  return {
    total: members.length,
    snippetFound,
    cleared,
    found,
    usedFallback,
    blank,
    changed,
  }
}

// Allow `node refresh.js` for local testing.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  runRefresh()
    .catch((err) => {
      console.error(err)
      process.exitCode = 1
    })
    .finally(() => closeClient())
}
