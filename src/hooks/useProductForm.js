import { useState, useEffect, useRef } from 'react'
import { createProductTemplate } from '../data/productTemplate'
import { getProductsFile, parseProducts } from '../lib/github'
import { normalizeCategoryOrder } from '../lib/categoryOrderUtils'

const TOTAL_STEPS = 5

export function useProductForm(nextId, nextOrder, initialData = null) {
  const [currentStep, setCurrentStep] = useState(0)
  const [fields, setFields] = useState(() => initialData ?? createProductTemplate(nextId, nextOrder))
  const [errors, setErrors] = useState({})
  const isEditMode = useRef(initialData !== null)

  useEffect(() => {
    if (!isEditMode.current) {
      setFields(prev => ({ ...prev, id: nextId, order: nextOrder }))
    }
  }, [nextId, nextOrder])

  function setField(key, value) {
    setFields(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function addVariant() {
    setFields(prev => ({
      ...prev,
      variants: [...prev.variants, { size: '', price: '', link: '' }],
    }))
  }

  function updateVariant(index, key, value) {
    setFields(prev => {
      const updated = [...prev.variants]
      updated[index] = { ...updated[index], [key]: value }
      return { ...prev, variants: updated }
    })
  }

  function removeVariant(index) {
    setFields(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }))
  }

  function validate(step) {
    const errs = {}
    if (step === 0) {
      if (!fields.name.trim()) errs.name = 'Nome obrigatório'
      if (!fields.shortName.trim()) errs.shortName = 'Nome curto obrigatório'
      if (!fields.hasVariants && !fields.price.trim()) errs.price = 'Preço obrigatório'
      if (fields.hasVariants && fields.variants.length === 0) errs.variants = 'Adicione ao menos um tamanho'
      if (fields.category.length === 0) errs.category = 'Selecione ao menos uma categoria'
    }
    if (step === 1) {
      if (!fields.description.trim()) errs.description = 'Descrição obrigatória'
    }
    if (step === 2) {
      if (!fields.image.trim()) errs.image = 'Foto obrigatória'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function nextStep() {
    if (validate(currentStep)) {
      setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
    }
  }

  function prevStep() {
    setCurrentStep(s => Math.max(s - 1, 0))
  }

  function resetForm() {
    setFields(isEditMode.current ? initialData : createProductTemplate(nextId, nextOrder))
    setErrors({})
    setCurrentStep(0)
  }

  function applyAIData(data) {
    setFields(prev => ({ ...prev, ...data }))
  }

  async function updateCategory(categoryId) {
    const newCategory = fields.category.includes(categoryId)
      ? fields.category.filter(id => id !== categoryId)
      : [...fields.category, categoryId]
    const { content } = await getProductsFile()
    const allProducts = parseProducts(content)
    const normalized = normalizeCategoryOrder(
      { category: newCategory, categoryOrder: fields.categoryOrder || {} },
      allProducts
    )
    setFields(prev => ({
      ...prev,
      category: normalized.category,
      categoryOrder: normalized.categoryOrder,
    }))
    setErrors(prev => ({ ...prev, category: '' }))
  }

  return {
    fields,
    setField,
    applyAIData,
    errors,
    currentStep,
    nextStep,
    prevStep,
    resetForm,
    isLastStep: currentStep === TOTAL_STEPS - 1,
    addVariant,
    updateVariant,
    removeVariant,
    updateCategory,
  }
}
