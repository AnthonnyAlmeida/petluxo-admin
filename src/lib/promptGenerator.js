export function generatePrompt({ name, description, bullets }) {
  const bulletsList = Array.isArray(bullets)
    ? bullets.filter(Boolean).join('\n- ')
    : bullets

  return `Você é redator da PetLuxo, marca premium de produtos para pets. O público-alvo são tutores sofisticados que valorizam design, qualidade e experiência.

Refine as informações abaixo com tom sofisticado, caloroso e elegante. Sem exageros — premium de verdade é sutil.

Produto: ${name}

Descrição bruta:
${description}

Bullets brutos:
- ${bulletsList}

Retorne exatamente neste formato:

DESCRIÇÃO:
[um parágrafo refinado, 2 a 3 frases]

BULLETS:
- [bullet 1]
- [bullet 2]
- [bullet 3]
- [bullet 4 — opcional]
- [bullet 5 — opcional]`
}
