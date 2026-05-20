# AI_CONTEXT.md — PetLuxo Admin

Painel administrativo da PetLuxo para adição de produtos sem depender do desenvolvedor.

## Stack
- React 18 + Vite
- react-router-dom
- CSS Modules + variables.css global

## Estrutura
- src/pages/ — LoginPage e AdminPage
- src/steps/ — Step1 a Step5 (etapas do formulário)
- src/components/ — Field, StepIndicator, ProductPreview, PublishStatus
- src/lib/ — github.js, imageConverter.js, promptGenerator.js
- src/hooks/ — useProductForm.js, usePublish.js
- src/data/ — categories.js, productTemplate.js
- src/styles/ — variables.css (tokens), globals.css (reset)

## Variáveis de ambiente
Documentadas em .env.example

## Convenções CSS
- CSS Modules em todos os componentes
- camelCase nas classes
- Tokens via variables.css

## Status

### Fase 1 — Scaffold (concluída)
- Projeto inicializado com Vite + React 18 + react-router-dom
- Estrutura de pastas criada: pages/, steps/, components/, lib/, hooks/, data/, styles/
- Tokens visuais em src/styles/variables.css
- Reset global em src/styles/globals.css
- .gitignore e .env.example configurados
- Projeto sobe com `npm run dev` sem erros (confirmado em 20/05/2026)

### Fase 2 — Login (concluída)
- LoginPage com formulário de senha via `import.meta.env.VITE_ADMIN_PASSWORD`
- Guard de autenticação `PrivateRoute` usando `sessionStorage` (`petluxo-admin-auth`)
- AdminPage placeholder com botão de logout que limpa a session e redireciona para /login
- Rotas configuradas em App.jsx: `/login`, `/admin` (protegida), `*` → `/login`
- Build confirma 27 módulos sem erros (concluído em 20/05/2026)

### Fase 3 — Dados e lógica pura (concluída)
- `src/data/categories.js` — lista de categorias do catálogo
- `src/data/productTemplate.js` — factory `createProductTemplate(nextId, nextOrder)`
- `src/lib/github.js` — `getProductsFile`, `commitFile`, `commitProducts`, `commitImage` via GitHub Contents API
- `src/lib/imageConverter.js` — `convertToWebP`, `blobToBase64`, `generateImageFilename`
- `src/lib/promptGenerator.js` — `generatePrompt` para refinamento de copy via IA
- `src/hooks/useProductForm.js` — estado do formulário multi-step com validação por etapa
- `src/hooks/usePublish.js` — fluxo de publicação: upload de imagem → commit products.js → aguarda deploy
- Build limpo sem erros (concluído em 20/05/2026)
