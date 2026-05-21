const OWNER = import.meta.env.VITE_GITHUB_OWNER
const REPO = import.meta.env.VITE_GITHUB_REPO
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN

const BASE = 'https://api.github.com'

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }
}

export async function getProductsFile() {
  const res = await fetch(
    `${BASE}/repos/${OWNER}/${REPO}/contents/src/data/products.js?ref=${BRANCH}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`GitHub GET falhou: ${res.status}`)
  const data = await res.json()
  return {
    content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
    sha: data.sha,
  }
}

export async function commitFile(path, content, message, sha = null) {
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: BRANCH,
  }
  if (sha) body.sha = sha
  const res = await fetch(
    `${BASE}/repos/${OWNER}/${REPO}/contents/${path}`,
    { method: 'PUT', headers: headers(), body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`GitHub commit falhou: ${err.message}`)
  }
  return res.json()
}

export async function commitProducts(newProductsContent, sha) {
  return commitFile(
    'src/data/products.js',
    newProductsContent,
    'feat: novo produto adicionado via painel admin',
    sha
  )
}

export async function commitImage(filename, base64Content) {
  const path = `public/images/products/${filename}`
  let sha = null
  try {
    const res = await fetch(
      `${BASE}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
      { headers: headers() }
    )
    if (res.ok) {
      const data = await res.json()
      sha = data.sha
    }
  } catch (_) {}
  const body = {
    message: `feat: imagem ${filename} adicionada via painel admin`,
    content: base64Content,
    branch: BRANCH,
  }
  if (sha) body.sha = sha
  const res = await fetch(
    `${BASE}/repos/${OWNER}/${REPO}/contents/${path}`,
    { method: 'PUT', headers: headers(), body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`GitHub image commit falhou: ${err.message}`)
  }
  return res.json()
}
