import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getProductsFile,
  parseCategories,
  parseProducts,
  replaceCategoriesInFile,
  replaceProductInFile,
  commitFile,
} from '../lib/github'
import styles from './CategoriesPage.module.css'

function labelToId(label) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function CategoriesPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // modal: null = fechado, 'create' = novo, objeto = editando
  const [modal, setModal] = useState(null)
  const [modalLabel, setModalLabel] = useState('')
  const [modalId, setModalId] = useState('')
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError('')
    try {
      const { content } = await getProductsFile()
      setCategories(parseCategories(content))
      setProducts(parseProducts(content))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function countProducts(categoryId) {
    return products.filter(p => p.category && p.category.includes(categoryId)).length
  }

  function openCreate() {
    setModal('create')
    setModalLabel('')
    setModalId('')
    setModalError('')
  }

  function openEdit(cat) {
    setModal(cat)
    setModalLabel(cat.label)
    setModalId(cat.id)
    setModalError('')
  }

  function closeModal() {
    setModal(null)
  }

  function handleLabelChange(value) {
    setModalLabel(value)
    if (modal === 'create') {
      setModalId(labelToId(value))
    }
  }

  async function handleSave() {
    if (!modalLabel.trim()) {
      setModalError('Nome é obrigatório.')
      return
    }
    if (modal === 'create' && !modalId.trim()) {
      setModalError('ID inválido — ajuste o nome da categoria.')
      return
    }
    if (modal === 'create' && categories.some(c => c.id === modalId)) {
      setModalError('Já existe uma categoria com esse ID. Escolha outro nome.')
      return
    }

    setSaving(true)
    setModalError('')
    try {
      const { content, sha } = await getProductsFile()
      const current = parseCategories(content)
      let newCategories
      if (modal === 'create') {
        newCategories = [...current, { id: modalId, label: modalLabel.trim() }]
      } else {
        newCategories = current.map(c =>
          c.id === modal.id ? { ...c, label: modalLabel.trim() } : c
        )
      }
      const newContent = replaceCategoriesInFile(content, newCategories)
      const message = modal === 'create'
        ? 'feat: categoria criada via painel admin'
        : 'feat: categoria editada via painel admin'
      await commitFile('src/data/products.js', newContent, message, sha)
      if (modal === 'create') {
        setCategories(prev => [...prev, { id: modalId, label: modalLabel.trim() }])
      } else {
        setCategories(prev => prev.map(c => c.id === modal.id ? { ...c, label: modalLabel.trim() } : c))
      }
      closeModal()
    } catch (err) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${cat.label}"?\n\nEla será removida de todos os produtos que a referenciam.`)) return

    setSaving(true)
    setError('')
    try {
      const { content, sha } = await getProductsFile()
      const current = parseCategories(content)
      const currentProducts = parseProducts(content)
      const newCategories = current.filter(c => c.id !== cat.id)
      let newContent = replaceCategoriesInFile(content, newCategories)

      const affected = currentProducts.filter(p => p.category && p.category.includes(cat.id))
      for (const product of affected) {
        const updated = { ...product, category: product.category.filter(id => id !== cat.id) }
        newContent = replaceProductInFile(newContent, updated)
      }

      await commitFile('src/data/products.js', newContent, 'feat: categoria removida via painel admin', sha)
      setCategories(prev => prev.filter(c => c.id !== cat.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('petluxo-admin-auth')
    navigate('/login')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerLogo}>✦ PetLuxo</span>
        <div className={styles.headerRight}>
          <span className={styles.headerLabel}>Admin</span>
          <button className={styles.btnLogout} onClick={handleLogout}>SAIR</button>
        </div>
      </header>

      <div className={styles.content}>
        <button className={styles.btnBack} onClick={() => navigate('/admin/products')}>
          ← Voltar
        </button>

        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Categorias</h1>
            {!loading && !error && (
              <p className={styles.count}>
                {categories.length} categoria{categories.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button className={styles.btnNew} onClick={openCreate} disabled={saving}>
            <svg className={styles.btnNewIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova categoria
          </button>
        </div>

        {loading && (
          <div className={styles.feedback}>
            <p className={styles.feedbackText}>Carregando categorias...</p>
          </div>
        )}

        {error && (
          <div className={styles.feedback}>
            <p className={styles.feedbackError}>{error}</p>
            <button className={styles.btnRetry} onClick={fetchData}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && categories.length === 0 && (
          <div className={styles.feedback}>
            <p className={styles.feedbackText}>Nenhuma categoria cadastrada.</p>
          </div>
        )}

        {!loading && !error && categories.length > 0 && (
          <ul className={styles.list}>
            {categories.map(cat => (
              <li key={cat.id} className={styles.item}>
                <div className={styles.info}>
                  <p className={styles.label}>{cat.label}</p>
                  <p className={styles.meta}>
                    {countProducts(cat.id)} produto{countProducts(cat.id) !== 1 ? 's' : ''}
                    <span className={styles.idChip}>{cat.id}</span>
                  </p>
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.btnOrder}
                    onClick={() => console.log('ordenar', cat)}
                    disabled={saving}
                    title="Ordenar"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="15" height="15">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="3" y1="12" x2="21" y2="12"/>
                      <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                  <button
                    className={styles.btnEdit}
                    onClick={() => openEdit(cat)}
                    disabled={saving}
                    title="Editar categoria"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    className={styles.btnDelete}
                    onClick={() => handleDelete(cat)}
                    disabled={saving}
                    title="Excluir categoria"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              {modal === 'create' ? 'Nova categoria' : 'Editar categoria'}
            </h2>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Nome da categoria</label>
              <input
                className={styles.fieldInput}
                type="text"
                value={modalLabel}
                onChange={e => handleLabelChange(e.target.value)}
                placeholder="Ex: Coleção Passeio"
                autoFocus
                disabled={saving}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                ID {modal !== 'create' && <span className={styles.readonlyHint}>(não editável)</span>}
              </label>
              <input
                className={[styles.fieldInput, styles.fieldInputMono].join(' ')}
                type="text"
                value={modalId}
                onChange={modal === 'create' ? e => setModalId(e.target.value) : undefined}
                readOnly={modal !== 'create'}
                placeholder="gerado automaticamente"
                disabled={saving}
              />
              {modal === 'create' && (
                <p className={styles.fieldHint}>Gerado a partir do nome — pode ser editado.</p>
              )}
            </div>

            {modalError && <p className={styles.modalError}>{modalError}</p>}

            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={closeModal} disabled={saving}>
                Cancelar
              </button>
              <button className={styles.btnSave} onClick={handleSave} disabled={saving || !modalLabel.trim()}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
