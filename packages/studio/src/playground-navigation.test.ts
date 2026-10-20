import { describe, expect, test } from 'bun:test'
import { editorDemoPath } from '../playground/editorNavigation'

describe('entrada leve do playground no editor', () => {
  test('mantém a URL padrão de um projeto JavaScript', () => {
    expect(editorDemoPath('projeto-js', '')).toBe('/editor/projeto-js')
  })

  test.each([
    '1',
    'falha',
    'adiada',
  ])('preserva o opt-in de missão %s antes do import lazy', (mission) => {
    expect(editorDemoPath('projeto-js', `?missao=${mission}`)).toBe(
      `/editor/projeto-js?missao=${mission}`,
    )
  })

  test('transporta somente a missão, sem mudar outras opções de navegação', () => {
    expect(editorDemoPath('projeto-js', '?host=1&missao=adiada&outro=valor')).toBe(
      '/editor/projeto-js?missao=adiada',
    )
    expect(editorDemoPath('projeto-js', '?host=1')).toBe('/editor/projeto-js')
  })

  test('codifica o identificador sem misturá-lo com a query', () => {
    expect(editorDemoPath('pasta/projeto?novo', '?missao=adiada')).toBe(
      '/editor/pasta%2Fprojeto%3Fnovo?missao=adiada',
    )
  })
})
