import ProductPreview from '../components/ProductPreview'
import styles from './Step4Review.module.css'

export default function Step4Review({ fields, onBack, onPublish }) {
  const rows = [
    { key: 'Categorias', val: fields.category.join(', ') || '—' },
    { key: 'Subtítulo', val: fields.subtitle || '—' },
    { key: 'Preço original', val: fields.originalPrice || '—' },
    { key: 'Badge', val: fields.badge || '—' },
    !fields.hasVariants && { key: 'Link PagBank', val: fields.buyLink ? '✓ Configurado' : '—' },
    fields.hasVariants && {
      key: 'Tamanhos',
      val: fields.variants.map(v => v.size).filter(Boolean).join(', ') || '—',
    },
    { key: 'Foto', val: fields.image || '—' },
    { key: 'Bullets', val: fields.bullets.filter(Boolean).length + ' item(s)' },
  ].filter(Boolean)

  return (
    <div className={styles.step}>
      <div className={styles.previewWrapper}>
        <ProductPreview fields={fields} />
      </div>

      <div className={styles.dataList}>
        {rows.map(row => (
          <div key={row.key} className={styles.dataRow}>
            <span className={styles.dataKey}>{row.key}</span>
            <span className={styles.dataVal}>{row.val}</span>
          </div>
        ))}
      </div>

      <div className={styles.nav}>
        <button type="button" className={styles.btnBack} onClick={onBack}>← Corrigir</button>
        <button type="button" className={styles.btnPublish} onClick={onPublish}>PUBLICAR</button>
      </div>
    </div>
  )
}
