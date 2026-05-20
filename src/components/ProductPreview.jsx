import styles from './ProductPreview.module.css'

export default function ProductPreview({ fields }) {
  const { shortName, name, price, originalPrice, badge, buyLink, image } = fields
  const displayName = shortName || name || 'Nome do produto'
  const hasImage = image && image.trim()

  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        {hasImage ? (
          <img
            src={`/images/products/${image}`}
            alt={displayName}
            className={styles.image}
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <svg className={styles.imagePlaceholderIcon} viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            <span className={styles.imagePlaceholderText}>Foto do produto</span>
          </div>
        )}
      </div>
      <div className={styles.info}>
        {badge && <span className={styles.badge}>{badge}</span>}
        <p className={styles.name}>{displayName}</p>
        {originalPrice && <p className={styles.originalPrice}>{originalPrice}</p>}
        <p className={styles.price}>{price || 'R$ 0,00'}</p>
        <button className={styles.cta}>
          {buyLink ? 'COMPRAR AGORA' : 'VIA WHATSAPP'}
        </button>
      </div>
    </div>
  )
}
