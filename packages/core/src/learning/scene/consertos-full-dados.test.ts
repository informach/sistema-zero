import { describe, expect, test } from 'bun:test'
import {
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  isPublicInteractiveBlock,
  publicInteractiveBlock,
} from '../index'
import { SCENE_MODELS, sceneDefaultGoalIds } from './catalog'
import {
  type DemonstrationActivity,
  type ExperimentationActivity,
  sceneActivityForReading,
  sceneSetupGoals,
  sceneTargets,
  sceneUnknownSetupGoals,
} from './index'
import { SCENE_QUESTIONS } from './questions'
import { initialExperiment, packExperiment, stepExperiment } from './session'
import type { SceneStart } from './state'

/**
 * Os consertos do full review final de DADOS e DEPLOY (16/09/2026), no lado do core.
 * Relatório: `community-kids/tmp/storyboard/implementacao/consertos-full-dados.md`.
 */

describe('MÉDIO-3: a meta que a cena não tem não esconde o bloco nem trava a seção', () => {
  const coordenadas = (goals: string[]): InteractiveBlock => ({
    kind: 'interactive',
    title: 'Endereço',
    instructions: 'Aumente só o y.',
    hints: [],
    required: true,
    activity: { type: 'experimentation', scene: 'coordinates', setup: { goals } },
  })

  test('o id que a cena não tem fica fora, e o que ela tem fica na ordem do professor', () => {
    expect(sceneSetupGoals('coordinates', ['same-x', 'down'])).toEqual(['down'])
    expect(sceneSetupGoals('hitbox', ['separate'])).toEqual([])
    expect(sceneSetupGoals('sheet-vs-sprite', ['cut', 'two-cells', 'size-apart'])).toEqual([
      'size-apart',
    ])
    // O mesmo id repetido não entra duas vezes.
    expect(sceneSetupGoals('sheet-vs-sprite', ['crop-whole', 'crop-whole'])).toEqual(['crop-whole'])
    // ⚠️ Nome do protótipo, id de outra cena e lixo: fora, sem lançar.
    expect(sceneSetupGoals('coordinates', ['constructor', 'crop-whole', 7, null])).toEqual([])
    expect(sceneSetupGoals('coordinates', 'down')).toEqual([])
  })

  test('⚠️⚠️ só ids que a cena não tem: a missão volta a ser a do modelo, e não uma missão VAZIA', () => {
    const atividade = coordenadas(['same-x']).activity as ExperimentationActivity
    expect(sceneTargets(atividade)).toEqual(sceneDefaultGoalIds('coordinates'))
    expect(
      sceneTargets(coordenadas(['same-x', 'down']).activity as ExperimentationActivity),
    ).toEqual(['down'])
  })

  test('⚠️⚠️ a AUTORIA segue recusando; a LEITURA aceita e a criança não perde a aula', () => {
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
    // E o navegador aceita a projeção CRUA (uma meta que ele ainda não conhece, com o members à frente).
    const cru = { ...publico, activity: bloco.activity }
    expect(isPublicInteractiveBlock(cru)).toBe(true)
    // Só ids que a cena não tem: o caso inteiro sai da projeção.
    expect(publicInteractiveBlock(coordenadas(['same-x'])).activity).toEqual({
      type: 'experimentation',
      scene: 'coordinates',
    })
  })

  test('⚠️⚠️ e a seção fecha: só com id que a cena não tem, vale a missão do modelo', () => {
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

  test('o `waitFor` que cita meta inexistente é tirado na leitura, e o resto do roteiro fica', () => {
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

  test('o aviso do admin NOMEIA cada objetivo que a cena não tem', () => {
    expect(sceneUnknownSetupGoals('sheet-vs-sprite', ['cut', 'two-cells', 'size-apart'])).toEqual([
      'cut',
      'two-cells',
    ])
    expect(sceneUnknownSetupGoals('coordinates', ['down'])).toEqual([])
    expect(sceneUnknownSetupGoals('coordinates', ['inventada'])).toEqual(['inventada'])
  })
})
