import { describe, expect, test } from 'bun:test'
import { openScene, type SceneAction, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  AVISOS_DA_CABANA,
  TwoPiecesControls,
  TwoPiecesStage,
} from '../src/components/scene-two-pieces'

describe('a porta com duas peças no player', () => {
  const start = { scene: 'two-pieces' } as const
  const initial = openScene(start)
  const run = (actions: SceneAction[], from = initial) =>
    actions.reduce((s, a) => stepScene(start, s, a), from)

  test('o palco abre com as duas peças no chão, a cabana fechada e o aviso do jogo', () => {
    const html = renderToStaticMarkup(<TwoPiecesStage state={initial} />)
    expect(html.match(/data-no-chao="sim"/g)).toHaveLength(2)
    expect(html).toContain('data-cabana="closed"')
    expect(html).toContain(AVISOS_DA_CABANA.inicio)
    expect(html).toContain('data-personagem="comeco"')
    expect(html.match(/data-tem="nao"/g)).toHaveLength(2)
  })

  test('pegar uma peça tira do chão e enche a casinha do que o personagem leva', () => {
    const s = run([{ type: 'take-piece', piece: 'emblem' }])
    const html = renderToStaticMarkup(<TwoPiecesStage state={s} />)
    expect(html).toContain('data-peca="emblema" data-no-chao="nao"')
    expect(html).toContain('data-casinha="emblema" data-tem="sim"')
    expect(html).toContain(AVISOS_DA_CABANA.emblema)
    expect(html).toContain('data-personagem="emblem"')
  })

  test('a cabana diz o que pede com uma peça e abre com as duas', () => {
    const uma = run([{ type: 'take-piece', piece: 'key' }, { type: 'try-cabin' }])
    const falta = renderToStaticMarkup(<TwoPiecesStage state={uma} />)
    expect(falta).toContain(AVISOS_DA_CABANA.falta)
    expect(falta).toContain('data-personagem="cabana"')
    const abriu = renderToStaticMarkup(
      <TwoPiecesStage
        state={run([{ type: 'take-piece', piece: 'emblem' }, { type: 'try-cabin' }], uma)}
      />,
    )
    expect(abriu).toContain('data-cabana="open"')
    expect(abriu).toContain(AVISOS_DA_CABANA.abriu)
  })

  test('a bancada tem os rótulos que pedidos e pistas citam e a pergunta de agora', () => {
    const html = renderToStaticMarkup(<TwoPiecesControls state={initial} dispatch={() => {}} />)
    for (const rotulo of [
      'Pegar a chave',
      'Pegar o emblema',
      'Encostar na cabana',
      'Recomeçar a partida',
      '>e<',
      '>ou<',
    ])
      expect(html).toContain(rotulo)
    expect(html).toContain('data-pergunta="falso"')
  })

  test('na cabana, a regra marca o ramo que a tentativa seguiu; com "ou" uma peça basta', () => {
    const fechada = run([{ type: 'take-piece', piece: 'key' }, { type: 'try-cabin' }])
    const html = renderToStaticMarkup(<TwoPiecesControls state={fechada} dispatch={() => {}} />)
    expect(html).toContain('data-estado="escolhido"')
    // O "então" foi pulado e o "senão" foi o escolhido.
    expect(html).toMatch(
      /data-estado="ignorado"[\s\S]*então[\s\S]*data-estado="escolhido"[\s\S]*senão/,
    )
    const ou = run([
      { type: 'cabin-rule', rule: 'or' },
      { type: 'take-piece', piece: 'key' },
    ])
    expect(renderToStaticMarkup(<TwoPiecesControls state={ou} dispatch={() => {}} />)).toContain(
      'data-pergunta="verdadeiro"',
    )
  })
})
