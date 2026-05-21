import { useState, useEffect } from 'react'
import { createProductTemplate } from '../data/productTemplate'

const TOTAL_STEPS = 5

export function useProductForm(nextId, nextOrder) {
  const [currentStep, setCurrentStep] = useState(0)
  const [fields, setFields] = useState(() => createProductTemplate(nextId, nextOrder))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setFields(prev => ({ ...prev, id: nextId, order: nextOrder }))
  }, [nextId, nextOrder])

  function setField(key, value) {
    setFields(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function validate(step) {
    const errs = {}
    if (step === 0) {
      if (!fields.name.trim()) errs.name = 'Nome obrigatório'
      if (!fields.shortName.trim()) errs.shortName = 'Nome curto obrigatório'
      if (!fields.price.trim()) errs.price = 'Preço obrigatório'
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
    setFields(createProductTemplate(nextId, nextOrder))
    setErrors({})
    setCurrentStep(0)
  }

  return {
    fields,
    setField,
    errors,
    currentStep,
    nextStep,
    prevStep,
    resetForm,
    isLastStep: currentStep === TOTAL_STEPS - 1,
  }
}
