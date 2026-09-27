import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { SectionStructureRule } from '../../packages/core/src/learning'
import {
  defaultLessonSection,
  type InteractiveBlock,
  type SectionProgressView,
  sectionCompletionIssues,
} from '../../packages/core/src/learning'
import { buildApp, grantLifetime, seedSampleCourse } from '../../packages/members/tests/helpers'
import { evaluateStructureRule as evaluateClient } from '../../packages/studio/src/activity/structure'
import type { SZIRV2 } from '../../packages/studio/src/ir'

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

describe('review regressions', () => {
  test('a visible optional support quiz remains answerable', async () => {
    const ctx = setup()
    const quizId = randomUUID()
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
    ctx.learningRepository.structures.set(ctx.lessonId, {
      revision: ctx.structureRevision,
      sections: ctx.sections,
      supportBlockIds: [quizId],
    })
    const view = await json(ctx.read())
    expect(view.blocks.some((b) => b.id === quizId)).toBe(true)
    const response = await ctx.request(
      `/lessons/${ctx.lessonId}/blocks/${quizId}/quiz-attempts`,
      'POST',
      { answers: { q: ['yes'] } },
    )
    console.log('support quiz gate:', response.status, await response.text())
    for (let index = 0; index < 3; index++) await ctx.attempt(index)
    expect((await json(ctx.read())).sectionProgress.percent).toBe(100)
    const afterAll = await ctx.request(
      `/lessons/${ctx.lessonId}/blocks/${quizId}/quiz-attempts`,
      'POST',
      { answers: { q: ['yes'] } },
    )
    console.log('support quiz after completing all sections:', afterAll.status)
    // Control: identical quiz is answerable before enabling section gates.
    ctx.learningRepository.structures.set(ctx.lessonId, {
      revision: ctx.structureRevision,
      sections: ctx.sections.map(({ completion, ...section }) => section),
      supportBlockIds: [quizId],
    })
    const legacy = await ctx.request(
      `/lessons/${ctx.lessonId}/blocks/${quizId}/quiz-attempts`,
      'POST',
      { answers: { q: ['yes'] } },
    )
    expect(legacy.status).toBe(200)
    expect(response.status).toBe(200)
  })
  test('publication rejects a delivery placed before construction sections', async () => {
    const ctx = setup()
    const projectId = randomUUID()
    ctx.courses.blocks.push({
      id: projectId,
      lessonId: ctx.lessonId,
      kind: 'studio',
      sortOrder: 4,
      contentRevision: REVISION,
      content: { kind: 'studio', initialProject: {} },
    })
    const sections = ctx.sections.map((s, index) =>
      index === 0
        ? {
            ...s,
            intent: 'closing' as const,
            blockIds: [...s.blockIds, projectId],
            completion: { ...s.completion, blockIds: [...s.completion.blockIds, projectId] },
          }
        : { ...s, workspaceBlockId: projectId },
    )
    ctx.learningRepository.structures.set(ctx.lessonId, {
      revision: ctx.structureRevision,
      sections,
    })
    const issues = sectionCompletionIssues(
      sections,
      ctx.courses.blocks.filter((b) => b.lessonId === ctx.lessonId),
    )
    const response = await ctx.request(
      `/lessons/${ctx.lessonId}/blocks/${projectId}/studio-submission`,
      'POST',
      { project: { name: 'Meu projeto', files: {} } },
    )
    console.log(
      'early closing:',
      JSON.stringify({ issues, status: response.status, body: await response.json() }),
    )
    expect(issues.length).toBeGreaterThan(0)
  })
})

test('section project checks accept the current Studio IR format', async () => {
  const ir: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    extensions: [],
    behavior: {
      start: [
        { type: 'var', name: 'pontos', value: { type: 'num', value: 0 } },
        { type: 'funcDecl', name: 'somar', params: [], body: [] },
        { type: 'callFunction', name: 'somar', args: [] },
      ],
      events: [],
      loops: [{ type: 'repeat', times: { type: 'num', value: 3 }, body: [] }],
    },
  }
  const rules: SectionStructureRule[] = [
    { type: 'usesLoop' },
    { type: 'declaresVariable', name: 'pontos' },
    { type: 'definesFunction', name: 'somar' },
    { type: 'callsFunction', name: 'somar' },
  ]
  const results: boolean[] = []
  for (const rule of rules) {
    // The actual Studio grader accepts this valid project.
    expect(evaluateClient(rule, ir, null)).toBe(true)
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
    const sections = ctx.sections.map((s, index) =>
      index === 0
        ? {
            ...s,
            workspaceBlockId: projectId,
            completion: {
              ...s.completion,
              projectChecks: [{ id: 'goal', label: 'Objetivo', rule }],
            },
          }
        : index === 2
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
    expect(
      sectionCompletionIssues(
        sections,
        ctx.courses.blocks.filter((b) => b.lessonId === ctx.lessonId),
      ),
    ).toEqual([])
    await ctx.attempt(0)
    const path = `/lessons/${ctx.lessonId}/sections/${sections[0]!.id}/project-check`
    const response = await ctx.request(path, 'POST', {
      revision: ctx.structureRevision,
      project: { ir },
    })
    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      passed: boolean
      sectionProgress: SectionProgressView
    }
    console.log(
      'current IR:',
      JSON.stringify({
        rule,
        clientPassed: true,
        serverPassed: payload.passed,
        completed: payload.sectionProgress.completed,
      }),
    )
    results.push(payload.passed)
    // Positive control: the very same program in the previous IR format passes.
    const legacy = await json(
      ctx.request(path, 'POST', {
        revision: ctx.structureRevision,
        project: {
          ir: {
            html: [],
            css: [],
            extensions: [],
            js: [...ir.behavior.start, ...ir.behavior.loops],
          },
        },
      }),
    )
    expect(legacy.passed).toBe(true)
    expect(legacy.sectionProgress.completed).toBe(1)
  }
  expect(results).toEqual([true, true, true, true])
})
