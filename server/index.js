import express from 'express'
import cors from 'cors'

import {
  createSessionToken,
  isAuthEnabled,
  requireAuth,
  verifyPasscode,
  verifySessionToken,
  getBearerToken,
} from './auth.js'
import { loadEnv, runRefresh } from './refresh.js'
import { getMembersCollection } from './db.js'

// Load MONGODB_URI, SERPER_API_KEY, etc. from server/.env when present.
loadEnv()

const app = express()

// Allow the separately-deployed frontend to call this API. Set CORS_ORIGIN to
// your frontend's URL in production (e.g. https://your-site.vercel.app); leave
// it unset to allow any origin (handy for local dev).
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.get('/api/auth/status', (req, res) => {
  res.json({
    ok: true,
    authRequired: isAuthEnabled(),
    authenticated: verifySessionToken(getBearerToken(req)),
  })
})

app.post('/api/auth/login', (req, res) => {
  if (!isAuthEnabled()) {
    res.json({ ok: true, token: null, authRequired: false })
    return
  }

  const passcode = req.body?.passcode
  if (!verifyPasscode(passcode)) {
    res.status(401).json({ ok: false, error: 'Invalid passcode' })
    return
  }

  res.json({ ok: true, token: createSessionToken(), authRequired: true })
})

// Return every member as JSON from MongoDB Atlas (the _id is omitted so the
// payload matches the old static members.json shape the frontend expects).
app.get('/api/members', requireAuth, async (_req, res) => {
  try {
    const collection = await getMembersCollection()
    const members = await collection.find({}, { projection: { _id: 0 } }).toArray()
    res.json(members)
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Re-scrape and re-derive everyone's current company, persisting changes to
// Atlas. This can take a few minutes, so we disable the per-request timeout and
// guard against overlapping runs.
let refreshing = false
app.post('/api/refresh', requireAuth, async (req, res) => {
  if (refreshing) {
    res.status(409).json({ ok: false, error: 'A refresh is already running' })
    return
  }
  refreshing = true
  req.setTimeout(0)
  res.setTimeout(0)
  try {
    const stats = await runRefresh()
    res.json({ ok: true, stats })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    refreshing = false
  }
})

const FEEDBACK_MAX_LENGTH = 2000

app.post('/api/feedback', requireAuth, async (req, res) => {
  const message = req.body?.message?.trim()
  if (!message) {
    res.status(400).json({ ok: false, error: 'Message is required' })
    return
  }
  if (message.length > FEEDBACK_MAX_LENGTH) {
    res.status(400).json({
      ok: false,
      error: `Message must be ${FEEDBACK_MAX_LENGTH} characters or fewer`,
    })
    return
  }

  const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) {
    res.status(500).json({ ok: false, error: 'Feedback is not configured' })
    return
  }

  try {
    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `@everyone **hackNY alumni feedback**\n${message}`,
        allowed_mentions: { parse: ['everyone'] },
      }),
    })

    if (!discordRes.ok) {
      const detail = await discordRes.text().catch(() => '')
      throw new Error(detail || `Discord returned ${discordRes.status}`)
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
