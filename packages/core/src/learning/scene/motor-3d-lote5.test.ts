import { describe, expect, test } from 'bun:test'
import { isSceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { DELTA_RACE, hydrateSceneState, initialScene, isSceneState, type SceneState } from './state'

/**
 * Os contratos de ESTADO do lote 5 do Raio-X no motor e na porta do 3D (G6): o retrato de antes abre,
 * o caso do professor não fecha meta por ela e as duas ações novas só valem na cena delas.
 * O comportamento de cada cena está em `engine-scenes.test.ts` e `pedidos-no-motor.test.ts`.
 */

describe('⚠️⚠️ o retrato de antes do lote 5 abre (pool, entity-state, delta-time, mesh)', () => {
  test('sem os campos novos, o retrato é completado a partir do que ele já guardava', () => {
    const atual = initialScene({ scene: 'pool' })
    const { onScreen: _o, progress: _p, last: _l, ...berçarioAntigo } = atual.nursery
    const { shared: _s, ...cabecasAntigas } = atual.brains
    const { fastFrames: _f, slowFrames: _d, ...maquinasAntigas } = atual.machines
    const { see: _v, sawHalf: _h, ...modeloAntigo } = atual.model
    const antigo = {
      ...atual,
      nursery: { ...berçarioAntigo, created: 3 },
      brains: cabecasAntigas,
      machines: { ...maquinasAntigas, fastX: 42, slowX: 21 },
      model: { ...modeloAntigo, wire: true },
    }
    expect(isSceneState(antigo)).toBe(false)
    const hidratado = hydrateSceneState(antigo) as SceneState
    expect(isSceneState(hidratado)).toBe(true)
    // Antes, o número guardado era o de corpos na tela.
    expect(hidratado.nursery.onScreen).toBe(3)
    expect(hidratado.nursery.created).toBe(3)
    // As pegadas saem da posição: uma a cada passo da corrida.
    expect(hidratado.machines.fastFrames).toBe(Math.floor(42 / DELTA_RACE.passo))
    expect(hidratado.machines.slowFrames).toBe(Math.floor(21 / DELTA_RACE.passo))
    // O raio-X ligado de antes é o "tudo" de agora.
    expect(hidratado.model.see).toBe('tudo')
    expect(hidratado.model.sawHalf).toBe(false)
    expect(hidratado.brains.shared).toBe(false)
  })

  test('a hidratação não inventa um estado inválido: o retrato atual passa inteiro', () => {
    const atual = initialScene({ scene: 'mesh' })
    expect(hydrateSceneState(atual)).toEqual(atual)
  })
})

describe('⚠️⚠️ o caso do professor não fecha meta pela criança', () => {
  test('mesh: um caso na "metade" abre na metade, mas voltar para "nada" ainda não mostra a pele', () => {
    const start = {
      scene: 'mesh' as const,
      setup: { actions: [{ type: 'see-points', level: 'metade' }] },
    }
    const aberto = openScene(start as never)
    expect(aberto.model.see).toBe('metade')
    expect(aberto.model.sawHalf).toBe(false)
    const voltou = stepScene(start as never, aberto, { type: 'see-points', level: 'nada' })
    expect(voltou.evidence.discoveries).not.toContain('skin')
  })

  test('pool e delta-time: o caso guarda a CHAVE, mas a contagem e a corrida começam do zero', () => {
    const pool = openScene({
      scene: 'pool',
      setup: { actions: [{ type: 'connect', port: 'recycle', enabled: true }] },
    } as never)
    expect(pool.nursery.recycling).toBe(true)
    expect(pool.nursery.created).toBe(0)
    const corrida = openScene({
      scene: 'delta-time',
      setup: { actions: [{ type: 'count', kind: 'seconds' }] },
    } as never)
    expect(corrida.machines).toMatchObject({ mode: 'seconds', fastX: 0, slowX: 0, fastFrames: 0 })
  })
})

describe('as duas ações novas só valem na cena delas', () => {
  test('`see-points` é da mesh, com um dos três degraus', () => {
    expect(isSceneAction({ type: 'see-points', level: 'metade' }, 'mesh')).toBe(true)
    expect(isSceneAction({ type: 'see-points', level: 'meio' }, 'mesh')).toBe(false)
    expect(isSceneAction({ type: 'see-points', level: 'tudo' }, 'camera-3d')).toBe(false)
  })

  test('`brain-scope` é da entity-state, com um booleano', () => {
    expect(isSceneAction({ type: 'brain-scope', shared: true }, 'entity-state')).toBe(true)
    expect(isSceneAction({ type: 'brain-scope', shared: 'sim' }, 'entity-state')).toBe(false)
    expect(isSceneAction({ type: 'brain-scope', shared: true }, 'pool')).toBe(false)
  })
})
