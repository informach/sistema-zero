import { describe, expect, test } from 'bun:test'
import { blockCheckpoint, evaluateLearning, type InteractiveBlock } from '../index'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation, sceneGoals } from './evaluate'
import {
  type ExperimentationActivity,
  isExperimentationActivity,
  isSceneSetup,
  sceneStart,
  sceneTargets,
} from './index'
import { initialExperiment, packExperiment, stepExperiment } from './session'

/**
 * O CASO da atividade: de onde a cena parte e o que ela cobra.
 *
 * É a peça que faz um modelo render mais de um uso — a mesma mecânica servindo dois exercícios,
 * que é como o Brilliant tira 39 lições de três mecânicas. Aqui ela é testada pelos dois lados:
 * o estado de partida muda de verdade, e a evidência NÃO vem junto.
 */

const bloco = (activity: ExperimentationActivity): InteractiveBlock => ({
  kind: 'interactive',
  title: 'Caso',
  instructions: 'Mexa.',
  hints: [],
  required: true,
  activity,
})

describe('o caso da atividade', () => {
  test('as ações do caso mudam o estado de partida', () => {
    const start = sceneStart({
      type: 'experimentation',
      scene: 'stage-size',
      setup: { actions: [{ type: 'stage', width: 480, height: 270 }] },
    })
    expect(openScene(start).stage.width).toBe(480)
    expect(openScene({ scene: 'stage-size' }).stage.width).toBe(800)
  })

  test('⚠️⚠️ o caso NÃO traz descoberta junto: a criança ainda tem tudo por fazer', () => {
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'stage-size',
      // Chegar em 480 por 270 É uma das metas da cena. Se a evidência do caso contasse, a
      // atividade abriria com ela fechada e passaria antes do primeiro gesto.
      setup: { actions: [{ type: 'stage', width: 480, height: 270 }] },
    }
    const estado = openScene(sceneStart(activity))
    expect(estado.evidence.discoveries).toEqual([])
    expect(estado.evidence.actions).toBe(0)
    expect(estado.caption).toBe('')
    expect(evaluateLearning(bloco(activity), {}).passed).toBe(false)
  })

  test('recomeçar volta ao caso, não ao mundo de fábrica', () => {
    const start = sceneStart({
      type: 'experimentation',
      scene: 'stage-size',
      setup: { actions: [{ type: 'stage', width: 480, height: 270 }] },
    })
    const mexido = stepScene(start, openScene(start), { type: 'stage', width: 800, height: 480 })
    const recomecado = stepScene(start, mexido, { type: 'reset' })
    expect(recomecado.stage.width).toBe(480)
    // E recomeçar nunca apaga o que já foi descoberto.
    expect(recomecado.evidence.discoveries).toEqual(mexido.evidence.discoveries)
  })

  test('a missão cobra só as metas escolhidas', () => {
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'draw-loop',
      setup: { goals: ['trail'] },
    }
    expect(sceneTargets(activity)).toEqual(['trail'])
    const start = sceneStart(activity)
    let estado = openScene(start)
    for (const acao of [
      { type: 'loop', on: true },
      { type: 'advance', seconds: 1 },
      { type: 'advance', seconds: 1 },
    ] as const)
      estado = stepScene(start, estado, acao)
    // Sem limpar, fica rastro: a meta desta missão fecha, e as outras duas não são cobradas.
    expect(estado.evidence.discoveries).toContain('trail')
    expect(sceneGoals('draw-loop', estado, undefined, sceneTargets(activity))).toHaveLength(1)
    expect(
      evaluateExperimentation('draw-loop', estado, true, undefined, sceneTargets(activity)).passed,
    ).toBe(true)
    // A mesma cena sem missão continua cobrando as três.
    expect(evaluateExperimentation('draw-loop', estado).passed).toBe(false)
  })

  test('a missão em `layers` não trava quem deixou a montagem no outro arranjo', () => {
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'layers',
      setup: { goals: ['covered'] },
    }
    const start = sceneStart(activity)
    const estado = stepScene(start, openScene(start), { type: 'layer', front: false })
    expect(
      evaluateExperimentation('layers', estado, true, undefined, sceneTargets(activity)).passed,
    ).toBe(true)
  })

  test('a sessão guardada reabre no caso, e o servidor avalia pela missão', () => {
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'draw-loop',
      setup: { actions: [{ type: 'loop', on: true }], goals: ['trail'] },
    }
    const start = sceneStart(activity)
    let sessao = initialExperiment(start)
    expect(sessao.state.render.loop).toBe(true)
    for (let i = 0; i < 2; i++)
      sessao = stepExperiment(start, sessao, { type: 'advance', seconds: 1 }).session
    // ⚠️ A experimentação herda a pergunta do modelo da cena (o terceiro tempo do ciclo), e ela
    // dá a palavra final: a missão fecha a DESCOBERTA, e enunciar a regra fecha o bloco.
    const b = bloco(activity)
    const guardado = { sceneCheckpoint: packExperiment('draw-loop', sessao) }
    expect(evaluateLearning(b, guardado).passed).toBe(false)
    const pergunta = blockCheckpoint(b)
    if (!pergunta) throw new Error('a experimentação tem de herdar a pergunta do modelo')
    expect(evaluateLearning(b, { ...guardado, checkpoint: pergunta.correctChoiceId }).passed).toBe(
      true,
    )
  })

  test('⚠️ o caso recusa o que não é desta cena, o `reset` e a meta que não existe', () => {
    expect(
      isSceneSetup({ actions: [{ type: 'stage', width: 480, height: 270 }] }, 'stage-size'),
    ).toBe(true)
    // Ação de outra cena.
    expect(isSceneSetup({ actions: [{ type: 'stage', width: 480, height: 270 }] }, 'layers')).toBe(
      false,
    )
    // `reset` volta para o próprio caso: dentro dele seria um laço.
    expect(isSceneSetup({ actions: [{ type: 'reset' }] }, 'layers')).toBe(false)
    expect(isSceneSetup({ actions: [{ type: 'hint', level: 1 }] }, 'layers')).toBe(false)
    // Meta que não existe no modelo é uma atividade que nunca fecha.
    expect(isSceneSetup({ goals: ['inventada'] }, 'layers')).toBe(false)
    expect(isSceneSetup({ goals: ['front'] }, 'layers')).toBe(true)
    // Caso vazio não é caso.
    expect(isSceneSetup({}, 'layers')).toBe(false)
    expect(isSceneSetup({ actions: [] }, 'layers')).toBe(false)
    // E a atividade inteira recusa junto.
    expect(
      isExperimentationActivity({
        type: 'experimentation',
        scene: 'layers',
        setup: { goals: ['inventada'] },
      }),
    ).toBe(false)
  })

  test('⚠️ a demonstração não aceita missão: lá meta nenhuma é cobrada', () => {
    expect(isSceneSetup({ goals: ['front'] }, 'layers', { goals: false })).toBe(false)
    expect(
      isSceneSetup({ actions: [{ type: 'layer', front: true }] }, 'layers', { goals: false }),
    ).toBe(true)
  })
})
