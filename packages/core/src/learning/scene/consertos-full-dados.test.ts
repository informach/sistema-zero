import { describe, expect, test } from 'bun:test'
import {
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  isPublicInteractiveBlock,
  publicInteractiveBlock,
} from '../index'
import { SCENE_MODELS, type SceneStep, sceneDefaultGoalIds } from './catalog'
import {
  type DemonstrationActivity,
  type ExperimentationActivity,
  sceneActivityForReading,
  sceneSetupGoals,
  sceneTargets,
  sceneUnknownSetupGoals,
} from './index'
import { SCENE_QUESTIONS } from './questions'
import {
  applyDemonstrationSegment,
  initialDemonstration,
  initialExperiment,
  packExperiment,
  stepDemonstration,
  stepExperiment,
} from './session'
import type { SceneStart } from './state'

/**
 * Os consertos do full review final de DADOS e DEPLOY (16/09/2026), no lado do core.
 * Relatório: `community-kids/tmp/storyboard/implementacao/consertos-full-dados.md`.
 */

describe('MÉDIO-2: a tolerância da demonstração tem custo limitado por requisição', () => {
  const pool = { scene: 'pool' } as const
  /** Um roteiro de UMA etapa: a etapa 1 do modelo da `pool`, que espera `grows` no fim do `advance`. */
  const umaEtapa: readonly SceneStep[] = [SCENE_MODELS.pool.script[0] as SceneStep]

  /** A sessão no meio da última ação (um `advance`), com a descoberta ainda por vir no servidor. */
  function noMeioDaEspera() {
    let s = stepDemonstration(pool, umaEtapa, initialDemonstration(pool), { type: 'start' }).session
    const acoes = umaEtapa[0]?.actions.length ?? 0
    for (let i = 0; i < 60 && s.action < acoes - 1; i++)
      s = stepDemonstration(pool, umaEtapa, s, { type: 'tick', seconds: 0.05 }).session
    // Uma fatia DENTRO do `advance` (sem ela a tolerância nem olha: a ação ainda não começou).
    s = stepDemonstration(pool, umaEtapa, s, { type: 'tick', seconds: 0.05 }).session
    expect(s.elapsed).toBeGreaterThan(0)
    expect(s.state.nursery.created).toBeLessThan(3)
    return s
  }

  test('⚠️⚠️ o `next` repetido na ÚLTIMA etapa não toca nada, nem uma vez nem cem', () => {
    const s = noMeioDaEspera()
    const segmento = (comandos: unknown[]) =>
      applyDemonstrationSegment(
        pool,
        umaEtapa,
        { sequence: 1, sessionId: 's', segmentId: 'a', session: s },
        { sessionId: 's', segmentId: 'b', baseSequence: 1, commands: comandos },
        { tolerarPlayerAnterior: true },
      ).session
    const comUm = segmento([{ type: 'next' }])
    const comCem = segmento(Array.from({ length: 100 }, () => ({ type: 'next' })))
    // Antes, a cópia com o resto do `advance` virava o estado (`created` 3) e a etapa seguia sem terminar:
    // o tique seguinte tocava o resto de novo por cima do mundo já adiantado.
    expect(comUm.state).toEqual(s.state)
    expect(comCem.state).toEqual(s.state)
    expect(comCem.step).toBe(0)
    expect(comCem.viewed).toBe(false)
  })

  test('⚠️⚠️ a espera IMPOSSÍVEL é tocada uma vez por segmento, e não uma vez por comando', () => {
    // Um roteiro gravado cuja espera não acontece mais (a meta saiu, ou a regra mudou): 10 s de relógio
    // da `spawn`, o teto autorável, na última etapa. Cada tique tolerante tocava os 10 s de novo.
    const spawn: readonly SceneStep[] = [
      {
        id: 'espera',
        caption: 'Espere.',
        actions: [{ type: 'advance', seconds: 10 }],
        waitFor: 'meta-que-nunca-cai',
      },
    ]
    /**
     * Quanto trabalho de motor o segmento pediu, contado pelas leituras do `start` (cada entrada no
     * motor lê a cena), sem depender do relógio da máquina.
     */
    function leituras(comandos: number, tolerarPlayerAnterior: boolean) {
      let n = 0
      const start = new Proxy({ scene: 'spawn' } as SceneStart, {
        get(alvo, chave, receptor) {
          n += 1
          return Reflect.get(alvo, chave, receptor)
        },
      })
      const inicio = stepDemonstration(start, spawn, initialDemonstration(start), {
        type: 'start',
      }).session
      n = 0
      const fim = applyDemonstrationSegment(
        start,
        spawn,
        { sequence: 1, sessionId: 's', segmentId: 'a', session: inicio },
        {
          sessionId: 's',
          segmentId: 'b',
          baseSequence: 1,
          commands: Array.from({ length: comandos }, () => ({ type: 'tick', seconds: 0.001 })),
        },
        { tolerarPlayerAnterior },
      ).session
      expect(fim.viewed).toBe(false)
      return n
    }
    // O que UM resto de espera custa a mais: um tique tolerante menos o mesmo tique estrito.
    const umResto = leituras(1, true) - leituras(1, false)
    expect(umResto).toBeGreaterThan(0)
    // Cem tiques tolerantes custam os cem tiques estritos mais UM resto, e não cem restos.
    expect(leituras(100, true)).toBe(leituras(100, false) + umResto)
  })

  test('e o player anterior continua registrando (o mesmo segmento, com e sem o limite)', () => {
    // A etapa pronta na primeira fatia, como o player de antes do lote 4 mandava.
    const s = noMeioDaEspera()
    const depois = applyDemonstrationSegment(
      pool,
      umaEtapa,
      { sequence: 1, sessionId: 's', segmentId: 'a', session: s },
      {
        sessionId: 's',
        segmentId: 'b',
        baseSequence: 1,
        commands: [
          { type: 'tick', seconds: 0.05 },
          { type: 'tick', seconds: 0.05 },
        ],
      },
      { tolerarPlayerAnterior: true },
    ).session
    expect(depois.viewed).toBe(true)
  })
})

describe('MÉDIO-3: a meta que saiu do catálogo não esconde o bloco nem trava a seção', () => {
  const coordenadas = (goals: string[]): InteractiveBlock => ({
    kind: 'interactive',
    title: 'Endereço',
    instructions: 'Aumente só o y.',
    hints: [],
    required: true,
    activity: { type: 'experimentation', scene: 'coordinates', setup: { goals } },
  })

  test('a sucessora entra no lugar, e a meta sem par sai', () => {
    expect(sceneSetupGoals('coordinates', ['same-x', 'down'])).toEqual(['down'])
    expect(sceneSetupGoals('hitbox', ['separate'])).toEqual([])
    expect(sceneSetupGoals('sheet-vs-sprite', ['cut', 'two-cells', 'size-apart'])).toEqual([
      'crop-whole',
      'size-apart',
    ])
    // A sucessora que já estava na lista não entra duas vezes.
    expect(sceneSetupGoals('sheet-vs-sprite', ['crop-whole', 'cut'])).toEqual(['crop-whole'])
    // ⚠️ Nome do protótipo, id de outra cena e lixo: fora, sem lançar.
    expect(sceneSetupGoals('coordinates', ['constructor', 'crop-whole', 7, null])).toEqual([])
    expect(sceneSetupGoals('coordinates', 'down')).toEqual([])
  })

  test('⚠️⚠️ só metas que saíram: a missão volta a ser a do modelo, e não uma missão VAZIA', () => {
    const atividade = coordenadas(['same-x']).activity as ExperimentationActivity
    expect(sceneTargets(atividade)).toEqual(sceneDefaultGoalIds('coordinates'))
    expect(
      sceneTargets(coordenadas(['same-x', 'down']).activity as ExperimentationActivity),
    ).toEqual(['down'])
  })

  test('⚠️⚠️ a AUTORIA segue recusando; a LEITURA aceita, pelos dois lados do deploy', () => {
    const bloco = coordenadas(['same-x', 'down'])
    expect(isInteractiveBlock(bloco)).toBe(false)
    // O members novo manda a projeção limpa.
    const publico = publicInteractiveBlock(bloco)
    expect(publico.activity).toEqual({
      type: 'experimentation',
      scene: 'coordinates',
      setup: { goals: ['down'] },
    })
    expect(isPublicInteractiveBlock(publico)).toBe(true)
    // E o navegador aceita a projeção CRUA (members atrás, ou uma meta que ele ainda não conhece).
    const cru = { ...publico, activity: bloco.activity }
    expect(isPublicInteractiveBlock(cru)).toBe(true)
    // Só metas que saíram: o caso inteiro sai da projeção.
    expect(publicInteractiveBlock(coordenadas(['same-x'])).activity).toEqual({
      type: 'experimentation',
      scene: 'coordinates',
    })
  })

  test('⚠️⚠️ e a seção fecha: só com metas que saíram, vale a missão do modelo', () => {
    // Antes, a missão filtrada ficava VAZIA e reprovava para sempre: obrigatória, a seção travava.
    const bloco = coordenadas(['same-x'])
    const start: SceneStart = { scene: 'coordinates', setup: { goals: ['same-x'] } }
    let s = initialExperiment(start)
    const { x, y } = s.state.place
    for (const [px, py] of [
      [x + 20, y],
      [x + 20, y + 20],
      [0, y + 20],
      [0, 0],
    ] as const)
      s = stepExperiment(start, s, { type: 'place', x: px, y: py }).session
    const resultado = evaluateLearning(bloco, {
      sceneSequence: 1,
      sceneSessionId: 's',
      sceneSegmentId: 'g',
      sceneCheckpoint: packExperiment('coordinates', s),
      checkpoint: SCENE_QUESTIONS.coordinates.explain.correctChoiceId,
    })
    expect(resultado.passed).toBe(true)
  })

  test('o `waitFor` que cita meta que saiu é tirado na leitura, e o resto do roteiro fica', () => {
    const roteiro = SCENE_MODELS['sheet-vs-sprite'].script.map((passo, i) =>
      i === 0 ? { ...passo, waitFor: 'cut' } : passo,
    )
    const bloco: InteractiveBlock = {
      kind: 'interactive',
      title: 'Folha',
      instructions: 'Olhe.',
      hints: [],
      required: true,
      activity: { type: 'demonstration', scene: 'sheet-vs-sprite', script: roteiro },
    }
    expect(isInteractiveBlock(bloco)).toBe(false)
    const lido = sceneActivityForReading(bloco.activity) as DemonstrationActivity
    expect(lido.script?.[0]?.waitFor).toBeUndefined()
    expect(lido.script?.[0]?.actions).toEqual(roteiro[0]?.actions)
    expect(lido.script?.slice(1)).toEqual(roteiro.slice(1))
    expect(isPublicInteractiveBlock(publicInteractiveBlock(bloco))).toBe(true)
  })

  test('o que NÃO é meta desconhecida continua recusado na leitura', () => {
    // Uma ação que deixou de ser legal no caso (o `advance` saiu da `random`) não é tolerada aqui:
    // ela é da varredura do banco e do editor.
    const aleatorio: InteractiveBlock = {
      kind: 'interactive',
      title: 'Sorteio',
      instructions: 'Sorteie.',
      hints: [],
      required: false,
      activity: {
        type: 'experimentation',
        scene: 'random',
        setup: { actions: [{ type: 'advance', seconds: 1 }] },
      },
    }
    expect(isPublicInteractiveBlock(publicInteractiveBlock(aleatorio))).toBe(false)
  })

  test('o aviso do admin diz qual meta saiu e qual entra no lugar', () => {
    expect(sceneUnknownSetupGoals('sheet-vs-sprite', ['cut', 'two-cells', 'size-apart'])).toEqual([
      { id: 'cut', successor: 'crop-whole' },
      { id: 'two-cells', successor: null },
    ])
    expect(sceneUnknownSetupGoals('coordinates', ['down'])).toEqual([])
    // Meta que nunca existiu (não é uma que saiu) também aparece, sem sucessora.
    expect(sceneUnknownSetupGoals('coordinates', ['inventada'])).toEqual([
      { id: 'inventada', successor: null },
    ])
  })
})
