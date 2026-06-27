export const config = { runtime: 'edge' }

const attempts = new Map() // ip -> { count, firstAt }
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

function hexToBytes(hex) {
  const pairs = hex.match(/.{1,2}/g)
  if (!pairs) return null
  return new Uint8Array(pairs.map(b => parseInt(b, 16)))
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function signTimestamp(ts, secret) {
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ts))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyToken(token, secret) {
  if (!token || !secret) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [ts, sigHex] = parts
  if (!/^\d+$/.test(ts)) return false
  if (Date.now() - parseInt(ts, 10) > TOKEN_MAX_AGE_MS) return false

  const sigBytes = hexToBytes(sigHex)
  if (!sigBytes) return false

  const key = await hmacKey(secret)
  return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(ts))
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const ip = getClientIp(request)
  const now = Date.now()
  const record = attempts.get(ip)

  if (record && now - record.firstAt < WINDOW_MS && record.count >= MAX_ATTEMPTS) {
    return new Response(JSON.stringify({ ok: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { password } = await request.json()
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    if (!record || now - record.firstAt >= WINDOW_MS) {
      attempts.set(ip, { count: 1, firstAt: now })
    } else {
      record.count++
    }
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  attempts.delete(ip)

  const ts = now.toString()
  const sigHex = await signTimestamp(ts, ADMIN_PASSWORD)
  const token = `${ts}.${sigHex}`

  return new Response(JSON.stringify({ ok: true, token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
