import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProductForm } from '../hooks/useProductForm'
import { usePublish } from '../hooks/usePublish'
import { getProductsFile, parseCategories } from '../lib/github'
import { fillProductWithAI } from '../lib/ai'
import { generateAIFillPrompt } from '../lib/promptGenerator'
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
  const [categories, setCategories] = useState([])
  const [imageBlob, setImageBlob] = useState(null)
  const [loadingIds, setLoadingIds] = useState(true)

  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiOpen, setAiOpen] = useState(!isEditMode)
  const [aiFilled, setAiFilled] = useState(false)

  const form = useProductForm(nextId, nextOrder, editProduct)
  const publishHook = usePublish()

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
      setCategories(parseCategories(content))
    } catch (err) {
      setNextId(100)
      setNextOrder(100)
    } finally {
      setLoadingIds(false)
    }
  }

  useEffect(() => {
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

  async function handleNewProduct() {
    setLoadingIds(true)
    await fetchNextIds()
    form.resetForm()
    setImageBlob(null)
  }

  async function handleAIFill() {
    setAiLoading(true)
    setAiError('')
    try {
      const prompt = generateAIFillPrompt(aiText, categories)
      const data = await fillProductWithAI(prompt)
      const validIds = new Set(categories.map(c => c.id))
      if (Array.isArray(data.category)) {
        data.category = data.category.filter(id => validIds.has(id))
      }
      form.applyAIData(data)
      setAiText('')
      setAiOpen(false)
      setAiFilled(true)
    } catch {
      setAiError('Não foi possível preencher. Tente novamente.')
    } finally {
      setAiLoading(false)
    }
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

        {form.currentStep === 0 && !isEditMode && (
          aiOpen ? (
            <div className={styles.aiBlock}>
              <p className={styles.aiLabel}>✨ Anthonny AI</p>
              <textarea
                className={styles.aiTextarea}
                placeholder="Cole aqui o texto bruto do produto (nome, descrição, características, tamanhos...)&#10;A IA vai adaptar para o tom PetLuxo automaticamente."
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                rows={5}
                disabled={aiLoading}
              />
              {aiError && <p className={styles.aiError}>{aiError}</p>}
              <button
                className={styles.aiBtn}
                onClick={handleAIFill}
                disabled={aiLoading || !aiText.trim()}
              >
                {aiLoading ? 'Anthonny AI pensando...' : '✨ Preencher com Anthonny AI'}
              </button>
            </div>
          ) : aiFilled && (
            <div className={styles.aiRefillRow}>
              <button className={styles.aiRefill} onClick={() => setAiOpen(true)}>
                ✦ Preencher novamente com IA
              </button>
            </div>
          )
        )}

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
            updateCategory={form.updateCategory}
            categories={categories}
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
