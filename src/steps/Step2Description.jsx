import { useState } from 'react'
import Field from '../components/Field'
import styles from './Step2Description.module.css'

export default function Step2Description({ fields, setField, errors, onNext, onBack }) {
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

      <Field
        label="Tags"
        name="tags"
        value={fields.tags.join(', ')}
        onChange={v => setField('tags', v.split(',').map(t => t.trim()).filter(Boolean))}
        placeholder="Ex: cama, veludo, conforto, gato"
        hint="Separe por vírgula — ajudam na busca do site"
      />

      <div className={styles.nav}>
        <button type="button" className={styles.btnBack} onClick={onBack}>← Voltar</button>
        <button type="button" className={styles.btnNext} onClick={onNext}>Próximo →</button>
      </div>
    </div>
  )
}
