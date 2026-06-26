import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductsFile, parseProducts, parseCategories, putProductsFile, replaceProductInFile, commitFile } from '../lib/github'
import styles from './ProductsPage.module.css'

const OWNER = import.meta.env.VITE_GITHUB_OWNER
const REPO = import.meta.env.VITE_GITHUB_REPO
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH

function getDisplayPrice(product) {
  if (product.prices && product.prices.length > 0) {
    let minVal = Infinity
    let minStr = product.prices[0].price
    for (const p of product.prices) {
      const num = parseFloat(p.price.replace(/[^\d,]/g, '').replace(',', '.'))
      if (!isNaN(num) && num < minVal) {
        minVal = num
        minStr = p.price
      }
    }
    return `${minStr} a partir de`
  }
  return product.price || '—'
}

function removeProductFromFile(content, productId) {
  const idPattern = `\n    id: ${productId},`
  const idIndex = content.indexOf(idPattern)
  if (idIndex === -1) throw new Error(`Produto id=${productId} não encontrado`)

  const blockStart = content.lastIndexOf('\n  {', idIndex)
  if (blockStart === -1) throw new Error(`Bloco do produto id=${productId} inválido`)

  const blockEnd = content.indexOf('\n  }', blockStart + 3)
  if (blockEnd === -1) throw new Error(`Fim do bloco do produto id=${productId} não encontrado`)

  const afterBlock = blockEnd + 4 // skip '\n  }'

  if (content[afterBlock] === ',') {
    // Não é o último: remove '\n  {...\n  },'
    return content.slice(0, blockStart) + content.slice(afterBlock + 1)
  } else {
    // É o último: remove também a vírgula do produto anterior
    const before = content.slice(0, blockStart)
    const trimmed = before.endsWith(',') ? before.slice(0, -1) : before
    return trimmed + content.slice(afterBlock)
  }
}

export default function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [supplierModal, setSupplierModal] = useState(null) // { product } ou null
  const [supplierLinkInput, setSupplierLinkInput] = useState('')
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null) // { product } ou null
  const [visibilityModal, setVisibilityModal] = useState(null) // { product, action: 'hide'|'show' }
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [statusTime, setStatusTime] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  // Polling automático a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      // Não fazer polling se está deletando
      if (deleting !== null) return

      try {
        const { content } = await getProductsFile()
        const parsed = parseProducts(content)
        const newProducts = parsed.sort((a, b) => b.order - a.order)
        const newCategories = parseCategories(content)

        if (JSON.stringify(newProducts) !== JSON.stringify(products)) {
          setProducts(newProducts)
        }
        if (JSON.stringify(newCategories) !== JSON.stringify(categories)) {
          setCategories(newCategories)
        }
      // eslint-disable-next-line no-unused-vars
      } catch (_err) {
        // Ignorar erros silenciosamente durante o polling
      }
    }, 5000) // 5 segundos

    return () => clearInterval(interval)
  }, [deleting, products])

  useEffect(() => {
    function updateTime() {
      setStatusTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const t = setInterval(updateTime, 1000)
    return () => clearInterval(t)
  }, [])

  async function fetchProducts() {
    setLoading(true)
    setError('')
    try {
      const { content } = await getProductsFile()
      const parsed = parseProducts(content)
      setProducts(parsed.sort((a, b) => b.order - a.order))
      setCategories(parseCategories(content))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.shortName && p.shortName.toLowerCase().includes(q))
    const matchCat = !categoryFilter || (p.category && p.category.includes(categoryFilter))
    return matchSearch && matchCat
  })

  function handleDelete(product) {
    setDeleteModal({ product })
  }

  async function handleConfirmDelete() {
    if (!deleteModal) return
    const product = deleteModal.product
    setDeleting(product.id)
    setDeleteModal(null)
    try {
      const { content, sha } = await getProductsFile()
      const updated = removeProductFromFile(content, product.id)
      await putProductsFile(updated, sha)
      await fetchProducts()
    } catch (err) {
      console.error('Erro ao excluir produto:', err)
    } finally {
      setDeleting(null)
    }
  }

  function handleToggleVisibility(product) {
    const action = product.visible === false ? 'show' : 'hide'
    setVisibilityModal({ product, action })
  }

  async function handleConfirmVisibility() {
    if (!visibilityModal) return
    setSavingVisibility(true)
    try {
      const { content, sha } = await getProductsFile()
      const updatedProduct = {
        ...visibilityModal.product,
        visible: visibilityModal.action === 'show' ? true : false
      }
      const updatedContent = replaceProductInFile(content, updatedProduct)
      await commitFile(
        'src/data/products.js',
        updatedContent,
        'feat: visibilidade de produto atualizada via painel admin',
        sha
      )
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
      setVisibilityModal(null)
    } catch (err) {
      console.error('Erro ao atualizar visibilidade:', err)
    } finally {
      setSavingVisibility(false)
    }
  }

  function handleEdit(product) {
    navigate('/admin', { state: { editProduct: product } })
  }

  function handleLogout() {
    sessionStorage.removeItem('petluxo-admin-auth')
    navigate('/login')
  }

  function handleOpenSupplierModal(product) {
    setSupplierLinkInput(product.supplierLink || '')
    setSupplierModal({ product })
  }

  async function handleSaveSupplierLink() {
    if (!supplierModal) return
    setSavingSupplier(true)
    try {
      const { content, sha } = await getProductsFile()
      const updatedProduct = { ...supplierModal.product, supplierLink: supplierLinkInput.trim() }
      const updatedContent = replaceProductInFile(content, updatedProduct)
      await commitFile(
        'src/data/products.js',
        updatedContent,
        'feat: link de fornecedor atualizado via painel admin',
        sha
      )
      setProducts(prev => prev.map(p =>
        p.id === updatedProduct.id ? updatedProduct : p
      ))
      setSupplierModal(null)
    } catch (err) {
      console.error('Erro ao salvar link do fornecedor:', err)
    } finally {
      setSavingSupplier(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusItem}>
            <span className={styles.statusDot} />
            sistema online
          </span>
          <span className={styles.statusItem}>
            <span className={styles.statusDotGold} />
            github conectado
          </span>
          <span className={styles.statusItem}>vercel · deploy ok</span>
        </div>
        <span className={styles.statusRight}>{statusTime}</span>
      </div>

      <header className={styles.header}>
        <span className={styles.headerLogo}>✦ PetLuxo</span>
        <nav className={styles.headerNav}>
          <button className={`${styles.headerNavItem} ${styles.headerNavItemActive}`}>
            Produtos
          </button>
          <button
            className={styles.headerNavItem}
            onClick={() => navigate('/admin/categories')}
          >
            Categorias
          </button>
        </nav>
        <div className={styles.headerRight}>
          <button className={styles.btnLogout} onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <div className={styles.metricsBar}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>// produtos</span>
          <span className={styles.metricValue}>{products.length}</span>
        </div>
        <div className={styles.metricSep} />
        <div className={styles.metric}>
          <span className={styles.metricLabel}>// categorias</span>
          <span className={styles.metricValue}>{categories.length}</span>
        </div>
        <div className={styles.metricSep} />
        <div className={styles.metric}>
          <span className={styles.metricLabel}>// status</span>
          <span className={styles.metricSmall} style={{ color: '#00ff41' }}>● live</span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.titleEyebrow}>// gestão de produtos</p>
            <h1 className={styles.title}>Produtos</h1>
          </div>
          <button className={styles.btnNew} onClick={() => navigate('/admin')}>
            <svg className={styles.btnNewIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo produto
          </button>
        </div>

        {!loading && !error && (
          <>
            <div className={styles.searchRow}>
              <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className={styles.searchInput}
                placeholder="Buscar por nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.filters}>
              <button
                className={`${styles.filterBtn} ${categoryFilter === null ? styles.filterBtnActive : ''}`}
                onClick={() => setCategoryFilter(null)}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`${styles.filterBtn} ${categoryFilter === cat.id ? styles.filterBtnActive : ''}`}
                  onClick={() => setCategoryFilter(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </>
        )}

        {loading && (
          <div className={styles.feedback}>
            <p className={styles.feedbackText}>// carregando produtos...</p>
          </div>
        )}

        {error && (
          <div className={styles.feedback}>
            <p className={styles.feedbackError}>{error}</p>
            <button className={styles.btnRetry} onClick={fetchProducts}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className={styles.feedback}>
            <p className={styles.feedbackText}>// nenhum produto encontrado.</p>
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <ul className={styles.list}>
            {filteredProducts.map((product, index) => (
              <li
                key={product.id}
                className={[styles.item, product.visible === false ? styles.itemHidden : ''].filter(Boolean).join(' ')}
              >
                <span className={styles.itemIndex}>{String(index + 1).padStart(2, '0')}</span>
                <img
                  className={styles.thumb}
                  src={`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/public${product.image}`}
                  alt={product.name}
                  onError={e => {
                    e.target.style.display = 'none'
                  }}
                />
                <div className={styles.info}>
                  <p className={styles.name}>{product.name}</p>
                  <div className={styles.meta}>
                    <span className={styles.price}>{getDisplayPrice(product)}</span>
                    {product.category?.length > 0 && (
                      <>
                        <span className={styles.metaSep}>·</span>
                        <span className={styles.category}>
                          {categories.find(c => c.id === product.category[0])?.label || product.category[0]}
                        </span>
                      </>
                    )}
                  </div>
                  {(product.badge || (product.hasVariants && product.variants?.length > 0)) && (
                    <div className={styles.badges}>
                      {product.badge && <span className={styles.badge}>{product.badge}</span>}
                      {product.hasVariants && product.variants?.length > 0 && (
                        <span className={styles.badgeSizes}>{product.variants.length} tamanhos</span>
                      )}
                    </div>
                  )}
                  <div className={styles.supplierRow}>
                    {product.supplierLink ? (
                      <a
                        href={product.supplierLink.startsWith('http') ? product.supplierLink : `https://${product.supplierLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.supplierLink}
                      >
                        🔗 Fornecedor
                      </a>
                    ) : (
                      <span className={styles.supplierEmpty}>sem link de fornecedor</span>
                    )}
                    <button
                      className={styles.btnSupplierEdit}
                      onClick={() => handleOpenSupplierModal(product)}
                      title="Editar link do fornecedor"
                      aria-label="Editar link do fornecedor"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    className={[styles.btnVisibility, product.visible === false ? styles.btnVisibilityHidden : ''].filter(Boolean).join(' ')}
                    onClick={() => handleToggleVisibility(product)}
                    title={product.visible === false ? 'Exibir no site' : 'Ocultar do site'}
                    aria-label={product.visible === false ? 'Exibir no site' : 'Ocultar do site'}
                  >
                    {product.visible === false ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                  <button
                    className={styles.btnEdit}
                    onClick={() => handleEdit(product)}
                    disabled={deleting === product.id}
                  >
                    Editar
                  </button>
                  <button
                    className={styles.btnDelete}
                    onClick={() => handleDelete(product)}
                    disabled={deleting === product.id}
                    aria-label="Excluir produto"
                  >
                    {deleting === product.id ? (
                      <svg className={styles.deleteIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                    ) : (
                      <svg className={styles.deleteIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {supplierModal && (
        <div className={styles.modalOverlay} onClick={() => setSupplierModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Link do fornecedor</h3>
            <p className={styles.modalProduct}>{supplierModal.product.name}</p>
            <input
              className={styles.modalInput}
              type="url"
              value={supplierLinkInput}
              onChange={e => setSupplierLinkInput(e.target.value)}
              placeholder="https://..."
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setSupplierModal(null)}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleSaveSupplierLink} disabled={savingSupplier}>
                {savingSupplier ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className={styles.modalOverlay} onClick={() => setDeleteModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Excluir produto</h3>
            <p className={styles.modalProduct}>
              Tem certeza que deseja excluir <strong>{deleteModal.product.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button className={styles.btnDanger} onClick={handleConfirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {visibilityModal && (
        <div className={styles.modalOverlay} onClick={() => setVisibilityModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {visibilityModal.action === 'hide' ? 'Ocultar produto?' : 'Exibir produto?'}
            </h3>
            <p className={styles.modalProduct}>
              {visibilityModal.action === 'hide'
                ? `O produto ${visibilityModal.product.name} ficará oculto no site imediatamente. Ele continuará visível aqui no painel.`
                : `O produto ${visibilityModal.product.name} voltará a aparecer no site imediatamente.`}
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setVisibilityModal(null)}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleConfirmVisibility} disabled={savingVisibility}>
                {savingVisibility ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
