import styles from './PublishStatus.module.css'

function StepIcon({ state }) {
  if (state === 'done') {
    return (
      <div className={[styles.icon, styles.iconDone].join(' ')}>
        <svg className={[styles.iconSvg, styles.iconSvgDone].join(' ')} viewBox="0 0 24 24">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
    )
  }
  if (state === 'active') {
    return (
      <div className={[styles.icon, styles.iconActive].join(' ')}>
        <svg className={[styles.iconSvg, styles.iconSvgActive, styles.spinning].join(' ')} viewBox="0 0 24 24">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </div>
    )
  }
  return (
    <div className={[styles.icon, styles.iconWait].join(' ')}>
      <svg className={[styles.iconSvg, styles.iconSvgWait].join(' ')} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 3"/>
      </svg>
    </div>
  )
}

export default function PublishStatus({ steps, status, error, onViewSite, onNewProduct }) {
  return (
    <div className={styles.wrapper}>
      {steps.map(step => (
        <div key={step.id} className={styles.step}>
          <StepIcon state={step.state} />
          <div className={styles.text}>
            <span className={styles.label}>{step.label}</span>
            {step.detail && <span className={styles.detail}>{step.detail}</span>}
          </div>
        </div>
      ))}

      {status === 'success' && (
        <div className={styles.success}>
          <p className={styles.successTitle}>✦ Produto publicado!</p>
          <p className={styles.successSub}>Já está disponível em petluxostory.com.br</p>
          <button className={styles.btnSite} onClick={onViewSite}>Ver no site →</button>
          <button className={styles.btnSite} style={{ background: 'transparent', color: 'var(--color-muted)', border: '0.5px solid #e0d5c5', marginTop: '0.25rem' }} onClick={onNewProduct}>
            Adicionar outro produto
          </button>
        </div>
      )}

      {status === 'error' && error && (
        <div className={styles.errorBox}>
          <strong>Erro:</strong> {error}
        </div>
      )}
    </div>
  )
}
