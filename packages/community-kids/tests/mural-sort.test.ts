import { describe, expect, test } from 'bun:test'
import { MURAL_SORTS, sortQuery } from '../src/components/kids/mural-sort'

describe('filtros do Mural', () => {
  test('a ordem padrão é a AUSÊNCIA do parâmetro (o Clube e o cursor antigo seguem iguais)', () => {
    expect(sortQuery('activity', '?')).toBe('')
    expect(sortQuery('activity', '&')).toBe('')
  })

  test('as ordens alternativas viram `sort=` com o separador certo', () => {
    expect(sortQuery('plays', '?')).toBe('?sort=plays')
    expect(sortQuery('recent', '&')).toBe('&sort=recent')
  })

  test('são exatamente os três filtros de verdade, na ordem da tela-modelo', () => {
    expect(MURAL_SORTS.map((s) => s.label)).toEqual(['Todos os jogos', 'Mais jogados', 'Novidades'])
  })
})
