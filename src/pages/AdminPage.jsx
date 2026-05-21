import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const editProduct = location.state?.editProduct ?? null
  const isEditMode = editProduct !== null

  const [nextId, setNextId] = useState(100)
  const [nextOrder, setNextOrder] = useState(100)
  const [imageBlob, setImageBlob] = useState(null)
  const [loadingIds, setLoadingIds] = useState(true)

  const form = useProductForm(nextId, nextOrder, editProduct)
  const publishHook = usePublish()

  useEffect(() => {
    async function fetchNextIds() {
      try {
        const { content } = await getProductsFile()
        const allIds = []
        const allOrders = []
        const idRegex = /^\s+id:\s*(\d+)\s*,/gm
        const orderRegex = /^\s+order:\s*(\d+)\s*,/gm
        let m
        while ((m = idRegex.exec(content)) !== null) {
          allIds.push(parseInt(m[1]))
        }
        while ((m = orderRegex.exec(content)) !== null) {
          allOrders.push(parseInt(m[1]))
        }
        const maxId = allIds.length > 0 ? Math.max(...allIds) : 0
        const maxOrder = allOrders.length > 0 ? Math.max(...allOrders) : 0
        setNextId(maxId + 1)
        setNextOrder(maxOrder + 1)
      } catch (err) {
        setNextId(100)
        setNextOrder(100)
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
    if (isEditMode) {
      await publishHook.update(form.fields, imageBlob)
    } else {
      await publishHook.publish(form.fields, imageBlob)
    }
  }

  function handleNewProduct() {
    navigate('/admin/products')
  }

  const modeTitle = isEditMode ? 'Editar produto' : 'Novo produto'
  const stepTitles = [
    { title: modeTitle, subtitle: 'Informações básicas' },
    { title: modeTitle, subtitle: 'Descrição e destaques' },
    { title: modeTitle, subtitle: 'Foto do produto' },
    { title: modeTitle, subtitle: 'Revisão final' },
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

        <div className={styles.toolbar}>
          <button className={styles.btnBack} onClick={() => navigate('/admin/products')}>
            ← Voltar
          </button>
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
            addVariant={form.addVariant}
            updateVariant={form.updateVariant}
            removeVariant={form.removeVariant}
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
