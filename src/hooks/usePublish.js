import { useState } from 'react'
import { getProductsFile, commitProducts, commitImage } from '../lib/github'
import { blobToBase64 } from '../lib/imageConverter'

export function usePublish() {
  const [status, setStatus] = useState('idle')
  const [steps, setSteps] = useState([
    { id: 'image', label: 'Enviando foto', detail: '', state: 'wait' },
    { id: 'products', label: 'Atualizando catálogo', detail: '', state: 'wait' },
    { id: 'deploy', label: 'Publicando no site', detail: 'Aguardando Vercel (~1 min)', state: 'wait' },
  ])
  const [error, setError] = useState('')

  function updateStep(id, patch) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  async function publish(fields, imageBlob) {
    setStatus('publishing')
    setError('')

    try {
      updateStep('image', { state: 'active' })
      const base64 = await blobToBase64(imageBlob)
      await commitImage(fields.image, base64)
      updateStep('image', { state: 'done', detail: fields.image })

      updateStep('products', { state: 'active' })
      const { content, sha } = await getProductsFile()

      const newProduct = {
        id: fields.id,
        name: fields.name,
        shortName: fields.shortName,
        subtitle: fields.subtitle,
        description: fields.description,
        bullets: fields.bullets.filter(Boolean),
        ...(fields.hasVariants
          ? { prices: fields.variants.map(v => ({ size: v.size, price: v.price })) }
          : { price: fields.price }
        ),
        originalPrice: fields.originalPrice || undefined,
        category: fields.category,
        order: fields.order,
        image: `/images/products/${fields.image}`,
        badge: fields.badge || undefined,
        ...(fields.hasVariants
          ? { buyLinks: fields.variants.map(v => ({ size: v.size, link: v.link })) }
          : { buyLink: fields.buyLink || undefined }
        ),
        tags: fields.tags.filter(Boolean),
      }

      const updatedContent = appendProductToFile(content, newProduct)
      await commitProducts(updatedContent, sha)
      updateStep('products', { state: 'done', detail: 'products.js atualizado' })

      updateStep('deploy', { state: 'active' })
      await new Promise(r => setTimeout(r, 3000))
      updateStep('deploy', { state: 'done', detail: 'Vercel deploy disparado' })

      setStatus('success')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
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

  function appendProductToFile(content, product) {
    const lastBracket = content.lastIndexOf(']')
    if (lastBracket === -1) throw new Error('Formato de products.js inválido')
    const before = content.slice(0, lastBracket).trimEnd().replace(/,\s*$/, '')
    return before + ',\n' + productToJS(product) + '\n];\n'
  }

  function reset() {
    setStatus('idle')
    setError('')
    setSteps(prev => prev.map(s => ({ ...s, state: 'wait', detail: '' })))
  }

  return { status, steps, error, publish, reset }
}
