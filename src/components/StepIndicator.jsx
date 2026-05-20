import styles from './StepIndicator.module.css'

const STEP_LABELS = [
  'Informações básicas',
  'Descrição',
  'Foto',
  'Revisão',
  'Publicar',
]

export default function StepIndicator({ currentStep, total = 5 }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.dots}>
        {Array.from({ length: total }).map((_, i) => {
          const cls = [
            styles.dot,
            i < currentStep ? styles.dotDone : '',
            i === currentStep ? styles.dotActive : '',
          ].filter(Boolean).join(' ')
          return <div key={i} className={cls} />
        })}
      </div>
      <span className={styles.label}>
        Passo {currentStep + 1} de {total} · {STEP_LABELS[currentStep]}
      </span>
    </div>
  )
}
