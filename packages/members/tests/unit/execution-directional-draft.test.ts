import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import {
  applyLessonDraftChange,
  type DraftBlockContent,
  defaultLessonSection,
  isSectionCompletion,
  type LessonDraft,
  type LessonDraftChange,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'
import { Elysia, getSchemaValidator } from 'elysia'
import { type DraftRecovery, LessonDraftSession } from '../../../admin/src/lib/lesson-draft-session'
import { ProjectChecksTestBody } from '../../src/interfaces/http/learning.dtos'
import { DraftCommandSchema, draftCommand } from '../../src/interfaces/http/lesson-draft.dtos'

const sectionId = randomUUID(),
  workspaceId = randomUUID()
const sections = (path: string) => [
  {
    ...defaultLessonSection(sectionId, 'Movimento', []),
    workspaceBlockId: workspaceId,
    completion: {
      version: 1 as const,
      blockIds: [],
      projectChecks: [
        {
          id: 'subir',
          label: 'Faça subir',
          rule: {
            type: 'behavior' as const,
            observation: { type: 'idleBeforeAction' as const, idleMs: 80 },
            steps: [{ action: 'press' as const, key: 'ArrowUp', holdMs: 80 }],
            expect: {
              target: { kind: 'spritePosition' as const, path, axis: 'y' as const },
              compare: 'decreased' as const,
            },
          },
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

test('actual draft autosave acknowledges the empty directional path then the completed path without inventing a target', async () => {
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
      sections: sections('original'),
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
      if (!response.ok) throw Error(`Draft HTTP ${response.status}`)
      const ack: unknown = await response.json()
      if (
        !ack ||
        typeof ack !== 'object' ||
        !('revision' in ack) ||
        typeof ack.revision !== 'string' ||
        !('updatedAt' in ack) ||
        typeof ack.updatedAt !== 'string'
      )
        throw Error('Invalid draft ACK')
      return { revision: ack.revision, updatedAt: ack.updatedAt }
    },
  })
  try {
    await session.load()
    for (const path of ['', 'avatar']) {
      const edit: LessonDraftChange<DraftBlockContent> = {
        type: 'structure',
        sections: sections(path),
      }
      expect(session.enqueue(edit)).toBe(true)
      await session.flush()
      expect(session.getSnapshot().status).toBe('saved')
      expect(server.document.sections).toEqual(sections(path))
    }
    expect(accepted).toHaveLength(2)
    expect(recovery === null).toBe(true)
  } finally {
    const handoff = session.beginHandoff()
    handoff.seal()
    await handoff.confirmLocal()
    await handoff.retire()
  }
})

test('inert draft text cannot execute or publish and malformed envelopes remain rejected', async () => {
  const draft = getSchemaValidator(DraftCommandSchema, { normalize: true })
  let executions = 0
  const testApp = new Elysia().post(
    '/',
    () => {
      executions++
      return {}
    },
    { body: ProjectChecksTestBody },
  )
  for (const path of ['', 'avatar.', '__proto__.avatar', 'two words']) {
    const input = command(path),
      parsed = draft.safeParse(input)
    expect(parsed.success).toBe(true)
    if (!parsed.success) throw Error('Inert draft text was rejected')
    expect(isDeepStrictEqual(parsed.data, input)).toBe(true)
    const section = input.change.sections[0]
    if (!section) throw Error('Missing test section')
    expect(isSectionCompletion(section.completion)).toBe(false)
    expect(
      sectionCompletionIssues(input.change.sections, [
        { id: workspaceId, content: { kind: 'studio' } },
      ]).map((issue) => issue.message),
    ).toContain('Configure os critérios de conclusão desta seção.')
    const response = await testApp.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ project: {}, checks: section.completion.projectChecks }),
      }),
    )
    expect([400, 422]).toContain(response.status)
  }
  expect(executions).toBe(0)
  for (const patch of [
    { expect: { target: { kind: 'spritePosition', path: '', axis: 'z' }, compare: 'decreased' } },
    { observation: { type: 'idleBeforeAction', idleMs: 80, retry: true } },
    { steps: [{ action: 'press', key: 'UnknownKey' }] },
    {
      expect: {
        target: { kind: 'spritePosition', path: 'x'.repeat(201), axis: 'y' },
        compare: 'decreased',
      },
    },
  ]) {
    const input = command(''),
      section = input.change.sections[0],
      check = section?.completion.projectChecks[0]
    if (!section || !check) throw Error('Missing test objective')
    const raw = {
      ...input,
      change: {
        ...input.change,
        sections: [
          {
            ...section,
            completion: {
              ...section.completion,
              projectChecks: [{ ...check, rule: { ...check.rule, ...patch } }],
            },
          },
        ],
      },
    }
    expect(draft.safeParse(raw).success).toBe(false)
  }
  expect(isSectionCompletion(sections('avatar')[0]?.completion)).toBe(true)
})
