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
import { getCategoryOrder, getMaxCategoryOrder } from '../lib/categoryOrderUtils'
import styles from './CategoriesPage.module.css'

const OWNER = import.meta.env.VITE_GITHUB_OWNER
const REPO = import.meta.env.VITE_GITHUB_REPO
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH

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

  // ordenação de produtos dentro de uma categoria
  const [orderingCategory, setOrderingCategory] = useState(null)
  const [orderedProducts, setOrderedProducts] = useState([])

  // reordenação da lista de categorias
  const [isReordering, setIsReordering] = useState(false)
  const [reorderedCategories, setReorderedCategories] = useState([])

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

  // ── Modal ──────────────────────────────────────────────

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

  // ── Reordenação de categorias ──────────────────────────

  function handleStartReorder() {
    setReorderedCategories([...categories])
    setIsReordering(true)
  }

  function handleCancelReorder() {
    setIsReordering(false)
    setReorderedCategories([])
  }

  function handleMoveCategoryUp(index) {
    setReorderedCategories(prev => {
      if (index <= 0) return prev
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function handleMoveCategoryDown(index) {
    setReorderedCategories(prev => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  async function handleSaveCategoryOrder() {
    setSaving(true)
    setError('')
    try {
      const { content, sha } = await getProductsFile()
      const newContent = replaceCategoriesInFile(content, reorderedCategories)
      await commitFile('src/data/products.js', newContent, 'feat: ordem de categorias atualizada via painel admin', sha)
      setCategories(reorderedCategories)
      setIsReordering(false)
      setReorderedCategories([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Ordenação de produtos ──────────────────────────────

  async function handleStartOrdering(cat) {
    setSaving(true)
    setError('')
    try {
      const { content } = await getProductsFile()
      const freshProducts = parseProducts(content)
      const catProducts = freshProducts
        .filter(p => p.category && p.category.includes(cat.id))
        .sort((a, b) => getCategoryOrder(b, cat.id) - getCategoryOrder(a, cat.id))
      setOrderingCategory(cat)
      setOrderedProducts(catProducts)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleMoveUp(index) {
    if (index === 0) return
    setOrderedProducts(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function handleMoveDown(index) {
    setOrderedProducts(prev => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function handleCancelOrdering() {
    setOrderingCategory(null)
    setOrderedProducts([])
  }

  async function handleSaveOrder() {
    setSaving(true)
    setError('')
    try {
      const { content, sha } = await getProductsFile()
      const allProducts = parseProducts(content)
      const maxOrder = getMaxCategoryOrder(allProducts, orderingCategory.id)

      let updatedContent = content
      const updatedProducts = []

      for (let i = 0; i < orderedProducts.length; i++) {
        const product = orderedProducts[i]
        const newValue = maxOrder + (orderedProducts.length - i) * 100
        if (getCategoryOrder(product, orderingCategory.id) !== newValue) {
          const freshProduct = allProducts.find(p => p.id === product.id) || product
          const updatedProduct = {
            ...freshProduct,
            categoryOrder: {
              ...(freshProduct.categoryOrder || {}),
              [orderingCategory.id]: newValue,
            }
          }
          updatedContent = replaceProductInFile(updatedContent, updatedProduct)
          updatedProducts.push(updatedProduct)
        }
      }

      await commitFile('src/data/products.js', updatedContent, 'feat: ordem de produtos atualizada via painel admin', sha)

      if (updatedProducts.length > 0) {
        setProducts(prev => prev.map(p => {
          const updated = updatedProducts.find(u => u.id === p.id)
          return updated ?? p
        }))
      }

      setOrderingCategory(null)
      setOrderedProducts([])
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

        {/* ── Tela de ordenação de produtos ── */}
        {orderingCategory !== null ? (
          <>
            <div className={styles.orderHeader}>
              <div>
                <p className={styles.orderHeaderLabel}>Ordenar produtos</p>
                <h2 className={styles.orderHeaderTitle}>{orderingCategory.label}</h2>
              </div>
              <div className={styles.orderHeaderActions}>
                <button
                  className={styles.btnCancel}
                  onClick={handleCancelOrdering}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  className={styles.btnSaveOrder}
                  onClick={handleSaveOrder}
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar ordem'}
                </button>
              </div>
            </div>

            {error && (
              <div className={styles.feedback}>
                <p className={styles.feedbackError}>{error}</p>
              </div>
            )}

            {orderedProducts.length === 0 ? (
              <div className={styles.feedback}>
                <p className={styles.feedbackText}>Nenhum produto nesta categoria.</p>
              </div>
            ) : (
              <ul className={styles.orderList}>
                {orderedProducts.map((product, index) => (
                  <li key={product.id} className={styles.orderItem}>
                    <img
                      className={styles.orderThumb}
                      src={`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/public${product.image}`}
                      alt={product.name}
                      onError={e => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0e6d0" width="100" height="100"/%3E%3C/svg%3E'
                      }}
                    />
                    <p className={styles.orderName}>{product.name}</p>
                    <div className={styles.orderArrows}>
                      <button
                        className={styles.btnArrow}
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || saving}
                        title="Mover para cima"
                      >
                        ↑
                      </button>
                      <button
                        className={styles.btnArrow}
                        onClick={() => handleMoveDown(index)}
                        disabled={index === orderedProducts.length - 1 || saving}
                        title="Mover para baixo"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (

        /* ── Tela de lista de categorias ── */
          <>
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
              <div className={styles.titleActions}>
                {isReordering ? (
                  <>
                    <button
                      className={styles.btnCancel}
                      onClick={handleCancelReorder}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                    <button
                      className={styles.btnSaveOrder}
                      onClick={handleSaveCategoryOrder}
                      disabled={saving}
                    >
                      {saving ? 'Salvando...' : 'Salvar ordem'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={styles.btnReorder}
                      onClick={handleStartReorder}
                      disabled={saving || loading || categories.length <= 1}
                    >
                      Ordenar
                    </button>
                    <button className={styles.btnNew} onClick={openCreate} disabled={saving}>
                      <svg className={styles.btnNewIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Nova categoria
                    </button>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className={styles.feedback}>
                <p className={styles.feedbackError}>{error}</p>
                {!isReordering && (
                  <button className={styles.btnRetry} onClick={fetchData}>Tentar novamente</button>
                )}
              </div>
            )}

            {isReordering ? (
              <ul className={styles.list}>
                {reorderedCategories.map((cat, index) => {
                  const isFixed = cat.id === 'mais-vendidos'
                  const prevCat = index > 0 ? reorderedCategories[index - 1] : null
                  const isFirstMovable = !isFixed && (!prevCat || prevCat.id === 'mais-vendidos')
                  const isLastMovable = !isFixed && index === reorderedCategories.length - 1
                  return (
                    <li key={cat.id} className={styles.item}>
                      <div className={styles.info}>
                        <p className={styles.label}>{cat.label}</p>
                        <p className={styles.meta}>
                          {countProducts(cat.id)} produto{countProducts(cat.id) !== 1 ? 's' : ''}
                          <span className={styles.idChip}>{cat.id}</span>
                        </p>
                      </div>
                      {!isFixed && (
                        <div className={styles.orderArrows}>
                          <button
                            className={styles.btnArrow}
                            onClick={() => handleMoveCategoryUp(index)}
                            disabled={isFirstMovable || saving}
                            title="Mover para cima"
                          >
                            ↑
                          </button>
                          <button
                            className={styles.btnArrow}
                            onClick={() => handleMoveCategoryDown(index)}
                            disabled={isLastMovable || saving}
                            title="Mover para baixo"
                          >
                            ↓
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <>
                {loading && (
                  <div className={styles.feedback}>
                    <p className={styles.feedbackText}>Carregando categorias...</p>
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
                            onClick={() => handleStartOrdering(cat)}
                            disabled={saving}
                            title="Ordenar produtos"
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
              </>
            )}
          </>
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
