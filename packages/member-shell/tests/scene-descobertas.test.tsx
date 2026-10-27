import { describe, expect, test } from 'bun:test'
import type { SceneGoalProgress } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneDescobertas } from '../src/components/scene-descobertas'

/**
 * "O que você já descobriu" (console v2, 30/09/2026): os casos que o review do lote apontou sem
 * cobertura — a cena SEM metas e a linha de ações vazia depois de concluir.
 */

const meta = (id: string, complete: boolean, label = `Conclusão de ${id}`): SceneGoalProgress =>
  ({ id, complete, label }) as SceneGoalProgress

describe('SceneDescobertas', () => {
  test('sem metas não há título, lista ou região de conferência vazia', () => {
    const markup = renderToStaticMarkup(<SceneDescobertas goals={[]} />)
    expect(markup).not.toContain('<h4')
    expect(markup).not.toContain('aria-labelledby')
    expect(markup).not.toContain('<ol')
    expect(markup).not.toContain('aria-live="polite"')
    expect(markup).not.toContain('class="sr-only"')
  })

  test('⚠️ a pendente é trancada e NEUTRA; a feita mostra a conclusão; cada uma tem número para o leitor', () => {
    const markup = renderToStaticMarkup(
      <SceneDescobertas goals={[meta('a', true, 'O Dino existe'), meta('b', false)]} />,
    )
    expect(markup).toContain('O Dino existe')
    expect(markup).not.toContain('Conclusão de b')
    expect(markup).toContain('Ainda tem uma descoberta aqui.')
    expect(markup).toContain('Descoberta 1, feita: ')
    expect(markup).toContain('Descoberta 2, trancada. ')
    expect(markup).toMatch(/<li class="sz-scene-descoberta" data-feita="true">/)
    // A pendente NÃO leva `data-feita`.
    expect(markup.split('<li class="sz-scene-descoberta"').length - 1).toBe(2)
    expect(markup.split('data-feita').length - 1).toBe(1)
  })

  test('⚠️ a linha de ações só existe com uma ação de verdade (um array de null não conta)', () => {
    const vazia = renderToStaticMarkup(
      <SceneDescobertas goals={[meta('a', true)]}>
        {null}
        {false}
        {null}
      </SceneDescobertas>,
    )
    expect(vazia).not.toContain('sz-scene-descobertas-acoes')

    const comAcao = renderToStaticMarkup(
      <SceneDescobertas goals={[meta('a', true)]}>
        {null}
        <button type="button">Uma pista</button>
      </SceneDescobertas>,
    )
    expect(comAcao).toContain('sz-scene-descobertas-acoes')
    expect(comAcao).toContain('>Uma pista</button>')
  })
})
