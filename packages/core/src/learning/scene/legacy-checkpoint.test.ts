import { describe, expect, test } from 'bun:test'
import { packExperiment, readDemonstrationSession, readExperimentSession } from './session'
import { initialScene, isSceneState } from './state'

/**
 * ⚠️⚠️ O que já está gravado no banco continua sendo lido (14/09/2026).
 *
 * `place` e `description` nasceram com as cenas `coordinates` e `screen-reader`. O estado da
 * cena vai SERIALIZADO INTEIRO no checkpoint (`packExperiment` → `pack(state)`), e a leitura
 * valida campo a campo — então, sem hidratar, todo retrato gravado antes desse dia seria
 * recusado. O player trata recusa como "esta descoberta mudou, recomece": a criança abriria
 * uma cena que já tinha mexido e encontraria o trabalho apagado, com um recado de erro.
 *
 * Este teste monta o retrato ANTIGO à mão de propósito. Derivá-lo do `initialScene` atual não
 * provaria nada: ele já nasce com os campos novos.
 */

/** Um `world` gravado antes de 14/09/2026, com os oito grupos que existiam. */
function retratoAntigo() {
  return {
    evidence: { actions: 3, discoveries: ['hidden'], observations: [], hints: 1 },
    world: { created: true, drawn: false, front: false },
    flight: { gravity: true, force: 9, y: 0, time: null, atForce: 9, atGravity: true, peak: 0 },
    sound: { onJump: false, count: 0, jumps: 0 },
    crowd: {
      timer: false,
      interval: 1,
      cleanup: false,
      remainder: 0,
      born: 0,
      removed: 0,
      cacti: [],
      elapsed: 0,
    },
    match: {
      guarded: false,
      touch: false,
      restartConnected: false,
      screen: 'start',
      points: 0,
      clockRemainder: 0,
      scoreIdle: 0,
    },
    contact: { distance: 140, width: 48 },
    speed: {
      limited: false,
      base: -5,
      ticks: 0,
      samples: { x: 500, velocity: -5, positions: [], velocities: [] },
    },
    caption: 'O Dino existe nos bastidores, sem desenho na tela.',
  }
}
const guardado = (extra: Record<string, unknown>) => [
  JSON.stringify({
    scene: 'world',
    state: retratoAntigo(),
    past: [retratoAntigo()],
    trials: [],
    ...extra,
  }),
]

describe('retrato guardado antes dos grupos novos', () => {
  test('o validador sozinho RECUSA o retrato antigo — é por isso que existe hidratação', () => {
    // Esta asserção é a prova de que o teste abaixo morde: sem ela, uma hidratação removida
    // por engano passaria despercebida.
    expect(isSceneState(retratoAntigo())).toBe(false)
  })

  test('⚠️ a experimentação guardada continua sendo lida, com o padrão nos campos novos', () => {
    const sessao = readExperimentSession('world', guardado({}))
    expect(sessao).not.toBeNull()
    expect(sessao?.state.evidence.discoveries).toEqual(['hidden'])
    expect(sessao?.state.world.created).toBe(true)
    expect(sessao?.state.place.x).toBe(110)
    expect(sessao?.state.description.text).toBe('')
    // O histórico do desfazer também: ele é uma lista de retratos.
    expect(sessao?.past).toHaveLength(1)
    expect(sessao?.past[0]?.place.y).toBe(150)
    // E os cinco grupos do lote de desenho, que nasceram depois ainda: mesma regra.
    expect(sessao?.state.animation.frame).toBe(1)
    expect(sessao?.state.lifeline.lives).toBe(3)
  })

  test('⚠️⚠️ o retrato da GERAÇÃO DO MEIO também volta, e é o caso mais provável', () => {
    // A criança que mexeu na cena de manhã guardou um retrato com os doze grupos daquele
    // momento, e nenhum dos cinco de desenho. É o retrato que existe no banco em maior número
    // no dia de um lote como este, e por isso ele tem fixture PRÓPRIA em vez de confiar que
    // "o antigo passa, então o do meio também".
    const doMeio = {
      ...retratoAntigo(),
      place: { x: 300, y: 240, fromX: 110, fromY: 150, visitedX: [110, 300] },
      description: { text: '', heard: '', heardEmpty: false },
      stage: { width: 480, height: 270, border: true, tried: 2 },
      render: { loop: true, erase: false, frames: 3, trail: 2 },
    }
    expect(isSceneState(doMeio)).toBe(false)
    const sessao = readExperimentSession('world', [
      JSON.stringify({ scene: 'world', state: doMeio, past: [], trials: [] }),
    ])
    // O que ela já tinha mexido continua lá, e o que não existia entra no padrão.
    expect(sessao?.state.place.x).toBe(300)
    expect(sessao?.state.stage.tried).toBe(2)
    expect(sessao?.state.mirror.painted).toEqual([])
    expect(sessao?.state.sheet.size).toBe(48)
    expect(sessao?.state.pixels.zoom).toBe(1)
  })

  test('a demonstração guardada idem', () => {
    const parts = [
      JSON.stringify({
        scene: 'world',
        state: retratoAntigo(),
        step: 1,
        action: 0,
        elapsed: 0,
        ready: true,
        viewed: true,
      }),
    ]
    const sessao = readDemonstrationSession('world', parts)
    expect(sessao?.viewed).toBe(true)
    expect(sessao?.state.place.x).toBe(110)
  })

  test('o que é gravado HOJE volta igual', () => {
    const atual = { state: initialScene({ scene: 'coordinates' }), past: [], trials: [] }
    const lido = readExperimentSession('coordinates', packExperiment('coordinates', atual))
    expect(lido?.state.place).toEqual(atual.state.place)
  })

  test('retrato de outra cena continua recusado', () => {
    // A hidratação não pode virar uma porta larga: ela preenche grupo AUSENTE, não conserta
    // retrato quebrado nem deixa passar o de outra cena.
    expect(readExperimentSession('layers', guardado({}))).toBeNull()
    const quebrado = { ...retratoAntigo(), contact: { distance: 'perto', width: 48 } }
    expect(
      readExperimentSession('world', [
        JSON.stringify({ scene: 'world', state: quebrado, past: [], trials: [] }),
      ]),
    ).toBeNull()
  })
})
