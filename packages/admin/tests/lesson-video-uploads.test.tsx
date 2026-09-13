import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonVideoUploadRegistry, LessonVideoUploads, useLessonVideoController } = await import(
  '../src/components/media/lesson-video-uploads'
)
const { VideoUploader } = await import('../src/components/media/video-uploader')

test('a processing video always offers a manual status retry', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = Object.assign(async () => new Promise<Response>(() => {}), {
    preconnect: originalFetch.preconnect,
  })
  const registry = new LessonVideoUploadRegistry()
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await act(async () =>
      root.render(
        <LessonVideoUploads registry={registry} onReady={() => {}}>
          <VideoUploader
            blockId="processing"
            currentSrc="https://player.vimeo.com/video/123456789"
            autoCheckStatus
            onReady={() => {}}
          />
        </LessonVideoUploads>,
      ),
    )
    expect(registry.getSnapshot().processing?.phase).toBe('processing')
    expect(
      [...container.querySelectorAll('button')].some(
        (b) => b.textContent?.includes('Verificar status/transcrição') && !b.disabled,
      ),
    ).toBe(true)
  } finally {
    await act(async () => root.unmount())
    globalThis.fetch = originalFetch
  }
})

test('the transfer lifecycle is isolated from editor visibility', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/lesson-video-transfer.fixture.tsx'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [output, errors, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(status, output + errors).toBe(0)
})

test('processing survives closing its editor and reports readiness only to its original block', async () => {
  const originalFetch = globalThis.fetch
  let resolveStatus!: (response: Response) => void
  let requests = 0
  globalThis.fetch = Object.assign(
    async () => {
      requests++
      return new Promise<Response>((resolve) => {
        resolveStatus = resolve
      })
    },
    { preconnect: originalFetch.preconnect },
  )
  const registry = new LessonVideoUploadRegistry()
  const received: string[] = []
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  function Field() {
    const controller = useLessonVideoController('video-a')
    return (
      <button type="button" onClick={() => controller?.checkStatus('123456789')}>
        Verificar vídeo
      </button>
    )
  }
  function Harness() {
    const [open, setOpen] = useState(true)
    return (
      <LessonVideoUploads registry={registry} onReady={(id) => received.push(id)}>
        <button type="button" onClick={() => setOpen(false)}>
          Fechar editor
        </button>
        {open && <Field />}
      </LessonVideoUploads>
    )
  }
  try {
    await act(async () => root.render(<Harness />))
    await act(async () => (container.querySelectorAll('button')[1] as HTMLButtonElement).click())
    expect(registry.getSnapshot()['video-a']?.phase).toBe('processing')
    await act(async () => (container.querySelector('button') as HTMLButtonElement).click())
    await act(async () =>
      resolveStatus(
        Response.json({
          status: 'ready',
          durationSeconds: 20,
          embedUrl: 'https://player.vimeo.com/video/123456789',
          captions: [],
        }),
      ),
    )
    expect(received).toEqual(['video-a'])
    expect(registry.getSnapshot()['video-a']?.phase).toBe('ready')
    expect(requests).toBe(1)
  } finally {
    await act(async () => root.unmount())
    globalThis.fetch = originalFetch
    container.remove()
  }
})

test('removing a video cancels its pending result instead of recreating the removed block', async () => {
  const originalFetch = globalThis.fetch
  let resolveStatus!: (response: Response) => void
  globalThis.fetch = Object.assign(
    async () =>
      new Promise<Response>((resolve) => {
        resolveStatus = resolve
      }),
    { preconnect: originalFetch.preconnect },
  )
  const registry = new LessonVideoUploadRegistry()
  const received: string[] = []
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await act(async () =>
      root.render(
        <LessonVideoUploads registry={registry} onReady={(id) => received.push(id)}>
          <span>Aula</span>
        </LessonVideoUploads>,
      ),
    )
    await act(async () => registry.request('removed', { checkId: '123456789' }))
    await act(async () => registry.remove('removed'))
    await act(async () =>
      resolveStatus(
        Response.json({
          status: 'ready',
          durationSeconds: 10,
          embedUrl: 'https://player.vimeo.com/video/123456789',
          captions: [],
        }),
      ),
    )
    expect(received).toEqual([])
    expect(registry.getSnapshot().removed).toBeUndefined()
  } finally {
    await act(async () => root.unmount())
    globalThis.fetch = originalFetch
  }
})
