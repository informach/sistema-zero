import { describe, expect, test } from 'bun:test'
import { ONCE_VS_ALWAYS_PRESETS, openScene, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { botoesDoMundo } from '../src/components/scene-frame'
import { OnceVsAlwaysControls, OnceVsAlwaysStage } from '../src/components/scene-once-vs-always'

describe('uma vez, sempre e na hora no palco', () => {
  test.each([
    ['duas-caixas-dino', 'dino'],
  ] as const)('%s desenha o personagem do curso depois da criação', (id, figure) => {
    const preset = ONCE_VS_ALWAYS_PRESETS[id]
    const start = { scene: 'once-vs-always' as const, setup: { preset } }
    let state = openScene(start)
    state = stepScene(start, state, { type: 'place-in-area', card: 'create', area: 'start' })
    state = stepScene(start, state, { type: 'advance', seconds: 0.25 })
    const html = renderToStaticMarkup(<OnceVsAlwaysStage state={state} preset={preset} />)
    expect(html).toContain(`data-figure="${figure}"`)
  })

  test('o piloto abre no espaço com nave e asteroide, sem cacto nem chão', () => {
    const preset = ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave']
    const start = { scene: 'once-vs-always' as const, setup: { preset } }
    const cast = {
      hero: { name: 'nave', gender: 'f' as const },
      obstacle: { name: 'asteroide', gender: 'm' as const },
    }
    let state = openScene(start)
    let html = renderToStaticMarkup(<OnceVsAlwaysStage state={state} cast={cast} preset={preset} />)
    expect(html).toContain('data-fundo="nave"')
    expect(html).toContain('data-figure="nave"')
    expect(html).toContain('data-figure="asteroide"')
    expect(html).not.toContain('data-figure="cacto"')
    expect(html).not.toContain('M0 248H560')
    expect(html).toContain('#ffb13b')
    expect(html).toContain('Movimentos: 0')
    expect(html).not.toContain('Nave ligada')

    state = stepScene(start, state, { type: 'place-in-area', card: 'move', area: 'start' })
    state = stepScene(start, state, { type: 'advance', seconds: 0.25 })
    html = renderToStaticMarkup(<OnceVsAlwaysStage state={state} cast={cast} preset={preset} />)
    expect(html).toContain('Movimentos: 1')
    expect(html).not.toContain('Nave ligada')
    expect(html).toContain('#ffb13b')
  })

  test('a bancada não repete uma segunda grade de controles', () => {
    const preset = ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave']
    const state = openScene({ scene: 'once-vs-always', setup: { preset } })
    const html = renderToStaticMarkup(
      <OnceVsAlwaysControls state={state} preset={preset} dispatch={() => {}} />,
    )
    expect((html.match(/Mover a nave um pouquinho/g) ?? []).length).toBe(1)
    expect(html).not.toContain('Ligar a nave')
    expect(html).toContain('Escolha uma ficha')
  })

  test('a cena oferece um passo manual, sem tempo contínuo nem velocidade', () => {
    const html = renderToStaticMarkup(
      botoesDoMundo({
        scene: 'once-vs-always',
        tocando: false,
        lento: false,
        onTocar: () => {},
        onLento: () => {},
        dispatch: () => {},
      }),
    )
    expect(html).toContain('Avançar 1 passo')
    expect(html).not.toContain('Tempo')
    expect(html).not.toContain('Mais devagar')
  })

  test('a nave continua ligada nos presets que não ensinam a ação de ligar', () => {
    const preset = ONCE_VS_ALWAYS_PRESETS['uma-ficha-vidas']
    const state = openScene({ scene: 'once-vs-always', setup: { preset } })
    const html = renderToStaticMarkup(<OnceVsAlwaysStage state={state} preset={preset} />)

    expect(html).toContain('#ffb13b')
    expect(html).not.toContain('Nave ligada')
  })

  test('o caso da tecla mostra a terceira área e mantém um caminho de teclado', () => {
    const preset = ONCE_VS_ALWAYS_PRESETS['tres-caixas-tiro']
    const state = openScene({ scene: 'once-vs-always', setup: { preset } })
    const html = renderToStaticMarkup(
      <OnceVsAlwaysControls state={state} preset={preset} dispatch={() => {}} />,
    )
    expect(html).toContain('Quando acontecer')
    expect(html).toContain('Apertar a tecla')
    expect((html.match(/<button\b/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })
})
