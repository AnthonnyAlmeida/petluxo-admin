# AI_CONTEXT.md — PetLuxo Admin

## Visão geral
Painel administrativo React para gestão de produtos e categorias da PetLuxo. Usuária não-técnica (iPad). Fluxo: Login → Listagem → Criar/Editar produto (5 steps) → Publicação automática no GitHub → Deploy na Vercel. Identidade visual única em todas as telas: tema "terminal premium" — fundo escuro (`#13110e`), paleta dourada (`#c9a96e`), `Courier New` monoespaçado para rótulos/detalhes técnicos, `Cormorant Garamond` (`var(--font-serif)`) para títulos/logo.

## Stack e ambiente
- React 18 + Vite, react-router-dom, CSS Modules
- GitHub Contents API para leitura/escrita de `products.js` e imagens — via Edge Functions (`/api/github`)
- Canvas API para conversão de imagens em WebP (redimensiona para max 1200px de largura, qualidade 0.85)
- Variáveis de servidor (sem prefixo `VITE_`, usadas pelas Edge Functions): `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `CLAUDE_API_KEY`
- Variáveis de cliente (prefixo `VITE_`, expostas no bundle para URLs de thumbnail): `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_BRANCH` — não são segredos (repo público)

## Desenvolvimento local
- Usar `vercel dev` (não `npm run dev`) — necessário para que as Edge Functions em `api/` funcionem localmente
- Vercel CLI já instalado globalmente; `vercel.json` na raiz configura framework Vite
- `.env` na raiz deve conter **todas** as variáveis: as de servidor sem prefixo (`GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_TOKEN`, `ADMIN_PASSWORD`, `CLAUDE_API_KEY`) **e** as de cliente com prefixo (`VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO`, `VITE_GITHUB_BRANCH`)
- Referência de variáveis: `.env.example` na raiz do projeto

## Rotas (App.jsx)
- `/login` → LoginPage
- `/admin` → AdminPage (protegida) — criação e edição de produto
- `/admin/products` → ProductsPage (protegida)
- `/admin/categories` → CategoriesPage (protegida) — gerenciamento de categorias
- `*` → NotFoundPage (404) — não redireciona mais para `/login`
- Após login bem-sucedido: navega para `/admin/products`; `PrivateRoute` checa `!!sessionStorage.getItem('petluxo-admin-auth')` (token UUID)

## Tema global e estilos base
- `src/styles/variables.css` define `--color-cream: #faf7f2` e `--color-cream-dark: #f0e6d0`; `src/styles/globals.css` ainda aplica `background: var(--color-cream)` no `body` — resquício do tema claro original
- Cada página sobrescreve isso na prática: todo `.page` de `LoginPage`/`AdminPage`/`ProductsPage`/`CategoriesPage` define `background: #13110e` no próprio CSS Module, então o `body` claro nunca chega a ser visível — não é um bug ativo, apenas uma inconsistência de origem que não foi limpa em `globals.css`

## LoginPage.jsx
- `canvasRef` + `useEffect`: animação Matrix rain via Canvas API (`setInterval` de 55ms), redesenhada em `resize` da janela; caracteres mistos (katakana, hex, símbolos `✦◆▸▹<>{}[]|`), tons dourados (`rgba(201,169,110,...)`), efeito puramente decorativo, `pointer-events: none`
- Relógio (`time`) atualizado a cada 1s via `setInterval`, exibido no rodapé do card (`toLocaleTimeString('pt-BR')`)
- `.scanline`: barra animada que desliza verticalmente sobre o card (CSS puro); `.glitch` no logo "✦ PetLuxo" (deslocamento de camadas via `text-shadow`/`clip-path`, CSS puro); `.statusRow` com dot pulsante + texto "Sistema seguro — conexão criptografada"
- `handleSubmit`: trata erro via `data.error || 'Senha incorreta'` lançado como `Error` quando `!res.ok`; `api/auth.js` hoje responde apenas `{ ok: false }` em falha (sem `error`), então o fallback é o que é exibido na prática

## NotFoundPage.jsx
- Rota catch-all (`*`) do `App.jsx`; substitui o redirect silencioso para `/login` que existia antes — qualquer URL desconhecida agora renderiza uma página 404 própria
- Reusa o mesmo padrão de Matrix rain da `LoginPage` (`canvasRef` + `useEffect` único, `setInterval` de 55ms, mesmos `chars`, mesmas cores douradas, redesenho em `resize`) — sem relógio e sem formulário, já que a página não tem estado de autenticação
- `.content` centralizado (`.page` com `min-height: 100vh`, flex centrado): `.eyebrow` ("// erro do sistema", monoespaçado dourado translúcido uppercase) → `.errorCode` ("404", `Cormorant Garamond` ~8rem, dourado `#c9a96e`, `text-shadow` sutil, classe `.glitch` aplicada via `${styles.errorCode} ${styles.glitch}` com o mesmo keyframe de glitch do logo da `LoginPage`, redefinido localmente pois CSS Modules escopa `@keyframes` por arquivo) → `.dividerLine` → `.title` ("Página não encontrada", `Cormorant Garamond`, `#faf7f2`, sem negrito) → `.message` (texto explicativo, monoespaçado, `rgba(250,247,242,0.3)`, fonte pequena)
- `.statusRow` no mesmo padrão visual da `LoginPage` ("acesso negado · rota inválida"), mas `.dot` usa `var(--color-error)` em vez de dourado — único elemento vermelho da tela
- Botão "← Voltar ao painel" (`.btn`, dourado sólido `#c9a96e`/`#13110e`, monoespaçado uppercase, `border-radius: 3px`) navega via `useNavigate` para `/admin/products` — não passa por `PrivateRoute`, então se a sessão tiver expirado o próprio `ProductsPage`/`PrivateRoute` redireciona para `/login` na sequência

## Estrutura de arquivos
```
api/
  auth.js    Edge Function — valida ADMIN_PASSWORD e retorna token UUID de sessão
  github.js  Edge Function — proxy para GitHub Contents API (token protegido)
  ai.js      Edge Function — proxy para Anthropic API (chave protegida)
src/
  pages/   LoginPage, AdminPage, ProductsPage, CategoriesPage, NotFoundPage
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
Campos: `id, name, shortName, subtitle, description, bullets, category[], order, categoryOrder{}, featured, visible, image, badge, tags, originalPrice, supplierLink`

`createProductTemplate()` (`src/data/productTemplate.js`) já inclui `visible: true` e `supplierLink: ''` como defaults para produto novo.

`visible` (boolean, default `true`): controla exibição do produto no site público, independente da listagem do painel (produto oculto continua visível e editável aqui). Toggle direto no card da listagem (`ProductsPage.jsx`), nunca no formulário/wizard.

`supplierLink` (string, default `''`): link de origem/compra do produto junto ao fornecedor — uso interno do admin, nunca exibido no site público. **Não existe campo no formulário de criação/edição** (`Step1Basics.jsx`/`useProductForm.js`) — é editado exclusivamente inline em `ProductsPage.jsx` via modal próprio, com commit imediato (sem passar pelo fluxo de 5 steps). Protegido em `applyAIData` (`useProductForm.js`): a chave é descartada do payload da IA antes do merge, caso uma resposta de IA inclua essa chave por engano.

`featured` (boolean, default `false`): produto destaque exibido na seção especial da home. Toggle em `Step1Basics.jsx` abaixo do campo Badge; unicidade garantida em `usePublish` (ver abaixo) — só um produto fica com `featured: true` por vez

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
- `parseProducts(content)` → array objetos; `parseCategories(content)` → array `{ id, label, visible? }` (visible: false = oculto; ausente ou true = visível)
- `serializeCategories(categories)` — converte array em bloco JS, incluindo `visible` quando presente; `replaceCategoriesInFile(content, categories)` → substitui bloco CATEGORIES mantendo PRODUCTS intacto; escapa `\` e `'` nos valores
- `replaceProductInFile(content, product)` → substitui bloco de um produto pelo ID usando `productToJS()` interno

## Hooks principais
- `useProductForm(nextId, nextOrder, initialData=null)` — estado do formulário; expõe `applyAIData(data)` e `updateCategory(categoryId)` (async: toggle da categoria + fetch de allProducts + `normalizeCategoryOrder` + atualiza `fields.category` e `fields.categoryOrder` juntos)
- `usePublish()` — orquestração: `publish()`, `update()`, `reset()`; contém cópias internas de `productToJS`/`replaceProductInFile` independentes das de `github.js`; ambos `publish()` e `update()` chamam `normalizeCategoryOrder` antes de montar o objeto produto, garantindo que `categoryOrder` reflita exatamente as categorias selecionadas no momento do commit
- **Unicidade de `featured`**: em `publish()`/`update()`, após montar `updatedContent` (produto novo/editado já aplicado) e se `fields.featured === true`, reparseia `updatedContent` com `parseProducts`, encontra outros produtos com `featured: true` (id diferente do atual) e chama `replaceProductInFile` para cada um, setando `featured: false` — encadeando `updatedContent` a cada chamada antes do commit final

## Integração com IA
- `src/lib/ai.js` — `fillProductWithAI(prompt)`: chama `/api/ai` (Edge Function) que repassa ao Anthropic `claude-haiku-4-5-20251001`; `CLAUDE_API_KEY` fica apenas no servidor
- `src/lib/promptGenerator.js` — `generateAIFillPrompt(rawText, categories)`: injeta IDs válidos; tom premium sem emojis

## AdminPage.jsx
- `.card` (wizard) em `#1a1610`, borda `rgba(201,169,110,0.15)`, `border-radius: 6px`, max-width 520px, sem sombra — `.cardTitle` em `Cormorant Garamond` (`#faf7f2`), `.cardSubtitle` monoespaçado dourado translúcido uppercase
- Header simplificado: logo "✦ PetLuxo" + botão "Sair" — sem rótulo "Admin" (mesmo padrão das demais páginas)
- Lê `location.state?.editProduct`; se existe, é modo edição
- `fetchNextIds()` também chama `parseCategories()` → `categories` passado para `Step1Basics`
- **Bloco Anthonny AI** (Step 0, criação apenas): `aiOpen` inicia `true`; valida IDs antes de `applyAIData`; `.aiBlock` com fundo `#13110e` e borda dourada translúcida, `.aiTextarea` em `#0d0b08`, `.aiBtn` dourado sólido (`#c9a96e`/`#13110e`)
- Lint pré-existente (fora de escopo de CSS): `'err' is defined but never used` no catch de `fetchNextIds()` e `setState` síncrono dentro do `useEffect` de mount (`react-hooks/set-state-in-effect`)

## Componentes do wizard (Field.jsx, StepIndicator.jsx)
- Inputs com fundo `#13110e`, borda `rgba(201,169,110,0.2)`, texto `#faf7f2`, placeholder `rgba(250,247,242,0.18)`, focus com borda `rgba(201,169,110,0.55)`
- `Field.jsx`: `.textarea` usa `composes: input` (CSS Modules) — qualquer ajuste em `.input` propaga automaticamente para textareas
- `StepIndicator.jsx`: barra de progresso com `.dot` quase invisível (`rgba(250,247,242,0.08)`) quando inativo, `.dotDone` dourado translúcido (`rgba(201,169,110,0.4)`), `.dotActive` dourado sólido (`#c9a96e`); `.label` monoespaçado dourado translúcido uppercase

## ProductsPage.jsx
- **`statusBar`** (topo, 28px): três indicadores estáticos — dot verde pulsante "sistema online", dot dourado pulsante "github conectado", "vercel · deploy ok" — e relógio (`statusTime`/`statusRight`) à direita, atualizado a cada 1s via `useEffect`/`setInterval` próprio (mesmo padrão da LoginPage)
- **`header`**: logo "✦ PetLuxo" à esquerda; `nav` central (`headerNav`, posicionado via `position: absolute` + `translateX(-50%)`) com botões "Produtos" (sempre `headerNavItemActive`, sem `onClick` — é a página atual) e "Categorias" (→ `/admin/categories`); botão "Sair" à direita (`handleLogout`)
- **`metricsBar`**: três métricas lado a lado com separador vertical (`metricSep`) — `products.length`, `categories.length`, e indicador "● live" em verde (`#00ff41`, inline style)
- Filtro de categoria usa `categoryFilter` iniciado em `null` (não `''`); botão "Todos" ativo quando `categoryFilter === null`; `filteredProducts` calcula com `!categoryFilter || category.includes(...)`, que trata `null` e `''` igualmente como "sem filtro"
- Mount + polling 5s: `getProductsFile()` → `parseProducts()` + `parseCategories()`; polling pausado enquanto `deleting !== null`; só atualiza estado se `JSON.stringify` mudou
- **Card de produto** (`item`): índice numerado (`itemIndex`, `String(index+1).padStart(2,'0')`), thumbnail 48px (sem fallback SVG — `onError` apenas oculta a imagem via `display: none`), nome, preço + categoria (label do primeiro ID via `categories.find()`), badges (badge custom + contagem de `product.variants` quando `hasVariants`), linha de fornecedor (link "🔗 Fornecedor" ou "sem link de fornecedor" + botão lápis), ações (toggle visibilidade, Editar, lixeira)
- Link de fornecedor no card sempre normalizado para protocolo: `product.supplierLink.startsWith('http') ? product.supplierLink : \`https://${product.supplierLink}\`` — cobre valores salvos sem `http(s)://`
- **Editar link de fornecedor** (`supplierModal = { product }` ou `null`): botão lápis na linha de fornecedor do card abre modal (`handleOpenSupplierModal`) com input pré-preenchido por `product.supplierLink`; "Salvar" (`handleSaveSupplierLink`) busca `getProductsFile()` fresco, monta produto atualizado (`{ ...product, supplierLink: input.trim() }`), `replaceProductInFile` + `commitFile()` com mensagem `'feat: link de fornecedor atualizado via painel admin'`, depois `setProducts()` otimista e fecha modal — fluxo independente do `/admin` (5 steps), commit direto da listagem
- **Toggle de visibilidade do produto** (`btnVisibility`, ícone de olho no card): `handleToggleVisibility(product)` determina `action` (`'show'` se `product.visible === false`, senão `'hide'`) e abre `visibilityModal = { product, action }`; "Confirmar" (`handleConfirmVisibility`) busca `getProductsFile()` fresco, monta produto com `visible` invertido, `replaceProductInFile` + `commitFile()` com mensagem `'feat: visibilidade de produto atualizada via painel admin'`, `setProducts()` otimista e fecha modal
- **Produto oculto no card**: `.itemHidden` (`product.visible === false`) aplica `opacity: 0.45` e um badge `::after` com texto "OCULTO" (monoespaçado, laranja/`--color-text-warning`, canto superior direito do card); `.btnVisibility` também troca de cor (`btnVisibilityHidden`, laranja) e ícone (olho cortado) quando o produto está oculto
- **Excluir produto** (`deleteModal = { product }` ou `null`): botão lixeira abre modal próprio (`handleDelete` só seta `deleteModal`, não há `window.confirm`); "Excluir" (`handleConfirmDelete`) fecha o modal, marca `deleting = product.id`, busca `getProductsFile()` fresco, `removeProductFromFile()` (manipulação de string) → `putProductsFile()` → `fetchProducts()`; erros só logados via `console.error` (sem `alert`)
- Os três modais (`supplierModal`, `deleteModal`, `visibilityModal`) compartilham as mesmas classes (`.modalOverlay`, `.modal`, `.modalTitle`, `.modalProduct`, `.modalActions`, `.btnCancel`) em `ProductsPage.module.css`; botão de confirmação varia: `.btnSave` (dourado, ações neutras como salvar fornecedor ou alternar visibilidade) vs `.btnDanger` (vermelho `--color-error`, ações destrutivas como excluir)

## CategoriesPage.jsx
- Header simplificado: logo "✦ PetLuxo" + botão "Sair" — sem o rótulo "Admin" (mesmo padrão do `ProductsPage`); cards/modais `#1a1610` com borda esquerda dourada translúcida que fica sólida no hover
- Título precedido por `titleEyebrow` ("// gestão de categorias"), mesmo padrão do eyebrow usado em `ProductsPage`; `.count` permanece oculto via `display: none`
- Mount: `getProductsFile()` → `parseCategories()` + `parseProducts()` — sem polling
- **Lista**: label, ID chip (`idChip`, fundo/borda dourados translúcidos), contagem de produtos; botões Ordenar / visibilidade / editar / excluir por item (32x32px, borda dourada translúcida, incluindo "Mais Vendidos")
- **Botão visibilidade**: olho aberto (`visible !== false`) com tooltip "Ocultar do site"; olho fechado (`visible === false`) com `color: var(--color-text-warning)` e tooltip "Exibir no site"; abre `visibilityModal`
- **Modal visibilidade** (`visibilityModal = { category, action }`): título "Ocultar categoria?" ou "Exibir categoria?"; mensagem explica efeito imediato; botões "Cancelar" e "Confirmar" → `handleConfirmVisibility()`
- **Confirmar visibilidade**: `getProductsFile()` fresco → `parseCategories()` → atualiza `visible` (`hide → false`, `show → true`) → `replaceCategoriesInFile` → `commitFile()` com mensagem `'feat: visibilidade de categoria atualizada via painel admin'` → `setCategories()` otimista → fecha modal
- **Modal criar**: Nome + ID auto-gerado por `labelToId()` (lowercase, normalize NFD, sem acentos, espaços→hífens); valida ID único; commit → `setCategories()` otimista → fecha modal
- **Modal editar**: ID readonly; só atualiza label; mesmo fluxo de commit otimista
- **Excluir**: confirm → `replaceCategoriesInFile` + `replaceProductInFile` por produto afetado → um `commitFile` → `setCategories()` otimista
- **Reordenação de categorias** (`isReordering`): botão "Ordenar" (`btnReorder`, monoespaçado/uppercase) na titleRow ativa modo; copia `categories` → `reorderedCategories`; setas ↑↓ por item; "Mais Vendidos" (`id === 'mais-vendidos'`) fixo no topo sem setas; botões editar/excluir ocultos; movimentação só local; titleRow mostra "Cancelar" + "Salvar ordem" em vez dos botões normais
- **Salvar ordem de categorias**: `getProductsFile()` fresco → `replaceCategoriesInFile(content, reorderedCategories)` → `commitFile()` com mensagem `'feat: ordem de categorias atualizada via painel admin'` → `setCategories(reorderedCategories)` → `setIsReordering(false)`
- **Abrir ordenação de produtos** (`handleStartOrdering`): async — `getProductsFile()` fresco, `parseProducts()`, filtra e ordena DESC por `getCategoryOrder(p, cat.id)`; `saving=true` durante fetch
- **Tela de ordenação de produtos** (`orderingCategory !== null`): substitui a lista; thumbnail 40px (`orderThumb`, fundo `#0d0b08`), nome e setas ↑↓ (`btnArrow`, 28x28px, desabilitadas com `opacity: 0.2` nas extremidades); movimentação só local; botões "Cancelar" e "Salvar ordem" (`btnSaveOrder`, dourado `#c9a96e`)
- **Salvar ordem de produtos**: `getProductsFile()` + `parseProducts()` frescos → `maxOrder = getMaxCategoryOrder(...)` → `newValue = maxOrder + (length - i) * 100` → `replaceProductInFile` por produto alterado → um `commitFile` → `setProducts()` otimista → `setOrderingCategory(null)`
- Thumbnail URL: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/public${product.image}` (constantes de env no topo do arquivo)

## Fluxos
**Criar produto:** ProductsPage → `/admin` → 5 steps → `publish()` → Step5
**Editar produto:** ProductsPage → `/admin` (com `state.editProduct`) → 5 steps → `update()`
**Excluir produto:** ProductsPage → modal de confirmação (`deleteModal`) → `removeProductFromFile()` → `putProductsFile()`
**Ocultar/exibir produto:** ProductsPage → toggle no card → modal de confirmação (`visibilityModal`) → `replaceProductInFile()` → `commitFile()`
**Editar fornecedor:** ProductsPage → botão lápis no card → modal (`supplierModal`) → `replaceProductInFile()` → `commitFile()`
**Categorias:** ProductsPage (btn Categorias) → CategoriesPage → criar/editar/excluir/ocultar/reordenar

## Steps (Step1Basics → Step5Publish)
- Padrão comum: `.step` com fundo transparente (o `.card` do `AdminPage` já fornece o fundo `#1a1610`); `.btnBack` transparente com borda dourada translúcida monoespaçada uppercase; `.btnNext`/`.btnPublish` dourado sólido (`#c9a96e`/`#13110e`, uppercase, `font-weight: 600`, `disabled` com `opacity: 0.5`); `.nav` com `margin-top: 1.5rem`
- **Step1Basics**: `.sectionLabel`/`.variantHeaderCell` monoespaçados dourado translúcido uppercase (padrão `.metricLabel`); `.catBtn`/`.catBtnActive` (pill dourado quando ativo); `.toggleSwitch` (pill `rgba(250,247,242,0.1)` inativo → `#c9a96e` ativo); `.variantInput` no mesmo padrão do `.input` de `Field.jsx`; `.variantRemove` em vermelho translúcido (`rgba(192,57,43,0.5)`)
- **Step2Description**: `.bulletInput`/`.bulletRemove`/`.btnAddBullet` espelham exatamente `.variantInput`/`.variantRemove`/`.btnAddVariant` do Step1
- **Step3Photo**: `.uploadArea` com borda tracejada dourada translúcida (hover mais forte); `.webpBadge` mantém verde (`rgba(59,109,17,...)`) — única cor não dourada da tela, sinaliza sucesso da conversão; `fields.image` normalizado para filename, preview do GitHub exibido; botão "Trocar foto" (`.btnChange`, mesmo padrão de `.btnBack`) permite substituir — `imageBlob = null` → `update()` pula upload; após conversão WebP, valida `blob.size > 3 MB` e exibe erro local (estado `error`) sem prosseguir
- **Step4Review**: `.previewWrapper`/`.dataList` com fundo `#13110e` e borda dourada translúcida sutil; `.dataKey` monoespaçado dourado translúcido uppercase, `.dataVal` em `#faf7f2`
- **Step5Publish**: `.title` em `Cormorant Garamond` dourado (`#c9a96e`) com `text-shadow` sutil — mensagem de conclusão
- Lint pré-existente em `Step3Photo.jsx` (fora de escopo de CSS): múltiplos erros `react-hooks/refs` por acessar `initialImagePath.current` durante o render; e `useState` importado sem uso em `Step2Description.jsx`
