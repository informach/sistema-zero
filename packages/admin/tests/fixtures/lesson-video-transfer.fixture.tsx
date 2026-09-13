import { expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// Only the external TUS transport is replaced. The registry, hook, editor subscriber,
// ticket request and readiness callback execute their production lifecycle.
const transfer = {
  aborted: 0,
  options: null as {
    onSuccess: () => void
    onProgress: (sent: number, total: number) => void
  } | null,
}
mock.module('tus-js-client', () => ({
  Upload: class {
    constructor(_file: File, options: NonNullable<typeof transfer.options>) {
      transfer.options = options
    }
    start() {
      transfer.options!.onProgress(3, 10)
    }
    abort() {
      transfer.aborted++
      return Promise.resolve()
    }
  },
}))
const { act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonVideoUploadRegistry, LessonVideoUploads, useLessonVideoController } = await import(
  '../../src/components/media/lesson-video-uploads'
)

test('a transferring video survives switching editors and completes in the original lesson block', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.endsWith('/ticket'))
        return Response.json({
          vimeoVideoId: '123456789',
          uploadLink: 'https://upload.example.test/one',
          embedUrl: 'https://player.vimeo.com/video/123456789',
        })
      if (path.endsWith('/status'))
        return Response.json({
          status: 'ready',
          durationSeconds: 42,
          captions: [],
          embedUrl: 'https://player.vimeo.com/video/123456789',
        })
      throw new Error(`Unexpected request: ${path}`)
    },
    { preconnect: originalFetch.preconnect },
  )
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const registry = new LessonVideoUploadRegistry()
  const received: { id: string; duration: number | null }[] = []
  function Editor({ blockId }: { blockId: string }) {
    const controller = useLessonVideoController(blockId)
    return (
      <button
        type="button"
        onClick={() =>
          void controller!.upload(new File(['video'], 'aula.mp4', { type: 'video/mp4' }))
        }
      >
        Enviar {blockId}
      </button>
    )
  }
  function Harness() {
    const [blockId, setBlockId] = useState('video-a')
    return (
      <LessonVideoUploads
        registry={registry}
        onReady={(id, video) => received.push({ id, duration: video.durationSeconds })}
      >
        <button type="button" onClick={() => setBlockId('video-b')}>
          Editar outra seção
        </button>
        <Editor key={blockId} blockId={blockId} />
      </LessonVideoUploads>
    )
  }
  try {
    await act(async () => root.render(<Harness />))
    await act(async () => container.querySelectorAll('button')[1]!.click())
    expect(registry.getSnapshot()['video-a']).toMatchObject({ phase: 'uploading', progress: 0.3 })
    await act(async () => container.querySelector('button')!.click())
    expect(container.textContent).toContain('Enviar video-b')
    expect(transfer.aborted).toBe(0)
    await act(async () => transfer.options!.onSuccess())
    expect(registry.getSnapshot()['video-a']?.phase).toBe('ready')
    expect(registry.getSnapshot()['video-b']).toBeUndefined()
    expect(received).toEqual([
      { id: 'video-a', duration: null },
      { id: 'video-a', duration: 42 },
    ])
  } finally {
    await act(async () => root.unmount())
    globalThis.fetch = originalFetch
    container.remove()
  }
})
