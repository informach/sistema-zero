import { expect, test } from 'bun:test'
import { isParentHelpContext } from '../src/app/pais/parent-routes'

test('Ajuda dos pais inclui recados gerais da equipe e dúvidas de aula, sem entregas infantis', () => {
  expect(
    ['general', 'lesson_section', 'studio_submission', 'mural_thread'].filter(isParentHelpContext),
  ).toEqual(['general', 'lesson_section'])
})
