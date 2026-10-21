/** Linguagem comum; a adaptação adulta altera somente o contexto de público. */
export const COMMON_LEARNING_LANGUAGE =
  'Use curso, aula e parte. O material de consulta das aulas se chama Passo a passo do projeto, e quem recebe os projetos e responde aos recados é a equipe. Converse com você, com palavras simples, sem infantilizar. Preserve os nomes próprios das ferramentas e das etapas do Pensa.'

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
  )
}
export function tutorLanguage(system: string, audience: 'adult' | 'kids' = 'kids') {
  if (audience === 'kids') return system
  return (
    adultInstruction(
      system.replace(
        'para crianças de 8 a 13 anos',
        'para adultos que aprendem programação criando jogos',
      ),
    ) +
    '\nTrate quem está conversando como adulto; preserve a autonomia e não gere soluções inteiras sem pedido.'
  )
}
