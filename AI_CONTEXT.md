# AI_CONTEXT.md — PetLuxo Admin

## Visão geral
Painel administrativo React para gestão de produtos e categorias da PetLuxo. Usuária não-técnica (iPad). Fluxo: Login → Listagem → Criar/Editar produto (5 steps) → Publicação automática no GitHub → Deploy na Vercel.

## Stack e ambiente
- React 18 + Vite, react-router-dom, CSS Modules
- GitHub Contents API para leitura/escrita de `products.js` e imagens
- Canvas API para conversão de imagens em WebP
- `.env.local`: `VITE_ADMIN_PASSWORD`, `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_BRANCH`, `VITE_GITHUB_TOKEN`

## Rotas (App.jsx)
- `/login` → LoginPage
- `/admin` → AdminPage (protegida) — criação e edição de produto
- `/admin/products` → ProductsPage (protegida)
- `/admin/categories` → CategoriesPage (protegida) — gerenciamento de categorias
- `*` → redirect `/login`
- Após login bem-sucedido: navega para `/admin/products`

## Estrutura de arquivos
```
src/
  pages/   LoginPage, AdminPage, ProductsPage, CategoriesPage
  steps/   Step1Basics, Step2Description, Step3Photo, Step4Review, Step5Publish
  components/ Field, StepIndicator, ProductPreview, PublishStatus
  hooks/   useProductForm, usePublish
  lib/     github.js, imageConverter.js, formatPrice.js, ai.js, promptGenerator.js
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
Campos: `id, name, shortName, subtitle, description, bullets, category[], order, image, badge, tags, originalPrice`

**Simples** (`hasVariants: false`): `price`, `buyLink`, `variants: []`

**Com variantes** (`hasVariants: true`): `price: ''`, `buyLink: ''`, `prices[{size, price}]`, `buyLinks[{size, link}]`, `variants` (estado interno do painel)

URL de imagens: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/public${product.image}`

## github.js — funções exportadas
- `getProductsFile()` → `{ content, sha }`; usa `cache: 'no-store'` para forçar fetch sem cache do browser (evita SHA stale quando duas operações ocorrem dentro de 60s — janela do `Cache-Control: private, max-age=60` da API do GitHub); `commitFile(path, content, message, sha?)` — recebe conteúdo bruto inteiro
- `commitProducts(content, sha)` / `putProductsFile(content, sha)` — atalhos para products.js
- `commitImage(filename, base64Content)` — upload de imagem
- `parseProducts(content)` → array objetos; `parseCategories(content)` → array `{ id, label }`
- `serializeCategories(categories)` — converte array em bloco JS; `replaceCategoriesInFile(content, categories)` → substitui bloco CATEGORIES mantendo PRODUCTS intacto; escapa `\` e `'` nos valores
- `replaceProductInFile(content, product)` → substitui bloco de um produto pelo ID usando `productToJS()` interno

## Hooks principais
- `useProductForm(nextId, nextOrder, initialData=null)` — estado do formulário; expõe `applyAIData(data)`
- `usePublish()` — orquestração: `publish()`, `update()`, `reset()`; contém cópias internas de `productToJS`/`replaceProductInFile` independentes das de `github.js`

## Integração com IA
- `src/lib/ai.js` — `fillProductWithAI(prompt)`: chama Anthropic `claude-haiku-4-5-20251001`; requer `VITE_CLAUDE_API_KEY`
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
- Botão "← Voltar" → `/admin/products`; lista com label, ID chip (monospace), contagem de produtos
- Mount: `getProductsFile()` → `parseCategories()` + `parseProducts()` — sem polling (só uma pessoa usa o painel; categorias não são alteradas externamente)
- Cada item: botões Ordenar (`console.log` — placeholder Prompt 3), editar (ícone lápis), excluir (ícone lixeira, danger no hover)
- **Modal criar**: Nome + ID readonly auto-gerado por `labelToId()` (lowercase, normalize NFD, sem acentos, espaços→hífens); valida ID único com erro "Já existe uma categoria com esse ID. Escolha outro nome."; após commit → atualiza `setCategories()` → fecha modal (sem delay, sem fetchData)
- **Modal editar**: ID readonly; só atualiza label; após commit → atualiza `setCategories()` → fecha modal (sem delay, sem fetchData)
- **Excluir**: confirm → `replaceCategoriesInFile` + `replaceProductInFile` por produto afetado → um único `commitFile` → atualiza `setCategories()` (sem delay, sem fetchData)
- Estado local atualiza imediatamente; polling 5s sincroniza com GitHub periodicamente

## Fluxos
**Criar produto:** ProductsPage → `/admin` → 5 steps → `publish()` → Step5
**Editar produto:** ProductsPage → `/admin` (com `state.editProduct`) → 5 steps → `update()`
**Excluir produto:** ProductsPage → confirm → `removeProductFromFile()` → `putProductsFile()`
**Categorias:** ProductsPage (btn Categorias) → CategoriesPage → criar/editar/excluir

## Step3Photo (edição)
- `fields.image` normalizado para filename; preview do GitHub exibido
- Botão "Trocar foto" permite substituir; `imageBlob = null` → `update()` pula upload
