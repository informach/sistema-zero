import { describe, expect, test } from 'bun:test'
import {
  applyLessonDraftChange,
  type DraftBlockContent,
  defaultLessonSection,
  type LessonDraft,
  type LessonDraftCommand,
  type StudioProjectExampleChange,
} from '@sistemazero/core/learning'
import { type DraftRecovery, LessonDraftSession } from '../src/lib/lesson-draft-session'

type Text = { kind: 'rich_text'; markdown: string }
function fixture() {
  let server: LessonDraft<Text> = {
    lessonId: 'lesson',
    revision: 'r1',
    publishedRevision: 'published',
    isPublished: true,
    canUndoRestore: false,
    updatedBy: 'author',
    updatedAt: '2026-09-08T12:00:00Z',
    document: {
      title: 'Aula',
      slug: 'aula',
      estimatedMinutes: 10,
      blocks: [],
      sections: [defaultLessonSection('section', 'Criar', [])],
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
  let beforeLocalWrite: (value: DraftRecovery<Text> | null) => Promise<void> = async () => {}
  const session = new LessonDraftSession<Text>({
    read: async () => structuredClone(server),
    send: async (command) => {
      commands.push(structuredClone(command))
      return send(command)
    },
    readLocal: async () => structuredClone(recovery),
    writeLocal: async (value) => {
      await beforeLocalWrite(value)
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
    beforeLocalWrite: (next: typeof beforeLocalWrite) => {
      beforeLocalWrite = next
    },
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
  test('per-part saves retain immutable retry bytes and do not coalesce different roles', async () => {
    const blockId = '11111111-1111-4111-8111-111111111111'
    const sectionId = '22222222-2222-4222-8222-222222222222'
    const project = {
      formatVersion: 2,
      id: 'same-project',
      kind: 'classic',
      name: 'Criar',
      files: { 'index.html': '', 'style.css': '', 'script.js': 'before mutation' },
      installedExtensions: [],
    }
    const draft: LessonDraft<DraftBlockContent> = {
      lessonId: 'lesson',
      revision: 'r1',
      publishedRevision: 'published',
      isPublished: true,
      canUndoRestore: false,
      updatedBy: null,
      updatedAt: 'now',
      document: {
        title: 'Criar',
        slug: 'criar',
        estimatedMinutes: null,
        attachments: [],
        plannedVideos: [],
        blocks: [{ id: blockId, content: { kind: 'studio', initialProject: project } }],
        sections: [
          { ...defaultLessonSection(sectionId, 'Criar', [blockId]), workspaceBlockId: blockId },
        ],
      },
    }
    const commands: LessonDraftCommand<DraftBlockContent>[] = []
    let offline = true
    let revision = 1
    const session = new LessonDraftSession<DraftBlockContent>({
      read: async () => structuredClone(draft),
      readLocal: async () => null,
      writeLocal: async () => {},
      archiveLocal: async () => {},
      send: async (command) => {
        commands.push(structuredClone(command))
        if (offline) throw new Error('Offline')
        return { revision: `r${++revision}`, updatedAt: 'now' }
      },
    })
    await session.load()
    session.enqueue({
      type: 'studio-example',
      blockId,
      sectionId,
      role: 'entry',
      action: { type: 'save', exampleId: '33333333-3333-4333-8333-333333333333', project },
    })
    project.files['script.js'] = 'editor changed after snapshot capture'
    await expect(session.flush()).rejects.toThrow('Offline')
    session.enqueue({
      type: 'studio-example',
      blockId,
      sectionId,
      role: 'solution',
      action: { type: 'save', exampleId: '44444444-4444-4444-8444-444444444444', project },
    })
    offline = false
    await session.flush()
    expect(commands).toHaveLength(3)
    expect(commands[1]).toEqual(commands[0])
    expect(commands[0]?.change).toMatchObject({
      role: 'entry',
      action: {
        project: {
          files: { 'script.js': 'before mutation' },
        },
      },
    })
    expect(commands[2]?.change).toMatchObject({
      role: 'solution',
      action: {
        project: {
          files: { 'script.js': 'editor changed after snapshot capture' },
        },
      },
    })
    expect(commands[2]?.expectedRevision).toBe('r2')
    expect(session.getSnapshot().status).toBe('saved')
    const clear: StudioProjectExampleChange = {
      type: 'studio-example',
      blockId,
      sectionId,
      role: 'entry',
      action: { type: 'clear' },
    }
    session.enqueue(clear)
    clear.role = 'solution'
    await session.flush()
    expect(commands[3]?.change).toMatchObject({ role: 'entry', action: { type: 'clear' } })
    const reuseAction = {
      type: 'reuse' as const,
      exampleId: '44444444-4444-4444-8444-444444444444',
    }
    const reuse = {
      type: 'studio-example' as const,
      blockId,
      sectionId,
      role: 'entry' as const,
      action: reuseAction,
    }
    session.enqueue(reuse)
    reuseAction.exampleId = '33333333-3333-4333-8333-333333333333'
    reuse.sectionId = '55555555-5555-4555-8555-555555555555'
    await session.flush()
    expect(commands[4]?.change).toMatchObject({
      sectionId,
      role: 'entry',
      action: { type: 'reuse', exampleId: '44444444-4444-4444-8444-444444444444' },
    })
  })
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

describe('publication acknowledgement without discarding the mounted working copy', () => {
  test('adopts the canonical confirmed document and uses its revision for the next edit', async () => {
    const f = fixture()
    await f.session.load()
    const confirm = f.session.publicationConfirmation('r1')
    const published = {
      ...structuredClone(f.server()),
      revision: 'r-published',
      publishedRevision: 'published-new',
      isPublished: true,
      canUndoRestore: false,
    }
    f.revise('r-published')
    expect(confirm(published)).toBe('adopted')
    expect(f.session.getSnapshot().draft).toBe(published)
    expect(f.session.getSnapshot().status).toBe('saved')
    expect(confirm(published)).toBe('stale')
    f.session.enqueue(metadata('Depois de publicar'))
    await f.session.flush()
    expect(f.commands[0]!.expectedRevision).toBe('r-published')
  })

  test('preserves a concurrent local edit as an explicit conflict instead of replacing it', async () => {
    const f = fixture()
    await f.session.load()
    const confirm = f.session.publicationConfirmation('r1')
    f.session.enqueue(metadata('Intenção posterior'))
    const local = f.session.getSnapshot().draft
    const published = { ...structuredClone(f.server()), revision: 'r-published', isPublished: true }
    expect(confirm(published)).toBe('conflict')
    expect(f.session.getSnapshot().draft).toBe(local)
    expect(f.session.getSnapshot().draft!.document.title).toBe('Intenção posterior')
    expect(f.session.getSnapshot().status).toBe('conflict')
    expect(f.session.getSnapshot().recovery!.pending).toHaveLength(1)
    expect(f.session.getSnapshot().recovery!.pending[0]!.change).toEqual(
      metadata('Intenção posterior'),
    )
    expect(f.commands).toHaveLength(0)
    f.session.dispose()
  })

  test('does not adopt a response from a retired owner or an intervening load', async () => {
    for (const retire of ['dispose', 'reload'] as const) {
      const f = fixture()
      await f.session.load()
      const confirm = f.session.publicationConfirmation('r1')
      if (retire === 'dispose') f.session.dispose()
      else await f.session.load()
      const current = f.session.getSnapshot().draft
      expect(confirm({ ...structuredClone(f.server()), revision: 'late' })).toBe('stale')
      expect(f.session.getSnapshot().draft).toBe(current)
      expect(f.session.getSnapshot().draft!.revision).toBe('r1')
    }
  })

  test('refuses a different lesson response or publication preparation on an outdated revision', async () => {
    const f = fixture()
    await f.session.load()
    expect(() => f.session.publicationConfirmation('old')).toThrow()
    const confirm = f.session.publicationConfirmation('r1')
    const current = f.session.getSnapshot().draft
    expect(
      confirm({ ...structuredClone(f.server()), lessonId: 'other', revision: 'other-revision' }),
    ).toBe('conflict')
    expect(f.session.getSnapshot().draft).toBe(current)
    expect(f.session.getSnapshot().status).toBe('conflict')
  })
})

test('a publication ACK preserves C already in transport when CAS rejects its old revision', async () => {
  const f = fixture()
  await f.session.load()
  const confirm = f.session.publicationConfirmation('r1')
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  f.transport(async (command) => {
    started.resolve()
    await release.promise
    if (command.expectedRevision !== f.server().revision)
      throw { code: 'LESSON_DRAFT_CONFLICT', message: 'Conflito de revisão' }
    throw new Error('Old CAS must not apply after confirmed publication')
  })
  f.session.enqueue(metadata('C em transporte'))
  const flushing = f.session.flush().then(
    () => null,
    (error: unknown) => error,
  )
  try {
    await started.promise
    f.revise('r-published')
    expect(confirm({ ...structuredClone(f.server()), isPublished: true })).toBe('conflict')
    expect(f.session.getSnapshot().status).toBe('conflict')
    release.resolve()
    expect(await flushing).toMatchObject({ code: 'LESSON_DRAFT_CONFLICT' })
    expect(f.commands).toHaveLength(1)
    expect(f.commands[0]!.expectedRevision).toBe('r1')
    expect(f.session.getSnapshot().status).toBe('conflict')
    expect(f.session.getSnapshot().draft!.document.title).toBe('C em transporte')
    expect(f.session.getSnapshot().recovery!.pending[0]!.change).toEqual(
      metadata('C em transporte'),
    )
    expect(f.local()!.pending[0]!.expectedRevision).toBe('r1')
    expect(f.server().revision).toBe('r-published')
  } finally {
    release.resolve()
    await flushing
    f.session.dispose()
  }
})

test('a publication conflict fences C awaiting local persistence before any new wire', async () => {
  const f = fixture()
  await f.session.load()
  const confirm = f.session.publicationConfirmation('r1')
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  f.beforeLocalWrite(async (value) => {
    if (!value) return
    started.resolve()
    await release.promise
  })
  f.session.enqueue(metadata('C ainda no disco'))
  const flushing = f.session.flush().then(
    () => null,
    (error: unknown) => error,
  )
  try {
    await started.promise
    f.revise('r-published')
    expect(confirm({ ...structuredClone(f.server()), isPublished: true })).toBe('conflict')
    release.resolve()
    await flushing
    expect(f.commands).toHaveLength(0)
    expect(f.session.getSnapshot().status).toBe('conflict')
    expect(f.session.getSnapshot().draft!.document.title).toBe('C ainda no disco')
    expect(f.session.getSnapshot().recovery!.pending[0]!.change).toEqual(
      metadata('C ainda no disco'),
    )
    expect(f.local()!.pending[0]!.change).toEqual(metadata('C ainda no disco'))
  } finally {
    release.resolve()
    await flushing
    f.session.dispose()
  }
})

test('an uncertain C transport remains retryable with identical bytes after publication', async () => {
  const f = fixture()
  await f.session.load()
  const confirm = f.session.publicationConfirmation('r1')
  const started = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  f.transport(async () => {
    started.resolve()
    await release.promise
    throw new Error('Resposta do transporte perdida')
  })
  f.session.enqueue(metadata('C sem resposta'))
  const flushing = f.session.flush().then(
    () => null,
    (error: unknown) => error,
  )
  try {
    await started.promise
    f.revise('r-published')
    expect(confirm({ ...structuredClone(f.server()), isPublished: true })).toBe('conflict')
    release.resolve()
    expect(await flushing).toBeInstanceOf(Error)
    expect(f.session.getSnapshot().status).toBe('error')
    expect(f.session.getSnapshot().draft!.document.title).toBe('C sem resposta')
    f.transport(async (command) => {
      if (command.expectedRevision !== f.server().revision)
        throw { code: 'LESSON_DRAFT_CONFLICT', message: 'Conflito confirmado pelo CAS' }
      throw new Error('Old CAS cannot win after publication')
    })
    const retryError = await f.session.flush().then(
      () => null,
      (error: unknown) => error,
    )
    expect(retryError).toMatchObject({ code: 'LESSON_DRAFT_CONFLICT' })
    expect(f.commands).toHaveLength(2)
    expect(f.commands[1]).toEqual(f.commands[0])
    expect(f.session.getSnapshot().status).toBe('conflict')
    expect(f.session.getSnapshot().recovery!.pending[0]!.change).toEqual(metadata('C sem resposta'))
  } finally {
    release.resolve()
    await flushing
    f.session.dispose()
  }
})
