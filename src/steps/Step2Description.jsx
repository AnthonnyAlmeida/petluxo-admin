import { useState } from 'react'
import Field from '../components/Field'
import { generatePrompt } from '../lib/promptGenerator'
import styles from './Step2Description.module.css'

export default function Step2Description({ fields, setField, errors, onNext, onBack }) {
  const [copied, setCopied] = useState(false)

  const bullets = fields.bullets.length > 0 ? fields.bullets : ['']

  function updateBullet(index, value) {
    const updated = [...bullets]
    updated[index] = value
    setField('bullets', updated)
  }

  function addBullet() {
    setField('bullets', [...bullets, ''])
  }

  function removeBullet(index) {
    const updated = bullets.filter((_, i) => i !== index)
    setField('bullets', updated.length > 0 ? updated : [''])
  }

  async function handleCopyPrompt() {
    const prompt = generatePrompt({
      name: fields.name,
      description: fields.description,
      bullets: fields.bullets,
    })
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      window.open('https://claude.ai', '_blank')
    } catch {
      alert('Não foi possível copiar automaticamente. Selecione e copie o texto do prompt.')
    }
  }

  return (
    <div className={styles.step}>
      <Field
        label="Descrição do produto"
        name="description"
        value={fields.description}
        onChange={v => setField('description', v)}
        placeholder="Descreva o produto como você explicaria para uma amiga..."
        multiline
        rows={4}
        error={errors.description}
        required
      />

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>refinar com Claude</span>
        <div className={styles.dividerLine} />
      </div>

      <div className={styles.promptBox}>
        <p className={styles.promptBoxTitle}>✦ Prompt pronto para copiar</p>
        <p className={styles.promptBoxText}>
          {generatePrompt({ name: fields.name || 'Nome do produto', description: fields.description || '...', bullets: fields.bullets }).slice(0, 180)}...
        </p>
        <button
          type="button"
          className={[styles.btnCopy, copied ? styles.btnCopied : ''].filter(Boolean).join(' ')}
          onClick={handleCopyPrompt}
        >
          <svg className={styles.copyIcon} viewBox="0 0 24 24">
            {copied
              ? <path d="M20 6L9 17l-5-5"/>
              : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
            }
          </svg>
          {copied ? 'Copiado! Claude aberto ↗' : 'Copiar prompt + abrir Claude'}
        </button>
      </div>

      <div>
        <p className={styles.bulletsLabel}>Pontos de destaque (bullets)</p>
      </div>
      {bullets.map((bullet, i) => (
        <div key={i} className={styles.bulletRow}>
          <input
            type="text"
            className={styles.bulletInput}
            value={bullet}
            onChange={e => updateBullet(i, e.target.value)}
            placeholder={`Destaque ${i + 1}`}
          />
          {bullets.length > 1 && (
            <button type="button" className={styles.bulletRemove} onClick={() => removeBullet(i)}>
              ×
            </button>
          )}
        </div>
      ))}
      <button type="button" className={styles.btnAddBullet} onClick={addBullet}>
        + Adicionar bullet
      </button>

      <div className={styles.nav}>
        <button type="button" className={styles.btnBack} onClick={onBack}>← Voltar</button>
        <button type="button" className={styles.btnNext} onClick={onNext}>Próximo →</button>
      </div>
    </div>
  )
}
