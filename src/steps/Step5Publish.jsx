import PublishStatus from '../components/PublishStatus'
import styles from './Step5Publish.module.css'

export default function Step5Publish({ publishHook }) {
  const { status, steps, error, reset } = publishHook

  function handleViewSite() {
    window.open('https://petluxostory.com.br', '_blank')
  }

  return (
    <div className={styles.step}>
      <p className={styles.title}>
        {status === 'success' ? '✦ Produto publicado' : 'Publicando produto...'}
      </p>
      <PublishStatus
        steps={steps}
        status={status}
        error={error}
        onViewSite={handleViewSite}
        onNewProduct={reset}
      />
    </div>
  )
}
