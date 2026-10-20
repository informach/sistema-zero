import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import {
  applyLessonDraftChange,
  type DraftBlockContent,
  defaultLessonSection,
  EXECUTION_LIMITS,
  isExecutionStep,
  isSectionCompletion,
  type LessonDraft,
  type LessonDraftChange,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'
import { Elysia, getSchemaValidator } from 'elysia'
import { type DraftRecovery, LessonDraftSession } from '../../../admin/src/lib/lesson-draft-session'
import { ProjectChecksTestBody } from '../../src/interfaces/http/learning.dtos'
import { DraftCommandSchema, draftCommand } from '../../src/interfaces/http/lesson-draft.dtos'

const sectionId = randomUUID()
const workspaceId = randomUUID()
const sections = (path: string, groupPath = path) => [
  {
    ...defaultLessonSection(sectionId, 'Conte um achado', []),
    workspaceBlockId: workspaceId,
    completion: {
      version: 1 as const,
      blockIds: [],
      projectChecks: [
        {
          id: 'contar',
          label: 'Conte um achado',
          hint: 'Olhe o contador.',
          rule: {
            type: 'behavior' as const,
            steps: [
              {
                action: 'clickTarget' as const,
                target: { kind: 'sprite' as const, path, groupPath },
              },
            ],
            expect: {
              target: { kind: 'value' as const, path: 'achados' },
              compare: 'equals' as const,
              value: 1,
            },
          },
        },
        {
          id: 'extra',
          label: 'Experimente uma repetição',
          hint: 'Dica do extra.',
          optional: true as const,
          rule: { type: 'usesLoop' as const },
        },
      ],
    },
  },
]
const command = (path: string) => ({
  expectedRevision: randomUUID(),
  operationId: randomUUID(),
  change: { type: 'structure' as const, sections: sections(path) },
})

test('real Admin autosave confirms the empty new target before typing, then confirms complete names', async () => {
  let server: LessonDraft<DraftBlockContent> = {
    lessonId: randomUUID(),
    revision: randomUUID(),
    publishedRevision: 'published',
    isPublished: true,
    canUndoRestore: false,
    updatedBy: randomUUID(),
    updatedAt: new Date().toISOString(),
    document: {
      title: 'Aula',
      slug: 'aula',
      estimatedMinutes: null,
      blocks: [{ id: workspaceId, content: { kind: 'studio' } }],
      sections: sections('inicial'),
      attachments: [],
      plannedVideos: [],
    },
  }
  const accepted: unknown[] = []
  const app = new Elysia().patch(
    '/',
    ({ body }) => {
      const parsed = draftCommand(body)
      if (parsed.expectedRevision !== server.revision)
        return new Response('Conflict', { status: 409 })
      accepted.push(structuredClone(parsed.change))
      server = {
        ...server,
        revision: randomUUID(),
        document: applyLessonDraftChange(server.document, parsed.change),
      }
      return { revision: server.revision, updatedAt: server.updatedAt }
    },
    { body: DraftCommandSchema },
  )
  let recovery: DraftRecovery<DraftBlockContent> | null = null
  const session = new LessonDraftSession<DraftBlockContent>({
    read: async () => structuredClone(server),
    readLocal: async () => structuredClone(recovery),
    writeLocal: async (value) => {
      recovery = structuredClone(value)
    },
    archiveLocal: async () => {},
    send: async (body, signal) => {
      const response = await app.handle(
        new Request('http://members.test/', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        }),
      )
      if (!response.ok) throw new Error(`Draft HTTP ${response.status}`)
      const ack: unknown = await response.json()
      if (
        !ack ||
        typeof ack !== 'object' ||
        !('revision' in ack) ||
        typeof ack.revision !== 'string' ||
        !('updatedAt' in ack) ||
        typeof ack.updatedAt !== 'string'
      )
        throw new Error('Invalid draft acknowledgement')
      return { revision: ack.revision, updatedAt: ack.updatedAt }
    },
  })
  try {
    await session.load()
    const edit = (path: string, groupPath = path): LessonDraftChange<DraftBlockContent> => ({
      type: 'structure',
      sections: sections(path, groupPath),
    })
    expect(session.enqueue(edit(''))).toBe(true)
    await session.flush()
    expect(session.getSnapshot().status).toBe('saved')
    expect(accepted).toHaveLength(1)
    expect(isDeepStrictEqual(server.document.sections, sections(''))).toBe(true)
    expect(session.enqueue(edit('esconderijo1', 'esconderijos'))).toBe(true)
    await session.flush()
    expect(session.getSnapshot().status).toBe('saved')
    expect(accepted).toHaveLength(2)
    expect(
      isDeepStrictEqual(server.document.sections, sections('esconderijo1', 'esconderijos')),
    ).toBe(true)
    expect(recovery === null).toBe(true)
  } finally {
    const handoff = session.beginHandoff()
    handoff.seal()
    await handoff.confirmLocal()
    await handoff.retire()
  }
})

test('draft keeps incomplete or prohibited path text inert; final testing and publication still refuse it', async () => {
  const draftValidator = getSchemaValidator(DraftCommandSchema, { normalize: true })
  let executed = 0
  const testApp = new Elysia().post(
    '/',
    () => {
      executed++
      return { results: [] }
    },
    { body: ProjectChecksTestBody },
  )
  for (const path of ['', 'grupo.', '__proto__.alvo', 'grupo.constructor']) {
    const input = command(path)
    const draft = draftValidator.safeParse(input)
    expect(draft.success).toBe(true)
    if (!draft.success) throw new Error('Draft path text was rejected')
    expect(isDeepStrictEqual(draft.data, input)).toBe(true)
    const completion = input.change.sections[0]!.completion
    expect(isSectionCompletion(completion)).toBe(false)
    expect(
      sectionCompletionIssues(input.change.sections, [
        { id: workspaceId, content: { kind: 'studio' } },
      ]).map((issue) => issue.message),
    ).toContain('Configure os critérios de conclusão desta seção.')
    const response = await testApp.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ project: {}, checks: completion.projectChecks }),
      }),
    )
    expect([400, 422]).toContain(response.status)
  }
  expect(executed).toBe(0)
  expect(isSectionCompletion(sections('alvo', 'grupo')[0]?.completion)).toBe(true)
  expect(
    sectionCompletionIssues(sections('alvo', 'grupo'), [
      { id: workspaceId, content: { kind: 'studio' } },
    ]),
  ).toEqual([])
})

test('draft context does not relax existing key, timing or absolute-click limits', () => {
  for (const step of [
    { action: 'wait', ms: EXECUTION_LIMITS.maxWaitMs + 1 },
    { action: 'press', key: 'UnknownKey' },
    { action: 'click', x: EXECUTION_LIMITS.maxCoordinate + 1, y: 1 },
  ]) {
    expect(isExecutionStep(step, 'draft')).toBe(false)
    expect(isExecutionStep(step, 'final')).toBe(false)
  }
})

test('draft target mode preserves limits, known discriminants and closed objects', () => {
  const validator = getSchemaValidator(DraftCommandSchema, { normalize: true })
  for (const target of [
    { kind: 'sprite', path: 'a'.repeat(201), groupPath: '' },
    { kind: 'sprite', path: '', groupPath: '', extra: true },
    { kind: 'unknown', path: '' },
  ]) {
    const input = command('')
    const rule = input.change.sections[0]!.completion.projectChecks[0]!.rule
    const raw = {
      ...input,
      change: {
        ...input.change,
        sections: [
          {
            ...input.change.sections[0],
            completion: {
              ...input.change.sections[0]!.completion,
              projectChecks: [
                {
                  ...input.change.sections[0]!.completion.projectChecks[0],
                  rule: { ...rule, steps: [{ action: 'clickTarget', target }] },
                },
              ],
            },
          },
        ],
      },
    }
    expect(validator.safeParse(raw).success).toBe(false)
  }
})
