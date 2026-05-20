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
