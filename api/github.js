import { verifyToken } from './auth.js'

export const config = { runtime: 'edge' }

const ALLOWED_PREFIXES = ['src/data/', 'public/images/products/']

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/')
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const valid = await verifyToken(token, process.env.ADMIN_PASSWORD)
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const TOKEN = process.env.GITHUB_TOKEN
  const OWNER = process.env.GITHUB_OWNER
  const REPO = process.env.GITHUB_REPO
  const BRANCH = process.env.GITHUB_BRANCH

  const { operation, params } = await request.json()

  if (typeof params?.path !== 'string' || !ALLOWED_PREFIXES.some(prefix => params.path.startsWith(prefix))) {
    return new Response(JSON.stringify({ error: 'Invalid path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }

  const encodedPath = encodePath(params.path)
  let url, options

  if (operation === 'getFile') {
    url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodedPath}?ref=${BRANCH}`
    options = { method: 'GET', headers, cache: 'no-store' }

  } else if (operation === 'putFile') {
    url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodedPath}`
    options = {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: params.message,
        content: params.content,
        branch: BRANCH,
        ...(params.sha ? { sha: params.sha } : {}),
      }),
    }

  } else {
    return new Response('Unknown operation', { status: 400 })
  }

  const response = await fetch(url, options)
  const data = await response.json()
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
