// Fetch a Google (Serper) LinkedIn snippet for a member.
//
// For a record with a linkedin_url it re-searches the person on Google, finds
// the organic result whose URL matches that exact profile, and returns its
// "{title} — {snippet}". Every search hits the web fresh (no caching) so that
// company changes are always picked up.
//
// To stay under Serper's rate limit while running many lookups concurrently, a
// single shared scheduler spaces out *all* outgoing requests (a global QPS cap),
// independent of how many lookups are in flight, and 429/5xx responses are
// retried with exponential backoff (honoring Retry-After when present).

const SERPER_URL = 'https://google.serper.dev/search'
const SLUG_RE = /linkedin\.com\/in\/([^/?#]+)/i

export function linkedinSlug(url) {
  // Extract the lowercased /in/<slug> identifier from a LinkedIn URL.
  if (typeof url !== 'string') return ''
  const match = SLUG_RE.exec(url)
  return match ? match[1].trim().replace(/\/+$/, '').toLowerCase() : ''
}

export function buildQueries(record) {
  // Prioritized query templates likely to surface the record's LinkedIn profile.
  const name = String(record.name || '').trim()
  if (!name) return []

  const queries = []
  for (const key of ['university', 'previous_company', 'current_company']) {
    const value = String(record[key] || '').trim()
    if (value && value.toLowerCase() !== 'nan') {
      queries.push(`"${name}" "${value}" LinkedIn`)
    }
  }
  queries.push(`"${name}" LinkedIn`)
  queries.push(`${name} LinkedIn`)

  const seen = new Set()
  return queries.filter((q) => (seen.has(q) ? false : seen.add(q)))
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function parseRetryAfter(response) {
  // Retry-After is either a number of seconds or an HTTP date.
  const raw = response.headers.get('retry-after')
  if (!raw) return null
  const secs = Number(raw)
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000)
  const when = Date.parse(raw)
  return Number.isNaN(when) ? null : Math.max(0, when - Date.now())
}

export class SnippetSearcher {
  // Serper client. Every query hits the web fresh — no caching.
  //
  // minIntervalMs spaces every outgoing request globally (e.g. 200ms ≈ 5 req/s),
  // so even with many concurrent lookups the API sees a steady, safe request
  // rate. maxRetries controls 429/5xx backoff.
  constructor(apiKey, { minIntervalMs = 200, maxRetries = 4 } = {}) {
    if (!apiKey) throw new Error('Missing SERPER_API_KEY')
    this.apiKey = apiKey
    this.minIntervalMs = minIntervalMs
    this.maxRetries = maxRetries
    this._nextSlotAt = 0
  }

  async acquireSlot() {
    // Reserve the next globally-spaced send slot (shared across all callers).
    const now = Date.now()
    const slot = Math.max(now, this._nextSlotAt)
    this._nextSlotAt = slot + this.minIntervalMs
    const wait = slot - now
    if (wait > 0) await sleep(wait)
  }

  async search(query) {
    // Always fetch fresh organic results as [{ link, title, snippet }, ...].
    for (let attempt = 0; ; attempt += 1) {
      await this.acquireSlot()
      try {
        const response = await fetch(SERPER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': this.apiKey },
          body: JSON.stringify({ q: query, gl: 'us', hl: 'en' }),
        })

        // Back off and retry on rate-limit / transient server errors.
        if (response.status === 429 || response.status >= 500) {
          if (attempt < this.maxRetries) {
            const backoff = parseRetryAfter(response) ?? 1000 * 2 ** attempt
            const jitter = Math.floor(Math.random() * 250)
            console.log(
              `  Serper ${response.status}; retry ${attempt + 1}/${this.maxRetries} in ${backoff + jitter}ms`,
            )
            await sleep(backoff + jitter)
            continue
          }
          console.log(`  Serper ${response.status}; giving up on '${query}'`)
          return []
        }

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          console.log(`  Serper failed (${response.status}): ${text.slice(0, 150)}`)
          return []
        }

        const payload = await response.json()
        const organic = Array.isArray(payload?.organic) ? payload.organic : []
        return organic.map((item) => ({
          link: String(item.link || ''),
          title: String(item.title || ''),
          snippet: String(item.snippet || ''),
        }))
      } catch (err) {
        if (attempt < this.maxRetries) {
          const backoff = 1000 * 2 ** attempt + Math.floor(Math.random() * 250)
          console.log(`  Serper error '${err.message}'; retry in ${backoff}ms`)
          await sleep(backoff)
          continue
        }
        console.log(`  Serper request failed for '${query}': ${err.message}`)
        return []
      }
    }
  }

  async findSnippet(record) {
    // Re-search the person and return the snippet whose URL matches their slug.
    const target = linkedinSlug(String(record.linkedin_url || ''))
    if (!target) return ''

    for (const query of buildQueries(record)) {
      for (const result of await this.search(query)) {
        if (linkedinSlug(result.link) === target) {
          const title = (result.title || '').trim()
          const snippet = (result.snippet || '').trim()
          if (title && snippet) return `${title} — ${snippet}`
          return title || snippet
        }
      }
    }
    return ''
  }
}
