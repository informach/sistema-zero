import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
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
  test('voz para texto: o recado FALADO atravessa preparo e confirmação assinada; sem o campo, digitado', async () => {
    const ctx = setup(),
      items = [await ctx.seed('dino'), await ctx.seed('cacto')]
    const deliver = async (input: Record<string, unknown>) => {
      const prepared = await ctx.request(`${ctx.path}/gallery-prepare`, input)
      expect(prepared.status).toBe(200)
      const committed = await ctx.request(
        `/internal${ctx.path}/gallery-commit`,
        { actor: ctx.owner, input, projectForChecks: null },
        { 'x-consumer-id': 'member-shell' },
      )
      expect(committed.status).toBe(200)
    }
    const base = { revision: ctx.revision, items }

    await deliver({
      ...base,
      requestId: randomUUID(),
      message: 'Escolhi os mais coloridos',
      messageSpoken: true,
    })
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toMatchObject({
      message: 'Escolhi os mais coloridos',
      messageSpoken: true,
    })

    await deliver({ ...base, requestId: randomUUID(), message: 'Troquei a ordem' })
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toMatchObject({
      message: 'Troquei a ordem',
      messageSpoken: false,
    })
    expect(ctx.teacherThreadsRepo.messages.map((m) => [m.body, m.spoken])).toEqual([
      ['Escolhi os mais coloridos', true],
      ['Troquei a ordem', false],
    ])
  })
  test('recado acima de 1000 caracteres: 400 no preparo e no commit, sem entrega e sem turno espelhado', async () => {
    const ctx = setup(),
      items = [await ctx.seed('dino'), await ctx.seed('cacto')]
    const commit = (input: Record<string, unknown>) =>
      ctx.request(
        `/internal${ctx.path}/gallery-commit`,
        { actor: ctx.owner, input, projectForChecks: null },
        { 'x-consumer-id': 'member-shell' },
      )
    // A coluna é varchar(1000): antes a galeria aceitava 2000 e o upsert estourava 500 DEPOIS
    // de o recado já ter virado turno na conversa com o professor.
    const tooLong = {
      requestId: randomUUID(),
      revision: ctx.revision,
      items,
      message: 'a'.repeat(1001),
      messageSpoken: true,
    }
    const prepared = await ctx.request(`${ctx.path}/gallery-prepare`, tooLong)
    expect(prepared.status).toBe(400)
    const committed = await commit(tooLong)
    expect(committed.status).toBe(400)
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toBeNull()
    expect(ctx.teacherThreadsRepo.messages).toEqual([])

    // No limite exato a entrega passa e o recado chega inteiro.
    const atLimit = { ...tooLong, requestId: randomUUID(), message: 'b'.repeat(1000) }
    expect((await ctx.request(`${ctx.path}/gallery-prepare`, atLimit)).status).toBe(200)
    expect((await commit(atLimit)).status).toBe(200)
    expect(
      (await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId))?.message,
    ).toHaveLength(1000)
    expect(ctx.teacherThreadsRepo.messages.map((m) => m.body.length)).toEqual([1000])
  })
  test('o serviço de entrega recusa recado acima do teto antes de espelhar o turno', async () => {
    const ctx = setup()
    // Rede para quem chamar o serviço sem passar por uma borda HTTP validada.
    await expect(
      ctx.submitStudio.execute(
        ctx.owner.userId,
        ctx.lessonId,
        ctx.blockId,
        {},
        {
          message: `  ${'c'.repeat(1001)}  `,
          accountId: ctx.owner.accountId,
          kind: 'pinta',
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(ctx.teacherThreadsRepo.messages).toEqual([])
    expect(await ctx.studioSubmissions.getOne(ctx.owner.userId, ctx.blockId)).toBeNull()
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
