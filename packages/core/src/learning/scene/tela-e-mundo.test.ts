import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { drawLoopOnScreen, sceneReadout, sceneSituation } from './readout'
import {
  DRAW_LOOP_LANE,
  hydrateSceneState,
  isSceneState,
  type SceneStart,
  type SceneState,
} from './state'

/**
 * Lote 5 do Raio-X (16/09/2026), família "A tela e o mundo": as regras de motor do REDESENHO de
 * `draw-loop`, `stage-size`, `world` e da voz da `screen-reader`. A `coordinates` e o reconhecimento
 * da frase moram em `lesson-one.test.ts`; os pedidos seguidos ao pé da letra, em
 * `pedidos-no-motor.test.ts`.
 */

const rodar = (start: SceneStart, acoes: SceneAction[], de = openScene(start)) =>
  acoes.reduce((estado, acao) => stepScene(start, estado, acao), de)
const faixa = (scene: SceneStart['scene'], s: SceneState) =>
  Object.fromEntries(sceneReadout(scene, s).map((l) => [l.label, l.value]))

describe('draw-loop: o Dino anda nos bastidores, e a tela só muda quando alguém desenha', () => {
  const start = { scene: 'draw-loop' } as const
  const quadro: SceneAction = { type: 'advance', seconds: 1 / 4 }
  const quadros = (n: number) => Array.from({ length: n }, () => quadro)
  const { start: inicio, step, places } = DRAW_LOOP_LANE

  test('abre com o Dino desenhado UMA vez, no começo, e a faixa mostra os valores', () => {
    const s = openScene(start)
    expect(s.render.drawn).toEqual([inicio])
    expect(faixa('draw-loop', s)).toEqual({
      quadro: '0',
      'x do Dino': String(inicio),
      'Dinos na tela': '1',
    })
    expect(isSceneState(s)).toBe(true)
  })

  test('⚠️⚠️ só no começo: o x ANDA e o desenho não, e é isso que a meta afirma', () => {
    const s = rodar(start, quadros(3))
    expect(s.render.x).toBe(inicio + 3 * step)
    expect(s.render.drawn).toEqual([inicio])
    expect(s.evidence.discoveries).toEqual(['frozen'])
    expect(s.caption).toBe('Quadro 3: o x do Dino mudou e a tela continua igual.')
    expect(faixa('draw-loop', s)['x do Dino']).toBe(String(inicio + 3 * step))
  })

  test('⚠️⚠️ trocar a chave NÃO apaga a tela: quem apaga é o quadro com a limpeza', () => {
    const s = rodar(start, [
      { type: 'loop', on: true },
      { type: 'erase', on: true },
    ])
    expect(s.render.drawn).toEqual([inicio])
    expect(drawLoopOnScreen(s)).toBe(1)
  })

  test('⭐ o "salto" é a descoberta: o desenho novo aparece onde o Dino JÁ estava, e o velho fica', () => {
    const s = rodar(start, [...quadros(3), { type: 'loop', on: true }, quadro])
    expect(s.render.drawn).toEqual([inicio, inicio + 4 * step])
    expect(s.evidence.discoveries).toContain('trail')
    expect(s.caption).toBe('Desenhou sem limpar: 2 Dinos na tela.')
  })

  test('sem limpar, o rastro ENCHE a tela e para de crescer (uma casa, um desenho)', () => {
    const cheia = rodar(start, [{ type: 'loop', on: true }, ...quadros(places + 5)])
    expect(cheia.render.drawn).toHaveLength(places)
    expect(new Set(cheia.render.drawn).size).toBe(places)
    expect(cheia.caption).toBe('A tela encheu de Dinos. Nada foi apagado.')
    expect(isSceneState(cheia)).toBe(true)
  })

  test('⚠️⚠️ limpando e desenhando, um Dino só que NUNCA para: depois da última casa, volta ao começo', () => {
    let s = rodar(start, [
      { type: 'loop', on: true },
      { type: 'erase', on: true },
    ])
    const vistos: number[] = []
    for (let i = 0; i < places * 2; i++) {
      s = stepScene(start, s, quadro)
      expect(s.render.drawn).toHaveLength(1)
      vistos.push(s.render.x)
    }
    expect(s.evidence.discoveries).toEqual(['moving'])
    expect(new Set(vistos).size).toBe(places)
    expect(vistos[places - 1]).toBe(inicio)
    expect(Math.max(...vistos)).toBe(inicio + (places - 1) * step)
  })

  test('⚠️⚠️ limpar SEM desenhar deixa a tela vazia, e tela vazia parada não "deixa de mudar"', () => {
    const vazia = rodar(start, [{ type: 'erase', on: true }, quadro])
    expect(vazia.render.drawn).toEqual([])
    expect(vazia.render.empty).toBe(true)
    expect(vazia.evidence.discoveries).toEqual([])
    const parada = rodar(start, [{ type: 'erase', on: false }, ...quadros(4)], vazia)
    expect(parada.evidence.discoveries).toEqual([])
    expect(sceneSituation('draw-loop', { ...parada, caption: '' })).toContain('vazia')
  })

  test('⚠️ o CASO deixa o mundo (desenhos e x) e esquece a contagem: quadro 0, e o número de Dinos é o da tela', () => {
    const caso = {
      scene: 'draw-loop' as const,
      setup: {
        actions: [
          { type: 'loop' as const, on: true },
          { type: 'advance' as const, seconds: 1 },
        ],
      },
    }
    const aberto = openScene(caso)
    expect(aberto.render.frames).toBe(0)
    expect(aberto.render.drawn.length).toBeGreaterThan(1)
    expect(aberto.render.trail).toBe(aberto.render.drawn.length)
    expect(aberto.evidence.discoveries).toEqual([])
  })

  test('⚠️ retrato de antes do lote 5 (só `trail` e `empty`) volta com o MESMO número na tela', () => {
    const { x: _x, drawn: _d, ...velho } = openScene(start).render
    const comRastro = hydrateSceneState({ ...openScene(start), render: { ...velho, trail: 3 } })
    expect(isSceneState(comRastro)).toBe(true)
    expect(drawLoopOnScreen(comRastro as SceneState)).toBe(3)
    const vazia = hydrateSceneState({
      ...openScene(start),
      render: { ...velho, trail: 0, empty: true },
    })
    expect(drawLoopOnScreen(vazia as SceneState)).toBe(0)
    // E um retrato NOVO não é tocado.
    const novo = rodar(start, quadros(2))
    expect(hydrateSceneState(novo)).toEqual(novo)
  })
})

describe('stage-size: os números só descobrem alguma coisa com a borda à vista', () => {
  const start = { scene: 'stage-size' } as const

  test('⚠️⚠️ sem a borda, mudar os números (ou chegar em 480 por 270) não derruba meta nenhuma', () => {
    const s = rodar(start, [{ type: 'stage', width: 480, height: 270 }])
    expect(s.evidence.discoveries).toEqual([])
    expect([s.stage.width, s.stage.height]).toEqual([480, 270])
  })

  test('com a borda à vista, a borda acompanha e a chegada conta', () => {
    const s = rodar(start, [
      { type: 'border', visible: true },
      { type: 'stage', width: 600, height: 480 },
      { type: 'stage', width: 480, height: 270 },
    ])
    expect(s.evidence.discoveries).toEqual(['border-on', 'resized', 'target'])
    expect(evaluateExperimentation('stage-size', s).passed).toBe(true)
  })

  test('⚠️ reenviar o MESMO tamanho já no alvo não é chegar nele', () => {
    const caso = {
      scene: 'stage-size' as const,
      setup: {
        actions: [
          { type: 'stage' as const, width: 480, height: 270 },
          { type: 'border' as const, visible: true },
        ],
      },
    }
    const s = rodar(caso, [{ type: 'stage', width: 480, height: 270 }])
    expect(s.evidence.discoveries).toEqual([])
  })
})

describe('world: criar e desenhar são controles independentes', () => {
  const start = { scene: 'world' } as const
  const desenho = (enabled: boolean): SceneAction => ({ type: 'connect', port: 'draw', enabled })

  test('⚠️⚠️ desenhar sem ninguém criado não mostra nada e não derruba meta', () => {
    const s = rodar(start, [desenho(true)])
    expect(s.world).toMatchObject({ created: false, drawn: true })
    expect(s.evidence.discoveries).toEqual([])
    expect(faixa('world', s)).toEqual({ bastidores: 'vazio', 'desenho na tela': 'ligado' })
  })

  test('as duas ordens fecham a cena, e em qualquer uma o Dino some da tela sem sumir dos bastidores', () => {
    const desenhaPrimeiro = rodar(start, [desenho(true), { type: 'create' }, desenho(false)])
    expect(desenhaPrimeiro.evidence.discoveries).toEqual(['visible', 'hidden'])
    expect(desenhaPrimeiro.world.created).toBe(true)
    expect(evaluateExperimentation('world', desenhaPrimeiro).passed).toBe(true)
    const criaPrimeiro = rodar(start, [{ type: 'create' }, desenho(true)])
    expect(criaPrimeiro.evidence.discoveries).toEqual(['hidden', 'visible'])
    expect(faixa('world', criaPrimeiro)).toEqual({
      bastidores: 'com o Dino',
      'desenho na tela': 'ligado',
    })
  })
})

describe('screen-reader: a voz e as duas escutas', () => {
  const start = { scene: 'screen-reader' } as const

  test('⚠️ o CASO não pré-semeia escuta: nem a frase ouvida, nem a contagem que dispara a voz', () => {
    const caso = {
      scene: 'screen-reader' as const,
      setup: {
        actions: [
          { type: 'describe' as const, text: 'Pule apertando espaço' },
          { type: 'listen' as const },
        ],
      },
    }
    const aberto = openScene(caso)
    expect(aberto.description).toMatchObject({ heard: '', said: '', listens: 0, heardEmpty: false })
    expect(aberto.description.text).toBe('Pule apertando espaço')
  })

  test('⚠️ retrato de antes do lote 5: a frase que a pessoa ouviu volta para o painel', () => {
    const {
      said: _s,
      listens: _l,
      ...velho
    } = rodar(start, [
      { type: 'describe', text: 'Pule apertando espaço' },
      { type: 'listen' },
    ]).description
    const hidratado = hydrateSceneState({ ...openScene(start), description: velho }) as SceneState
    expect(isSceneState(hidratado)).toBe(true)
    expect(hidratado.description.said).toBe('Tela do jogo. Pule apertando espaço')
    expect(hidratado.description.listens).toBe(0)
  })
})
