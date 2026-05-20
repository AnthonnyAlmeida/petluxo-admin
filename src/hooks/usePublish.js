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
        price: fields.price,
        originalPrice: fields.originalPrice || undefined,
        category: fields.category,
        order: fields.order,
        image: `/images/products/${fields.image}`,
        badge: fields.badge || undefined,
        buyLink: fields.buyLink || undefined,
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

  function appendProductToFile(content, product) {
    const lastBracket = content.lastIndexOf(']')
    if (lastBracket === -1) throw new Error('Formato de products.js inválido')
    const before = content.slice(0, lastBracket).trimEnd().replace(/,\s*$/, '')
    const productStr = '  ' + JSON.stringify(product, null, 2)
      .split('\n')
      .join('\n  ')
    return before + ',\n' + productStr + '\n];\n'
  }

  function reset() {
    setStatus('idle')
    setError('')
    setSteps(prev => prev.map(s => ({ ...s, state: 'wait', detail: '' })))
  }

  return { status, steps, error, publish, reset }
}
