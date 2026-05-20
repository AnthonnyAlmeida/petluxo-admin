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
    image: '',
    badge: '',
    buyLink: '',
    tags: [],
  }
}
