import { expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LessonDraft } from '@sistemazero/core/learning'
import { type DraftRecovery, LessonDraftSession } from '../../src/lib/lesson-draft-session'
import type { VideoBlock } from '../../src/lib/types'

GlobalRegistrator.register({ url: 'http://localhost/' })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const transfers: { succeed(): void; aborted: number }[] = []
mock.module('tus-js-client', () => ({
  Upload: class {
    private transfer: (typeof transfers)[number]
    constructor(_file: File, options: { onSuccess(): void }) {
      this.transfer = { succeed: options.onSuccess, aborted: 0 }
      transfers.push(this.transfer)
    }
    start() {}
    abort() {
      this.transfer.aborted++
      return Promise.resolve()
    }
  },
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonVideoUploadRegistry, LessonVideoUploads } = await import(
  '../../src/components/media/lesson-video-uploads'
)
type ReadyVideo = import('../../src/components/media/use-video-upload').ReadyVideo
type VideoReceipt =
  import('../../src/components/media/lesson-video-uploads').LessonVideoDeliveryReceipt

const ready: ReadyVideo = {
  vimeoVideoId: '123456789',
  embedUrl: 'https://player.vimeo.com/video/123456789',
  durationSeconds: 42,
  captions: [{ lang: 'pt-BR', url: 'https://cdn.test/legenda.vtt' }],
}

async function setup(
  onReady: (id: string, video: ReadyVideo, receipt: VideoReceipt) => void = () => {},
) {
  const originalFetch = globalThis.fetch
  const statuses: ReturnType<typeof Promise.withResolvers<Response>>[] = []
  let tickets = 0
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/ticket')) {
        tickets++
        return Response.json({
          vimeoVideoId: ready.vimeoVideoId,
          embedUrl: ready.embedUrl,
          uploadLink: 'https://upload.test/tus',
        })
      }
      const deferred = Promise.withResolvers<Response>()
      statuses.push(deferred)
      return deferred.promise
    },
    { preconnect: originalFetch.preconnect },
  )
  const registry = new LessonVideoUploadRegistry()
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () =>
    root.render(
      <LessonVideoUploads registry={registry} onReady={onReady}>
        <span>Aula</span>
      </LessonVideoUploads>,
    ),
  )
  return {
    registry,
    statuses,
    getTickets: () => tickets,
    async close() {
      await act(async () => root.unmount())
      globalThis.fetch = originalFetch
    },
  }
}

test('capture retains hosted video before callbacks and fences a later status response', async () => {
  const received: ReadyVideo[] = []
  const fixture = await setup((_id, video) => received.push(video))
  try {
    await act(async () =>
      fixture.registry.request('a', {
        file: new File(['video'], 'a.mp4', { type: 'video/mp4' }),
      }),
    )
    const transfer = transfers.at(-1)!
    expect(fixture.registry.getSnapshot().a?.phase).toBe('uploading')
    expect(() => fixture.registry.prepareHandoff()).toThrow('envio')
    expect(transfer.aborted).toBe(0)
    expect(fixture.registry.getJobs()[0]?.file?.name).toBe('a.mp4')
    await act(async () => transfer.succeed())
    expect(fixture.statuses).toHaveLength(1)
    const snapshot = fixture.registry.prepareHandoff()
    expect(snapshot).toEqual([
      {
        blockId: 'a',
        requestId: fixture.registry.getJobs()[0]!.requestId,
        video: { ...ready, durationSeconds: null, captions: [] },
      },
    ])
    await act(async () =>
      fixture.statuses[0]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    expect(received).toHaveLength(1)
    expect(fixture.registry.prepareHandoff()).toEqual(snapshot)
    snapshot[0]!.video.embedUrl = 'https://mutated.test/'
    expect(fixture.registry.prepareHandoff()[0]!.video.embedUrl).toBe(ready.embedUrl)
    expect(fixture.getTickets()).toBe(1)
    expect(() => fixture.registry.request('b', { checkId: '987654321' })).toThrow()
    expect(fixture.registry.getJobs()).toHaveLength(1)
  } finally {
    await fixture.close()
  }
})

test.each([
  'throw',
  'reject',
] as const)('a presentation %s does not interrupt polling or lose the provisional result', async (failure) => {
  const fixture = await setup(() => {
    if (failure === 'throw') throw new Error('presentation failed')
    return Promise.reject(new Error('async presentation failed'))
  })
  try {
    const previousTransfers = transfers.length
    await act(async () =>
      fixture.registry.request('a', {
        file: new File(['video'], 'a.mp4', { type: 'video/mp4' }),
      }),
    )
    await act(async () => transfers.at(-1)!.succeed())
    expect(fixture.statuses).toHaveLength(1)
    expect(fixture.registry.getPresentationErrors().a).toContain('não foi possível aplicar')
    expect(fixture.registry.getSnapshot().a?.phase).toBe('processing')
    expect(fixture.registry.prepareHandoff()[0]!.video).toEqual({
      ...ready,
      durationSeconds: null,
      captions: [],
    })
    await act(async () => fixture.registry.resumeAfterHandoff())
    expect(fixture.statuses).toHaveLength(2)
    expect(fixture.getTickets()).toBe(1)
    expect(transfers.length - previousTransfers).toBe(1)
    await act(async () =>
      fixture.statuses[1]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    expect(fixture.registry.prepareHandoff()[0]!.video).toEqual(ready)
  } finally {
    await fixture.close()
  }
})

test.each([
  '401',
  'body',
] as const)('the status %s held across capture cannot redirect or alter captured bytes', async (held) => {
  const fixture = await setup()
  const originalUrl = window.location.href
  const body = Promise.withResolvers<unknown>()
  const bodyStarted = Promise.withResolvers<void>()
  try {
    await act(async () => fixture.registry.request('a', { checkId: ready.vimeoVideoId }))
    if (held === 'body') {
      const response = Response.json({ ignored: true })
      response.json = () => {
        bodyStarted.resolve()
        return body.promise
      }
      await act(async () => fixture.statuses[0]!.resolve(response))
      await bodyStarted.promise
    }
    const captured = fixture.registry.prepareHandoff()
    if (held === '401')
      await act(async () => fixture.statuses[0]!.resolve(new Response(null, { status: 401 })))
    else await act(async () => body.resolve({ ...ready, status: 'ready' }))
    expect(window.location.href).toBe(originalUrl)
    expect(fixture.registry.prepareHandoff()).toEqual(captured)
    expect(fixture.registry.getPresentationErrors()).toEqual({})
  } finally {
    await fixture.close()
    window.location.href = originalUrl
  }
})

test('capture before worker mount prevents its first status request until explicit resume', async () => {
  const fixture = await setup()
  try {
    await act(async () => {
      fixture.registry.request('a', { checkId: ready.vimeoVideoId })
      expect(fixture.registry.prepareHandoff()).toEqual([])
    })
    expect(fixture.statuses).toHaveLength(0)
    await act(async () => fixture.registry.resumeAfterHandoff())
    expect(fixture.statuses).toHaveLength(1)
    expect(fixture.getTickets()).toBe(0)
  } finally {
    await fixture.close()
  }
})

test('capture from the provisional callback fences the status request not yet started', async () => {
  const fixture = await setup(() => {
    fixture.registry.prepareHandoff()
  })
  try {
    await act(async () =>
      fixture.registry.request('a', {
        file: new File(['video'], 'a.mp4', { type: 'video/mp4' }),
      }),
    )
    await act(async () => transfers.at(-1)!.succeed())
    expect(fixture.statuses).toHaveLength(0)
    expect(fixture.registry.prepareHandoff()[0]!.video.embedUrl).toBe(ready.embedUrl)
    await act(async () => fixture.registry.resumeAfterHandoff())
    expect(fixture.statuses).toHaveLength(1)
    expect(fixture.getTickets()).toBe(1)
  } finally {
    await fixture.close()
  }
})

test('a completed result survives a presentation callback that does not apply it', async () => {
  let callbackSnapshot: unknown
  const fixture = await setup(() => {
    // The registry must already own the complete result before presentation is called.
    callbackSnapshot = fixture.registry.prepareHandoff()
  })
  try {
    await act(async () => fixture.registry.request('closed-block', { checkId: ready.vimeoVideoId }))
    await act(async () =>
      fixture.statuses[0]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    const result = fixture.registry.prepareHandoff()
    expect(result[0]!.video).toEqual(ready)
    expect(callbackSnapshot).toEqual(result)
    expect(fixture.registry.getSnapshot()['closed-block']?.phase).toBe('ready')
  } finally {
    await fixture.close()
  }
})

test('pre-seal resume starts a current status attempt without reviving the old response', async () => {
  const received: ReadyVideo[] = []
  const fixture = await setup((_id, video) => received.push(video))
  try {
    await act(async () => fixture.registry.request('a', { checkId: ready.vimeoVideoId }))
    expect(fixture.registry.prepareHandoff()).toEqual([])
    await act(async () => fixture.registry.resumeAfterHandoff())
    expect(fixture.statuses).toHaveLength(2)
    await act(async () =>
      fixture.statuses[0]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    expect(received).toEqual([])
    await act(async () =>
      fixture.statuses[1]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    expect(received).toEqual([ready])
    expect(fixture.registry.prepareHandoff()[0]!.video).toEqual(ready)
  } finally {
    await fixture.close()
  }
})

test('remove and recreate never reuse a job identity or accept its old status', async () => {
  const received: string[] = []
  const fixture = await setup((_id, video) => received.push(video.vimeoVideoId))
  try {
    await act(async () => fixture.registry.request('a', { checkId: ready.vimeoVideoId }))
    const oldId = fixture.registry.getJobs()[0]!.requestId
    await act(async () => fixture.registry.remove('a'))
    await act(async () => fixture.registry.request('a', { checkId: '987654321' }))
    expect(fixture.registry.getJobs()[0]!.requestId).not.toBe(oldId)
    await act(async () =>
      fixture.statuses[0]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    expect(received).toEqual([])
    await act(async () =>
      fixture.statuses[1]!.resolve(
        Response.json({ ...ready, vimeoVideoId: '987654321', status: 'ready' }),
      ),
    )
    expect(received).toEqual(['987654321'])
    expect(fixture.registry.prepareHandoff()[0]!.video.vimeoVideoId).toBe('987654321')
  } finally {
    await fixture.close()
  }
})

test('only the exact incorporated delivery is omitted; its hosted File remains safe', async () => {
  const receipts: VideoReceipt[] = []
  const fixture = await setup((_id, _video, receipt) => receipts.push(receipt))
  try {
    await act(async () =>
      fixture.registry.request('a', {
        file: new File(['video'], 'a.mp4', { type: 'video/mp4' }),
      }),
    )
    await act(async () => transfers.at(-1)!.succeed())
    expect(receipts[0]!.acknowledge()).toBe(true)
    // Acknowledgement does not erase proof that the File is hosted.
    expect(fixture.registry.prepareHandoff()).toEqual([])
    await act(async () => fixture.registry.resumeAfterHandoff())
    await act(async () =>
      fixture.statuses[1]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    expect(receipts).toHaveLength(2)
    expect(receipts[0]!.acknowledge()).toBe(false)
    expect(fixture.registry.prepareHandoff()[0]!.video).toEqual(ready)
    // A late acknowledgement cannot mutate a frozen snapshot.
    expect(receipts[1]!.acknowledge()).toBe(false)
    expect(fixture.registry.prepareHandoff()[0]!.video).toEqual(ready)
  } finally {
    await fixture.close()
  }
})

test('an acknowledged provisional delivery cannot replace a later explicit source edit', async () => {
  const receipts: VideoReceipt[] = []
  let source = ''
  const fixture = await setup((_id, video, receipt) => {
    source = video.embedUrl
    receipts.push(receipt)
    receipt.acknowledge()
  })
  try {
    await act(async () =>
      fixture.registry.request('a', {
        file: new File(['video'], 'a.mp4', { type: 'video/mp4' }),
      }),
    )
    await act(async () => transfers.at(-1)!.succeed())
    expect(source).toBe(ready.embedUrl)
    // Editorial replacement explicitly supersedes this job before mutating source.
    await act(async () => fixture.registry.remove('a'))
    source = 'https://player.vimeo.com/video/987654321'
    await act(async () =>
      fixture.statuses[0]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    expect(source).toBe('https://player.vimeo.com/video/987654321')
    expect(receipts[0]!.acknowledge()).toBe(false)
    expect(fixture.registry.prepareHandoff()).toEqual([])
  } finally {
    await fixture.close()
  }
})

test('a receipt cannot revive after freeze and resume without a new delivery', async () => {
  const receipts: VideoReceipt[] = []
  const fixture = await setup((_id, _video, receipt) => receipts.push(receipt))
  try {
    await act(async () => fixture.registry.request('a', { checkId: ready.vimeoVideoId }))
    await act(async () =>
      fixture.statuses[0]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    const before = fixture.registry.prepareHandoff()
    expect(receipts[0]!.acknowledge()).toBe(false)
    await act(async () => fixture.registry.resumeAfterHandoff())
    expect(fixture.statuses).toHaveLength(1)
    const oldReceiptAccepted = receipts[0]!.acknowledge()
    const after = fixture.registry.prepareHandoff()
    expect(oldReceiptAccepted).toBe(false)
    expect(after).toEqual(before)
  } finally {
    await fixture.close()
  }
})

test('an old presentation rejection after resume is observed without becoming a current error', async () => {
  const presentation = Promise.withResolvers<void>()
  const fixture = await setup(() => presentation.promise)
  try {
    await act(async () => fixture.registry.request('a', { checkId: ready.vimeoVideoId }))
    await act(async () =>
      fixture.statuses[0]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    const before = fixture.registry.prepareHandoff()
    await act(async () => fixture.registry.resumeAfterHandoff())
    await act(async () => presentation.reject(new Error('retired presentation')))
    expect(fixture.registry.getPresentationErrors()).toEqual({})
    expect(fixture.registry.prepareHandoff()).toEqual(before)
  } finally {
    await fixture.close()
  }
})

test('partial Session acceptance leaves the real delivery pending for explicit capture', async () => {
  const draft: LessonDraft<VideoBlock> = {
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
      attachments: [],
      plannedVideos: [],
      blocks: [{ id: 'a', content: { kind: 'video', provider: 'vimeo', src: '' } }],
    },
  }
  let local: DraftRecovery<VideoBlock> | null = null
  const getLocal = (): DraftRecovery<VideoBlock> | null => local
  const session = new LessonDraftSession<VideoBlock>({
    read: async () => structuredClone(draft),
    readLocal: async () => null,
    writeLocal: async (value) => {
      local = structuredClone(value)
    },
    archiveLocal: async () => {},
    send: async () => {
      throw new Error('Capture must not start a network operation')
    },
  })
  await session.load()
  let handoff: ReturnType<typeof session.beginHandoff> | undefined
  const getHandoff = (): ReturnType<typeof session.beginHandoff> | undefined => handoff
  const unsubscribe = session.subscribe(() => {
    if (!handoff && session.getSnapshot().draft?.document.blocks[0]?.content.src)
      handoff = session.beginHandoff()
  })
  const fixture = await setup((id, video, receipt) => {
    const acceptedBlock = session.enqueue({
      type: 'block',
      block: { id, content: { kind: 'video', provider: 'vimeo', src: video.embedUrl } },
    })
    const acceptedPlan = session.enqueue({
      type: 'planned-videos',
      plannedVideos: [{ blockId: id, instructions: '', videoId: video.vimeoVideoId }],
    })
    if (acceptedBlock && acceptedPlan) receipt.acknowledge()
  })
  try {
    await act(async () => fixture.registry.request('a', { checkId: ready.vimeoVideoId }))
    await act(async () =>
      fixture.statuses[0]!.resolve(Response.json({ ...ready, status: 'ready' })),
    )
    const capture = getHandoff()
    if (!capture) throw new Error('Expected handoff between the real Session commands')
    const pending = fixture.registry.prepareHandoff()
    expect(pending).toHaveLength(1)
    expect(session.getSnapshot().draft?.document.plannedVideos).toEqual([])
    const result = pending[0]!
    capture.capture({
      type: 'block',
      block: {
        id: result.blockId,
        content: {
          kind: 'video',
          provider: 'vimeo',
          src: result.video.embedUrl,
          durationSeconds: result.video.durationSeconds ?? undefined,
          captions: result.video.captions,
        },
      },
    })
    capture.capture({
      type: 'planned-videos',
      plannedVideos: [
        { blockId: result.blockId, instructions: '', videoId: result.video.vimeoVideoId },
      ],
    })
    capture.seal()
    await capture.confirmLocal()
    await capture.retire()
    expect(getLocal()?.document.blocks[0]?.content.durationSeconds).toBe(42)
    expect(getLocal()?.document.blocks[0]?.content.captions).toEqual(ready.captions)
    expect(getLocal()?.document.plannedVideos[0]?.videoId).toBe(ready.vimeoVideoId)
  } finally {
    unsubscribe()
    await fixture.close()
  }
})
