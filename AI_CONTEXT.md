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
lib/         github.js (API), imageConverter.js (WebP), formatPrice.js (formatação de valores monetários)
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
- O useEffect usa regex multiline com while+exec para evitar falsos positivos:
  - id: /^\s+id:\s*(\d+)\s*,/gm — captura linhas que começam com espaços seguidos de `id:`, correspondendo exatamente ao formato do arquivo
  - order: /^\s+order:\s*(\d+)\s*,/gm — mesmo padrão para o campo order
- Fallback em caso de erro: setNextId(100) e setNextOrder(100)
- Bug de timing corrigido: useProductForm tem useEffect que sincroniza fields.id e fields.order quando nextId/nextOrder mudam após o fetch

## Formatação de Preços (src/lib/formatPrice.js)
- Função formatPrice(value) aplicada em onBlur dos campos price e originalPrice
- Aceita: números inteiros (229), vírgula (229,90), ponto (229.90)
- Formata para: "R$ X,XX" (ex: 229 → R$ 229,00)
- Campo vazio permanece vazio (sem forçar formato)
- Digitação livre no onChange, formatação ao sair do campo (onBlur)

## Melhorias Recentes
1. **Suporte a produtos com tamanhos** — toggle no Step1, array variants, prices+buyLinks no commit
2. **Formatação automática de preços** — usuária digita apenas número, campo formata com R$ e 2 casas decimais
3. **Correção de estado do formulário** — campos não desaparecem ao navegar entre steps
4. **Remoção da seção Refinar com Claude** — Step2Description simplificado, promptGenerator.js removido
5. **Field component melhorado** — suporta onBlur para tratamento customizado ao sair do campo

## Suporte a Variantes (prices + buyLinks)
- Campo `hasVariants` (boolean) e `variants` (array `{ size, price, link }`) em productTemplate e useProductForm
- Toggle visual switch em Step1Basics: quando ligado oculta price/buyLink e exibe linhas de variantes
- Cada linha de variante: tamanho, preço (com formatPrice no onBlur), link PagBank
- Hook: `addVariant()`, `updateVariant(index, key, value)`, `removeVariant(index)`
- Validação: sem variantes → price obrigatório; com variantes → ao menos 1 variante
- usePublish: se hasVariants gera `prices: [{size, price}]` e `buyLinks: [{size, link}]`; senão usa `price` e `buyLink`
- productToJS: novo branch para arrays de objetos com aspas simples (single-quote convention)
- Step4Review: mostra linha "Tamanhos" (sizes) quando hasVariants=true

## Pendências

Funcionalidades:
- Implementar editar e excluir produtos
- Re-buscar nextId/nextOrder após publicação bem-sucedida
- Deploy na Vercel

Baixa prioridade:
- Suporte a `originalPrice` em produtos com variantes
