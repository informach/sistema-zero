import { describe, expect, test } from 'bun:test'
import { SCENE_IDS } from './actions'
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
  sceneEmitsSound,
  sceneFromTrial,
  sceneSegmentAnswers,
  sceneTrial,
  stepDemonstration,
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

  test('⚠️⚠️ "Ligar som" só onde há som: a régua bate com o que o MOTOR emite', () => {
    // O botão aparecia nas 45 cenas e só uma fazia som. A régua é de legalidade (a porta `sound`);
    // este teste é o que a amarra ao motor: tocando o roteiro do modelo, a porta ligada e saltos
    // pelos dois caminhos, cena que diz "não" nunca emite `sound`, e a que diz "sim" emite.
    let comSom = 0
    for (const scene of SCENE_IDS) {
      const start = { scene }
      let s = initialExperiment(start)
      let ouviu = false
      const tentar = (comando: unknown) => {
        if (!isExperimentCommand(comando, start)) return
        const passo = stepExperiment(start, s, comando)
        s = passo.session
        if (passo.events.some((e) => e.type === 'sound')) ouviu = true
      }
      tentar({ type: 'connect', port: 'sound', enabled: true })
      for (const input of ['key', 'tap', 'key', 'tap']) {
        tentar({ type: 'jump', input })
        tentar({ type: 'advance', seconds: 0.2 })
      }
      for (const passo of SCENE_MODELS[scene].script) for (const acao of passo.actions) tentar(acao)
      expect(ouviu, scene).toBe(sceneEmitsSound(scene))
      if (ouviu) comSom++
    }
    // Anti-vácuo: pelo menos uma cena faz som, senão o teste aprovaria a régua "nunca".
    expect(comSom).toBeGreaterThan(0)
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

  test('⚠️⚠️ a etapa com `waitFor` consome o `advance` INTEIRO, e não só a primeira fatia', () => {
    // O player toca o roteiro em fatias de ~0,05 s, e a etapa terminava na PRIMEIRA fatia em que
    // a descoberta acontecia: "avance 1 s" durava 0,05 s, o Dino da `velocity` andava 2,5 px e a
    // fala dizia "a cada quadro ele anda um pouco para a direita" sobre um movimento invisível.
    const velocity = { scene: 'velocity' } as const
    const roteiro = SCENE_MODELS.velocity.script
    let s = stepDemonstration(velocity, roteiro, initialDemonstration(velocity), {
      type: 'start',
    }).session
    let fatias = 0
    for (; fatias < 200 && !s.ready; fatias++)
      s = stepDemonstration(velocity, roteiro, s, { type: 'tick', seconds: 0.05 }).session
    expect(s.state.evidence.discoveries).toContain('moves')
    // ⚠️ Mudou de propósito (lote 4 do Raio-X): 1 s inteiro são 5 quadros de `x + 5`, de 60 para 85
    // (era `vx × 10 × segundos`, 110). O que o teste guarda é o segundo INTEIRO, e não 62,5.
    expect(s.state.drive.x).toBe(85)
    expect(s.state.drive.ticks).toBe(5)
    // O respiro da primeira ação (0,45 s) e o segundo inteiro de relógio.
    expect(fatias * 0.05).toBeGreaterThanOrEqual(1.45 - 1e-9)
  })

  test('⚠️⚠️ todo roteiro do catálogo, tocado em fatias como o player, cumpre cada `waitFor`', () => {
    // A outra metade da mudança acima: sem encerrar cedo, a etapa só termina com o tempo todo, e
    // a descoberta prometida precisa estar lá quando ela terminar, em qualquer tamanho de fatia
    // que o relógio do player produz. Foi esta varredura que achou a `circle-collision`: em
    // fatias de 0,04 s a soma parava em 60,0000001 contra 60, e a batida prometida não vinha.
    for (const fatia of [0.04, 0.05, 1 / 30, 0.1])
      for (const scene of SCENE_IDS) {
        const start = { scene }
        const roteiro = SCENE_MODELS[scene].script
        let s = stepDemonstration(start, roteiro, initialDemonstration(start), {
          type: 'start',
        }).session
        for (let i = 0; i < 4000 && !s.viewed; i++) {
          s = stepDemonstration(start, roteiro, s, { type: 'tick', seconds: fatia }).session
          if (!s.ready) continue
          const espera = roteiro[s.step]?.waitFor
          if (espera)
            expect(
              s.state.evidence.discoveries,
              `${scene}, etapa ${s.step + 1}, fatia ${fatia}`,
            ).toContain(espera)
          if (s.step < roteiro.length - 1)
            s = stepDemonstration(start, roteiro, s, { type: 'next' }).session
        }
        expect(s.viewed, `${scene}, fatia ${fatia}`).toBe(true)
      }
  })

  /**
   * O relógio DE VERDADE do player (`scene-activity.tsx`): quadros do `requestAnimationFrame`
   * acumulados até passar de 0,04 s, e aí um tique com o acumulado.
   *
   * ⚠️⚠️ As fatias fixas da varredura acima dividem o segundo EXATAMENTE (a sobra é 0 ou 1e-16), e
   * foi por isso que ela não pegou a `circle-collision`: com quadros de 60 Hz a soma fica ora um fio
   * acima, ora um fio abaixo do segundo, e a sobra abaixo de um milésimo era jogada fora (a batida
   * sumia em ~9 de cada 10 execuções). A tremida é determinística (semente), para o teste não piscar.
   */
  function relogioDoPlayer(semente: number, hz: number, velocidade = 1) {
    let a = semente >>> 0
    const aleatorio = () => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    let acumulado = 0
    return () => {
      for (;;) {
        const quadro = 1 / hz + (aleatorio() - 0.5) * 0.0006
        acumulado += Math.min(quadro, 0.1) * velocidade
        if (acumulado >= 0.04) {
          const tique = acumulado
          acumulado = 0
          return tique
        }
      }
    }
  }
  function tocarComRelogio(scene: (typeof SCENE_IDS)[number], proximoTique: () => number) {
    const start = { scene }
    const roteiro = SCENE_MODELS[scene].script
    const faltas: string[] = []
    let s = stepDemonstration(start, roteiro, initialDemonstration(start), {
      type: 'start',
    }).session
    for (let i = 0; i < 4000 && !s.viewed; i++) {
      s = stepDemonstration(start, roteiro, s, { type: 'tick', seconds: proximoTique() }).session
      if (!s.ready) continue
      const espera = roteiro[s.step]?.waitFor
      if (espera && !s.state.evidence.discoveries.includes(espera))
        faltas.push(`${scene} etapa ${s.step + 1}: ${espera}`)
      if (s.step < roteiro.length - 1)
        s = stepDemonstration(start, roteiro, s, { type: 'next' }).session
    }
    if (!s.viewed) faltas.push(`${scene}: não terminou`)
    return faltas
  }

  test('⚠️⚠️ com o relógio REAL do player (quadros com tremida), todo `waitFor` chega', () => {
    const faltas: string[] = []
    for (const [hz, velocidade] of [
      [60, 1],
      [120, 1],
      [144, 1],
      [60, 0.5],
    ] as const)
      for (const semente of [1, 7, 42])
        for (const scene of SCENE_IDS)
          faltas.push(...tocarComRelogio(scene, relogioDoPlayer(semente, hz, velocidade)))
    expect(faltas).toEqual([])
  })

  test('⚠️⚠️ `circle-collision`: a batida do roteiro vem em TODA execução, não em 1 de cada 10', () => {
    // O caso exato do review: 200 execuções a 60 Hz com 0,3 ms de tremida.
    let semBatida = 0
    for (let semente = 0; semente < 200; semente++)
      if (tocarComRelogio('circle-collision', relogioDoPlayer(semente, 60)).length) semBatida++
    expect(semBatida).toBe(0)
  })

  const replay = (scene: (typeof SCENE_IDS)[number], commands: unknown[]) =>
    applyDemonstrationSegment({ scene }, SCENE_MODELS[scene].script, null, {
      sessionId: 's',
      segmentId: 'g',
      baseSequence: 0,
      commands,
    }).session.viewed

  test('⚠️⚠️ o servidor rejoga os comandos do player e registra a demonstração assistida nas 45', () => {
    // O player e o servidor rodam o MESMO motor: os comandos que fecham a demonstração na tela dela
    // precisam fechá-la no rejogo, senão a criança assiste tudo e o bloco não conclui.
    for (const scene of SCENE_IDS) {
      const start = { scene }
      const roteiro = SCENE_MODELS[scene].script
      const comandos: unknown[] = [{ type: 'start' }]
      let s = stepDemonstration(start, roteiro, initialDemonstration(start), {
        type: 'start',
      }).session
      for (let i = 0; i < 4000 && !s.viewed; i++) {
        comandos.push({ type: 'tick', seconds: 0.05 })
        s = stepDemonstration(start, roteiro, s, { type: 'tick', seconds: 0.05 }).session
        if (s.ready && s.step < roteiro.length - 1) {
          comandos.push({ type: 'next' })
          s = stepDemonstration(start, roteiro, s, { type: 'next' }).session
        }
      }
      expect(s.viewed, scene).toBe(true)
      expect(replay(scene, comandos), scene).toBe(true)
    }
  })

  test('⚠️ o `next` no meio de uma etapa é ignorado: a etapa só termina com o `advance` inteiro', () => {
    const velocity = { scene: 'velocity' } as const
    const roteiro = SCENE_MODELS.velocity.script
    const s = stepDemonstration(velocity, roteiro, initialDemonstration(velocity), {
      type: 'start',
    }).session
    expect(stepDemonstration(velocity, roteiro, s, { type: 'next' }).session.step).toBe(0)
    // E o mesmo na etapa que espera uma descoberta: a `pool` fabrica um corpo por segundo, e o `next`
    // com o `advance` pela metade não adianta o mundo nem pula a etapa.
    const pool = { scene: 'pool' } as const
    const script = SCENE_MODELS.pool.script
    let p = stepDemonstration(pool, script, initialDemonstration(pool), { type: 'start' }).session
    for (let i = 0; i < 60 && p.action < script[0]!.actions.length - 1; i++)
      p = stepDemonstration(pool, script, p, { type: 'tick', seconds: 0.05 }).session
    p = stepDemonstration(pool, script, p, { type: 'tick', seconds: 0.05 }).session
    expect(p.state.nursery.created).toBeLessThan(3)
    const depois = stepDemonstration(pool, script, p, { type: 'next' }).session
    expect(depois.step).toBe(0)
    expect(depois.state).toEqual(p.state)
  })

  test('só aceita os três comandos dela, e o tique tem teto', () => {
    expect(isDemonstrationCommand({ type: 'start' })).toBe(true)
    expect(isDemonstrationCommand({ type: 'tick', seconds: 0.1 })).toBe(true)
    expect(isDemonstrationCommand({ type: 'tick', seconds: 5 })).toBe(false)
    // Ação de cena não entra numa demonstração: quem assiste não mexe.
    expect(isDemonstrationCommand({ type: 'create' })).toBe(false)
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

  test('a sessão de demonstração sobrevive à ida e volta', () => {
    let s = initialDemonstration(world)
    s = stepDemonstration(world, SCENE_MODELS.world.script, s, { type: 'start' }).session
    s = stepDemonstration(world, SCENE_MODELS.world.script, s, {
      type: 'tick',
      seconds: 0.5,
    }).session
    const volta = readDemonstrationSession('world', packDemonstration('world', s))
    expect(volta).not.toBeNull()
    expect(volta?.step).toBe(s.step)
    expect(volta?.before).toEqual(s.before)
  })

  test('⚠️ retrato de OUTRA cena é recusado, não relido como se fosse desta', () => {
    // O estado das 14 cenas tem a mesma FORMA, e várias compartilham ids de descoberta. Sem a
    // cena gravada junto, o registro do `spawn` passava como registro do `world` — e as cenas
    // que já começam com o mundo montado fariam a criança aparecer com uma descoberta que ela
    // nunca fez. Quem troca a cena de um bloco publicado cai exatamente nisso.
    let s = initialExperiment({ scene: 'spawn' })
    s = stepExperiment({ scene: 'spawn' }, s, {
      type: 'connect',
      port: 'timer',
      enabled: true,
    }).session
    const pacote = packExperiment('spawn', s)
    expect(readExperimentSession('spawn', pacote)).not.toBeNull()
    expect(readExperimentSession('world', pacote)).toBeNull()
    const demo = packDemonstration('world', initialDemonstration(world))
    expect(readDemonstrationSession('layers', demo)).toBeNull()
  })

  test('recusa pacote corrompido, estado inválido e passo fora do roteiro', () => {
    expect(readExperimentSession('world', 'nada')).toBeNull()
    expect(readExperimentSession('world', ['{isso não é json'])).toBeNull()
    expect(
      readExperimentSession('world', [JSON.stringify({ scene: 'world', state: { flight: 1 } })]),
    ).toBeNull()
    const bom = packDemonstration('world', initialDemonstration(world))
    const cru = JSON.parse(bom.join(''))
    expect(readDemonstrationSession('world', [JSON.stringify({ ...cru, step: 99 })])).toBeNull()
    expect(readDemonstrationSession('world', [JSON.stringify({ ...cru, ready: 'sim' })])).toBeNull()
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
