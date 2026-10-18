/** Adult-only prompt vocabulary. Kids systems pass through byte for byte. */
export function adultInstruction(text: string) {
  return text
    .replaceAll('a criança', 'o aluno')
    .replaceAll('A criança', 'O aluno')
    .replaceAll('da criança', 'do aluno')
    .replaceAll('linguagem de criança', 'linguagem simples')
}
export function adultPlanningSystem(system: string) {
  return adultInstruction(
    system.replace(
      'na Comunidade Kids do Sistema Zero, para crianças de 8 a 13 anos',
      'na comunidade adulta do Sistema Zero, para adultos que aprendem programação criando jogos',
    ),
  ).replace(
    'Ao indicar onde aprender, diga aventura e fase. Organize o caminho em partes.',
    'Ao indicar onde aprender, diga curso e aula. Organize o caminho em seções.',
  )
}
export function tutorLanguage(system: string, audience: 'adult' | 'kids' = 'kids') {
  if (audience === 'kids') return system
  return (
    adultInstruction(
      system
        .split('\n')
        .filter(
          (line) =>
            !line.startsWith('Fale a língua da plataforma') &&
            !line.startsWith('Fale em aventura, fase'),
        )
        .join('\n')
        .replace(
          'para crianças de 8 a 13 anos',
          'para adultos que aprendem programação criando jogos',
        )
        .replaceAll('Mapa da Aventura', 'plano do projeto'),
    ) +
    '\nUse curso, aula, seção e equipe. Trate o usuário como adulto; preserve a autonomia e não gere soluções inteiras sem pedido.'
  )
}
