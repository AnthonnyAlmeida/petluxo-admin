export function formatPrice(value) {
  if (!value || value.trim() === '') {
    return ''
  }

  // Remove espaços em branco
  let normalized = value.trim()

  // Remove "R$" se já existir
  normalized = normalized.replace(/^R\$\s?/, '')

  // Substitui ponto por vírgula se for separador decimal
  // (quando há apenas 1 ou 2 dígitos após o ponto)
  normalized = normalized.replace(/\.(\d{1,2})$/, ',$1')

  // Remove qualquer caractere que não seja número, vírgula ou ponto
  normalized = normalized.replace(/[^\d.,]/g, '')

  // Remove múltiplas vírgulas/pontos, mantendo apenas a última
  const parts = normalized.split(/[.,]/)
  if (parts.length > 2) {
    // Se há múltiplos separadores, trata como erro de formatação
    // Mantém apenas os números da primeira parte e os últimos 2 dígitos da última
    const integerPart = parts[0]
    const decimalPart = parts[parts.length - 1]
    normalized = integerPart + (decimalPart.length <= 2 ? ',' + decimalPart : '')
  }

  // Se não houver separador decimal, é apenas um número inteiro
  if (!normalized.includes(',')) {
    return `R$ ${normalized},00`
  }

  const [integerPart, decimalPart] = normalized.split(',')

  // Garante que a parte decimal tenha exatamente 2 dígitos
  const formattedDecimal = decimalPart.padEnd(2, '0').slice(0, 2)

  return `R$ ${integerPart},${formattedDecimal}`
}
