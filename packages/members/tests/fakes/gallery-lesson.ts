import { expect } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection } from '@sistemazero/core/learning'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * Uma aula Kids publicada com uma entrega pela galeria (Pinta: 2 a 3 desenhos; Estúdio: 1 projeto)
 * numa parte de entrega, seguida de uma parte de fecho com quiz. O dono é um perfil (conta +
 * perfil); `seed` guarda uma criação pela leitura antiga do índice de criações.
 */
export function galleryLesson(
  tool: 'studio' | 'pinta' = 'pinta',
  options: Parameters<typeof buildApp>[0] = {},
) {
  const env = buildApp(options),
    course = seedSampleCourse(env.courses, 'galeria', 'published', 'kids')
  const owner = { userId: randomUUID(), accountId: randomUUID(), privileged: false },
    sibling = randomUUID()
  grantLifetime(env.entitlements, { userId: owner.accountId, courseRef: course.slug })
  grantLifetime(env.entitlements, { userId: owner.accountId, courseRef: 'pinta' })
  const lessonId = course.lessonIds[0],
    blockId = randomUUID(),
    quizId = randomUUID(),
    sectionId = randomUUID(),
    closingId = randomUUID(),
    revision = 'a'.repeat(32)
  env.courses.blocks = env.courses.blocks.filter((b) => b.lessonId !== lessonId)
  env.courses.blocks.push(
    {
      id: blockId,
      lessonId,
      kind: tool,
      contentRevision: revision,
      sortOrder: 0,
      content:
        tool === 'pinta'
          ? { kind: 'pinta', initialAsset: null, gallery: { minItems: 2, maxItems: 3 } }
          : {
              kind: 'studio',
              initialProject: { formatVersion: 2 },
              gallery: { minItems: 1, maxItems: 1 },
            },
    },
    {
      id: quizId,
      lessonId,
      kind: 'quiz',
      contentRevision: revision,
      sortOrder: 1,
      content: {
        kind: 'quiz',
        passingScore: 70,
        questions: [
          {
            id: 'q',
            prompt: 'Fim?',
            choices: [
              { id: 'a', label: 'Sim' },
              { id: 'b', label: 'Não' },
            ],
            correctChoiceIds: ['a'],
          },
        ],
      },
    },
  )
  env.learningRepository.structures.set(lessonId, {
    revision: randomUUID(),
    sections: [
      {
        ...defaultLessonSection(sectionId, 'Minha entrega', [blockId]),
        intent: 'delivery',
        completion: { version: 1, blockIds: [blockId] },
      },
      {
        ...defaultLessonSection(closingId, 'Para fechar', [quizId]),
        intent: 'closing',
        completion: { version: 1, blockIds: [quizId] },
      },
    ],
  })
  const request = (
    path: string,
    body?: unknown,
    extra: Record<string, string> = {},
    userId = owner.userId,
  ) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'x-auth-user-id': userId,
          'x-auth-account-id': owner.accountId,
          'content-type': 'application/json',
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  async function seed(itemId: string, userId = owner.userId) {
    const created = await request(
      `/creations/pinta/${itemId}/upload`,
      { name: itemId, kind: 'pixel-sprite', itemUpdatedAt: new Date().toISOString(), bytes: 100 },
      {},
      userId,
    )
    expect(created.status).toBe(200)
    const reserved = (await created.json()) as { revision: number }
    expect(
      (
        await request(
          `/creations/pinta/${itemId}/commit`,
          { revision: reserved.revision },
          {},
          userId,
        )
      ).status,
    ).toBe(200)
    return { itemId, revision: reserved.revision }
  }
  const path = `/lessons/${lessonId}/blocks/${blockId}`
  return {
    ...env,
    owner,
    sibling,
    course,
    lessonId,
    blockId,
    quizId,
    sectionId,
    closingId,
    revision,
    request,
    seed,
    path,
  }
}
