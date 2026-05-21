import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProductForm } from '../hooks/useProductForm'
import { usePublish } from '../hooks/usePublish'
import { getProductsFile } from '../lib/github'
import StepIndicator from '../components/StepIndicator'
import Step1Basics from '../steps/Step1Basics'
import Step2Description from '../steps/Step2Description'
import Step3Photo from '../steps/Step3Photo'
import Step4Review from '../steps/Step4Review'
import Step5Publish from '../steps/Step5Publish'
import styles from './AdminPage.module.css'

export default function AdminPage() {
  const navigate = useNavigate()
  const [nextId, setNextId] = useState(100)
  const [nextOrder, setNextOrder] = useState(100)
  const [imageBlob, setImageBlob] = useState(null)
  const [loadingIds, setLoadingIds] = useState(true)

  const form = useProductForm(nextId, nextOrder)
  const publishHook = usePublish()

  useEffect(() => {
    async function fetchNextIds() {
      try {
        const { content } = await getProductsFile()
        const productsMatch = content.match(/export const PRODUCTS\s*=\s*(\[[\s\S]*?\]);/)
        let maxId = 0
        let maxOrder = 0
        if (productsMatch) {
          const ids = [...content.matchAll(/^\s{2}\{\s*\n\s+id:\s*(\d+)/gm)]
          const orders = [...content.matchAll(/\border:\s*(\d+)/g)]
          maxId = ids.length > 0 ? Math.max(...ids.map(m => parseInt(m[1]))) : 0
          maxOrder = orders.length > 0 ? Math.max(...orders.map(m => parseInt(m[1]))) : 0
        }
        setNextId(maxId + 1)
        setNextOrder(maxOrder + 1)
      } catch {
        // usa defaults se falhar
      } finally {
        setLoadingIds(false)
      }
    }
    fetchNextIds()
  }, [])

  function handleLogout() {
    sessionStorage.removeItem('petluxo-admin-auth')
    navigate('/login')
  }

  async function handlePublish() {
    form.nextStep()
    await publishHook.publish(form.fields, imageBlob)
  }

  function handleNewProduct() {
    publishHook.reset()
    form.resetForm()
    setImageBlob(null)
  }

  const stepTitles = [
    { title: 'Novo produto', subtitle: 'Informações básicas' },
    { title: 'Novo produto', subtitle: 'Descrição e destaques' },
    { title: 'Novo produto', subtitle: 'Foto do produto' },
    { title: 'Novo produto', subtitle: 'Revisão final' },
    { title: 'Publicando', subtitle: 'Enviando para o site' },
  ]

  const current = stepTitles[form.currentStep]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerLogo}>✦ PetLuxo</span>
        <div className={styles.headerRight}>
          <span className={styles.headerLabel}>Admin</span>
          <button className={styles.btnLogout} onClick={handleLogout}>SAIR</button>
        </div>
      </header>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1 className={styles.cardTitle}>{current.title}</h1>
          <p className={styles.cardSubtitle}>
            {loadingIds ? 'Carregando...' : current.subtitle}
          </p>
        </div>

        {form.currentStep < 4 && (
          <StepIndicator currentStep={form.currentStep} total={5} />
        )}

        {form.currentStep === 0 && (
          <Step1Basics
            fields={form.fields}
            setField={form.setField}
            errors={form.errors}
            onNext={form.nextStep}
          />
        )}
        {form.currentStep === 1 && (
          <Step2Description
            fields={form.fields}
            setField={form.setField}
            errors={form.errors}
            onNext={form.nextStep}
            onBack={form.prevStep}
          />
        )}
        {form.currentStep === 2 && (
          <Step3Photo
            fields={form.fields}
            setField={form.setField}
            errors={form.errors}
            onNext={form.nextStep}
            onBack={form.prevStep}
            onImageBlob={setImageBlob}
          />
        )}
        {form.currentStep === 3 && (
          <Step4Review
            fields={form.fields}
            onBack={form.prevStep}
            onPublish={handlePublish}
          />
        )}
        {form.currentStep === 4 && (
          <Step5Publish
            publishHook={{ ...publishHook, reset: handleNewProduct }}
          />
        )}
      </div>
    </div>
  )
}
