import { describe, expect, test } from 'bun:test'
import { SCENE_MODELS } from './catalog'
import {
  applyDemonstrationSegment,
  applyExperimentSegment,
  initialDemonstration,
  initialExperiment,
  isDemonstrationCommand,
  isExperimentCommand,
  packDemonstration,
  packExperiment,
  readDemonstrationSession,
  readExperimentSession,
  readSceneSegment,
  SceneConflictError,
  sceneSegmentAnswers,
  stepDemonstration,
  stepExperiment,
} from './session'

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
})

describe('sessão de demonstração', () => {
  const script = SCENE_MODELS.world.script

  test('toca o roteiro até o fim e só então marca como assistida', () => {
    let s = initialDemonstration(world)
    s = stepDemonstration(world, script, s, { type: 'start' }).session
    for (let i = 0; i < 400 && !s.viewed; i++) {
      s = stepDemonstration(world, script, s, { type: 'tick', seconds: 0.1 }).session
      if (s.ready && s.step < script.length - 1)
        s = stepDemonstration(world, script, s, { type: 'next' }).session
    }
    expect(s.viewed).toBe(true)
    expect(s.step).toBe(script.length - 1)
  })

  test('o passo espera a criança pedir o próximo', () => {
    let s = initialDemonstration(world)
    s = stepDemonstration(world, script, s, { type: 'start' }).session
    for (let i = 0; i < 40 && !s.ready; i++)
      s = stepDemonstration(world, script, s, { type: 'tick', seconds: 0.1 }).session
    expect(s.ready).toBe(true)
    expect(s.step).toBe(0)
    // Sem o pedido, o roteiro não anda sozinho.
    s = stepDemonstration(world, script, s, { type: 'tick', seconds: 0.1 }).session
    expect(s.step).toBe(0)
  })

  test('⚠️ descoberta feita durante a demonstração NÃO é creditada à criança', () => {
    // Quem conduziu foi o roteiro. Creditar aqui tiraria o sentido da experimentação que
    // vem depois — a criança "já teria descoberto" sem ter feito nada.
    let s = initialDemonstration(world)
    s = stepDemonstration(world, script, s, { type: 'start' }).session
    let houveDescoberta = false
    for (let i = 0; i < 200 && !s.viewed; i++) {
      const passo = stepDemonstration(world, script, s, { type: 'tick', seconds: 0.1 })
      if (passo.events.some((e) => e.type === 'discovery')) houveDescoberta = true
      s = passo.session
      if (s.ready && s.step < script.length - 1)
        s = stepDemonstration(world, script, s, { type: 'next' }).session
    }
    expect(houveDescoberta).toBe(false)
    // O mundo mudou de verdade, mas o evento não foi emitido.
    expect(s.state.evidence.discoveries.length).toBeGreaterThan(0)
  })

  test('só aceita os três comandos dela, e o tique tem teto', () => {
    expect(isDemonstrationCommand({ type: 'start' })).toBe(true)
    expect(isDemonstrationCommand({ type: 'tick', seconds: 0.1 })).toBe(true)
    expect(isDemonstrationCommand({ type: 'tick', seconds: 5 })).toBe(false)
    // Ação de cena não entra numa demonstração: quem assiste não mexe.
    expect(isDemonstrationCommand({ type: 'create' })).toBe(false)
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
    s = stepExperiment({ scene: 'spawn' }, s, { type: 'advance', seconds: 2 }).session
    s = stepExperiment({ scene: 'spawn' }, s, { type: 'capture' }).session
    const volta = readExperimentSession(packExperiment(s))
    expect(volta).not.toBeNull()
    expect(volta?.state.crowd.born).toBe(s.state.crowd.born)
    expect(volta?.state.crowd.cacti).toEqual(s.state.crowd.cacti)
    expect(volta?.trials).toEqual(s.trials)
  })

  test('a sessão de demonstração sobrevive à ida e volta', () => {
    let s = initialDemonstration(world)
    s = stepDemonstration(world, SCENE_MODELS.world.script, s, { type: 'start' }).session
    s = stepDemonstration(world, SCENE_MODELS.world.script, s, {
      type: 'tick',
      seconds: 0.5,
    }).session
    const volta = readDemonstrationSession(packDemonstration(s))
    expect(volta).not.toBeNull()
    expect(volta?.step).toBe(s.step)
    expect(volta?.before).toEqual(s.before)
  })

  test('recusa pacote corrompido, estado inválido e passo fora do roteiro', () => {
    expect(readExperimentSession('nada')).toBeNull()
    expect(readExperimentSession(['{isso não é json'])).toBeNull()
    expect(readExperimentSession([JSON.stringify({ state: { flight: 1 } })])).toBeNull()
    const bom = packDemonstration(initialDemonstration(world))
    const cru = JSON.parse(bom.join(''))
    expect(readDemonstrationSession([JSON.stringify({ ...cru, step: 99 })])).toBeNull()
    expect(readDemonstrationSession([JSON.stringify({ ...cru, ready: 'sim' })])).toBeNull()
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

  test('aplicar um segmento avança a versão pelo número de comandos', () => {
    const c = applyDemonstrationSegment(world, SCENE_MODELS.world.script, null, {
      sessionId: 'a',
      segmentId: 'um',
      baseSequence: 0,
      commands: [{ type: 'start' }, { type: 'tick', seconds: 0.5 }],
    })
    expect(c.sequence).toBe(2)
    expect(c.session.step).toBe(0)
  })

  test('⚠️ o servidor reaplica o roteiro AUTORADO, não o do modelo', () => {
    // Com um roteiro autoral de 1 passo e o do modelo com 2, usar o do modelo marcaria
    // "assistido" no passo errado: a criança concluiria sem ter visto, ou nunca concluiria.
    const autoral = [
      {
        id: 'unico',
        caption: 'Só isto acontece.',
        actions: [{ type: 'create' as const }],
      },
    ]
    const c = applyDemonstrationSegment(world, autoral, null, {
      sessionId: 'a',
      segmentId: 'um',
      baseSequence: 0,
      commands: [{ type: 'start' }, { type: 'tick', seconds: 0.5 }],
    })
    // Um passo só: terminar esse passo termina a demonstração inteira.
    expect(c.session.viewed).toBe(true)
    expect(SCENE_MODELS.world.script.length).toBeGreaterThan(autoral.length)
  })

  test('⚠️ rever uma demonstração já concluída não a desconclui', () => {
    const script = SCENE_MODELS.world.script
    let s = stepDemonstration(world, script, initialDemonstration(world), { type: 'start' }).session
    for (let i = 0; i < 400 && !s.viewed; i++) {
      s = stepDemonstration(world, script, s, { type: 'tick', seconds: 0.1 }).session
      if (s.ready && s.step < script.length - 1)
        s = stepDemonstration(world, script, s, { type: 'next' }).session
    }
    expect(s.viewed).toBe(true)
    // A criança clica em "assistir de novo": o bloco continua concluído.
    const revendo = stepDemonstration(world, script, s, { type: 'start' }).session
    expect(revendo.viewed).toBe(true)
    expect(revendo.step).toBe(0)
    expect(revendo.state.evidence.discoveries).toEqual([])
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
