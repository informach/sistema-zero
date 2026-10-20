import { describe, expect, test } from 'bun:test'
import {
  COMUNIDADE_ADULTO_CONTINUAR_URL,
  comunidadeAdultoContinuarUrl,
} from '../src/lib/adult-links'

/**
 * A oferta de continuidade adulta é uma constante de produção (como a do Kids) e cada entrada do
 * app marca a origem em `utm_content`. O `FUNNEL_URL` do env não entra nesta conta.
 */
describe('comunidadeAdultoContinuarUrl', () => {
  test('a constante é a página pública de continuidade adulta', () => {
    expect(COMUNIDADE_ADULTO_CONTINUAR_URL).toBe(
      'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar',
    )
  })

  test('monta a URL com a origem do clique', () => {
    expect(comunidadeAdultoContinuarUrl('ferramenta-pinta')).toBe(
      'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar?utm_source=plataforma&utm_medium=app&utm_content=ferramenta-pinta',
    )
  })

  test('cada origem vira só o utm_content, codificado', () => {
    const url = new URL(comunidadeAdultoContinuarUrl('cursos nci&x=1'))
    expect(url.origin + url.pathname).toBe(COMUNIDADE_ADULTO_CONTINUAR_URL)
    expect(url.searchParams.get('utm_source')).toBe('plataforma')
    expect(url.searchParams.get('utm_medium')).toBe('app')
    expect(url.searchParams.get('utm_content')).toBe('cursos nci&x=1')
    expect(url.searchParams.has('x')).toBe(false)
  })
})
