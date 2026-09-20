import { describe, expect, test } from 'bun:test'
import { ONCE_VS_ALWAYS_PRESETS, openScene, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { OnceVsAlwaysControls, OnceVsAlwaysStage } from '../src/components/scene-once-vs-always'

describe('uma vez, sempre e na hora no palco', () => {
  test.each([
    ['duas-caixas-nave', 'nave'],
    ['duas-caixas-dino', 'dino'],
  ] as const)('%s desenha o personagem do curso', (id, figure) => {
    const preset = ONCE_VS_ALWAYS_PRESETS[id]
    const start = { scene: 'once-vs-always' as const, setup: { preset } }
    let state = openScene(start)
    state = stepScene(start, state, { type: 'place-in-area', card: 'create', area: 'start' })
    state = stepScene(start, state, { type: 'advance', seconds: 0.25 })
    const html = renderToStaticMarkup(<OnceVsAlwaysStage state={state} preset={preset} />)
    expect(html).toContain(`data-figure="${figure}"`)
  })

  test('o caso da tecla mostra a terceira área e mantém um caminho de teclado', () => {
    const preset = ONCE_VS_ALWAYS_PRESETS['tres-caixas-tiro']
    const state = openScene({ scene: 'once-vs-always', setup: { preset } })
    const html = renderToStaticMarkup(
      <OnceVsAlwaysControls state={state} preset={preset} dispatch={() => {}} />,
    )
    expect(html).toContain('Quando acontecer')
    expect(html).toContain('Apertar a tecla')
    expect((html.match(/<button\b/g) ?? []).length).toBeGreaterThan(12)
  })
})
