export function generateAIFillPrompt(rawText, categories) {
  const categoryList = categories.map(c => `  - "${c.id}" → ${c.label}`).join('\n')

  return `Você é um assistente especializado em copywriting para e-commerce de pet shop premium.

Leia o texto bruto abaixo e extraia as informações para preencher um cadastro de produto.

Retorne SOMENTE um objeto JSON válido, sem explicações, sem markdown, sem comentários.

Regras obrigatórias:
- Tom sofisticado e premium, sem emojis
- "name": nome completo do produto (até 60 caracteres)
- "shortName": versão curta do nome (até 35 caracteres, aparece no card)
- "subtitle": frase de impacto curta e elegante (até 80 caracteres)
- "description": parágrafo descritivo completo, sofisticado, 2 a 4 frases
- "bullets": array de strings com os diferenciais do produto, cada item uma frase curta (3 a 6 itens)
- "tags": array de palavras-chave relevantes em minúsculas, sem acentos (3 a 8 itens)
- "badge": string curta em maiúsculas (ex: "NOVO", "EXCLUSIVO", "PREMIUM") ou null se não houver destaque claro
- "category": array contendo apenas IDs válidos da lista abaixo — escolha os mais adequados ao produto

IDs de categoria válidos:
${categoryList}

- Se o texto mencionar tamanhos, variantes ou opções de tamanho: inclua "hasVariants": true e "variants": array de objetos { "size": "<tamanho>", "price": "", "link": "" } com os tamanhos encontrados. Caso contrário: "hasVariants": false e "variants": [].

Texto bruto do produto:
${rawText}`
}
