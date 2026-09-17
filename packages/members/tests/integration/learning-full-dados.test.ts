import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import {
  SCENE_QUESTIONS,
  type SceneActivity,
  sceneSegmentAnswers,
} from '@sistemazero/core/learning/scene'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * Os consertos do full review final de DADOS e DEPLOY (16/09/2026), no lado do members.
 * Relatório: `community-kids/tmp/storyboard/implementacao/consertos-full-dados.md`.
 */

const USER = '11111111-1111-1111-1111-111111111111'
const REVISION = '12345678901234567890123456789012'

/** ⚠️ O bloco entra DIRETO no repositório, sem a autoria: é o bloco que o banco já guarda. */
function preparar(activity: SceneActivity) {
  const env = buildApp()
  const course = seedSampleCourse(env.courses)
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  const lessonId = course.lessonIds[0] as string
  const blockId = randomUUID()
  const content = {
    kind: 'interactive',
    title: 'A cena',
    instructions: 'Aumente só o y.',
    hints: [],
    required: true,
    activity,
  } as InteractiveBlock
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'interactive',
    content,
    sortOrder: 15,
    contentRevision: REVISION,
  })
  const pedir = (path: string, method = 'GET', body?: unknown) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-auth-user-id': USER },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const gravar = (commands: unknown[]) => {
    const answers = sceneSegmentAnswers({
      sessionId: 'sessao-full',
      segmentId: `segmento-${randomUUID()}`,
      baseSequence: 0,
      commands,
    })
    return pedir(`/lessons/${lessonId}/blocks/${blockId}/learning-progress`, 'PUT', {
      revision: REVISION,
      hintsUsed: 0,
      positionSeconds: null,
      answers,
    })
  }
  const tentar = (answers: unknown) =>
    pedir(`/lessons/${lessonId}/blocks/${blockId}/learning-attempts`, 'POST', {
      id: randomUUID(),
      revision: REVISION,
      hintsUsed: 0,
      answers,
    })
  const ler = () => pedir(`/courses/${course.slug}/lessons/${lessonId}`)
  return { gravar, tentar, ler, blockId }
}

describe('BAIXO-1: o comando que não é legal nesta cena é 400 (pedido mal formado)', () => {
  test('⚠️ o ▶ na `random` é recusado: lá o tempo mora no gesto "Passar 5 segundos"', async () => {
    const recusado = await preparar({ type: 'experimentation', scene: 'random' }).gravar([
      { type: 'advance', seconds: 0.05 },
    ])
    expect(recusado.status).toBe(400)
    const legal = await preparar({ type: 'experimentation', scene: 'coordinates' }).gravar([
      { type: 'place', x: 0, y: 150 },
    ])
    expect(legal.status).toBe(200)
  })
})

describe('MÉDIO-3: o bloco do banco citando uma meta que a cena não tem', () => {
  const comMetaQueSaiu: SceneActivity = {
    type: 'experimentation',
    scene: 'coordinates',
    setup: { goals: ['same-x', 'down'] },
  }

  test('⚠️⚠️ a aula chega ao aluno com a atividade LIMPA, e não some', async () => {
    const { ler, blockId } = preparar(comMetaQueSaiu)
    const resposta = await ler()
    expect(resposta.status).toBe(200)
    const corpo = (await resposta.json()) as {
      blocks: Array<{ id: string; content: { activity: unknown } }>
    }
    const bloco = corpo.blocks.find((b) => b.id === blockId)
    expect(bloco?.content.activity).toEqual({
      type: 'experimentation',
      scene: 'coordinates',
      setup: { goals: ['down'] },
    })
  })

  test('⚠️⚠️ e a seção fecha: só com id que a cena não tem, vale a missão do modelo (e não uma VAZIA)', async () => {
    // Antes, a missão filtrada ficava vazia e "Missão VAZIA reprova": obrigatória, a seção nunca fechava.
    const { gravar, tentar } = preparar({
      type: 'experimentation',
      scene: 'coordinates',
      setup: { goals: ['same-x'] },
    })
    // As três metas do modelo, pelos pedidos: aumentar só o x, só o y, e chegar ao 0, 0.
    const gravado = await gravar([
      { type: 'place', x: 130, y: 150 },
      { type: 'place', x: 130, y: 170 },
      { type: 'place', x: 0, y: 170 },
      { type: 'place', x: 0, y: 0 },
    ])
    expect(gravado.status).toBe(200)
    const progresso = (await gravado.json()) as { answers: Record<string, unknown> }
    const resposta = await tentar({
      ...progresso.answers,
      checkpoint: SCENE_QUESTIONS.coordinates.explain.correctChoiceId,
    })
    expect(resposta.status).toBe(200)
    const corpo = (await resposta.json()) as { attempt: { result: { passed: boolean } } }
    expect(corpo.attempt.result.passed).toBe(true)
  })
})
