import { describe, expect, test } from 'bun:test'
import { isSceneAction, SCENE_FRAME_RATE, type SceneAction, type SceneId } from './actions'
import {
  openScene,
  sceneClockReachedStop,
  sceneClockShouldStop,
  sceneConnectRunsClock,
  sceneGestureRunsClock,
  sceneJumpLeftView,
  stepScene,
} from './engine'
import { ONCE_VS_ALWAYS_PRESETS } from './presets'

import type { SceneState } from './state'

/**
 * ⚠️⚠️ O que liga e o que para o ▶, numa régua só (full review de 16/09/2026).
 *
 * O player (`scene-activity.tsx`) e o "Agora é sua vez" (`scene-sandbox.tsx`) copiavam estas regras com o
 * comentário "como no player", e as cópias já tinham divergido: com o Dino no CHÃO, o ▶ do player parava
 * no primeiro tique da `gravity`, da `impulse` e da `jump-sound`, e o da bancada da vez nunca parava. Hoje
 * as duas superfícies leem `sceneClockShouldStop` e `sceneGestureRunsClock`, e este arquivo trava a régua
 * em TODAS as cenas com relógio, pelo motor de verdade.
 */

/** A fatia do ▶ no navegador (o `requestAnimationFrame` acumula até ~40 ms). */
const FATIA = 0.04
const CENAS_COM_RELOGIO = Object.keys(SCENE_FRAME_RATE) as SceneId[]
const SALTOS = CENAS_COM_RELOGIO.filter((cena) =>
  isSceneAction({ type: 'jump', input: 'tap' }, cena),
)

function tique(scene: SceneId, antes: SceneState) {
  const depois = stepScene({ scene }, antes, { type: 'advance', seconds: FATIA })
  return { depois, parou: sceneClockShouldStop(scene, antes, depois) }
}

describe('o ▶ para sozinho (`sceneClockShouldStop`)', () => {
  test('Uma vez e sempre: Ao iniciar para depois do começo; Enquanto estiver rodando para quando a nave sai', () => {
    const scene = 'once-vs-always' as const
    const preset = ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave']
    const start = { scene, setup: { preset } }
    for (const area of ['start', 'loop'] as const) {
      let state = stepScene(start, openScene(start), { type: 'place-in-area', card: 'move', area })
      let stopped = false
      for (let i = 0; i < 30; i++) {
        const before = state
        state = stepScene(start, state, { type: 'advance', seconds: 0.25 })
        stopped = sceneClockShouldStop(scene, before, state, preset)
        if (stopped) break
      }
      expect(stopped).toBe(true)
      expect(state.once.frames).toBe(area === 'start' ? 3 : 24)
      expect(state.once.fires.move).toBe(area === 'start' ? 1 : 24)
      if (area === 'loop') expect(state.once.heroX).toBeGreaterThan(560)
    }
  })

  test('eventos e vidas também encerram a demonstração, sem relógio infinito', () => {
    for (const [id, card, area, expectedFrames] of [
      ['tres-caixas-tiro', 'event', 'event', 5],
      ['uma-ficha-vidas', 'lives', 'loop', 9],
      ['duas-caixas-dino', 'move', 'loop', 5],
      ['tres-caixas-som', 'event', 'event', 5],
    ] as const) {
      const scene = 'once-vs-always' as const
      const preset = ONCE_VS_ALWAYS_PRESETS[id]
      const start = { scene, setup: { preset } }
      let state = stepScene(start, openScene(start), { type: 'place-in-area', card, area })
      let stopped = false
      for (let i = 0; i < expectedFrames; i++) {
        const before = state
        state = stepScene(start, state, { type: 'advance', seconds: 0.25 })
        stopped = sceneClockShouldStop(scene, before, state, preset)
        if (i < expectedFrames - 1) expect(stopped).toBe(false)
      }
      expect(stopped).toBe(true)
    }
  })

  test('as cenas de salto são exatamente as três do laboratório do pulo', () => {
    expect(SALTOS.sort()).toEqual(['gravity', 'impulse', 'jump-sound'])
  })

  test.each(
    CENAS_COM_RELOGIO.map((cena) => [cena]),
  )('⚠️⚠️ %s: a cena recém-aberta só para no primeiro tique se for de salto (o Dino no chão)', (cena) => {
    const { parou } = tique(cena, openScene({ scene: cena }))
    expect(parou).toBe(SALTOS.includes(cena))
  })

  test.each(
    SALTOS.map((cena) => [cena]),
  )('%s: no ar o ▶ segue, e para no tique em que o salto termina (nem antes, nem depois)', (cena) => {
    let estado = stepScene({ scene: cena }, openScene({ scene: cena }), {
      type: 'jump',
      input: 'tap',
    })
    // A gravidade ligada: o Dino sobe e volta ao chão (na `gravity` ela nasce desligada).
    if (cena === 'gravity')
      estado = stepScene({ scene: cena }, estado, {
        type: 'connect',
        port: 'gravity',
        enabled: true,
      })
    let tiques = 0
    for (; tiques < 400; tiques++) {
      const { depois, parou } = tique(cena, estado)
      estado = depois
      if (parou) break
      expect(depois.flight.time).not.toBeNull()
    }
    expect(tiques).toBeGreaterThan(5)
    expect(tiques).toBeLessThan(400)
    expect(estado.flight.time).toBeNull()
  })

  test('gravity sem gravidade: para no tique em que o Dino passa do alto do palco', () => {
    let estado = stepScene({ scene: 'gravity' }, openScene({ scene: 'gravity' }), {
      type: 'jump',
      input: 'tap',
    })
    let passou = false
    for (let i = 0; i < 400; i++) {
      const antes = estado
      const { depois, parou } = tique('gravity', antes)
      estado = depois
      if (parou) {
        passou = sceneJumpLeftView('gravity', antes, depois)
        break
      }
    }
    expect(passou).toBe(true)
    expect(estado.flight.time).not.toBeNull()
  })

  test('circle-collision: segue aproximando e para no tique da batida', () => {
    let estado = openScene({ scene: 'circle-collision' })
    let parouNaBatida = false
    for (let i = 0; i < 2000; i++) {
      const { depois, parou } = tique('circle-collision', estado)
      estado = depois
      if (parou) {
        parouNaBatida = sceneClockReachedStop('circle-collision', depois)
        break
      }
    }
    expect(parouNaBatida).toBe(true)
    // Encostados, apertar ▶ de novo para na primeira fatia.
    expect(tique('circle-collision', estado).parou).toBe(true)
  })
})

describe('o gesto solta ou para o ▶ (`sceneGestureRunsClock`)', () => {
  test.each(SALTOS.map((cena) => [cena]))('%s: pular solta o tempo', (cena) => {
    const aberto = openScene({ scene: cena })
    const acao: SceneAction = { type: 'jump', input: 'tap' }
    expect(sceneGestureRunsClock(cena, acao, stepScene({ scene: cena }, aberto, acao))).toBe(true)
  })

  test('connect segue a régua do fio com o Dino no ar (`sceneConnectRunsClock`)', () => {
    const noAr = stepScene({ scene: 'gravity' }, openScene({ scene: 'gravity' }), {
      type: 'jump',
      input: 'tap',
    })
    for (const enabled of [true, false]) {
      const acao: SceneAction = { type: 'connect', port: 'gravity', enabled }
      expect(sceneGestureRunsClock('gravity', acao, noAr)).toBe(
        sceneConnectRunsClock('gravity', acao, noAr),
      )
    }
    expect(
      sceneGestureRunsClock(
        'gravity',
        { type: 'connect', port: 'gravity', enabled: true },
        openScene({ scene: 'gravity' }),
      ),
    ).toBeNull()
  })

  test.each([
    ['restart'],
    ['score'],
  ] as const)('%s: o toque que COMEÇA a partida solta o tempo; na tela de início sem começar, nada', (cena) => {
    const aberto = openScene({ scene: cena })
    const tocar: SceneAction = { type: 'start', input: 'tap' }
    const depois = stepScene({ scene: cena }, aberto, tocar)
    expect(depois.match.screen).toBe('playing')
    expect(sceneGestureRunsClock(cena, tocar, depois)).toBe(true)
    expect(sceneGestureRunsClock(cena, tocar, aberto)).toBeNull()
  })
})
