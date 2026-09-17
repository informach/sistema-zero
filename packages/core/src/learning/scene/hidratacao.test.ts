import { describe, expect, test } from 'bun:test'
import { SCENE_IDS, type SceneId } from './actions'
import { SCENE_MODELS } from './catalog'
import { openScene, stepScene } from './engine'
import {
  type ExperimentSession,
  initialDemonstration,
  initialExperiment,
  isExperimentCommand,
  packDemonstration,
  packExperiment,
  readDemonstrationSession,
  readExperimentSession,
  stepDemonstration,
  stepExperiment,
} from './session'
import { hydrateSceneState, isSceneState, type SceneState } from './state'

/**
 * ⚠️⚠️ UMA regra para hidratar retrato (M-1 do full review 2, 17/09/2026).
 *
 * Antes havia duas: 31 grupos preenchiam campo faltando com o valor de FÁBRICA e 5 (`match`,
 * `speed`, `flight`, `sound`, `crowd`) recusavam o retrato inteiro. O preenchimento fabricava
 * estado incoerente e meta FALSA — um `drive` sem âncora voltava com `anchorX: 60` ao lado de
 * `x: 120`, e o primeiro passo do relógio fechava "a posição mudou sozinha" com a velocidade em
 * ZERO. Hoje a régua é uma só: **retrato incompleto é inválido**, e quem chama o trata como
 * ausente (a cena recomeça limpa). O que a hidratação ainda faz é dar o padrão ao GRUPO que não
 * veio inteiro.
 */

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/** Os 31 grupos que a hidratação conhece. Fora deles, grupo ausente já recusava o retrato. */
const GRUPOS_COM_PADRAO = [
  'place',
  'description',
  'stage',
  'render',
  'animation',
  'mirror',
  'pixels',
  'sheet',
  'lifeline',
  'drive',
  'input',
  'box',
  'hunt',
  'blueprint',
  'view',
  'hit',
  'weapon',
  'sight',
  'walkPad',
  'grid',
  'nursery',
  'brains',
  'machines',
  'circles',
  'space',
  'orbit',
  'model',
  'ray',
  'ink',
  'light',
  'clock',
] as const

/** O estado como o PACOTE o devolve: a tupla do cacto guarda id, x e velocidade, e só. */
function semBaseNoEstado(estado: SceneState): SceneState {
  return {
    ...estado,
    crowd: {
      ...estado.crowd,
      cacti: estado.crowd.cacti.map(({ id, x, velocity }) => ({ id, x, velocity })),
    },
  }
}

function semBaseDoSorteio(sessao: ExperimentSession): ExperimentSession {
  return {
    ...sessao,
    state: semBaseNoEstado(sessao.state),
    past: sessao.past.map(semBaseNoEstado),
  }
}

/** A sessão de experimentação que o roteiro do modelo produz, com um retrato guardado no fim. */
function experimentacaoDoModelo(scene: SceneId): ExperimentSession {
  const start = { scene }
  let sessao = initialExperiment(start)
  for (const passo of SCENE_MODELS[scene].script)
    for (const acao of passo.actions)
      if (isExperimentCommand(acao, start)) sessao = stepExperiment(start, sessao, acao).session
  return stepExperiment(start, sessao, { type: 'capture' }).session
}

/** A demonstração tocada até o fim, como o player a toca. */
function demonstracaoDoModelo(scene: SceneId) {
  const start = { scene }
  const roteiro = SCENE_MODELS[scene].script
  let s = stepDemonstration(start, roteiro, initialDemonstration(start), { type: 'start' }).session
  for (let i = 0; i < 4000 && !s.viewed; i++) {
    s = stepDemonstration(start, roteiro, s, { type: 'tick', seconds: 0.05 }).session
    if (s.ready && s.step < roteiro.length - 1)
      s = stepDemonstration(start, roteiro, s, { type: 'next' }).session
  }
  return s
}

describe('M-1: o que o player grava hoje volta IDÊNTICO nas 45 cenas', () => {
  test('⚠️⚠️ ida e volta do retrato: a hidratação não troca um campo sequer', () => {
    for (const scene of SCENE_IDS) {
      const estados = [
        openScene({ scene }),
        experimentacaoDoModelo(scene).state,
        demonstracaoDoModelo(scene).state,
      ]
      for (const estado of estados) {
        const guardado = clone(estado)
        expect(hydrateSceneState(guardado), scene).toEqual(guardado)
        expect(isSceneState(hydrateSceneState(guardado)), scene).toBe(true)
      }
    }
  })

  test('⚠️⚠️ ida e volta pelo pacote guardado (experimentação e demonstração), nas 45', () => {
    for (const scene of SCENE_IDS) {
      const experimentacao = experimentacaoDoModelo(scene)
      const lida = readExperimentSession(scene, packExperiment(scene, experimentacao))
      expect(lida, scene).toEqual(semBaseDoSorteio(experimentacao))
      const demonstracao = demonstracaoDoModelo(scene)
      const voltou = readDemonstrationSession(scene, packDemonstration(scene, demonstracao))
      expect(voltou, scene).toEqual({
        ...demonstracao,
        state: semBaseNoEstado(demonstracao.state),
        ...(demonstracao.before ? { before: demonstracao.before } : {}),
      })
    }
  })

  test('⚠️ o único campo que o PACOTE não devolve é o `base` do sorteio da `acceleration`', () => {
    // Achado registrado, não consertado aqui (é formato do pacote, anterior ao M-1, e mexer nele
    // mudaria o que a criança vê): `packExperiment` guarda cada cacto como a tupla
    // `[id, x, velocity]`, então o `base` — que a fileira da `acceleration` usa para escrever
    // "base −9, sorteio −1" — não sobrevive ao F5. Fica medido aqui para não passar despercebido.
    const afetadas = SCENE_IDS.filter((scene) => {
      const sessao = experimentacaoDoModelo(scene)
      return JSON.stringify(sessao) !== JSON.stringify(semBaseDoSorteio(sessao))
    })
    expect(afetadas).toEqual(['acceleration'])
  })
})

describe('M-1: retrato com campo faltando é RECUSADO, nos 36 grupos', () => {
  test('⚠️⚠️ nas 45 cenas, qualquer campo derrubado dentro de um grupo invalida o retrato', () => {
    for (const scene of SCENE_IDS) {
      const base = experimentacaoDoModelo(scene).state as unknown as Record<string, unknown>
      for (const grupo of Object.keys(base)) {
        const valor = base[grupo]
        if (!valor || typeof valor !== 'object' || Array.isArray(valor)) continue
        for (const campo of Object.keys(valor as Record<string, unknown>)) {
          const truncado = clone(base)
          delete (truncado[grupo] as Record<string, unknown>)[campo]
          expect(isSceneState(hydrateSceneState(truncado)), `${scene} · ${grupo}.${campo}`).toBe(
            false,
          )
        }
      }
    }
  })

  test('⚠️ o GRUPO inteiro ausente continua abrindo com o padrão de fábrica', () => {
    for (const scene of SCENE_IDS) {
      for (const grupo of GRUPOS_COM_PADRAO) {
        const semGrupo = clone(openScene({ scene })) as unknown as Record<string, unknown>
        delete semGrupo[grupo]
        expect(isSceneState(hydrateSceneState(semGrupo)), `${scene} · ${grupo}`).toBe(true)
      }
    }
  })
})

describe('M-1: nenhuma meta cai por causa de valor de fábrica preenchido', () => {
  test('⚠️⚠️ o caso exato: `velocity` sem âncora não fecha mais "a posição mudou sozinha"', () => {
    // Antes: o retrato voltava com `anchorX: 60` ao lado de `x: 200`, e um `advance` com velocidade
    // ZERO fechava `moves` escrevendo "Um quadro: o x foi de 60 para 200". Hoje é recusado, e o
    // conserto do members faz a cena recomeçar limpa.
    const base = openScene({ scene: 'velocity' })
    const { anchorX: _x, anchorY: _y, ...semAncora } = { ...base.drive, x: 200, y: 40 }
    const hidratado = hydrateSceneState({ ...base, drive: semAncora })
    expect(isSceneState(hidratado)).toBe(false)
  })

  test('⚠️⚠️ nas 45: grupo ausente abre no mundo de fábrica, sem descoberta de brinde', () => {
    // O que sobrou da hidratação (o grupo inteiro ausente) não pode inventar história: o estado
    // hidratado tem de andar como o de fábrica anda, sem meta a mais no primeiro passo.
    for (const scene of SCENE_IDS) {
      const fabrica = openScene({ scene })
      const passo = { type: 'advance', seconds: 0.05 } as const
      const esperado = stepScene({ scene }, fabrica, passo).evidence.discoveries
      for (const grupo of GRUPOS_COM_PADRAO) {
        const semGrupo = clone(fabrica) as unknown as Record<string, unknown>
        delete semGrupo[grupo]
        const hidratado = hydrateSceneState(semGrupo)
        if (!isSceneState(hidratado)) continue
        const andou = stepScene({ scene }, hidratado as SceneState, passo)
        expect(andou.evidence.discoveries, `${scene} · ${grupo}`).toEqual(esperado)
      }
    }
  })
})
