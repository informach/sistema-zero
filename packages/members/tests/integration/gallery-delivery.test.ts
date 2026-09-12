import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  defaultLessonSection,
  type GalleryDeliveryPlan,
  type GallerySubmission,
} from '@sistemazero/core/learning'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

function setup(tool: 'studio' | 'pinta' = 'pinta') {
  const env = buildApp(),
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
          : { kind: 'studio', initialProject: {}, gallery: { minItems: 1, maxItems: 1 } },
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

describe('gallery submission as a section criterion', () => {
  test('selection does not complete; signed confirmation receives multiple immutable copies and unlocks only the quiz', async () => {
    const ctx = setup(),
      items = [await ctx.seed('dino'), await ctx.seed('cacto')]
    const input = { requestId: randomUUID(), revision: ctx.revision, items }
    const response = await ctx.request(`${ctx.path}/gallery-prepare`, input)
    expect(response.status).toBe(200)
    const plan = (await response.json()) as GalleryDeliveryPlan
    if (plan.completed) throw new Error('Unexpected completion')
    expect(plan.snapshot.items).toHaveLength(2)
    expect(
      plan.copies.every(
        (copy) =>
          copy.source !== copy.destination &&
          copy.destination.includes(`/lesson-submissions/${ctx.blockId}/${input.requestId}/`),
      ),
    ).toBe(true)
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toBeNull()
    const unsigned = await ctx.request(`/internal${ctx.path}/gallery-commit`, {
      actor: ctx.owner,
      input,
      projectForChecks: null,
    })
    expect(unsigned.status).toBe(401)
    const received = await ctx.request(
      `/internal${ctx.path}/gallery-commit`,
      { actor: ctx.owner, input, projectForChecks: null },
      { 'x-consumer-id': 'member-shell' },
    )
    expect(received.status).toBe(200)
    expect((await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId))?.project).toEqual(
      plan.snapshot,
    )
    const view = (await (
      await ctx.request(`/courses/${ctx.course.slug}/lessons/${ctx.lessonId}`)
    ).json()) as { sectionProgress: { sections: { status: string }[]; completed: number } }
    expect(view.sectionProgress.sections.map((s) => s.status)).toEqual(['completed', 'available'])
    expect(view.sectionProgress.completed).toBe(1)
    const retry = (await (
      await ctx.request(`${ctx.path}/gallery-prepare`, input)
    ).json()) as GalleryDeliveryPlan
    expect(retry.completed).toBe(true)
    const saved = await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)
    expect(saved?.previousSubmittedAt).toBeNull()
  })
  test('rejects a sibling, stale revision, duplicates, counts, forged raw submission and a changed request', async () => {
    const ctx = setup(),
      mine = await ctx.seed('meu'),
      other = await ctx.seed('irmao', ctx.sibling)
    const base = { requestId: randomUUID(), revision: ctx.revision, items: [mine, other] }
    expect((await ctx.request(`${ctx.path}/gallery-prepare`, base)).status).toBe(400)
    expect(
      (await ctx.request(`${ctx.path}/gallery-prepare`, { ...base, items: [mine, mine] })).status,
    ).toBe(400)
    expect(
      (await ctx.request(`${ctx.path}/gallery-prepare`, { ...base, items: [mine] })).status,
    ).toBe(400)
    expect(
      (await ctx.request(`${ctx.path}/gallery-prepare`, { ...base, revision: 'b'.repeat(32) }))
        .status,
    ).toBe(409)
    const second = await ctx.seed('outro'),
      input = { ...base, items: [mine, second] }
    const plan = (await (await ctx.request(`${ctx.path}/gallery-prepare`, input)).json()) as {
      snapshot: GallerySubmission
    }
    expect(
      (await ctx.request(`${ctx.path}/pinta-submission`, { asset: plan.snapshot })).status,
    ).not.toBe(200)
    expect(
      (
        await ctx.request(
          `/internal${ctx.path}/gallery-commit`,
          { actor: ctx.owner, input, projectForChecks: null },
          { 'x-consumer-id': 'member-shell' },
        )
      ).status,
    ).toBe(200)
    expect(
      (await ctx.request(`${ctx.path}/gallery-prepare`, { ...input, items: [second, mine] }))
        .status,
    ).toBe(409)
  })
})
