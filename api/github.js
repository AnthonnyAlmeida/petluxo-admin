export const config = { runtime: 'edge' }

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const TOKEN = process.env.GITHUB_TOKEN
  const OWNER = process.env.GITHUB_OWNER
  const REPO = process.env.GITHUB_REPO
  const BRANCH = process.env.GITHUB_BRANCH

  const { operation, params } = await request.json()

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }

  let url, options

  if (operation === 'getFile') {
    url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${params.path}?ref=${BRANCH}`
    options = { method: 'GET', headers, cache: 'no-store' }

  } else if (operation === 'putFile') {
    url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${params.path}`
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
