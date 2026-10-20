import { afterEach, expect, spyOn, test } from 'bun:test'
import { createPythonPreviewContext } from './previewObserver'

const originalParent = Object.getOwnPropertyDescriptor(window, 'parent')
const originalURL = location.href
if (!('happyDOM' in window) || !window.happyDOM || typeof window.happyDOM !== 'object')
  throw new Error('Happy DOM required')
const dom = window.happyDOM
if (
  !('setURL' in dom) ||
  typeof dom.setURL !== 'function' ||
  !('settings' in dom) ||
  !dom.settings ||
  typeof dom.settings !== 'object'
)
  throw new Error('DOM lifecycle API missing')
const settings = dom.settings
const setURL = dom.setURL.bind(dom)
const scopes: AbortController[] = []
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.abort()
  if (originalParent) Object.defineProperty(window, 'parent', originalParent)
  else Reflect.deleteProperty(window, 'parent')
  setURL(originalURL)
  document.body.innerHTML = ''
})
function fixture() {
  if (
    !('disableIframePageLoading' in settings) ||
    typeof settings.disableIframePageLoading !== 'boolean'
  )
    throw new Error('DOM iframe setting missing')
  const frame = document.createElement('iframe')
  const originalLoading = settings.disableIframePageLoading
  settings.disableIframePageLoading = false
  try {
    document.body.append(frame)
  } finally {
    settings.disableIframePageLoading = originalLoading
  }
  const parent = frame.contentWindow
  if (!parent) throw new Error('Parent fixture unavailable')
  Object.defineProperty(window, 'parent', { configurable: true, value: parent })
  const session = crypto.randomUUID(),
    previewId = 'a'.repeat(64)
  setURL(
    `https://preview.test/v1/python-previews/${previewId}/index.html#studio-preview-session=${session}`,
  )
  const meta = document.createElement('meta')
  meta.name = 'studio-python-preview-parent'
  meta.content = 'https://editor.test'
  document.body.append(meta)
  const messages: unknown[] = []
  const posted = spyOn(parent, 'postMessage').mockImplementation((value) => {
    messages.push(value)
  })
  const scope = new AbortController()
  scopes.push(scope)
  const context = createPythonPreviewContext()
  if (!context.hostAudio) throw new Error('Missing preview host capability')
  const pending = context.hostAudio(scope.signal)
  const ready = messages[0]
  if (!ready || typeof ready !== 'object' || !('requestId' in ready))
    throw new Error('Ready envelope missing')
  const send = (
    delta: Record<string, unknown> = {},
    origin = 'https://editor.test',
    source: Window = parent,
  ) => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin,
        source,
        data: {
          type: 'studio-python-preview-audio',
          version: 1,
          session,
          previewId,
          requestId: ready.requestId,
          sequence: 0,
          muted: true,
          ...delta,
        },
      }),
    )
  }
  return { context, pending, scope, messages, send, posted, parent, ready }
}

test('trusted preview waits for exact parent initial state, updates without replacing preference and rejects learner/stale messages', async () => {
  const f = fixture()
  let settled = false
  void f.pending.then(() => {
    settled = true
  })
  f.send({}, 'https://attacker.test')
  f.send({}, 'https://editor.test', window)
  for (const delta of [
    { session: crypto.randomUUID() },
    { previewId: 'b'.repeat(64) },
    { requestId: crypto.randomUUID() },
    { sequence: 1 },
    { muted: 'false' },
  ])
    f.send(delta)
  await Promise.resolve()
  expect(settled).toBe(false)
  f.send()
  const preference = await f.pending
  expect(preference.getMuted()).toBe(true)
  const changes: boolean[] = []
  preference.subscribe(() => {
    changes.push(preference.getMuted())
  })
  f.send({ sequence: 1, muted: false })
  expect(preference.getMuted()).toBe(false)
  f.send({ sequence: 1, muted: true })
  f.send({ sequence: 2, muted: true }, 'https://editor.test', window)
  expect(changes).toEqual([false])
  f.scope.abort()
  f.send({ sequence: 2, muted: true })
  expect(changes).toEqual([false])
  expect(() => preference.getMuted()).toThrow()
  f.posted.mockRestore()
})

test('new launcher mount requests a fresh binding; old init cannot unlock it', async () => {
  const f = fixture()
  const nextScope = new AbortController()
  scopes.push(nextScope)
  if (!f.context.hostAudio) throw new Error('Missing preview host capability')
  f.scope.abort()
  await expect(f.pending).rejects.toThrow()
  const next = f.context.hostAudio(nextScope.signal)
  const ready = f.messages[1]
  if (!ready || typeof ready !== 'object' || !('requestId' in ready))
    throw new Error('New ready missing')
  expect(ready.requestId).not.toBe(f.ready.requestId)
  let settled = false
  void next.then(() => {
    settled = true
  })
  f.send()
  await Promise.resolve()
  expect(settled).toBe(false)
  f.send({ requestId: ready.requestId })
  expect((await next).getMuted()).toBe(true)
  f.posted.mockRestore()
})

test('ordinary export has no host gate, but malformed preview metadata cannot fall back to unmuted export', async () => {
  setURL('https://export.test/export/index.html')
  expect(createPythonPreviewContext().hostAudio).toBeUndefined()
  setURL('https://preview.test/v1/python-previews/invalid/index.html')
  const context = createPythonPreviewContext()
  expect(context.hostAudio).toBeDefined()
  if (!context.hostAudio) throw new Error('Malformed preview was allowed')
  await expect(context.hostAudio(new AbortController().signal)).rejects.toThrow('inválido')
})

test('missing initial preference fails closed and removes its listener within the fixed startup budget', async () => {
  const f = fixture()
  try {
    await expect(f.pending).rejects.toThrow('não confirmou')
    f.send()
    expect(f.messages).toHaveLength(1)
  } finally {
    f.posted.mockRestore()
  }
}, 7000)
