import { describe, expect, test } from 'bun:test'
import {
  isSceneAction,
  SCENE_FRAME_RATE,
  SCENE_IDS,
  type SceneAction,
  type SceneId,
} from './actions'
import {
  openScene,
  sceneClockReachedStop,
  sceneClockShouldStop,
  sceneConnectRunsClock,
  sceneGestureRunsClock,
  sceneJumpLeftView,
  stepScene,
} from './engine'
import { sceneScript } from './index'
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

  test('⚠️ nenhum outro gesto dos roteiros de fábrica mexe no ▶', () => {
    const mexem = new Set(['jump', 'connect', 'start'])
    for (const cena of SCENE_IDS) {
      let estado = openScene({ scene: cena })
      for (const passo of sceneScript({ type: 'demonstration', scene: cena })) {
        for (const acao of passo.actions) {
          estado = stepScene({ scene: cena }, estado, acao)
          if (!mexem.has(acao.type)) expect(sceneGestureRunsClock(cena, acao, estado)).toBeNull()
        }
      }
    }
  })
})
