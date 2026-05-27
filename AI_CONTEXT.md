# AI_CONTEXT.md — PetLuxo Admin

## Visão geral
Painel administrativo React para gestão de produtos da PetLuxo. Usuária não-técnica (iPad). Fluxo: Login → Listagem → Criar/Editar produto (5 steps) → Publicação automática no GitHub → Deploy na Vercel.

## Stack e ambiente
- React 18 + Vite, react-router-dom, CSS Modules
- GitHub Contents API para leitura/escrita de `products.js` e imagens
- Canvas API para conversão de imagens em WebP
- `.env.local`: `VITE_ADMIN_PASSWORD`, `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_BRANCH`, `VITE_GITHUB_TOKEN`

## Rotas (App.jsx)
- `/login` → LoginPage
- `/admin` → AdminPage (protegida) — criação e edição de produto
- `/admin/products` → ProductsPage (protegida)
- `*` → redirect `/login`
- Após login bem-sucedido: navega para `/admin/products`

## Estrutura de arquivos
```
src/
  pages/   LoginPage, AdminPage, ProductsPage
  steps/   Step1Basics, Step2Description, Step3Photo, Step4Review, Step5Publish
  components/ Field, StepIndicator, ProductPreview, PublishStatus
  hooks/   useProductForm, usePublish
  lib/     github.js, imageConverter.js, formatPrice.js
  data/    categories.js, productTemplate.js
  styles/  variables.css, globals.css
```

## Convenções
1. CSS Modules em todos os componentes — camelCase, tokens via `variables.css`
2. Encoding UTF-8 GitHub: escrita `btoa(unescape(encodeURIComponent(s)))`, leitura `decodeURIComponent(escape(atob(s)))`
3. Caminhos de imagem sempre com `/` inicial: `/images/products/arquivo.webp`
4. `products.js` usa JS puro: chaves sem aspas, strings com aspas simples — gerado por `productToJS()`

## Modelo de produto
Campos: `id, name, shortName, subtitle, description, bullets, category[], order, image, badge, tags, originalPrice`

**Simples** (`hasVariants: false`): `price`, `buyLink`, `variants: []`

**Com variantes** (`hasVariants: true`): `price: ''`, `buyLink: ''`, `prices[{size, price}]`, `buyLinks[{size, link}]`, `variants` (estado interno do painel)

URL de imagens: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}${product.image}`

## Hooks principais
- `useProductForm(nextId, nextOrder, initialData=null)` — estado do formulário (criação ou edição)
- `usePublish()` — orquestração de publicação: `publish()`, `update()`, `reset()`

## AdminPage.jsx
- Lê `location.state?.editProduct` via `useLocation()`; se existe, é modo edição
- Título dinâmico: `"Editar produto"` vs `"Novo produto"`
- Botão "Voltar" (↖ 0.75rem padding, acima do StepIndicator): navega para `/admin/products`
- `handlePublish`: chama `update()` em edição, `publish()` em criação
- `fetchNextIds()` chamada: (1) no mount, (2) após publicação bem-sucedida — garante IDs corretos em criações sequenciais
- `handleNewProduct` (clique em "Adicionar outro produto" no Step5): recarrega IDs, reseta formulário + imageBlob, volta para Step 0
- `nextId`/`nextOrder`: regex `/^\s+id:\s*(\d+)\s*,/gm` no products.js (max + 1, fallback 100)

## ProductsPage.jsx
- Mount: `getProductsFile()` → `parseProducts()` → ordena por `order` desc
- **Polling automático**: `setInterval` a cada 30s refaz fetch silenciosamente; pausa se `deleting !== null`
- Filtros: busca por `name`/`shortName`; categoria (pills, seleção única)
- Card: thumbnail 52px, nome, preço, categoria, badges, Editar + lixeira
- **Editar**: `navigate('/admin', { state: { editProduct: product } })`
- **Excluir**: `window.confirm()` → `removeProductFromFile()` → `putProductsFile()` → refetch

## Fluxos
**Criar:** ProductsPage → `/admin` (sem state) → 5 steps → `publish()` → Step5 sucesso ("Adicionar outro" reseta na mesma página, "Voltar" → `/admin/products`)

**Editar:** ProductsPage → `/admin` (com `state.editProduct`) → 5 steps → `update()` → Step5 sucesso → "Voltar" → `/admin/products`

**Excluir:** ProductsPage → confirm → `removeProductFromFile()` → `putProductsFile()` → refetch

**Criar sequencial (sem sair da página):** Step5 "Adicionar outro" → `fetchNextIds()` (refresca IDs) → reseta formulário → volta Step 0

## Step3Photo (edição)
- `fields.image` normalizado para filename; preview do GitHub exibido
- Botão "Trocar foto" permite substituir
- Se não trocar: `imageBlob = null` → `update()` pula upload
