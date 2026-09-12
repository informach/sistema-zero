import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { defaultLessonSection, type InteractiveBlock } from '@sistemazero/core/learning'
import { createLessonAsset, pintaAssetToWire } from '@sistemazero/pinta/assets'
import {
  changeDraft,
  draftRequest,
  publishBlock,
  publishDraft,
  readDraft,
} from '../draft-authoring-helpers'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const OTHER = '22222222-2222-2222-2222-222222222222'
const REVISION = '12345678901234567890123456789012'
const content: InteractiveBlock = {
  kind: 'interactive',
  title: 'O que vem primeiro?',
  instructions: 'Ordene a preparação e o desenho.',
  hints: ['Prepare antes de desenhar.'],
  required: true,
  activity: {
    type: 'sequence',
    mode: 'order',
    items: [
      { id: 'draw', label: 'Desenhar' },
      { id: 'prepare', label: 'Preparar' },
    ],
    solution: ['prepare', 'draw'],
    targets: [],
  },
}
function setup() {
  const env = buildApp()
  const course = seedSampleCourse(env.courses)
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  const lessonId = course.lessonIds[0]
  const blockId = randomUUID()
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'interactive',
    content,
    sortOrder: 15,
    contentRevision: REVISION,
  })
  const request = (path: string, method = 'GET', body?: unknown, user = USER, admin = false) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          'x-auth-user-id': user,
          ...(admin ? { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const attempt = (order: string[], id = randomUUID(), revision = REVISION) =>
    request(`/lessons/${lessonId}/blocks/${blockId}/learning-attempts`, 'POST', {
      id,
      revision,
      answers: { order },
      hintsUsed: 0,
    })
  const read = () => request(`/courses/${course.slug}/lessons/${lessonId}`)
  return { ...env, ...course, lessonId, blockId, request, attempt, read }
}

describe('learning activities and sections', () => {
  test('repeating a help request keeps one message and preserves its lesson context', async () => {
    const ctx = setup()
    const section = defaultLessonSection(
      randomUUID(),
      'Minha dúvida',
      ctx.courses.blocks.filter((b) => b.lessonId === ctx.lessonId).map((b) => b.id),
    )
    ctx.learningRepository.structures.set(ctx.lessonId, {
      revision: randomUUID(),
      sections: [section],
    })
    const body = { requestId: randomUUID(), sectionId: section.id, body: 'Não entendi.' }
    const first = await ctx.request(`/lessons/${ctx.lessonId}/section-help`, 'POST', body)
    expect(first.status).toBe(200)
    expect((await ctx.request(`/lessons/${ctx.lessonId}/section-help`, 'POST', body)).status).toBe(
      200,
    )
    expect(ctx.teacherThreadsRepo.messages).toHaveLength(1)
    expect(ctx.teacherThreadsRepo.messages[0]?.helpContext).toMatchObject({
      courseSlug: ctx.slug,
      sectionId: section.id,
      sectionTitle: section.title,
    })
    expect(
      (
        await ctx.request(`/lessons/${ctx.lessonId}/section-help`, 'POST', {
          ...body,
          body: 'Outro texto',
        })
      ).status,
    ).toBe(400)
    expect(ctx.teacherThreadsRepo.messages).toHaveLength(1)
  })
  for (const kind of ['studio', 'pinta'] as const) {
    test(`${kind} experiment authoring survives the HTTP schema and never requires submission`, async () => {
      const ctx = setup()
      const experiment =
        kind === 'studio'
          ? {
              kind,
              purpose: 'experiment',
              initialProject: { name: 'Exploração', files: { 'index.html': '' } },
            }
          : {
              kind,
              purpose: 'experiment',
              initialAsset: pintaAssetToWire(createLessonAsset('pixel-sprite', 32, 'Experimento')),
            }
      const id = randomUUID()
      const created = await publishBlock(ctx.app, ctx.lessonId, { content: experiment }, {}, id)
      expect(created.status).toBe(200)
      expect(
        (await readDraft(ctx.app, ctx.lessonId)).document.blocks.find((b) => b.id === id)?.content
          .purpose,
      ).toBe('experiment')
      expect(
        (
          await publishBlock(ctx.app, ctx.lessonId, {
            content: { ...experiment, chain: 'principal' },
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await publishBlock(ctx.app, ctx.lessonId, {
            content: { ...experiment, purpose: 'unknown' },
          })
        ).status,
      ).toBe(400)
      // The unchanged discovery keeps its revision when another block is published.
      const learningBlock = ctx.courses.blocks.find((b) => b.id === ctx.blockId)
      if (!learningBlock) throw new Error('Missing activity')
      expect(learningBlock.contentRevision).toBe(REVISION)
      await ctx.attempt(['prepare', 'draw'])
      expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(200)
    })
  }
  test('removed authoring endpoints cannot bypass the shared draft', async () => {
    const ctx = setup()
    for (const [path, method, body] of [
      [
        `/admin/lessons/${ctx.lessonId}`,
        'PATCH',
        { title: 'Bypass', slug: 'aula', isPublished: true },
      ],
      [
        `/admin/lessons/${ctx.lessonId}/blocks`,
        'POST',
        { content: { kind: 'rich_text', markdown: 'Bypass' } },
      ],
      [`/admin/blocks/${ctx.blockId}`, 'DELETE', undefined],
      [`/admin/lessons/${ctx.lessonId}/structure`, 'PUT', { sections: [] }],
    ] as const)
      expect((await ctx.request(path, method, body, USER, true)).status).toBe(404)
    const read = await (await ctx.read()).json()
    expect(JSON.stringify(read)).not.toContain('objective')
    expect(JSON.stringify(read)).not.toContain('intent')
  })
  test('answer keys are private, grading gates completion, retries are idempotent', async () => {
    const ctx = setup()
    const raw = await (await ctx.read()).text()
    expect(raw).not.toContain('solution')
    expect(raw).toContain('sections')
    expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(409)
    const wrong = await ctx.attempt(['draw', 'prepare'])
    expect(wrong.status).toBe(200)
    expect(await wrong.json()).toMatchObject({
      progress: { result: { passed: false }, attemptsCount: 1 },
    })
    const id = randomUUID()
    expect(await (await ctx.attempt(['prepare', 'draw'], id)).json()).toMatchObject({
      progress: { result: { passed: true }, attemptsCount: 2 },
    })
    expect(await (await ctx.attempt(['draw', 'prepare'], id)).json()).toMatchObject({
      progress: { result: { passed: true }, attemptsCount: 2 },
    })
    expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(200)
    const block = ctx.courses.blocks.find((b) => b.id === ctx.blockId)
    if (!block) throw new Error('Missing fixture')
    block.contentRevision = 'changed'
    // An already completed lesson never becomes incomplete after an author edit.
    expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(200)
  })

  test('draft state cannot forge a pass, revisions conflict, and access is checked', async () => {
    const ctx = setup()
    const path = `/lessons/${ctx.lessonId}/blocks/${ctx.blockId}/learning-progress`
    const body = {
      revision: REVISION,
      answers: { order: ['prepare', 'draw'], passed: true },
      hintsUsed: 1,
      positionSeconds: null,
    }
    expect((await ctx.request(path, 'PUT', body)).status).toBe(200)
    expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(409)
    expect((await ctx.attempt(['prepare', 'draw'], randomUUID(), 'obsolete')).status).toBe(409)
    expect((await ctx.request(path, 'PUT', body, OTHER)).status).toBe(403)
    expect((await ctx.request(path, 'PUT', { ...body, hintsUsed: 2 })).status).toBe(400)
    expect(
      (
        await ctx.request(
          `/admin/lessons/${ctx.lessonId}/learning-report?userId=${USER}&accountId=${USER}`,
        )
      ).status,
    ).toBe(401)
  })

  test('section authoring preserves IDs, checks coverage, and detects a stale edit', async () => {
    const ctx = setup()
    const blockIds = ctx.courses.blocks.filter((b) => b.lessonId === ctx.lessonId).map((b) => b.id)
    const section = defaultLessonSection(ctx.lessonId, 'Descubra a ordem', blockIds)
    const draft = await readDraft(ctx.app, ctx.lessonId)
    const change = { type: 'structure' as const, sections: [section], supportBlockIds: [] }
    const saved = await changeDraft(ctx.app, ctx.lessonId, change)
    expect(saved.status).toBe(200)
    expect((await readDraft(ctx.app, ctx.lessonId)).document.sections[0]).toMatchObject({
      id: ctx.lessonId,
      blockIds,
    })
    expect(
      (
        await draftRequest(ctx.app, ctx.lessonId, '', 'PATCH', {
          expectedRevision: draft.revision,
          operationId: randomUUID(),
          change,
        })
      ).status,
    ).toBe(409)
    expect((await publishDraft(ctx.app, ctx.lessonId)).status).toBe(200)
    expect(
      (await ctx.request(`/lessons/${ctx.lessonId}/navigation`, 'PUT', { sectionId: section.id }))
        .status,
    ).toBe(200)
    expect(await (await ctx.read()).json()).toMatchObject({
      learningProgress: { sectionId: section.id },
    })
  })

  test('help is anchored to a real accessible section and reaches the existing inbox', async () => {
    const ctx = setup()
    const response = await ctx.request(`/lessons/${ctx.lessonId}/section-help`, 'POST', {
      sectionId: ctx.lessonId,
      body: 'Não entendi a ordem.',
    })
    expect(response.status).toBe(200)
    const payload: unknown = await response.json()
    expect(payload).toMatchObject({ threadId: expect.any(String) })
    expect(
      (
        await ctx.request(`/lessons/${ctx.lessonId}/section-help`, 'POST', {
          sectionId: randomUUID(),
          body: 'Oi',
        })
      ).status,
    ).toBe(404)
  })

  test('essential HTML must have a native server checkpoint and iframe claims do not pass it', async () => {
    const ctx = setup()
    const html: InteractiveBlock = {
      ...content,
      activity: { type: 'html', html: '<button>Experimentar</button>' },
      checkpoint: {
        prompt: 'O que a gravidade muda?',
        choices: [
          { id: 'velocity', label: 'Velocidade' },
          { id: 'color', label: 'Cor' },
        ],
        correctChoiceId: 'velocity',
        explanation: 'A gravidade altera a velocidade a cada passo.',
      },
    }
    const block = ctx.courses.blocks.find((b) => b.id === ctx.blockId)
    if (!block) throw new Error('Missing fixture')
    block.content = html
    const raw = await (await ctx.read()).text()
    expect(raw).not.toContain('correctChoiceId')
    expect(raw).not.toContain(html.checkpoint?.explanation ?? 'missing')
    const res = await ctx.request(
      `/lessons/${ctx.lessonId}/blocks/${ctx.blockId}/learning-attempts`,
      'POST',
      {
        id: randomUUID(),
        revision: REVISION,
        answers: { participated: true, passed: true, checkpoint: 'color' },
        hintsUsed: 0,
      },
    )
    expect(await res.json()).toMatchObject({
      progress: { result: { passed: false, verifiedBy: 'server' } },
    })
  })
})
