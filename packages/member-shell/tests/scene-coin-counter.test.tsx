import { describe, expect, test } from 'bun:test'
import { openScene, type SceneAction, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AVISOS_DAS_MOEDAS,
  CoinCounterControls,
  CoinCounterStage,
} from '../src/components/scene-coin-counter'

describe('o contador de moedas no player', () => {
  const start = { scene: 'coin-counter' } as const
  const initial = openScene(start)
  const run = (actions: SceneAction[], from = initial) =>
    actions.reduce((s, a) => stepScene(start, s, a), from)

  test('o palco abre com seis moedas, o baú fechado, zero no placar e o aviso do jogo', () => {
    const html = renderToStaticMarkup(<CoinCounterStage state={initial} />)
    expect(html.match(/data-no-caminho="sim"/g)).toHaveLength(6)
    expect(html).toContain('data-bau="closed"')
    expect(html).toContain('Moedas: 0')
    expect(html).toContain(AVISOS_DAS_MOEDAS.inicio)
    expect(html).toContain('data-personagem="afastado"')
    expect(html).not.toContain('data-soma')
  })

  test('encostar numa moeda tira a moeda do caminho e mostra antes → +1 → agora', () => {
    const s = run([{ type: 'touch-coin', coin: 2 }])
    const html = renderToStaticMarkup(<CoinCounterStage state={s} />)
    expect(html).toContain('data-moeda="3" data-no-caminho="nao"')
    expect(html.match(/data-no-caminho="sim"/g)).toHaveLength(5)
    expect(html).toContain('Moedas: 1')
    expect(html).toContain('0 → +1 → 1')
    expect(html).toContain('data-personagem="moeda-3"')
  })

  test('o baú diz o aviso da regra escolhida e abre com cinco moedas', () => {
    const quatro = run([0, 1, 2, 3].map((coin) => ({ type: 'touch-coin', coin }) as SceneAction))
    const falta = renderToStaticMarkup(
      <CoinCounterStage state={run([{ type: 'try-chest' }], quatro)} />,
    )
    expect(falta).toContain(AVISOS_DAS_MOEDAS.falta)
    expect(falta).toContain('data-personagem="bau"')
    const faltaIgual = renderToStaticMarkup(
      <CoinCounterStage
        state={run([{ type: 'chest-rule', rule: 'equals' }, { type: 'try-chest' }], quatro)}
      />,
    )
    expect(faltaIgual).toContain(AVISOS_DAS_MOEDAS.faltaIgual)
    const abriu = renderToStaticMarkup(
      <CoinCounterStage
        state={run([{ type: 'touch-coin', coin: 4 }, { type: 'try-chest' }], quatro)}
      />,
    )
    expect(abriu).toContain('data-bau="open"')
    expect(abriu).toContain(AVISOS_DAS_MOEDAS.abriu)
  })

  test('a bancada tem os rótulos que pedidos e pistas citam', () => {
    const html = renderToStaticMarkup(<CoinCounterControls state={initial} dispatch={() => {}} />)
    for (const rotulo of [
      'A moeda some',
      'Pelo menos 5',
      'Igual a 5',
      'Afastar',
      'Encostar no baú',
      'Recomeçar a partida',
    ])
      expect(html).toContain(rotulo)
    for (let i = 1; i <= 6; i++) expect(html).toContain(`aria-label="Encostar na moeda ${i}"`)
    expect(html).toContain('Se moedas ≥ 5')
  })

  test('sem "a moeda some", a linha de tirar do grupo fica fora da regra', () => {
    const ligado = renderToStaticMarkup(<CoinCounterControls state={initial} dispatch={() => {}} />)
    expect(ligado).not.toContain('data-estado="fora"')
    const desligado = renderToStaticMarkup(
      <CoinCounterControls
        state={run([{ type: 'coin-disappears', enabled: false }])}
        dispatch={() => {}}
      />,
    )
    expect(desligado).toContain('data-estado="fora"')
  })
})
