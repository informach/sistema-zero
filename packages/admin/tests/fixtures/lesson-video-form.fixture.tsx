import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LessonDraft } from '@sistemazero/core/learning'
import { act, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import {
  type LessonVideoDeliveryReceipt,
  LessonVideoUploadRegistry,
} from '../../src/components/media/lesson-video-uploads'
import type { ReadyVideo } from '../../src/components/media/use-video-upload'
import { type BlockForm, EMPTY_BLOCK } from '../../src/lib/lesson-block-form'
import { type DraftRecovery, LessonDraftSession } from '../../src/lib/lesson-draft-session'
import { type LessonFormBuffer, LessonFormBufferSlot } from '../../src/lib/lesson-form-buffer'
import { buildLessonFormContent } from '../../src/lib/lesson-form-content'
import { applyLessonVideoDelivery } from '../../src/lib/lesson-video-delivery'
import type { LessonBlockContent } from '../../src/lib/types'

if (typeof document === 'undefined') GlobalRegistrator.register({ url: 'http://localhost/' })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const blockId = '11111111-1111-4111-8111-111111111111'
const otherBlockId = '22222222-2222-4222-8222-222222222222'
const originalSrc = 'https://player.vimeo.com/video/123456789'
const originalPoster = 'https://assets.test/old.webp'
const currentPoster = 'https://assets.test/working-buffer.webp'
const ready: ReadyVideo = {
  vimeoVideoId: '123456789',
  embedUrl: originalSrc,
  durationSeconds: 70,
  captions: [{ lang: 'pt', url: 'https://assets.test/pt.vtt' }],
}

async function fixture() {
  const draft: LessonDraft<LessonBlockContent> = {
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
      blocks: [
        {
          id: blockId,
          content: {
            kind: 'video',
            provider: 'vimeo',
            src: originalSrc,
            posterUrl: originalPoster,
          },
        },
        {
          id: otherBlockId,
          content: { kind: 'video', provider: 'file', src: 'https://assets.test/another.mp4' },
        },
      ],
      attachments: [],
      plannedVideos: [],
    },
  }
  let local: DraftRecovery<LessonBlockContent> | null = null
  let revision = 1
  const session = new LessonDraftSession<LessonBlockContent>({
    read: async () => structuredClone(draft),
    readLocal: async () => null,
    writeLocal: async (value) => {
      local = structuredClone(value)
    },
    archiveLocal: async () => {},
    send: async () => ({ revision: `r${++revision}`, updatedAt: 'later' }),
  })
  let activeCapture: ReturnType<typeof session.beginHandoff> | undefined
  const beginCapture = () => {
    activeCapture ??= session.beginHandoff()
    return activeCapture
  }
  await session.load()
  const slot = new LessonFormBufferSlot<BlockForm>(() => session.canEdit())
  const opening = slot.open(blockId, {
    ...EMPTY_BLOCK,
    kind: 'video',
    src: originalSrc,
    posterUrl: originalPoster,
  })
  const registry = new LessonVideoUploadRegistry()
  registry.request(blockId, { checkId: ready.vimeoVideoId })
  const job = registry.getJobs()[0]
  if (!job) throw new Error('Expected real registry job')
  let receipt: LessonVideoDeliveryReceipt | undefined
  let accepted = false
  const receive = (currentOpening: () => LessonFormBuffer<BlockForm> | null = () => opening) =>
    registry.receive(blockId, job.requestId, ready, (id, video, delivery) => {
      receipt = delivery
      accepted = applyLessonVideoDelivery({
        session,
        blockId: id,
        video,
        receipt: delivery,
        currentOpening,
      })
    })
  return {
    session,
    opening,
    slot,
    registry,
    requestId: job.requestId,
    receive,
    accepted: () => accepted,
    receipt: () => receipt,
    local: () => local,
    beginCapture,
    close: async () => {
      const handoff = beginCapture()
      handoff.seal()
      await handoff.confirmLocal()
      await handoff.retire()
    },
  }
}

test('real Vimeo delivery preserves the uncommitted working poster in form, domain and receipt', async () => {
  const f = await fixture()
  const container = document.createElement('div')
  const root = createRoot(container)
  let domAtDelivery = ''
  let captured: LessonBlockContent | undefined
  function Form() {
    const form = useSyncExternalStore(
      f.opening.subscribe,
      f.opening.getSnapshot,
      f.opening.getSnapshot,
    )
    return (
      <>
        <output>{form.posterUrl}</output>
        <button
          type="button"
          onClick={() => {
            f.opening.update((previous) => ({ ...previous, posterUrl: currentPoster }))
            f.receive()
            domAtDelivery = container.querySelector('output')?.textContent ?? ''
            captured = buildLessonFormContent(f.opening, { kind: 'none' })
          }}
        >
          Alterar e receber vídeo
        </button>
      </>
    )
  }
  try {
    await act(async () => root.render(<Form />))
    await act(async () => container.querySelector('button')!.click())
    expect(domAtDelivery).toBe(originalPoster)
    expect(f.accepted()).toBe(true)
    expect(captured).toMatchObject({
      kind: 'video',
      posterUrl: currentPoster,
      durationSeconds: 70,
      captions: ready.captions,
    })
    expect(f.session.getSnapshot().draft?.document.blocks[0]?.content).toMatchObject({
      kind: 'video',
      posterUrl: currentPoster,
      durationSeconds: 70,
    })
    expect(f.session.getSnapshot().draft?.document.plannedVideos).toEqual([
      { blockId, instructions: '', videoId: ready.vimeoVideoId },
    ])
    expect(f.registry.prepareHandoff()).toEqual([])
    expect(container.querySelector('output')?.textContent).toBe(currentPoster)
  } finally {
    await act(async () => root.unmount())
    await f.close()
  }
})

test('handoff after the first domain command leaves the exact delivery pending', async () => {
  const f = await fixture()
  let interrupted = false
  const unsubscribe = f.session.subscribe(() => {
    const content = f.session.getSnapshot().draft?.document.blocks[0]?.content
    if (
      !interrupted &&
      content?.kind === 'video' &&
      content.durationSeconds === ready.durationSeconds
    ) {
      interrupted = true
      f.beginCapture()
    }
  })
  try {
    f.receive()
    expect(interrupted).toBe(true)
    expect(f.accepted()).toBe(false)
    expect(f.session.getSnapshot().draft?.document.plannedVideos).toEqual([])
    expect(f.opening.getSnapshot().durationSeconds).toBe('70')
    expect(f.registry.prepareHandoff()).toEqual([{ blockId, requestId: f.requestId, video: ready }])
  } finally {
    unsubscribe()
    await f.close()
  }
})

test('a planned-video change made by a synchronous subscriber survives the delivery', async () => {
  const f = await fixture()
  let revised = false
  const other = { blockId: otherBlockId, instructions: 'Another intention', videoId: null }
  const unsubscribe = f.session.subscribe(() => {
    const content = f.session.getSnapshot().draft?.document.blocks[0]?.content
    if (
      !revised &&
      content?.kind === 'video' &&
      content.durationSeconds === ready.durationSeconds
    ) {
      revised = true
      f.session.enqueue({
        type: 'planned-videos',
        plannedVideos: [{ blockId, instructions: 'New teacher directions', videoId: null }, other],
      })
    }
  })
  try {
    f.receive()
    expect(f.accepted()).toBe(true)
    expect(f.session.getSnapshot().draft?.document.plannedVideos).toEqual([
      { blockId, instructions: 'New teacher directions', videoId: ready.vimeoVideoId },
      other,
    ])
    expect(f.registry.prepareHandoff()).toEqual([])
  } finally {
    unsubscribe()
    await f.close()
  }
})

test('a new upload started by a buffer subscriber retires delivery before domain effects', async () => {
  const f = await fixture()
  const newFile = new File(['new upload bytes'], 'next.mp4', { type: 'video/mp4' })
  let replaced = false
  const unsubscribe = f.opening.subscribe(() => {
    if (!replaced) {
      replaced = true
      f.registry.request(blockId, { file: newFile })
    }
  })
  try {
    f.receive()
    expect(f.accepted()).toBe(false)
    expect(f.receipt()?.isCurrent()).toBe(false)
    expect(f.session.getSnapshot().draft?.document.blocks[0]?.content).toEqual({
      kind: 'video',
      provider: 'vimeo',
      src: originalSrc,
      posterUrl: originalPoster,
    })
    expect(f.session.getSnapshot().draft?.document.plannedVideos).toEqual([])
    expect(f.registry.getJobs()[0]?.file).toBe(newFile)
    expect(() => f.registry.prepareHandoff()).toThrow('Aguarde o envio')
  } finally {
    unsubscribe()
    f.registry.resumeAfterHandoff()
    f.registry.remove(blockId)
    await f.close()
  }
})

test('delivery to A does not fill the current B form', async () => {
  const f = await fixture()
  f.slot.close(f.opening)
  const b = f.slot.open(otherBlockId, {
    ...EMPTY_BLOCK,
    kind: 'video',
    src: 'https://assets.test/another.mp4',
    posterUrl: currentPoster,
  })
  const before = b.getSnapshot()
  try {
    f.receive(() => b)
    expect(f.accepted()).toBe(true)
    expect(b.getSnapshot()).toBe(before)
    expect(f.session.getSnapshot().draft?.document.blocks[0]?.content).toMatchObject({
      kind: 'video',
      src: originalSrc,
      durationSeconds: ready.durationSeconds,
    })
    expect(f.session.getSnapshot().draft?.document.blocks[1]?.content).toMatchObject({
      kind: 'video',
      provider: 'file',
      src: 'https://assets.test/another.mp4',
    })
  } finally {
    await f.close()
  }
})

test('a new form opening during the first command prevents an incorporation receipt', async () => {
  const f = await fixture()
  let active = f.opening
  let switched = false
  const unsubscribe = f.session.subscribe(() => {
    const content = f.session.getSnapshot().draft?.document.blocks[0]?.content
    if (
      !switched &&
      content?.kind === 'video' &&
      content.durationSeconds === ready.durationSeconds
    ) {
      switched = true
      f.slot.close(active)
      active = f.slot.open(blockId, {
        ...EMPTY_BLOCK,
        kind: 'video',
        src: originalSrc,
        posterUrl: currentPoster,
      })
    }
  })
  try {
    f.receive(() => active)
    expect(switched).toBe(true)
    expect(f.accepted()).toBe(false)
    expect(active.getSnapshot().posterUrl).toBe(currentPoster)
    expect(active.getSnapshot().durationSeconds).toBe('')
    expect(f.session.getSnapshot().draft?.document.plannedVideos).toEqual([])
    expect(f.registry.prepareHandoff()).toEqual([{ blockId, requestId: f.requestId, video: ready }])
  } finally {
    unsubscribe()
    await f.close()
  }
})

test('receipt relevance never returns after freeze and resume without a new delivery', async () => {
  const f = await fixture()
  try {
    f.receive()
    const receipt = f.receipt()
    expect(receipt?.isCurrent()).toBe(true)
    f.registry.prepareHandoff()
    expect(receipt?.isCurrent()).toBe(false)
    f.registry.resumeAfterHandoff()
    expect(receipt?.isCurrent()).toBe(false)
  } finally {
    await f.close()
  }
})

const afterPlannedChanges: (
  | 'remove-block'
  | 'replace-src'
  | 'remove-planned'
  | 'replace-planned'
  | 'replace-buffer-src'
)[] = ['remove-block', 'replace-src', 'remove-planned', 'replace-planned', 'replace-buffer-src']

for (const change of afterPlannedChanges) {
  test(`delivery stays pending when the second-command subscriber performs ${change}`, async () => {
    const f = await fixture()
    const replacementSrc = 'https://assets.test/teacher-replacement.mp4'
    const replacementId = '987654321'
    let changed = false
    const unsubscribe = f.session.subscribe(() => {
      const document = f.session.getSnapshot().draft?.document
      if (
        changed ||
        !document?.plannedVideos.some(
          (entry) => entry.blockId === blockId && entry.videoId === ready.vimeoVideoId,
        )
      )
        return
      changed = true
      switch (change) {
        case 'remove-block':
          f.session.enqueue({ type: 'remove-block', blockId })
          break
        case 'replace-src':
          f.session.enqueue({
            type: 'block',
            block: {
              id: blockId,
              content: { kind: 'video', provider: 'file', src: replacementSrc },
            },
          })
          break
        case 'remove-planned':
          f.session.enqueue({ type: 'planned-videos', plannedVideos: [] })
          break
        case 'replace-planned':
          f.session.enqueue({
            type: 'planned-videos',
            plannedVideos: [{ blockId, instructions: 'Teacher choice', videoId: replacementId }],
          })
          break
        case 'replace-buffer-src':
          f.opening.update((form) => ({ ...form, src: replacementSrc }))
          break
      }
    })
    try {
      f.receive()
      expect(changed).toBe(true)
      expect(f.accepted()).toBe(false)
      expect(f.registry.prepareHandoff()).toEqual([
        { blockId, requestId: f.requestId, video: ready },
      ])
      const document = f.session.getSnapshot().draft?.document
      switch (change) {
        case 'remove-block':
          expect(document?.blocks.find((block) => block.id === blockId)).toBeUndefined()
          break
        case 'replace-src':
          expect(document?.blocks.find((block) => block.id === blockId)?.content).toMatchObject({
            kind: 'video',
            src: replacementSrc,
          })
          break
        case 'remove-planned':
          expect(document?.plannedVideos).toEqual([])
          break
        case 'replace-planned':
          expect(document?.plannedVideos[0]?.videoId).toBe(replacementId)
          break
        case 'replace-buffer-src':
          expect(f.opening.getSnapshot().src).toBe(replacementSrc)
          break
      }
    } finally {
      unsubscribe()
      await f.close()
    }
  })
}

test('second-command editorial changes preserve poster and instructions without rejecting video', async () => {
  const f = await fixture()
  let edited = false
  const unsubscribe = f.session.subscribe(() => {
    const document = f.session.getSnapshot().draft?.document
    if (
      edited ||
      !document?.plannedVideos.some(
        (entry) => entry.blockId === blockId && entry.videoId === ready.vimeoVideoId,
      )
    )
      return
    edited = true
    f.opening.update((form) => ({ ...form, posterUrl: currentPoster }))
    const block = document.blocks.find((entry) => entry.id === blockId)
    if (block?.content.kind !== 'video') throw new Error('Expected current real video')
    f.session.enqueue({
      type: 'block',
      block: { id: blockId, content: { ...block.content, posterUrl: currentPoster } },
    })
    f.session.enqueue({
      type: 'planned-videos',
      plannedVideos: document.plannedVideos.map((entry) =>
        entry.blockId === blockId
          ? { ...entry, instructions: 'Current teacher instructions' }
          : entry,
      ),
    })
  })
  try {
    f.receive()
    expect(edited).toBe(true)
    expect(f.accepted()).toBe(true)
    expect(f.registry.prepareHandoff()).toEqual([])
    expect(f.opening.getSnapshot().posterUrl).toBe(currentPoster)
    expect(f.session.getSnapshot().draft?.document.blocks[0]?.content).toMatchObject({
      kind: 'video',
      src: ready.embedUrl,
      posterUrl: currentPoster,
    })
    expect(f.session.getSnapshot().draft?.document.plannedVideos).toEqual([
      { blockId, instructions: 'Current teacher instructions', videoId: ready.vimeoVideoId },
    ])
  } finally {
    unsubscribe()
    await f.close()
  }
})
