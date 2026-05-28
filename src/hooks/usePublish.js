import { useState } from 'react'
import { getProductsFile, commitProducts, commitFile, commitImage, parseProducts } from '../lib/github'
import { blobToBase64 } from '../lib/imageConverter'
import { normalizeCategoryOrder } from '../lib/categoryOrderUtils'

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
      const allProducts = parseProducts(content)
      const { categoryOrder } = normalizeCategoryOrder(
        { category: fields.category, categoryOrder: fields.categoryOrder || {} },
        allProducts
      )

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
        categoryOrder,
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

  function replaceProductInFile(content, product) {
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

  async function update(fields, imageBlob) {
    setStatus('publishing')
    setError('')

    try {
      if (imageBlob !== null) {
        updateStep('image', { state: 'active' })
        const base64 = await blobToBase64(imageBlob)
        await commitImage(fields.image, base64)
        updateStep('image', { state: 'done', detail: fields.image })
      } else {
        updateStep('image', { state: 'done', detail: 'Foto mantida' })
      }

      updateStep('products', { state: 'active' })
      const { content, sha } = await getProductsFile()
      const allProducts = parseProducts(content)
      const { categoryOrder } = normalizeCategoryOrder(
        { category: fields.category, categoryOrder: fields.categoryOrder || {} },
        allProducts
      )

      const updatedProduct = {
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
        categoryOrder,
        image: `/images/products/${fields.image}`,
        badge: fields.badge || undefined,
        ...(fields.hasVariants
          ? { buyLinks: fields.variants.map(v => ({ size: v.size, link: v.link })) }
          : { buyLink: fields.buyLink || undefined }
        ),
        tags: fields.tags.filter(Boolean),
      }

      const updatedContent = replaceProductInFile(content, updatedProduct)
      await commitFile('src/data/products.js', updatedContent, 'feat: produto editado via painel admin', sha)
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

  function reset() {
    setStatus('idle')
    setError('')
    setSteps(prev => prev.map(s => ({ ...s, state: 'wait', detail: '' })))
  }

  return { status, steps, error, publish, update, reset }
}
