import { describe, expect, test } from 'bun:test'
import {
  applyLessonDraftChange,
  defaultLessonSection,
  type LessonDraft,
  type LessonDraftCommand,
} from '@sistemazero/core/learning'
import { type DraftRecovery, LessonDraftSession } from '../src/lib/lesson-draft-session'

type Text = { kind: 'rich_text'; markdown: string }
function fixture() {
  let server: LessonDraft<Text> = {
    lessonId: 'lesson',
    revision: 'r1',
    publishedRevision: 'published',
    isPublished: true,
    updatedBy: 'author',
    updatedAt: '2026-09-08T12:00:00Z',
    document: {
      title: 'Aula',
      slug: 'aula',
      estimatedMinutes: 10,
      blocks: [],
      sections: [defaultLessonSection('section', 'Criar', [])],
      supportBlockIds: [],
      attachments: [],
      plannedVideos: [],
    },
  }
  let recovery: DraftRecovery<Text> | null = null
  const archived: DraftRecovery<Text>[] = []
  const commands: LessonDraftCommand<Text>[] = []
  let send: (
    command: LessonDraftCommand<Text>,
  ) => Promise<Pick<LessonDraft<Text>, 'revision' | 'updatedAt'>> = async (command) => {
    if (command.expectedRevision !== server.revision)
      throw { code: 'LESSON_DRAFT_CONFLICT', message: 'Conflito' }
    server = {
      ...server,
      revision: `r${commands.length + 1}`,
      document: applyLessonDraftChange(server.document, command.change),
    }
    return server
  }
  const session = new LessonDraftSession<Text>({
    read: async () => structuredClone(server),
    send: async (command) => {
      commands.push(structuredClone(command))
      return send(command)
    },
    readLocal: async () => structuredClone(recovery),
    writeLocal: async (value) => {
      recovery = structuredClone(value)
    },
    archiveLocal: async (value) => {
      archived.push(structuredClone(value))
    },
  })
  return {
    session,
    commands,
    archived,
    server: () => server,
    local: () => recovery,
    transport: (next: typeof send) => {
      send = next
    },
    recover: (value: DraftRecovery<Text>) => {
      recovery = value
    },
    revise: (revision: string) => {
      server = { ...server, revision }
    },
  }
}
const metadata = (title: string) => ({
  type: 'metadata' as const,
  title,
  slug: 'aula',
  estimatedMinutes: 10,
})

describe('lesson draft autosave session', () => {
  test('saves incomplete content and sends only the changed block, with its original section', async () => {
    const f = fixture()
    await f.session.load()
    f.session.enqueue({
      type: 'block',
      block: { id: 'text', content: { kind: 'rich_text', markdown: '' } },
      sectionId: 'section',
    })
    f.session.enqueue({
      type: 'block',
      block: { id: 'text', content: { kind: 'rich_text', markdown: 'Continuação' } },
    })
    await f.session.flush()
    expect(f.commands).toHaveLength(1)
    expect(f.commands[0]?.change).toMatchObject({ type: 'block', sectionId: 'section' })
    expect(f.server().document.sections[0]?.blockIds).toEqual(['text'])
    expect(f.server().document.blocks[0]?.content.markdown).toBe('Continuação')
    expect(f.session.getSnapshot().status).toBe('saved')
    expect(f.local()).toBeNull()
  })
  test('an old response cannot replace newer typing; the next request uses its acknowledged revision', async () => {
    const f = fixture()
    await f.session.load()
    const gate = Promise.withResolvers<void>()
    f.transport(async (_command) => {
      if (f.commands.length === 1) await gate.promise
      return { revision: f.commands.length === 1 ? 'r2' : 'r3', updatedAt: 'now' }
    })
    f.session.enqueue(metadata('Primeira'))
    const flushing = f.session.flush()
    await Promise.resolve()
    await Promise.resolve()
    f.session.enqueue(metadata('Mais recente'))
    gate.resolve()
    await flushing
    expect(f.session.getSnapshot().draft?.document.title).toBe('Mais recente')
    expect(f.commands).toHaveLength(2)
    expect(f.commands[1]?.expectedRevision).toBe('r2')
  })
  test('network failure keeps the pending operation and retries its same id', async () => {
    const f = fixture()
    await f.session.load()
    f.transport(async () => {
      throw new Error('Offline')
    })
    f.session.enqueue(metadata('Minha aula'))
    await expect(f.session.flush()).rejects.toThrow('Offline')
    const first = f.commands[0]
    expect(f.local()?.document.title).toBe('Minha aula')
    expect(f.session.getSnapshot().status).toBe('error')
    f.transport(async () => ({ revision: 'r2', updatedAt: 'now' }))
    await f.session.flush()
    expect(f.commands[1]).toEqual(first)
    expect(f.local()).toBeNull()
  })
  test('two consecutive removals are not coalesced into one operation', async () => {
    const f = fixture()
    await f.session.load()
    f.session.enqueue({ type: 'remove-block', blockId: 'one' })
    f.session.enqueue({ type: 'remove-block', blockId: 'two' })
    await f.session.flush()
    expect(f.commands.map((c) => c.change)).toEqual([
      { type: 'remove-block', blockId: 'one' },
      { type: 'remove-block', blockId: 'two' },
    ])
  })
  test('reopening restores compatible local changes before syncing them', async () => {
    const f = fixture()
    f.recover({
      version: 1,
      baseRevision: 'r1',
      document: { ...f.server().document, title: 'Recuperada' },
      pending: [{ operationId: 'recover', change: metadata('Recuperada') }],
    })
    await f.session.load()
    expect(f.server().document.title).toBe('Recuperada')
    expect(f.session.getSnapshot().status).toBe('saved')
  })
  test('conflicting recovery never overwrites another author and remains archived after reconciliation', async () => {
    const f = fixture()
    f.recover({
      version: 1,
      baseRevision: 'older',
      document: { ...f.server().document, title: 'Minha cópia' },
      pending: [{ operationId: 'recover', change: metadata('Minha cópia') }],
    })
    await f.session.load()
    expect(f.commands).toHaveLength(0)
    expect(f.session.getSnapshot().status).toBe('conflict')
    expect(f.local()?.document.title).toBe('Minha cópia')
    await f.session.restoreServerVersion()
    expect(f.archived[0]?.document.title).toBe('Minha cópia')
    expect(f.session.getSnapshot().draft?.document.title).toBe('Aula')
  })
  test('a conflict during saving keeps both the local document and pending queue', async () => {
    const f = fixture()
    await f.session.load()
    f.revise('someone-else')
    f.session.enqueue(metadata('Meu texto'))
    await expect(f.session.flush()).rejects.toMatchObject({ code: 'LESSON_DRAFT_CONFLICT' })
    expect(f.session.getSnapshot().recovery?.document.title).toBe('Meu texto')
    expect(f.server().document.title).toBe('Aula')
  })
})
