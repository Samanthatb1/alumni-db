import crypto from 'crypto'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function isAuthEnabled() {
  return Boolean(process.env.SITE_PASSCODE && process.env.SESSION_SECRET)
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest()
}

export function verifyPasscode(input) {
  const expected = process.env.SITE_PASSCODE
  if (!expected) return true
  if (typeof input !== 'string' || !input) return false
  return crypto.timingSafeEqual(hash(input), hash(expected))
}

export function createSessionToken() {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const signature = crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url')
  return `${payloadB64}.${signature}`
}

export function verifySessionToken(token) {
  if (!isAuthEnabled()) return true
  if (typeof token !== 'string' || !token) return false

  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return false

  const expectedSignature = crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url')

  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSignature)
  if (sigBuf.length !== expectedBuf.length) return false
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    return typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

export function getBearerToken(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

export function requireAuth(req, res, next) {
  if (!isAuthEnabled()) {
    next()
    return
  }

  if (verifySessionToken(getBearerToken(req))) {
    next()
    return
  }

  res.status(401).json({ ok: false, error: 'Unauthorized' })
}
