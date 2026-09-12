import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  defaultLessonSection,
  type InteractiveBlock,
  type SectionProgressView,
} from '@sistemazero/core/learning'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

type Payload = {
  blocks: { id: string }[]
  sectionProgress: SectionProgressView
  learningProgress: { sectionId: string | null }
  passed: boolean
}
const json = async (response: Promise<Response>): Promise<Payload> =>
  (await response).json() as Promise<Payload>

const USER = '11111111-1111-1111-1111-111111111111'
const REVISION = '12345678901234567890123456789012'
function setup() {
  const env = buildApp()
  const course = seedSampleCourse(env.courses)
  const lessonId = course.lessonIds[0]
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  env.courses.blocks = env.courses.blocks.filter((b) => b.lessonId !== lessonId)
  const ids = [randomUUID(), randomUUID(), randomUUID()]
  const sections = ids.map((id, index) => ({
    ...defaultLessonSection(randomUUID(), `Etapa ${index + 1}`, [id]),
    completion: { version: 1 as const, blockIds: [id] },
  }))
  const content: InteractiveBlock = {
    kind: 'interactive',
    title: 'Confira',
    instructions: 'Prepare antes de desenhar.',
    required: false,
    hints: ['Leia a explicação.'],
    activity: { type: 'checkpoint' },
    checkpoint: {
      prompt: 'O que vem antes?',
      choices: [
        { id: 'prepare', label: 'Preparar' },
        { id: 'draw', label: 'Desenhar' },
      ],
      correctChoiceId: 'prepare',
      explanation: 'Prepare primeiro.',
    },
  }
  for (const [index, id] of ids.entries())
    env.courses.blocks.push({
      id,
      lessonId,
      content,
      kind: 'interactive',
      sortOrder: index,
      contentRevision: REVISION,
    })
  const structureRevision = randomUUID()
  env.learningRepository.structures.set(lessonId, { revision: structureRevision, sections })
  const request = (path: string, method = 'GET', body?: unknown, user = USER) =>
    env.app.handle(
      new Request(`http://localhost/members${path}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-auth-user-id': user },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    )
  const read = () => request(`/courses/${course.slug}/lessons/${lessonId}`)
  const attempt = (index: number, answer = 'prepare', id = randomUUID()) =>
    request(`/lessons/${lessonId}/blocks/${ids[index]}/learning-attempts`, 'POST', {
      id,
      revision: REVISION,
      answers: { checkpoint: answer },
      hintsUsed: 0,
    })
  return { ...env, course, lessonId, ids, sections, structureRevision, request, read, attempt }
}

describe('section gates across HTTP and persistence', () => {
  test('a selected formative quiz allows an immediate retry and reports the same state on reload', async () => {
    const ctx = setup(),
      quizId = randomUUID()
    const section = ctx.sections[0]
    if (!section) throw new Error('Missing section')
    ctx.courses.blocks.push({
      id: quizId,
      lessonId: ctx.lessonId,
      kind: 'quiz',
      sortOrder: 4,
      contentRevision: REVISION,
      content: {
        kind: 'quiz',
        passingScore: 100,
        questions: [
          {
            id: 'q',
            prompt: 'Qual?',
            choices: [
              { id: 'yes', label: 'Sim' },
              { id: 'no', label: 'Não' },
            ],
            correctChoiceIds: ['yes'],
          },
        ],
      },
    })
    section.blockIds.push(quizId)
    section.completion.blockIds = [quizId]
    const attempt = (answer: string) =>
      ctx.request(`/lessons/${ctx.lessonId}/blocks/${quizId}/quiz-attempts`, 'POST', {
        answers: { q: [answer] },
      })
    const wrong = await attempt('no')
    expect(wrong.status).toBe(200)
    expect(await wrong.json()).toMatchObject({ passed: false, retryAvailableAt: null })
    const state = (await (await ctx.read()).json()) as {
      blocks: { id: string; quizState?: { retryAvailableAt: string | null } }[]
    }
    expect(state.blocks.find((b) => b.id === quizId)?.quizState?.retryAvailableAt).toBeNull()
    expect((await attempt('yes')).status).toBe(200)
    expect((await json(ctx.read())).sectionProgress.completed).toBe(1)
  })
  test.each([
    'quiz',
    'interactive',
  ] as const)('unselected %s blocks do not add hidden section requirements', async (kind) => {
    const ctx = setup()
    const blockId = randomUUID()
    const firstBlock = ctx.courses.blocks.find((b) => b.id === ctx.ids[0])
    const firstSection = ctx.sections[0]
    if (firstBlock?.content.kind !== 'interactive' || !firstSection)
      throw new Error('Missing fixture')
    const content =
      kind === 'quiz'
        ? {
            kind: 'quiz' as const,
            passingScore: 100,
            questions: [
              {
                id: 'q',
                prompt: 'Qual?',
                choices: [
                  { id: 'yes', label: 'Sim' },
                  { id: 'no', label: 'Não' },
                ],
                correctChoiceIds: ['yes'],
              },
            ],
          }
        : { ...firstBlock.content, required: true }
    ctx.courses.blocks.push({
      id: blockId,
      lessonId: ctx.lessonId,
      kind,
      sortOrder: 9,
      contentRevision: REVISION,
      content,
    })
    firstSection.blockIds.push(blockId)
    const view = await json(ctx.attempt(0))
    expect(view.sectionProgress.completed).toBe(1)
    expect(view.sectionProgress.sections[1]?.status).toBe('available')
  })
  test('hides future content and refuses navigation, draft saves and attempts there', async () => {
    const ctx = setup()
    const view = await json(ctx.read())
    expect(Object.keys(view.sectionProgress.sections[2]!).sort()).toEqual([
      'id',
      'pending',
      'status',
      'title',
    ])
    expect(view.blocks.map((b: { id: string }) => b.id)).toEqual([ctx.ids[0]!])
    expect(view.sectionProgress).toMatchObject({ completed: 0, total: 3, percent: 0 })
    expect(view.sectionProgress.sections.map((s: { status: string }) => s.status)).toEqual([
      'available',
      'locked',
      'locked',
    ])
    expect((await ctx.attempt(2)).status).toBe(423)
    expect(
      (
        await ctx.request(`/lessons/${ctx.lessonId}/navigation`, 'PUT', {
          sectionId: ctx.sections[2]?.id,
        })
      ).status,
    ).toBe(423)
    expect(
      (
        await ctx.request(
          `/lessons/${ctx.lessonId}/blocks/${ctx.ids[2]}/learning-progress`,
          'PUT',
          {
            revision: REVISION,
            answers: { checkpoint: 'prepare', passed: true },
            hintsUsed: 0,
            positionSeconds: null,
          },
        )
      ).status,
    ).toBe(423)
  })
  test('saving an answer and wrong attempts do not count; passing unlocks exactly the next section', async () => {
    const ctx = setup()
    await ctx.request(`/lessons/${ctx.lessonId}/blocks/${ctx.ids[0]}/learning-progress`, 'PUT', {
      revision: REVISION,
      answers: { checkpoint: 'prepare' },
      hintsUsed: 0,
      positionSeconds: null,
    })
    expect((await json(ctx.read())).sectionProgress.completed).toBe(0)
    expect((await ctx.attempt(0, 'draw')).status).toBe(200)
    expect((await json(ctx.read())).sectionProgress.completed).toBe(0)
    const response = await json(ctx.attempt(0))
    expect(response.sectionProgress.completed).toBe(1)
    const view = await json(ctx.read())
    expect(view.blocks).toHaveLength(2)
    expect(view.sectionProgress.sections.map((s: { status: string }) => s.status)).toEqual([
      'completed',
      'available',
      'locked',
    ])
  })
  test('review, retries and navigation never regress or duplicate milestones', async () => {
    const ctx = setup(),
      id = randomUUID()
    await ctx.attempt(0, 'prepare', id)
    await ctx.attempt(0, 'prepare', id)
    await ctx.attempt(0, 'draw')
    await ctx.request(`/lessons/${ctx.lessonId}/navigation`, 'PUT', {
      sectionId: ctx.sections[0]?.id,
    })
    const saved = await ctx.learningRepository.getSectionProgress(
      { userId: USER, accountId: USER },
      ctx.lessonId,
    )
    expect(saved.filter((s) => s.completedAt)).toHaveLength(1)
    expect((await json(ctx.read())).sectionProgress.completed).toBe(1)
  })
  test('the final section is required before completing the lesson', async () => {
    const ctx = setup()
    await ctx.attempt(0)
    await ctx.attempt(1)
    expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(409)
    expect((await json(ctx.read())).sectionProgress.percent).toBeLessThan(100)
    await ctx.attempt(2)
    expect((await json(ctx.read())).sectionProgress.percent).toBe(100)
    expect((await ctx.request(`/lessons/${ctx.lessonId}/complete`, 'POST')).status).toBe(200)
  })
  test('an old saved position cannot unlock a future section and profiles do not share evidence', async () => {
    const ctx = setup()
    await ctx.learningRepository.saveNavigation(
      { userId: USER, accountId: USER },
      ctx.lessonId,
      ctx.sections[2]!.id,
    )
    expect((await json(ctx.read())).learningProgress.sectionId).toBe(ctx.sections[0]!.id)
    await ctx.attempt(0)
    const other = randomUUID()
    grantLifetime(ctx.entitlements, { userId: other, courseRef: ctx.course.slug })
    const view = await json(
      ctx.request(`/courses/${ctx.course.slug}/lessons/${ctx.lessonId}`, 'GET', undefined, other),
    )
    expect(view.sectionProgress.completed).toBe(0)
  })
  test('completed legacy lessons remain reviewable without manufacturing section records', async () => {
    const ctx = setup()
    await ctx.progress.markComplete(USER, ctx.lessonId, ctx.course.courseId, new Date())
    const view = await json(ctx.read())
    expect(view.sectionProgress.percent).toBe(100)
    expect(view.blocks).toHaveLength(3)
    expect(
      await ctx.learningRepository.getSectionProgress(
        { userId: USER, accountId: USER },
        ctx.lessonId,
      ),
    ).toHaveLength(0)
  })
  test('direct quiz requests cannot reveal answers or record attempts in a future section', async () => {
    const ctx = setup(),
      quizId = randomUUID()
    ctx.courses.blocks.push({
      id: quizId,
      lessonId: ctx.lessonId,
      kind: 'quiz',
      sortOrder: 5,
      contentRevision: REVISION,
      content: {
        kind: 'quiz',
        passingScore: 100,
        questions: [
          {
            id: 'q',
            prompt: 'Qual?',
            choices: [
              { id: 'yes', label: 'Sim' },
              { id: 'no', label: 'Não' },
            ],
            correctChoiceIds: ['yes'],
          },
        ],
      },
    })
    ctx.sections[1]!.blockIds.push(quizId)
    const response = await ctx.request(
      `/lessons/${ctx.lessonId}/blocks/${quizId}/quiz-attempts`,
      'POST',
      { answers: { q: ['yes'] } },
    )
    expect(response.status).toBe(423)
    expect(await response.text()).not.toContain('correctChoiceIds')
    expect(await ctx.quizAttempts.summarizeByBlockIds(USER, [quizId])).toEqual(new Map())
  })
  test('optional support quizzes can be answered before and after completing the sections', async () => {
    const ctx = setup(),
      quizId = randomUUID()
    ctx.courses.blocks.push({
      id: quizId,
      lessonId: ctx.lessonId,
      kind: 'quiz',
      sortOrder: 4,
      contentRevision: REVISION,
      content: {
        kind: 'quiz',
        questions: [
          {
            id: 'q',
            prompt: 'O que vem primeiro?',
            choices: [
              { id: 'prepare', label: 'Preparar' },
              { id: 'draw', label: 'Desenhar' },
            ],
            correctChoiceIds: ['prepare'],
          },
        ],
      },
    })
    ctx.learningRepository.structures.set(ctx.lessonId, {
      revision: ctx.structureRevision,
      sections: ctx.sections,
      supportBlockIds: [quizId],
    })
    expect((await json(ctx.read())).blocks.some((b) => b.id === quizId)).toBe(true)
    const answer = () =>
      ctx.request(`/lessons/${ctx.lessonId}/blocks/${quizId}/quiz-attempts`, 'POST', {
        answers: { q: ['prepare'] },
      })
    expect((await answer()).status).toBe(200)
    expect((await json(ctx.read())).sectionProgress.completed).toBe(0)
    for (let index = 0; index < ctx.sections.length; index++) await ctx.attempt(index)
    expect((await json(ctx.read())).sectionProgress.percent).toBe(100)
    expect((await answer()).status).toBe(200)
  })
  test('a changed checkpoint revision rejects stale attempts; confirmed milestones survive edits', async () => {
    const ctx = setup()
    await ctx.attempt(0)
    const first = ctx.courses.blocks.find((b) => b.id === ctx.ids[0])
    const second = ctx.courses.blocks.find((b) => b.id === ctx.ids[1])
    if (!first || !second) throw new Error('Missing fixtures')
    first.contentRevision = 'new-first'
    second.contentRevision = 'new-second'
    expect((await ctx.attempt(1)).status).toBe(409)
    expect((await json(ctx.read())).sectionProgress.completed).toBe(1)
  })
  test('delivery requires the final section even if an earlier one is labeled closing', async () => {
    const ctx = setup(),
      projectId = randomUUID()
    ctx.courses.blocks.push({
      id: projectId,
      lessonId: ctx.lessonId,
      kind: 'studio',
      sortOrder: 4,
      contentRevision: REVISION,
      content: { kind: 'studio', initialProject: {} },
    })
    const first = ctx.sections[0]
    if (!first) throw new Error('Missing fixture')
    const closing = {
      ...first,
      intent: 'closing' as const,
      blockIds: [...first.blockIds, projectId],
      completion: { ...first.completion, blockIds: [...first.completion.blockIds, projectId] },
    }
    const construction = ctx.sections.slice(1).map((s) => ({ ...s, workspaceBlockId: projectId }))
    ctx.learningRepository.structures.set(ctx.lessonId, {
      revision: ctx.structureRevision,
      sections: [closing, ...construction],
    })
    const submit = () =>
      ctx.request(`/lessons/${ctx.lessonId}/blocks/${projectId}/studio-submission`, 'POST', {
        project: { name: 'Meu projeto', files: {} },
      })
    expect((await submit()).status).toBe(423)
    expect(await ctx.studioSubmissions.getOne(USER, projectId)).toBeNull()
    ctx.learningRepository.structures.set(ctx.lessonId, {
      revision: randomUUID(),
      sections: [...construction, closing],
    })
    expect((await submit()).status).toBe(423)
    await ctx.attempt(1)
    await ctx.attempt(2)
    await ctx.attempt(0)
    expect((await submit()).status).toBe(200)
    expect((await json(ctx.read())).sectionProgress.percent).toBe(100)
  })
  test('workspace is accessible before closing but cannot be submitted early; project check is separate', async () => {
    const ctx = setup(),
      projectId = randomUUID()
    ctx.courses.blocks.push({
      id: projectId,
      lessonId: ctx.lessonId,
      kind: 'studio',
      sortOrder: 4,
      contentRevision: REVISION,
      content: { kind: 'studio', initialProject: {} },
    })
    const first = ctx.sections[0],
      last = ctx.sections[2]
    if (!first || !last) throw new Error('Missing fixtures')
    first.workspaceBlockId = projectId
    const sections = ctx.sections.map((s) =>
      s.id === first.id
        ? {
            ...s,
            completion: {
              ...s.completion,
              projectChecks: [
                { id: 'loop', label: 'Usar repetição', rule: { type: 'usesLoop' as const } },
                {
                  id: 'variable',
                  label: 'Criar pontos',
                  rule: { type: 'declaresVariable' as const, name: 'pontos' },
                },
                {
                  id: 'function',
                  label: 'Definir somar',
                  rule: { type: 'definesFunction' as const, name: 'somar' },
                },
                {
                  id: 'call',
                  label: 'Chamar somar',
                  rule: { type: 'callsFunction' as const, name: 'somar' },
                },
              ],
            },
          }
        : s.id === last.id
          ? {
              ...s,
              intent: 'closing' as const,
              blockIds: [...s.blockIds, projectId],
              completion: { ...s.completion, blockIds: [...s.completion.blockIds, projectId] },
            }
          : s,
    )
    ctx.learningRepository.structures.set(ctx.lessonId, {
      revision: ctx.structureRevision,
      sections,
    })
    expect((await json(ctx.read())).blocks.some((b: { id: string }) => b.id === projectId)).toBe(
      true,
    )
    expect(
      (
        await ctx.request(
          `/lessons/${ctx.lessonId}/blocks/${projectId}/studio-submission`,
          'POST',
          { project: { name: 'Meu projeto', files: {} } },
        )
      ).status,
    ).toBe(423)
    const path = `/lessons/${ctx.lessonId}/sections/${first.id}/project-check`
    expect((await ctx.request(path, 'POST', { revision: randomUUID(), project: {} })).status).toBe(
      409,
    )
    const wrong = await json(
      ctx.request(path, 'POST', { revision: ctx.structureRevision, project: {}, passed: true }),
    )
    expect(wrong.passed).toBe(false)
    await ctx.attempt(0)
    expect((await json(ctx.read())).sectionProgress.completed).toBe(0)
    const good = await json(
      ctx.request(path, 'POST', {
        revision: ctx.structureRevision,
        project: {
          ir: {
            version: 2,
            html: [],
            css: [],
            extensions: [],
            behavior: {
              start: [{ type: 'var', name: 'pontos', value: { type: 'num', value: 0 } }],
              molds: [{ type: 'funcDecl', name: 'somar', params: [], body: [] }],
              events: [{ type: 'callFunction', name: 'somar', args: [] }],
              loops: [{ type: 'repeat', times: { type: 'num', value: 3 }, body: [] }],
            },
          },
        },
      }),
    )
    expect(good.passed).toBe(true)
    expect(good.sectionProgress.completed).toBe(1)
    expect(await ctx.studioSubmissions.getOne(USER, projectId)).toBeNull()
  })
})
