import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductsFile, parseProducts, putProductsFile } from '../lib/github'
import { CATEGORIES } from '../data/categories'
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

function getCategoryLabel(categoryIds) {
  if (!categoryIds || categoryIds.length === 0) return ''
  const found = CATEGORIES.find(c => c.id === categoryIds[0])
  return found ? found.label : categoryIds[0]
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)
    setError('')
    try {
      const { content } = await getProductsFile()
      const parsed = parseProducts(content)
      setProducts(parsed.sort((a, b) => b.order - a.order))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.shortName && p.shortName.toLowerCase().includes(q))
    const matchCat = !categoryFilter || (p.category && p.category.includes(categoryFilter))
    return matchSearch && matchCat
  })

  async function handleDelete(product) {
    if (!window.confirm(`Tem certeza que deseja excluir "${product.name}"?`)) return
    setDeleting(product.id)
    try {
      const { content, sha } = await getProductsFile()
      const updated = removeProductFromFile(content, product.id)
      await putProductsFile(updated, sha)
      await fetchProducts()
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  function handleEdit(product) {
    navigate('/admin', { state: { editProduct: product } })
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
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Produtos</h1>
            {!loading && !error && (
              <p className={styles.count}>{products.length} produto{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <button className={styles.btnNew} onClick={() => navigate('/admin')}>
            <svg className={styles.btnNewIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo produto
          </button>
        </div>

        {!loading && !error && (
          <>
            <div className={styles.searchRow}>
              <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Buscar por nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className={styles.filters}>
              <button
                className={`${styles.filterBtn} ${categoryFilter === '' ? styles.filterBtnActive : ''}`}
                onClick={() => setCategoryFilter('')}
              >
                Todos
              </button>
              {CATEGORIES.map(cat => (
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
            <p className={styles.feedbackText}>Carregando produtos...</p>
          </div>
        )}

        {error && (
          <div className={styles.feedback}>
            <p className={styles.feedbackError}>{error}</p>
            <button className={styles.btnRetry} onClick={fetchProducts}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className={styles.feedback}>
            <p className={styles.feedbackText}>Nenhum produto encontrado.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className={styles.list}>
            {filtered.map(product => (
              <li key={product.id} className={styles.item}>
                <img
                  className={styles.thumb}
                  src={`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}${product.image}`}
                  alt={product.name}
                  loading="lazy"
                />
                <div className={styles.info}>
                  <p className={styles.name}>{product.name}</p>
                  <div className={styles.meta}>
                    <span className={styles.price}>{getDisplayPrice(product)}</span>
                    {getCategoryLabel(product.category) && (
                      <>
                        <span className={styles.metaSep}>·</span>
                        <span className={styles.category}>{getCategoryLabel(product.category)}</span>
                      </>
                    )}
                  </div>
                  <div className={styles.badges}>
                    {product.badge && (
                      <span className={styles.badge}>{product.badge}</span>
                    )}
                    {product.hasVariants && product.prices && product.prices.length > 0 && (
                      <span className={styles.badgeSizes}>{product.prices.length} tamanhos</span>
                    )}
                  </div>
                </div>
                <div className={styles.actions}>
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
                    title="Excluir produto"
                    aria-label="Excluir produto"
                  >
                    {deleting === product.id ? (
                      <svg className={styles.deleteIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="9"/>
                      </svg>
                    ) : (
                      <svg className={styles.deleteIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
