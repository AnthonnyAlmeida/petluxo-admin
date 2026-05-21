# AI_CONTEXT.md — PetLuxo Admin

## Visão geral
Painel administrativo da PetLuxo para adição de produtos por não-desenvolvedores.
Fluxo: Login com senha → formulário de 5 steps → upload WebP → commit no GitHub → deploy automático na Vercel.
Usuário principal: mãe do desenvolvedor, via iPad.

## Stack
- React 18 + Vite
- react-router-dom
- CSS Modules + src/styles/variables.css (design tokens)
- GitHub Contents API (leitura e escrita de products.js e imagens)
- Canvas API (conversão de imagens para WebP)

## Estrutura src/
pages/       LoginPage (formulário de senha), AdminPage (orquestrador do painel)
steps/       Step1Basics, Step2Description, Step3Photo, Step4Review, Step5Publish
components/  Field, StepIndicator, ProductPreview, PublishStatus
lib/         github.js (API), imageConverter.js (WebP), promptGenerator.js (prompt Claude)
hooks/       useProductForm (estado multi-step), usePublish (fluxo de publicação)
data/        categories.js, productTemplate.js
styles/      variables.css (tokens), globals.css (reset)

## Variáveis de ambiente
- VITE_ADMIN_PASSWORD — senha de acesso ao painel
- VITE_GITHUB_OWNER — AnthonnyAlmeida
- VITE_GITHUB_REPO — petluxo
- VITE_GITHUB_BRANCH — main
- VITE_GITHUB_TOKEN — personal access token com escopo repo

## Convenções obrigatórias
- CSS Modules em todos os componentes; camelCase nas classes; tokens via variables.css
- Todo prompt começa lendo este arquivo
- Todo prompt termina atualizando este arquivo com cat > (sobrescrever completo, sem histórico)
- NUNCA executar funções de src/lib/github.js sem instrução explícita do usuário
- Caminho de imagem sempre com / inicial: /images/products/arquivo.webp
- Encoding UTF-8: usar btoa(unescape(encodeURIComponent(content))) para escrever e decodeURIComponent(escape(atob())) para ler em github.js
- Formato JS puro no commit: chaves sem aspas, strings com aspas simples (função productToJS em usePublish.js)

## Repositório alvo (petluxo)
- Arquivo: src/data/products.js
- Exports: export const CATEGORIES = [...] e export const PRODUCTS = [...] (sem default export)
- Imagens: public/images/products/ — URL com /images/products/arquivo.webp
- Campos: id, name, shortName, subtitle, description, bullets, price, originalPrice, category, order, image, badge, buyLink, tags
- Alguns produtos têm variantes: prices: [{ size, price }] e buyLinks: [{ size, link }]

## Cálculo de nextId/nextOrder (AdminPage.jsx)
- O useEffect usa regex ancorado para evitar falsos positivos:
  - id: /^\s{2}\{\s*
\s+id:\s*(\d+)/gm — captura apenas o campo id no início de cada objeto do array
  - order: /order:\s*(\d+)/g — usa word boundary para evitar capturar campos com nomes semelhantes
- Ambos só são calculados se o bloco export const PRODUCTS = [...] for encontrado no conteúdo

## Pendências

Funcionalidades:
- Implementar editar e excluir produtos
- Re-buscar nextId/nextOrder após publicação bem-sucedida
- Deploy na Vercel

Baixa prioridade:
- Suporte a prices + buyLinks (múltiplos tamanhos)
