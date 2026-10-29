import { describe, expect, test } from 'bun:test'
import { openScene, type SceneAction, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AVISOS_DA_PONTE,
  TimedBridgeControls,
  TimedBridgeStage,
} from '../src/components/scene-timed-bridge'

describe('a ponte apressada no player', () => {
  const start = { scene: 'timed-bridge' } as const
  const initial = openScene(start)
  const run = (actions: SceneAction[], from = initial) =>
    actions.reduce((s, a) => stepScene(start, s, a), from)

  test('o palco abre com a ponte levantada, a alavanca para cima e o relógio apagado', () => {
    const html = renderToStaticMarkup(<TimedBridgeStage state={initial} />)
    expect(html).toContain('data-ponte="levantada"')
    expect(html).toContain('data-alavanca="cima"')
    expect(html).toContain('data-relogio="parado"')
    expect(html.match(/data-marca="apagada"/g)).toHaveLength(4)
    expect(html).toContain(AVISOS_DA_PONTE.inicio)
  })

  test('puxar baixa a ponte e cada segundo acende uma marquinha', () => {
    const s = run([{ type: 'pull-lever' }, { type: 'wait-second' }, { type: 'wait-second' }])
    const html = renderToStaticMarkup(<TimedBridgeStage state={s} />)
    expect(html).toContain('data-ponte="baixada"')
    expect(html).toContain('data-alavanca="baixo"')
    expect(html).toContain('data-personagem="lever"')
    expect(html.match(/data-marca="acesa"/g)).toHaveLength(2)
    expect(html).toContain(AVISOS_DA_PONTE.baixou)
  })

  test('atravessar toca o sino; a ponte que subiu sozinha diz para puxar de novo', () => {
    const atravessou = run([
      { type: 'pull-lever' },
      { type: 'wait-second' },
      { type: 'touch-bridge' },
    ])
    const html = renderToStaticMarkup(<TimedBridgeStage state={atravessou} />)
    expect(html).toContain('data-sino="tocando"')
    expect(html).toContain('data-personagem="stone"')
    expect(html).toContain(AVISOS_DA_PONTE.atravessou)
    const subiu = run([{ type: 'pull-lever' }, ...Array(4).fill({ type: 'wait-second' })])
    expect(renderToStaticMarkup(<TimedBridgeStage state={subiu} />)).toContain(
      AVISOS_DA_PONTE.subiu,
    )
  })

  test('a bancada tem os rótulos que pedidos e pistas citam e a regra no lugar escolhido', () => {
    const html = renderToStaticMarkup(<TimedBridgeControls state={initial} dispatch={() => {}} />)
    for (const rotulo of [
      'Puxar a alavanca',
      'Esperar 1 segundo',
      'Encostar na ponte',
      'Dentro da alavanca',
      'No começo do jogo',
      'Recomeçar a partida',
    ])
      expect(html).toContain(rotulo)
    expect(html).not.toContain('Ao começar o jogo')
    const comeco = run([{ type: 'timer-place', place: 'start' }])
    expect(
      renderToStaticMarkup(<TimedBridgeControls state={comeco} dispatch={() => {}} />),
    ).toContain('Ao começar o jogo')
  })
})
