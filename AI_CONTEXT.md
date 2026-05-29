# AI_CONTEXT.md — PetLuxo Admin

## Visão geral
Painel administrativo React para gestão de produtos e categorias da PetLuxo. Usuária não-técnica (iPad). Fluxo: Login → Listagem → Criar/Editar produto (5 steps) → Publicação automática no GitHub → Deploy na Vercel.

## Stack e ambiente
- React 18 + Vite, react-router-dom, CSS Modules
- GitHub Contents API para leitura/escrita de `products.js` e imagens — via Edge Functions (`/api/github`)
- Canvas API para conversão de imagens em WebP
- Variáveis de servidor (sem prefixo `VITE_`, não entram no bundle): `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_BRANCH`, `CLAUDE_API_KEY`
- Variáveis de cliente (prefixo `VITE_`, usadas para URLs de thumbnail): `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_BRANCH` — não são segredos (repo público)

## Rotas (App.jsx)
- `/login` → LoginPage
- `/admin` → AdminPage (protegida) — criação e edição de produto
- `/admin/products` → ProductsPage (protegida)
- `/admin/categories` → CategoriesPage (protegida) — gerenciamento de categorias
- `*` → redirect `/login`
- Após login bem-sucedido: navega para `/admin/products`; `PrivateRoute` checa `!!sessionStorage.getItem('petluxo-admin-auth')` (token UUID)

## Estrutura de arquivos
```
api/
  auth.js    Edge Function — valida ADMIN_PASSWORD e retorna token UUID de sessão
  github.js  Edge Function — proxy para GitHub Contents API (token protegido)
  ai.js      Edge Function — proxy para Anthropic API (chave protegida)
src/
  pages/   LoginPage, AdminPage, ProductsPage, CategoriesPage
  steps/   Step1Basics, Step2Description, Step3Photo, Step4Review, Step5Publish
  components/ Field, StepIndicator, ProductPreview, PublishStatus
  hooks/   useProductForm, usePublish
  lib/     github.js, imageConverter.js, formatPrice.js, ai.js, promptGenerator.js, categoryOrderUtils.js
  data/    productTemplate.js
  styles/  variables.css, globals.css
```

## Convenções
1. CSS Modules em todos os componentes — camelCase, tokens via `variables.css`
2. Encoding UTF-8 GitHub: escrita `btoa(unescape(encodeURIComponent(s)))`, leitura `decodeURIComponent(escape(atob(s)))`
3. Caminhos de imagem sempre com `/` inicial: `/images/products/arquivo.webp`
4. `products.js` usa JS puro: chaves sem aspas, strings com aspas simples — gerado por `productToJS()`
5. Categorias não são hardcoded: `parseCategories()` em `github.js` extrai `CATEGORIES` do mesmo `products.js` do repo petluxo

## Modelo de produto
Campos: `id, name, shortName, subtitle, description, bullets, category[], order, categoryOrder{}, image, badge, tags, originalPrice`

**Simples** (`hasVariants: false`): `price`, `buyLink`, `variants: []`

**Com variantes** (`hasVariants: true`): `price: ''`, `buyLink: ''`, `prices[{size, price}]`, `buyLinks[{size, link}]`, `variants` (estado interno do painel)

URL de imagens: `https://raw.githubusercontent.com/${VITE_GITHUB_OWNER}/${VITE_GITHUB_REPO}/${VITE_GITHUB_BRANCH}/public${product.image}`

## categoryOrderUtils.js — funções exportadas
- `getCategoryOrder(product, categoryId)` → valor numérico do `categoryOrder[categoryId]` ou `0`
- `getMaxCategoryOrder(products, categoryId)` → maior valor entre todos os produtos para a categoria
- `generateNextCategoryOrder(products, categoryId)` → `max + 100` (próximo slot livre)
- `setCategoryOrder(product, categoryId, value)` → novo objeto produto com o campo atualizado
- `normalizeCategoryOrder(product, allProducts)` → adiciona entradas faltantes (com `generateNextCategoryOrder`), remove entradas de categorias que o produto não pertence mais, mantém valores existentes

## github.js — funções exportadas
- Todas as operações HTTP passam por `/api/github` (Edge Function) via `githubRequest(operation, params)` — o token nunca chega ao browser
- `getProductsFile()` → `{ content, sha }`; força `cache: 'no-store'` via Edge Function (evita SHA stale)
- `commitFile(path, content, message, sha?)` — recebe conteúdo bruto; codifica em base64 antes de enviar ao proxy
- `commitProducts(content, sha)` / `putProductsFile(content, sha)` — atalhos para products.js
- `commitImage(filename, base64Content)` — busca SHA existente via `getFile` e faz upload via `putFile`
- `parseProducts(content)` → array objetos; `parseCategories(content)` → array `{ id, label }`
- `serializeCategories(categories)` — converte array em bloco JS; `replaceCategoriesInFile(content, categories)` → substitui bloco CATEGORIES mantendo PRODUCTS intacto; escapa `\` e `'` nos valores
- `replaceProductInFile(content, product)` → substitui bloco de um produto pelo ID usando `productToJS()` interno

## Hooks principais
- `useProductForm(nextId, nextOrder, initialData=null)` — estado do formulário; expõe `applyAIData(data)` e `updateCategory(categoryId)` (async: toggle da categoria + fetch de allProducts + `normalizeCategoryOrder` + atualiza `fields.category` e `fields.categoryOrder` juntos)
- `usePublish()` — orquestração: `publish()`, `update()`, `reset()`; contém cópias internas de `productToJS`/`replaceProductInFile` independentes das de `github.js`; ambos `publish()` e `update()` chamam `normalizeCategoryOrder` antes de montar o objeto produto, garantindo que `categoryOrder` reflita exatamente as categorias selecionadas no momento do commit

## Integração com IA
- `src/lib/ai.js` — `fillProductWithAI(prompt)`: chama `/api/ai` (Edge Function) que repassa ao Anthropic `claude-haiku-4-5-20251001`; `CLAUDE_API_KEY` fica apenas no servidor
- `src/lib/promptGenerator.js` — `generateAIFillPrompt(rawText, categories)`: injeta IDs válidos; tom premium sem emojis

## AdminPage.jsx
- Lê `location.state?.editProduct`; se existe, é modo edição
- `fetchNextIds()` também chama `parseCategories()` → `categories` passado para `Step1Basics`
- **Bloco Anthonny AI** (Step 0, criação apenas): `aiOpen` inicia `true`; valida IDs antes de `applyAIData`

## ProductsPage.jsx
- Header: botão **Categorias** (→ `/admin/categories`) + botão SAIR
- Mount + polling 5s: `parseProducts()` + `parseCategories()` → ordena por `order` desc
- Filtros: busca por nome; categoria pills (seleção única, match por `category.includes(id)`)
- Card: thumbnail 52px, nome, preço, categoria (label do primeiro ID), badges, Editar + lixeira
- **Excluir**: confirm → `removeProductFromFile()` (manipulação de string) → `putProductsFile()`

## CategoriesPage.jsx
- Mount: `getProductsFile()` → `parseCategories()` + `parseProducts()` — sem polling
- **Lista**: label, ID chip, contagem de produtos; botões Ordenar / editar / excluir por item
- **Modal criar**: Nome + ID auto-gerado por `labelToId()` (lowercase, normalize NFD, sem acentos, espaços→hífens); valida ID único; commit → `setCategories()` otimista → fecha modal
- **Modal editar**: ID readonly; só atualiza label; mesmo fluxo de commit otimista
- **Excluir**: confirm → `replaceCategoriesInFile` + `replaceProductInFile` por produto afetado → um `commitFile` → `setCategories()` otimista
- **Abrir ordenação** (`handleStartOrdering`): async — `getProductsFile()` fresco, `parseProducts()`, filtra e ordena DESC por `getCategoryOrder(p, cat.id)` (produtos sem entrada ficam em 0, no final); `saving=true` durante fetch; erro mostrado na tela de lista
- **Tela de ordenação** (`orderingCategory !== null`): substitui a lista; thumbnail 40px, nome e setas ↑↓; setas desabilitadas (opacity 0.3) nas extremidades; movimentação só local; botões "Cancelar" e "Salvar ordem" (verde `--color-success`)
- **Salvar ordem**: `getProductsFile()` + `parseProducts()` frescos → `maxOrder = getMaxCategoryOrder(allProducts, orderingCategory.id)` → para cada posição `i`, `newValue = maxOrder + (length - i) * 100` → só atualiza se `getCategoryOrder(product, categoryId) !== newValue` → monta `updatedProduct` com `categoryOrder[categoryId] = newValue` (spread preserva outras categorias) → `replaceProductInFile` por produto alterado → um `commitFile` → `setProducts()` otimista → `setOrderingCategory(null)`
- Thumbnail URL: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/public${product.image}` (constantes de env no topo do arquivo)

## Fluxos
**Criar produto:** ProductsPage → `/admin` → 5 steps → `publish()` → Step5
**Editar produto:** ProductsPage → `/admin` (com `state.editProduct`) → 5 steps → `update()`
**Excluir produto:** ProductsPage → confirm → `removeProductFromFile()` → `putProductsFile()`
**Categorias:** ProductsPage (btn Categorias) → CategoriesPage → criar/editar/excluir

## Step3Photo (edição)
- `fields.image` normalizado para filename; preview do GitHub exibido
- Botão "Trocar foto" permite substituir; `imageBlob = null` → `update()` pula upload
