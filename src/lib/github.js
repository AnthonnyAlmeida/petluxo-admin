async function githubRequest(operation, params) {
  const res = await fetch('/api/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, params }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`GitHub ${operation} falhou: ${data.message || res.status}`)
  return data
}

export async function getProductsFile() {
  const data = await githubRequest('getFile', { path: 'src/data/products.js' })
  return {
    content: decodeURIComponent(escape(atob(data.content.replace(/\n/g, '')))),
    sha: data.sha,
  }
}

export async function commitFile(path, content, message, sha = null) {
  return githubRequest('putFile', {
    path,
    content: btoa(unescape(encodeURIComponent(content))),
    message,
    sha,
  })
}

export async function commitProducts(newProductsContent, sha) {
  return commitFile(
    'src/data/products.js',
    newProductsContent,
    'feat: novo produto adicionado via painel admin',
    sha
  )
}

export async function putProductsFile(content, sha) {
  return commitFile(
    'src/data/products.js',
    content,
    'feat: produto removido via painel admin',
    sha
  )
}

export function parseProducts(content) {
  const idx = content.indexOf('export const PRODUCTS')
  const eqIdx = content.indexOf('=', idx) + 1
  const lastBracket = content.lastIndexOf(']')
  const arrayStr = content.slice(eqIdx, lastBracket + 1).trim()
  return new Function(`return ${arrayStr}`)()
}

export function parseCategories(content) {
  const idx = content.indexOf('export const CATEGORIES')
  const eqIdx = content.indexOf('=', idx) + 1
  const lastBracket = content.indexOf(']', eqIdx) + 1
  const arrayStr = content.slice(eqIdx, lastBracket).trim()
  return new Function(`return ${arrayStr}`)()
}

export async function commitImage(filename, base64Content) {
  const path = `public/images/products/${filename}`
  let sha = null
  try {
    const data = await githubRequest('getFile', { path })
    sha = data.sha
  } catch (_) {}
  return githubRequest('putFile', {
    path,
    content: base64Content,
    message: `feat: imagem ${filename} adicionada via painel admin`,
    sha,
  })
}

export function serializeCategories(categories) {
  const items = categories.map(c => {
    const id = c.id.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const label = c.label.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    return `  { id: '${id}', label: '${label}' }`
  })
  return `export const CATEGORIES = [\n${items.join(',\n')},\n]`
}

export function replaceCategoriesInFile(content, categories) {
  const startIdx = content.indexOf('export const CATEGORIES')
  const endIdx = content.indexOf(']', startIdx) + 1
  const serialized = serializeCategories(categories)
  return content.slice(0, startIdx) + serialized + content.slice(endIdx)
}

function productToJS(product) {
  const lines = ['  {']
  for (const [key, value] of Object.entries(product)) {
    if (value === null || value === undefined) {
      lines.push(`    ${key}: null,`)
    } else if (typeof value === 'string') {
      const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      lines.push(`    ${key}: '${escaped}',`)
    } else if (typeof value === 'number') {
      lines.push(`    ${key}: ${value},`)
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`    ${key}: [],`)
      } else if (value.every(v => typeof v === 'string')) {
        const items = value.map(v => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(', ')
        lines.push(`    ${key}: [${items}],`)
      } else if (value.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
        const items = value.map(obj => {
          const pairs = Object.entries(obj).map(([k, val]) => {
            if (typeof val === 'string') {
              const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
              return `${k}: '${escaped}'`
            }
            return `${k}: ${JSON.stringify(val)}`
          }).join(', ')
          return `{ ${pairs} }`
        }).join(', ')
        lines.push(`    ${key}: [${items}],`)
      } else {
        const json = JSON.stringify(value, null, 2)
          .split('\n')
          .map((l, i) => i === 0 ? `    ${key}: ${l}` : `    ${l}`)
          .join('\n')
        lines.push(json + ',')
      }
    } else {
      lines.push(`    ${key}: ${JSON.stringify(value)},`)
    }
  }
  lines.push('  }')
  return lines.join('\n')
}

export function replaceProductInFile(content, product) {
  const idPattern = `\n    id: ${product.id},`
  const idIndex = content.indexOf(idPattern)
  if (idIndex === -1) throw new Error(`Produto id=${product.id} não encontrado no catálogo`)
  const blockStart = content.lastIndexOf('\n  {', idIndex)
  if (blockStart === -1) throw new Error(`Bloco do produto id=${product.id} inválido`)
  const blockEnd = content.indexOf('\n  }', blockStart + 3)
  if (blockEnd === -1) throw new Error(`Fim do bloco do produto id=${product.id} não encontrado`)
  const before = content.slice(0, blockStart)
  const after = content.slice(blockEnd + 4)
  return before + '\n' + productToJS(product) + after
}
