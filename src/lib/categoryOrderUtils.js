export function getCategoryOrder(product, categoryId) {
  return product.categoryOrder?.[categoryId] ?? 0
}

export function getMaxCategoryOrder(products, categoryId) {
  return Math.max(...products.map(p => getCategoryOrder(p, categoryId)), 0)
}

export function generateNextCategoryOrder(products, categoryId) {
  return getMaxCategoryOrder(products, categoryId) + 100
}

export function setCategoryOrder(product, categoryId, value) {
  return {
    ...product,
    categoryOrder: {
      ...(product.categoryOrder || {}),
      [categoryId]: value,
    }
  }
}

export function normalizeCategoryOrder(product, allProducts) {
  const existing = product.categoryOrder || {}
  const normalized = {}
  for (const categoryId of product.category) {
    if (existing[categoryId] != null) {
      normalized[categoryId] = existing[categoryId]
    } else {
      normalized[categoryId] = generateNextCategoryOrder(allProducts, categoryId)
    }
  }
  return { ...product, categoryOrder: normalized }
}
