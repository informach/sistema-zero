import { describe, expect, test } from 'bun:test'
import { SCENE_IDS } from './actions'
import {
  applyExperimentSegment,
  initialExperiment,
  isExperimentCommand,
  packExperiment,
  readExperimentSession,
  readSceneSegment,
  SceneConflictError,
  sceneEmitsSound,
  sceneFromTrial,
  sceneSegmentAnswers,
  sceneTrial,
  stepExperiment,
} from './session'
import { initialScene, isSceneState } from './state'

const world = { scene: 'world' } as const
const layers = { scene: 'layers' } as const

describe('sessão de experimentação', () => {
  test('capturar guarda um retrato e para em dois', () => {
    let s = initialExperiment(world)
    for (let i = 0; i < 4; i++) s = stepExperiment(world, s, { type: 'capture' }).session
    expect(s.trials).toHaveLength(2)
    // O último capturado é o que fica.
    expect(s.trials[1]?.label).toContain('4')
  })

  test('desfazer volta o mundo mas guarda o que a criança descobriu', () => {
    let s = initialExperiment(world)
    s = stepExperiment(world, s, { type: 'create' }).session
    const descobertas = [...s.state.evidence.discoveries]
    expect(descobertas.length).toBeGreaterThan(0)
    s = stepExperiment(world, s, { type: 'undo' }).session
    expect(s.state.world.created).toBe(false)
    expect(s.state.evidence.discoveries).toEqual(descobertas)
  })

  test('deixar o tempo correr não vira passo de desfazer', () => {
    // A criança espera que "voltar" desfaça o que ELA montou, não que rebobine o relógio.
    let s = initialExperiment({ scene: 'gravity' })
    s = stepExperiment({ scene: 'gravity' }, s, { type: 'jump', input: 'key' }).session
    const passos = s.past.length
    s = stepExperiment({ scene: 'gravity' }, s, { type: 'advance', seconds: 0.5 }).session
    expect(s.past.length).toBe(passos)
  })

  test('a memória de desfazer é limitada pela população, não pela duração', () => {
    let s = initialExperiment({ scene: 'spawn' })
    for (let i = 0; i < 8; i++) {
      s = stepExperiment({ scene: 'spawn' }, s, {
        type: 'connect',
        port: 'timer',
        enabled: i % 2 === 0,
      }).session
      s = stepExperiment({ scene: 'spawn' }, s, { type: 'advance', seconds: 1 }).session
    }
    expect(s.past.length).toBeLessThanOrEqual(4)
  })

  test('evento de descoberta sai na experimentação', () => {
    const { events } = stepExperiment(world, initialExperiment(world), { type: 'create' })
    expect(events.some((e) => e.type === 'discovery')).toBe(true)
  })

  test('comando de outra cena é recusado', () => {
    expect(isExperimentCommand({ type: 'impulse', force: 9 }, world)).toBe(false)
    expect(isExperimentCommand({ type: 'capture' }, world)).toBe(true)
    expect(isExperimentCommand({ type: 'capture', extra: 1 }, world)).toBe(false)
  })

  test('o controle de som só aparece na cena cujo salto emite som', () => {
    expect(SCENE_IDS.filter(sceneEmitsSound)).toEqual(['jump-sound'])
    const start = { scene: 'jump-sound' } as const
    let session = initialExperiment(start)
    session = stepExperiment(start, session, {
      type: 'connect',
      port: 'sound',
      enabled: true,
    }).session
    const result = stepExperiment(start, session, { type: 'jump', input: 'key' })
    expect(result.events.some((event) => event.type === 'sound')).toBe(true)
  })
})

describe('o retrato guardado', () => {
  test('⚠️ o caminho de VOLTA devolve o que a criança guardou, não a cena inicial', () => {
    // O retrato é achatado (ele viaja) e o estado é agrupado. Espalhar um por cima do outro só
    // empilha chaves órfãs no topo, e o `tsc` não pega — foi assim que a comparação lado a lado
    // passou a mostrar a cena inicial: a criança guardava um salto de impulso 14 e via o de 9.
    const start = { scene: 'hitbox' } as const
    let s = initialExperiment(start)
    s = stepExperiment(start, s, { type: 'move', distance: 25 }).session
    s = stepExperiment(start, s, { type: 'resize', width: 100 }).session
    const retrato = sceneTrial(s.state, 'Guardado')
    // Agora a criança mexe de novo: o retrato NÃO pode acompanhar.
    const depois = stepExperiment(start, s, { type: 'move', distance: 200 }).session
    expect(depois.state.contact.distance).toBe(200)

    const volta = sceneFromTrial(start, retrato)
    expect(volta.contact).toEqual({ distance: 25, width: 100 })
    expect(volta.contact).not.toEqual(initialScene(start).contact)
  })

  test('o salto guardado volta com as condições DAQUELE voo', () => {
    const start = { scene: 'impulse', initialImpulse: 14 } as const
    let s = initialExperiment(start)
    s = stepExperiment(start, s, { type: 'jump', input: 'tap' }).session
    s = stepExperiment(start, s, { type: 'advance', seconds: 0.4 }).session
    const retrato = sceneTrial(s.state, 'Com 14')
    // A criança baixa o impulso DEPOIS de saltar: o retrato continua sendo o do salto de 14.
    const menor = stepExperiment(start, s, { type: 'impulse', force: 5 }).session
    expect(menor.state.flight.force).toBe(5)

    const volta = sceneFromTrial(start, retrato)
    expect(volta.flight.force).toBe(14)
    expect(volta.flight.atForce).toBe(14)
    expect(volta.flight.peak).toBeGreaterThan(0)
  })

  test('os 13 campos do retrato chegam TODOS ao grupo certo', () => {
    // Um campo no grupo errado desenha a cena de outra criança, e o tipo não acusa.
    const start = { scene: 'jump-sound' } as const
    let s = initialExperiment(start)
    s = stepExperiment(start, s, { type: 'connect', port: 'sound', enabled: true }).session
    s = stepExperiment(start, s, { type: 'jump', input: 'key' }).session
    const retrato = sceneTrial(s.state, 'x')
    const t = retrato.state
    const volta = sceneFromTrial(start, retrato)
    expect(volta.flight.force).toBe(t.force)
    expect(volta.flight.gravity).toBe(t.gravity)
    expect(volta.flight.peak).toBe(t.peak)
    expect(volta.flight.y).toBe(t.y)
    expect(volta.contact.distance).toBe(t.distance)
    expect(volta.contact.width).toBe(t.width)
    expect(volta.sound.count).toBe(t.soundCount)
    expect(volta.sound.jumps).toBe(t.jumpCount)
    expect(volta.sound.onJump).toBe(t.soundOnJump)
    expect(volta.match.screen).toBe(t.screen)
    expect(volta.match.points).toBe(t.points)
    expect(volta.crowd.born).toBe(t.born)
    expect(volta.crowd.removed).toBe(t.removed)
    // E o que volta continua sendo um estado que o validador aceita.
    expect(isSceneState(volta)).toBe(true)
  })
})

describe('o que vai e volta do servidor', () => {
  test('a sessão de experimentação sobrevive à ida e volta', () => {
    let s = initialExperiment({ scene: 'spawn' })
    s = stepExperiment({ scene: 'spawn' }, s, {
      type: 'connect',
      port: 'timer',
      enabled: true,
    }).session
    // ⚠️ Mudou de propósito (review do lote 4): a criança manda no máximo 1 s por comando.
    s = stepExperiment({ scene: 'spawn' }, s, { type: 'advance', seconds: 1 }).session
    s = stepExperiment({ scene: 'spawn' }, s, { type: 'advance', seconds: 1 }).session
    s = stepExperiment({ scene: 'spawn' }, s, { type: 'capture' }).session
    const volta = readExperimentSession('spawn', packExperiment('spawn', s))
    expect(volta).not.toBeNull()
    expect(volta?.state.crowd.born).toBe(s.state.crowd.born)
    expect(volta?.state.crowd.cacti).toEqual(s.state.crowd.cacti)
    expect(volta?.trials).toEqual(s.trials)
  })

  test('o segmento do cliente tem forma e teto', () => {
    // ⚠️ O segmento chega ACHATADO, com os comandos em JSON. Não é estilo: `LearningAnswers`
    // só admite valores rasos, então um segmento aninhado seria recusado na borda.
    const bom = sceneSegmentAnswers({
      sessionId: 'a1',
      segmentId: 'b2',
      baseSequence: 0,
      commands: [{ type: 'create' }],
    })
    expect(readSceneSegment(bom)).not.toBeNull()
    expect(readSceneSegment({ ...bom, sceneBaseSequence: -1 })).toBeNull()
    expect(readSceneSegment({ ...bom, sceneCommands: [] })).toBeNull()
    expect(readSceneSegment({ ...bom, sceneSessionId: 'com espaço' })).toBeNull()
    expect(readSceneSegment({ ...bom, sceneCommands: ['{quebrado'] })).toBeNull()
    expect(
      readSceneSegment({ ...bom, sceneCommands: Array.from({ length: 101 }, () => '{}') }),
    ).toBeNull()
  })

  test('as respostas do segmento são RASAS: só o que a borda do members admite', () => {
    const answers = sceneSegmentAnswers({
      sessionId: 'a1',
      segmentId: 'b2',
      baseSequence: 0,
      commands: [{ type: 'advance', seconds: 0.2 }],
    })
    expect(Object.keys(answers).sort()).toEqual([
      'sceneBaseSequence',
      'sceneCommands',
      'sceneSegmentId',
      'sceneSessionId',
    ])
    expect(Object.keys(readSceneSegment(answers) ?? {})).toEqual([
      'sessionId',
      'segmentId',
      'baseSequence',
      'commands',
    ])
  })

  test('⚠️ escrever sobre uma base que já mudou é recusado, não sobrescrito', () => {
    // Duas abas abertas, ou um pedido fora de ordem. Aplicar por cima perderia o que a
    // outra ponta fez — por isso o conflito é um erro, e não um "vence o último".
    const primeiro = applyExperimentSegment(world, null, {
      sessionId: 'a',
      segmentId: 'um',
      baseSequence: 0,
      commands: [{ type: 'create' }],
    })
    expect(primeiro.sequence).toBe(1)
    expect(() =>
      applyExperimentSegment(world, primeiro, {
        sessionId: 'a',
        segmentId: 'dois',
        baseSequence: 0,
        commands: [{ type: 'create' }],
      }),
    ).toThrow(SceneConflictError)
  })

  test('comando inválido dentro do segmento derruba o segmento inteiro', () => {
    expect(() =>
      applyExperimentSegment(layers, null, {
        sessionId: 'a',
        segmentId: 'um',
        commands: [
          { type: 'layer', front: true },
          { type: 'impulse', force: 9 },
        ],
        baseSequence: 0,
      }),
    ).toThrow()
  })
})
