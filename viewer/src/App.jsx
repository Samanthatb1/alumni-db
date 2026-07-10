import { useEffect, useMemo, useState } from 'react'
import './App.css'

// Base URL of the backend API. Defaults to the local Express server in dev;
// set VITE_API_URL to your deployed server's URL in production.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const AUTH_TOKEN_KEY = 'hackny_auth_token'

function getAuthToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY)
}

function setAuthToken(token) {
  if (token) sessionStorage.setItem(AUTH_TOKEN_KEY, token)
  else sessionStorage.removeItem(AUTH_TOKEN_KEY)
}

function authHeaders(extra = {}) {
  const token = getAuthToken()
  return token
    ? { ...extra, Authorization: `Bearer ${token}` }
    : extra
}

function apiFetch(path, options = {}) {
  const headers = authHeaders(options.headers || {})
  return fetch(`${API_BASE}${path}`, { ...options, headers })
}

const COMPANY_BLOCKLIST = new Set([
  '3x icpc regional finalist',
  'computer science and linguistics',
  'computer science, statistics, finance',
  'improving training delivery',
  'air liquide digital and it risk management',
  'buffalo',
  'have a nice day',
  'collabing on next-gen projects',
  'girl who helps dogs',
])

function normalizeCompany(company) {
  return String(company || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function normalizeRow(row) {
  const linkedinUrl =
    row.linkedin_url?.trim() ||
    row.candidate_linkedin_urls?.split(';')[0]?.trim() ||
    ''

  let currentCompany = row.current_company || ''
  if (COMPANY_BLOCKLIST.has(normalizeCompany(currentCompany))) {
    currentCompany = ''
  }

  return {
    name: row.name,
    university: row.university,
    current_company: currentCompany,
    linkedin_url: linkedinUrl,
    verified: row.verified === true,
  }
}

function linkedinDisplayText(url) {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i)
  return match ? decodeURIComponent(match[1]).replace(/\/$/, '') : url
}

// Mis-parsed or legacy company strings mapped to the display/sort name.
const COMPANY_ALIASES = {
  '(formerly twenty percent games, llc)': 'Up at Night',
  'up at night (formerly twenty percent games, llc)': 'Up at Night',
  'veeral patel, ramp': 'Ramp',
  aws: 'Amazon Web Services (AWS)',
  'aws elasticache': 'Amazon Web Services (AWS)',
  'google nyc': 'Google',
  'twilio inc.': 'Twilio',
  auth0: 'Auth0 (acquired by Okta)',
  'hackny.org': 'hackNY',
  jpmorganchase: 'JPMorgan Chase & Co',
  'microsoft ai (we\'re hiring!)': 'Microsoft',
  'palantir technologies': 'Palantir',
  nyt: 'The New York Times',
  'new york times': 'The New York Times',
  'yobi ai': 'Yobi',
  namshi: 'Namshi.com',
  koodos: 'koodos labs (the creators of Shelf)',
  susquehanna: 'Susquehanna International Group, LLP (SIG)',
  'fsh technologies': 'FSH Technologies (formerly Contenda)',
  'christopher triolo, modernloop': 'ModernLoop',
  'd. e. shaw group': 'The D. E. Shaw Group',
  'u.s': 'U.S. Digital Corps',
  'urbana-champaign': 'University of Illinois Urbana-Champaign',
  'digital corps': 'U.S. Digital Corps',
  'univ. of notre dame': 'University of Notre Dame',
  'university of southern california': 'University of Southern California',
  ucla: 'UCLA',
  'maverrik® with expertise in web design': 'MAVERRIK®',
  'browser company': 'The Browser Company',
  'koi (usekoi.com)': 'Koi',
  'sky using computers': 'SkyLink',
}

function sortableCompany(company, logoIndex) {
  const trimmed = String(company || '').trim()
  if (!trimmed) return ''
  const aliased = COMPANY_ALIASES[trimmed.toLowerCase()] || trimmed
  return logoIndex?.[aliased.toLowerCase()]?.canonicalName || aliased
}

function byCurrentCompany(a, b, logoIndex) {
  const ca = sortableCompany(a.current_company, logoIndex)
  const cb = sortableCompany(b.current_company, logoIndex)
  // Push rows without a company to the bottom.
  if (!ca && !cb) return 0
  if (!ca) return 1
  if (!cb) return -1
  return ca.localeCompare(cb, undefined, { sensitivity: 'base' })
}

function App() {
  const [rows, setRows] = useState([])
  const [logos, setLogos] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [authRequired, setAuthRequired] = useState(true)
  const [passcode, setPasscode] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackError, setFeedbackError] = useState(null)
  const [feedbackSent, setFeedbackSent] = useState(false)

  const loadMembers = () =>
    apiFetch(`/api/members?t=${Date.now()}`).then((res) => {
      if (res.status === 401) throw new Error('Unauthorized')
      if (!res.ok) throw new Error(`Failed to load members (${res.status})`)
      return res.json()
    })

  const loadAppData = () =>
    Promise.all([
      loadMembers(),
      fetch('/logos/manifest.json').then((res) => {
        if (!res.ok) return {}
        return res.json()
      }),
    ]).then(([members, manifest]) => {
      setRows(members.map((row) => normalizeRow(row)))
      setLogos(manifest)
      setAuthenticated(true)
      setError(null)
    })

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const statusRes = await apiFetch('/api/auth/status')
        const status = await statusRes.json()
        if (cancelled) return

        setAuthRequired(status.authRequired !== false)
        if (!status.authRequired || status.authenticated) {
          await loadAppData()
          return
        }

        setAuthenticated(false)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogin = async (event) => {
    event.preventDefault()
    const value = passcode.trim()
    if (!value) {
      setLoginError('Please enter the passcode.')
      return
    }

    setLoggingIn(true)
    setLoginError(null)
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Invalid passcode')
      }

      if (data.token) setAuthToken(data.token)
      setPasscode('')
      setLoading(true)
      await loadAppData()
    } catch (err) {
      setAuthToken(null)
      setLoginError(err.message)
    } finally {
      setLoggingIn(false)
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setShowConfirm(false)
    setRefreshing(true)
    setRefreshError(null)
    try {
      const res = await apiFetch('/api/refresh', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Refresh failed (${res.status})`)
      }
      const members = await loadMembers()
      setRows(members.map((row) => normalizeRow(row)))
    } catch (err) {
      setRefreshError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const closeFeedback = () => {
    setShowFeedback(false)
    setFeedbackMessage('')
    setFeedbackError(null)
    setFeedbackSent(false)
  }

  const handleFeedbackSubmit = async () => {
    const message = feedbackMessage.trim()
    if (!message) {
      setFeedbackError('Please enter a message.')
      return
    }

    setFeedbackSubmitting(true)
    setFeedbackError(null)
    try {
      const res = await apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Submit failed (${res.status})`)
      }
      setFeedbackSent(true)
    } catch (err) {
      setFeedbackError(err.message)
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  // Index logos by lowercased company name so lookups are case-insensitive
  // (the heuristic can emit e.g. "datadog" while the manifest key is "Datadog").
  const logoIndex = useMemo(() => {
    const index = {}
    for (const [name, entry] of Object.entries(logos)) {
      index[name.trim().toLowerCase()] = { ...entry, canonicalName: name }
    }
    return index
  }, [logos])

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => byCurrentCompany(a, b, logoIndex)),
    [rows, logoIndex],
  )

  const getLogoEntry = (company) => {
    if (!company) return null
    const key = COMPANY_ALIASES[company.trim().toLowerCase()] || company
    return logoIndex[key.trim().toLowerCase()] || null
  }

  if (loading) return <p className="status">Loading…</p>

  if (!authenticated && authRequired) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>hackNY linkedins</h1>
          <input
            className="login-input"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            autoFocus
            disabled={loggingIn}
          />
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="btn btn-primary login-btn" type="submit" disabled={loggingIn}>
            {loggingIn ? 'Checking…' : 'Continue'}
          </button>
        </form>
      </div>
    )
  }

  if (error) return <p className="status error">Error: {error}</p>

  return (
    <div className="app">
      <div className="topbar">
        <h1>hackNY linkedins</h1>
        <div className="topbar-actions">
          <button
            className="feedback-btn"
            onClick={() => setShowFeedback(true)}
            disabled={refreshing}
          >
            See something wrong?
          </button>
          <button
            className="refresh-btn"
            onClick={() => setShowConfirm(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Refreshing…
              </>
            ) : (
              'Refresh current companies'
            )}
          </button>
        </div>
      </div>
      <p className="count">{rows.length} people</p>
      <p className="disclaimer">
        The information displayed is not guaranteed to be correct or up to date. This
        project used multiple sources: LinkedIn mutual connections, past hackNY historical
        LinkedIn data, and search engine similarity matches. Always investigate and validate
        the information here before using it. If you suspect this site is out of date, click the blue 
        'Refresh current companies' button
      </p>

      {refreshError && (
        <p className="status error">Refresh error: {refreshError}</p>
      )}

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">
              This button will webscrape each member to determine whether their current company is outdated.
              <br></br>
              <br></br>
              It will take around <b>3-5 minutes</b> to check everyone's company. I recommend clicking this only
              if you suspect this website hasn't been updated in a while. 
              <br></br>
              <br></br>
              Do you want to proceed?
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                No
              </button>
              <button className="btn btn-primary" onClick={handleRefresh}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {refreshing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="spinner" />
            <p className="modal-text modal-text-loading">
              Refreshing everyone's company… this can take 3-5 minutes. It's safe to close the tab.
            </p>
          </div>
        </div>
      )}

      {showFeedback && (
        <div className="modal-overlay" onClick={closeFeedback}>
          <div className="modal modal-feedback" onClick={(e) => e.stopPropagation()}>
            {feedbackSent ? (
              <>
                <p className="modal-text">Thanks — your message was sent.</p>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={closeFeedback}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="modal-text modal-text-left">
                  Spot incorrect info? (eg. wrong linkedin url, company out of date, etc..). Your message will be sent directly to my phone!
                </p>
                <textarea
                  className="feedback-textarea"
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="e.g. Jane Doe's company should be Google, not Meta"
                  rows={5}
                  maxLength={2000}
                  disabled={feedbackSubmitting}
                  autoFocus
                />
                {feedbackError && (
                  <p className="feedback-error">{feedbackError}</p>
                )}
                <div className="modal-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={closeFeedback}
                    disabled={feedbackSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleFeedbackSubmit}
                    disabled={feedbackSubmitting}
                  >
                    {feedbackSubmitting ? 'Sending…' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="header row">
        <span>Name</span>
        <span>University</span>
        <span>Current Company</span>
        <span>LinkedIn</span>
        <span className="verified-header">
          Verified
          <span
            className="info-icon"
            tabIndex={0}
            role="img"
            aria-label="What does verified mean?"
            data-tooltip="Verified means the LinkedIn URL likely belongs to this hackNY member as it was double checked using either Linkedin connections or past hackNY data. It does NOT mean the current company is up to date, nor does it mean the individual confirmed the information is true."
          >
            i
          </span>
        </span>
      </div>

      <ul className="list">
        {sortedRows.map((row, i) => {
          const logoEntry = getLogoEntry(row.current_company)
          const logoSrc = logoEntry?.filename ? `/logos/${logoEntry.filename}` : null
          // Prefer the manifest's canonical casing so display is consistent.
          const companyDisplay = logoEntry?.canonicalName || row.current_company || '—'
          const isVerified = row.verified

          return (
            <li key={`${row.name}-${row.linkedin_url}-${i}`} className="row">
              <span className="name" data-label="Name">{row.name}</span>
              <span className="university" data-label="University">{row.university || '—'}</span>
              <span className="company" data-label="Current Company">
                <span className="field-value">
                  {logoSrc && (
                    <img
                      className="company-logo"
                      src={logoSrc}
                      alt=""
                    />
                  )}
                  <span>{companyDisplay}</span>
                </span>
              </span>
              <span className="link" data-label="LinkedIn">
                <span className="field-value">
                  {row.linkedin_url ? (
                    <a href={row.linkedin_url} target="_blank" rel="noopener noreferrer">
                      {linkedinDisplayText(row.linkedin_url)}
                    </a>
                  ) : (
                    '—'
                  )}
                </span>
              </span>
              <span className="verified" data-label="Verified">
                <img
                  className="verified-icon"
                  src={isVerified ? '/verified.png' : '/unverified.png'}
                  alt={isVerified ? 'verified' : 'unverified'}
                  title={isVerified ? 'verified' : 'unverified'}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default App
