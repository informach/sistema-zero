import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import {
  initialExperiment,
  packExperiment,
  readExperimentSession,
  type SceneActivity,
  sceneSegmentAnswers,
  stepExperiment,
} from '@sistemazero/core/learning/scene'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * ⚠️⚠️ Sessão guardada que NÃO hidrata não pode virar 409 eterno (ALTO A1 e A2 do
 * `fr2-dados.md`, 17/09/2026).
 *
 * A linha no banco pode trazer um retrato que o motor de hoje não lê (truncado, adulterado, ou
 * gravado numa forma que saiu). Antes, `saved && !guardado` era `LearningConflictError`: 409 em
 * TODA gravação daquele bloco, para sempre — recarregar não adiantava, porque a linha continuava
 * lá, e reimportar o manifesto não muda a revisão de um bloco igual. A criança ficava com o bloco
 * trancado sem caminho de volta.
 *
 * A régua nova: retrato ilegível vale como sessão INEXISTENTE (a cena recomeça limpa, como o
 * player, que lê o checkpoint com a MESMA função), e o conflito de VERDADE — sessão válida de
 * outra aba, base fora de ordem — continua 409.
 */

const USER = '22222222-2222-2222-2222-222222222222'
const REVISION = '12345678901234567890123456789012'
const CENA = { type: 'experimentation', scene: 'coordinates' } as const satisfies SceneActivity

function preparar() {
  const env = buildApp()
  const course = seedSampleCourse(env.courses)
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  const lessonId = course.lessonIds[0] as string
  const blockId = randomUUID()
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'interactive',
    content: {
      kind: 'interactive',
      title: 'A cena',
      instructions: 'Aumente só o y.',
      hints: [],
      required: true,
      activity: CENA,
    } as InteractiveBlock,
    sortOrder: 15,
    contentRevision: REVISION,
  })
  const gravar = (commands: unknown[], baseSequence = 0) =>
    env.app.handle(
      new Request(
        `http://localhost/members/lessons/${lessonId}/blocks/${blockId}/learning-progress`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json', 'x-auth-user-id': USER },
          body: JSON.stringify({
            revision: REVISION,
            hintsUsed: 0,
            positionSeconds: null,
            answers: sceneSegmentAnswers({
              sessionId: 'sessao-nova',
              segmentId: `segmento-${randomUUID()}`,
              baseSequence,
              commands,
            }),
          }),
        },
      ),
    )
  /** Planta no banco a linha que a criança já tem, com o checkpoint que ESTE teste quiser. */
  const plantar = (sceneCheckpoint: string[], sceneSequence: number) => {
    env.learningRepository.progresses.set(`${USER}:${USER}:${blockId}`, {
      blockId,
      lessonId,
      revision: REVISION,
      positionSeconds: null,
      answers: {
        sceneSequence,
        sceneSessionId: 'sessao-de-antes',
        sceneSegmentId: 'segmento-de-antes',
        sceneCheckpoint,
        segmentHash: 'hash-de-antes',
      },
      hintsUsed: 0,
      attemptsCount: 0,
      result: null,
      updatedAt: new Date('2026-09-16T23:42:43.000Z').toISOString(),
    })
  }
  const linha = () => env.learningRepository.progresses.get(`${USER}:${USER}:${blockId}`)
  return { gravar, plantar, linha }
}

/** Uma sessão de verdade, gravada pelo motor de hoje: é dela que os retratos abaixo saem. */
function sessaoDeHoje(passos: number) {
  let s = initialExperiment(CENA)
  for (let i = 0; i < passos; i++)
    s = stepExperiment(CENA, s, { type: 'place', x: 20 * (i + 1), y: 30 }).session
  return s
}

/**
 * O MESMO retrato, com um campo derrubado DENTRO de um grupo. É a forma exata das sessões reais
 * que a staging guardou antes da limpeza: `speed.spots`, `flight.base`, `sound.beats`,
 * `crowd.untimedBorn` e `match.tries` nasceram depois, e sem eles `isSceneState` recusa o retrato
 * inteiro. Medido nas três sessões gravadas de verdade que o revisor recuperou
 * (`git show 42d296d7:packages/core/tests/fixtures/retratos-lote4.json`): `hitbox`,
 * `acceleration` e a demonstração da `lives` voltam `null` com o código de hoje.
 */
function retratoIlegivel(passos: number) {
  const partes = packExperiment(CENA.scene, sessaoDeHoje(passos))
  const cru = JSON.parse(partes.join('')) as { state: { speed: Record<string, unknown> } }
  delete cru.state.speed.spots
  return [JSON.stringify(cru)]
}

describe('A1/A2: a linha guardada que não hidrata deixa de trancar o bloco', () => {
  test('⚠️⚠️ o retrato ilegível não é lido pelo motor de hoje (a premissa do conserto)', () => {
    expect(readExperimentSession(CENA.scene, retratoIlegivel(3))).toBeNull()
    expect(
      readExperimentSession(CENA.scene, packExperiment(CENA.scene, sessaoDeHoje(3))),
    ).not.toBeNull()
  })

  test('⚠️⚠️ a cena recomeça limpa e a gravação nova substitui a linha, em vez de 409 eterno', async () => {
    const { gravar, plantar, linha } = preparar()
    plantar(retratoIlegivel(3), 3)
    // Antes do conserto: 409 aqui, e em toda gravação seguinte, para sempre.
    const primeira = await gravar([{ type: 'place', x: 0, y: 150 }])
    expect(primeira.status).toBe(200)
    const depois = linha()
    expect(depois?.answers.sceneSequence).toBe(1)
    expect(depois?.answers.sceneSessionId).toBe('sessao-nova')
    // E o que ficou gravado é legível: a linha ilegível saiu de vez.
    expect(readExperimentSession(CENA.scene, depois?.answers.sceneCheckpoint)).not.toBeNull()
  })

  test('⚠️ e a segunda gravação continua andando: nada ficou preso', async () => {
    const { gravar, plantar, linha } = preparar()
    plantar(retratoIlegivel(3), 3)
    expect((await gravar([{ type: 'place', x: 0, y: 150 }])).status).toBe(200)
    expect((await gravar([{ type: 'place', x: 0, y: 0 }], 1)).status).toBe(200)
    expect(linha()?.answers.sceneSequence).toBe(2)
  })

  test('⚠️⚠️ o conflito de VERDADE continua 409: sessão VÁLIDA de outra aba não é atropelada', async () => {
    const { gravar, plantar, linha } = preparar()
    const valida = packExperiment(CENA.scene, sessaoDeHoje(3))
    plantar(valida, 3)
    // A outra aba está em 3; esta acha que está em 0. Perder o trabalho dela seria pior.
    const recusada = await gravar([{ type: 'place', x: 0, y: 150 }])
    expect(recusada.status).toBe(409)
    expect(linha()?.answers.sceneSequence).toBe(3)
    // Com a base certa, a gravação entra.
    expect((await gravar([{ type: 'place', x: 0, y: 150 }], 3)).status).toBe(200)
  })

  test('⚠️ a criança sem nada guardado segue igual (o caso de sempre)', async () => {
    const { gravar, linha } = preparar()
    expect((await gravar([{ type: 'place', x: 0, y: 150 }])).status).toBe(200)
    expect(linha()?.answers.sceneSequence).toBe(1)
  })
})
