import { expect, test } from 'bun:test'
import type { LessonDraft } from '@sistemazero/core/learning'
import { type DraftRecovery, LessonDraftSession } from '../src/lib/lesson-draft-session'

type Video = { kind: 'video'; provider: 'vimeo'; src: string }

test('enqueue reports actual acceptance when a subscriber begins handoff between video commands', async () => {
  const draft: LessonDraft<Video> = {
    lessonId: 'lesson',
    revision: 'r1',
    publishedRevision: 'p1',
    isPublished: true,
    canUndoRestore: false,
    updatedBy: 'author',
    updatedAt: 'now',
    document: {
      title: 'Vídeo',
      slug: 'video',
      estimatedMinutes: null,
      sections: [],
      blocks: [{ id: 'video', content: { kind: 'video', provider: 'vimeo', src: '' } }],
      attachments: [],
      plannedVideos: [],
    },
  }
  let local: DraftRecovery<Video> | null = null
  const getLocal = (): DraftRecovery<Video> | null => local
  const session = new LessonDraftSession<Video>({
    read: async () => structuredClone(draft),
    readLocal: async () => null,
    writeLocal: async (value) => {
      local = structuredClone(value)
    },
    archiveLocal: async () => {},
    send: async () => {
      throw new Error('This capture must not start a network operation')
    },
  })
  await session.load()
  let handoff: ReturnType<typeof session.beginHandoff> | undefined
  const getHandoff = (): ReturnType<typeof session.beginHandoff> | undefined => handoff
  const unsubscribe = session.subscribe(() => {
    if (!handoff && session.getSnapshot().draft?.document.blocks[0]?.content.src)
      handoff = session.beginHandoff()
  })
  const content: Video = {
    kind: 'video',
    provider: 'vimeo',
    src: 'https://player.vimeo.com/video/123456789',
  }
  const planned = [{ blockId: 'video', instructions: '', videoId: '123456789' }]
  const blockAccepted = session.enqueue({ type: 'block', block: { id: 'video', content } })
  const planAccepted = session.enqueue({ type: 'planned-videos', plannedVideos: planned })
  // The first command really applied, but normal return from the second was not acceptance.
  const beforeCapture = structuredClone(session.getSnapshot().draft?.document)
  unsubscribe()
  const capture = getHandoff()
  if (!capture) throw new Error('Expected the real synchronous subscriber to begin handoff')
  capture.capture({ type: 'block', block: { id: 'video', content } })
  capture.capture({ type: 'planned-videos', plannedVideos: planned })
  capture.seal()
  await capture.confirmLocal()
  await capture.retire()
  const retiredAccepted = session.enqueue({ type: 'planned-videos', plannedVideos: [] })
  expect(beforeCapture?.blocks[0]?.content.src).toBe(content.src)
  expect(beforeCapture?.plannedVideos).toEqual([])
  expect(blockAccepted).toBe(true)
  expect(planAccepted).toBe(false)
  expect(retiredAccepted).toBe(false)
  expect(getLocal()?.document.plannedVideos).toEqual(planned)
})
