export function createProductTemplate(nextId, nextOrder) {
  return {
    id: nextId,
    name: '',
    shortName: '',
    subtitle: '',
    description: '',
    bullets: [],
    price: '',
    originalPrice: '',
    category: [],
    order: nextOrder,
    categoryOrder: {},
    featured: false,
    image: '',
    badge: '',
    buyLink: '',
    tags: [],
    hasVariants: false,
    variants: [],
  }
}
