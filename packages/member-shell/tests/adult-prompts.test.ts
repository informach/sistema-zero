import { expect, test } from 'bun:test'
import {
  adultPlanningSystem,
  COMMON_LEARNING_LANGUAGE,
  tutorLanguage,
} from '../src/server/adult-prompts'

test('o material e os nomes da plataforma são os mesmos nas instruções dos dois públicos', () => {
  const base = `Ajude para crianças de 8 a 13 anos.\n${COMMON_LEARNING_LANGUAGE}`
  const kids = tutorLanguage(base, 'kids')
  const adulto = tutorLanguage(base, 'adult')
  for (const prompt of [kids, adulto]) {
    expect(prompt).toContain('Use curso, aula e parte.')
    expect(prompt).toContain('Passo a passo do projeto')
    expect(prompt).not.toContain('Use curso, aula, seção')
    expect(prompt).not.toContain('plano do projeto')
  }
  expect(adulto).toContain('para adultos que aprendem programação criando jogos')
  expect(adulto).toContain('não gere soluções inteiras sem pedido')
  expect(adultPlanningSystem('Organize o caminho em partes.')).toContain(
    'Organize o caminho em partes.',
  )
})
