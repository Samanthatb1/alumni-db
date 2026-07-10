// Extract a member's current company from their Google LinkedIn snippet.
//
// This is a faithful JavaScript port of the Python heuristics that used to live
// in extract_companies.py / archived/extract_jobs.py. For every member it parses
// the stored linkedin_snippet with ordered, precision-focused heuristics and
// returns { company, position }; either may be '' when nothing is confident.

const SCHOOL_WORDS = [
  'University',
  'College',
  'Institute',
  'School',
  'Polytechnic',
  'Universidad',
  'Université',
  'Universidade',
  'Universitesi',
  'Üniversitesi',
  'Universität',
  'Hochschule',
]

// School acronyms / short names that lack the words above.
const KNOWN_SCHOOLS = new Set([
  'ucla', 'nyu', 'nyuad', 'mit', 'cmu', 'usc', 'ucsd', 'ucsf', 'sfsu', 'ucsb',
  'uci', 'ucb', 'upenn', 'uiuc', 'caltech', 'oxford', 'cambridge', 'cornell tech',
  'georgia tech', 'virginia tech', 'texas tech', 'cu boulder', 'uc berkeley',
  'uc san diego', 'uc irvine', 'uc davis',
])

// Junk that signals a parse is not a real company name.
const JUNK_COMPANY = new Set([
  'linkedin', '--', '—', '...', '', 'professional profile', 'profile',
  'self-employed', 'self employed', 'freelance', 'independent contractor',
  'have a nice day',
  'collabing on next-gen projects',
  'girl who helps dogs',
])

// Words that, when a headline is a single short phrase, indicate it's a job
// title rather than a company name (so we don't mistake it for an employer).
const TITLE_WORDS =
  /\b(engineer(?:ing)?|developer|manager|director|analyst|scientist|designer|consultant|counsel|specialist|officer|founder|president|intern|candidate|student|lead|head|chief|vp|cto|ceo|coo|cfo|associate|coordinator|researcher|architect|administrator|advisor|partner|recruiter|strategist|professor|fellow|co-founder|cofounder|owner|principal|teacher|attorney|nurse|realtor|superintendent|supervisor|technician|apprentice|freelance|programmer)\b/i

// Titles that imply the person is EMPLOYED by a school (so a university name is
// a valid employer, not just their alma mater).
const EMPLOY_AT_SCHOOL =
  /\b(professor|lecturer|faculty|instructor|adjunct|dean|provost|postdoc|post-doc|researcher|teacher|teaching|staff|chair|principal|registrar|librarian|administrator|coach)\b/i

// Titles/markers that imply the person is a STUDENT (so a university is their
// school, not an employer).
const STUDENT_MARKER =
  /\b(student|candidate|undergrad|undergraduate|bachelor|master'?s?|doctoral|ph\.?d|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|mba|alum|alumni|class of|'?2\d\b|incoming)\b/i

// Stopwords that should never start or end a company name.
const EDGE_STOPWORDS = new Set([
  'at', 'in', 'of', 'the', 'and', 'with', 'for', 'a', 'an', 'to', 'by',
  'experience', 'education', 'location', 'formation', 'lieu',
])

function trimChars(text, chars) {
  let start = 0
  let end = text.length
  while (start < end && chars.includes(text[start])) start += 1
  while (end > start && chars.includes(text[end - 1])) end -= 1
  return text.slice(start, end)
}

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean)
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitTitleDesc(snippet) {
  // Snippets are stored as '{title} — {description}'.
  const idx = snippet.indexOf(' — ')
  if (idx !== -1) {
    return [snippet.slice(0, idx).trim(), snippet.slice(idx + 3).trim()]
  }
  return [snippet.trim(), '']
}

function stripLinkedinOnly(text) {
  // Remove a trailing '| LinkedIn' / '- LinkedIn' but keep any ellipsis.
  return text.replace(/\s*[-|—]\s*LinkedIn\s*$/i, '').trim()
}

function stripLinkedinSuffix(text) {
  let t = stripLinkedinOnly(text)
  t = t.replace(/\s*[.…]+\s*$/, '')
  return t.trim()
}

function headlineFromTitle(title) {
  // Drop the leading '{Name} - ' / '{Name} | ' prefix, return the headline.
  // Keeps a trailing ellipsis so callers can detect truncated company names.
  const stripped = stripLinkedinOnly(title)
  const match = /\s+[-|–]\s+/.exec(stripped)
  if (match) {
    return stripped.slice(match.index + match[0].length).trim()
  }
  return ''
}

function cleanCompany(raw) {
  // Trim a captured company string at the first delimiter and tidy it up.
  if (!raw) return ''
  // Cut at the first structural delimiter (avoid '. ' so initials like
  // 'J.P. Morgan' survive; sentence bounding is handled by the regexes).
  let value = raw.split(/\s[|·•]\s|\s[–—-]\s|\s\|\s|[·•]/)[0]
  value = stripLinkedinSuffix(value)
  value = trimChars(value.trim(), ' ,|·•—–-').trim()
  value = value.replace(/\s+/g, ' ')
  // Drop leading/trailing stopwords (e.g. 'MAVERRIK with' -> 'MAVERRIK').
  const tokens = value.split(' ').filter(Boolean)
  while (tokens.length && EDGE_STOPWORDS.has(trimChars(tokens[0].toLowerCase(), '.,'))) {
    tokens.shift()
  }
  while (
    tokens.length &&
    EDGE_STOPWORDS.has(trimChars(tokens[tokens.length - 1].toLowerCase(), '.,'))
  ) {
    tokens.pop()
  }
  return tokens.join(' ')
}

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSchool(co) {
  if (SCHOOL_WORDS.some((word) => co.includes(word))) return true
  return KNOWN_SCHOOLS.has(normalize(co))
}

function isValidCompany(co, name, university) {
  if (!co || JUNK_COMPANY.has(co.toLowerCase())) return false
  if (!/[A-Za-z]/.test(co)) return false
  // Taglines / multi-entity blurbs rather than a single employer.
  if ([...'/:+'].some((ch) => co.includes(ch)) || co.includes('@')) return false
  if (words(co).length > 9) return false
  const low = co.toLowerCase()
  if (low === name.toLowerCase() || low === university.toLowerCase()) return false
  if (/^(prev|previously|ex|former|formerly)\b/i.test(co)) return false
  // Sentence fragments / bios captured by mistake, not company names.
  if (
    /\b(i am|am a|is a|graduate|graduated|years of|over \d|passionate|aspiring|looking for|seeking|currently|and a|and the|with over)\b/i.test(
      co,
    )
  ) {
    return false
  }
  return true
}

function acceptCompany(co, position, name, university, employmentContext) {
  // Validate a company, applying the student-vs-employee rule for schools.
  if (!isValidCompany(co, name, university)) return false
  if (isSchool(co)) {
    // A university is only an employer when the role says so (professor,
    // lecturer, ...) and the person isn't flagged as a student.
    if (!employmentContext) return false
    if (STUDENT_MARKER.test(position) || !EMPLOY_AT_SCHOOL.test(position)) return false
  }
  return true
}

function isPrevious(position) {
  const cleaned = position.trim().toLowerCase().replace(/\.+$/, '')
  return ['prev', 'previously', 'ex', 'former', 'formerly'].includes(cleaned)
}

function universityRegex(university) {
  // Flexible pattern matching a university string (punctuation-insensitive).
  const core = normalize(university)
  if (core.length < 4) return null
  const pattern = core.split(' ').map(escapeRegExp).join('\\s+')
  return new RegExp(pattern, 'i')
}

function positionFromHeadline(headline) {
  // Use the headline as the title only if it reads like a role, not prose.
  if (!headline || headline.includes('|')) return ''
  if (words(headline).length <= 8 && TITLE_WORDS.test(headline)) {
    return trimChars(headline, ' .,|·•—–-')
  }
  return ''
}

export function extract(snippet, name, university) {
  // Return { company, position }; either may be '' if not confidently found.
  if (!snippet) return { company: '', position: '' }

  const [title, desc] = splitTitleDesc(snippet)
  const headline = headlineFromTitle(title)

  // Heuristic A: "{Title} at/@ {Company}" in the headline (gives both).
  // Skip when the company is truncated ("... at Foo ...") — the description
  // usually has the full name, so fall through to later heuristics.
  if (headline) {
    const m = /^(?<pos>.+?)\s+(?:\bat\b\s+|@\s*)(?<co>.+)$/.exec(headline)
    if (m && !/(\.\.\.|…)$/.test(m.groups.co.trimEnd())) {
      const company = cleanCompany(m.groups.co)
      const position = trimChars(m.groups.pos, ' .,|·•—–-')
      if (
        !isPrevious(position) &&
        acceptCompany(company, position, name, university, true)
      ) {
        return { company, position }
      }
    }
  }

  // Heuristic B: "Experience: {Company}" in the description (company only).
  let m = /(?:Experience|Expérience|Erfahrung)\s*[:.]\s*(?<co>[^·•\n]+?)\s*(?:[·•]|$)/.exec(
    desc,
  )
  if (m) {
    const company = cleanCompany(m.groups.co)
    if (acceptCompany(company, 'researcher', name, university, true)) {
      return { company, position: positionFromHeadline(headline) }
    }
  }

  // Heuristic F: "{Company} {AlumnusSchool}" in the description — the company
  // sits immediately before the person's own university. Very reliable.
  const uniRe = universityRegex(university)
  if (uniRe) {
    const um = uniRe.exec(desc)
    if (um) {
      const before = desc.slice(0, um.index)
      const parts = before.split('. ')
      const segment = parts[parts.length - 1] // text after the prior sentence
      const company = cleanCompany(words(segment).slice(-5).join(' '))
      if (acceptCompany(company, '', name, university, false)) {
        return { company, position: positionFromHeadline(headline) }
      }
    }
  }

  // Heuristic E: the headline is itself the company (title format
  // "{Name} - {Company} | LinkedIn"), cross-validated by appearing again in
  // the description body (e.g. in "{Company} {School}" or "Experience: ...").
  if (headline && !headline.includes('|') && !/\b(at|@)\b/.test(headline)) {
    const candidate = cleanCompany(headline)
    if (
      candidate &&
      !candidate.includes(',') && // commas usually mean a title or location
      !TITLE_WORDS.test(candidate) &&
      words(candidate).length <= 5 &&
      acceptCompany(candidate, '', name, university, false) &&
      normalize(desc).includes(normalize(candidate))
    ) {
      return { company: candidate, position: '' }
    }
  }

  // Heuristic C: "{Title} at/@ {Company}" anywhere in the description.
  m = /\b(?:at|@)\s+(?<co>[A-Z][^·•\n]+?)(?:[.·•|]|\s—\s|\s-\s|$)/.exec(desc)
  if (m) {
    const company = cleanCompany(m.groups.co)
    if (acceptCompany(company, headline, name, university, true)) {
      return { company, position: positionFromHeadline(headline) }
    }
  }

  return { company: '', position: '' }
}
