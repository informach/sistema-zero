import { afterAll, afterEach, expect, spyOn, test } from 'bun:test'
import { studioPythonExecutionRevision } from '@sistemazero/core/studio/python-execution-content'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { preparePythonExecutionSnapshot } from './snapshot'
import { pythonWebBytesSha256, readPythonWebBytes } from './webFiles'
import { loadPythonWebPayload } from './webPayload'

const controller = () => new AbortController()
const request = spyOn(globalThis, 'fetch')
const fetchImplementation = (
  implementation: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
) => Object.assign(implementation, { preconnect: globalThis.fetch.preconnect })
afterEach(() => request.mockReset())
afterAll(() => request.mockRestore())

async function fixture() {
  const project = documentFixture('python', 'classic')
  project.assets = []
  const snapshot = await preparePythonExecutionSnapshot(project)
  const files = snapshot.files.map(({ bytes, ...file }) => ({
    ...file,
    byteLength: bytes.byteLength,
  }))
  const payload = { version: 1, name: project.name, snapshot: { ...snapshot, files } }
  const seen: string[] = []
  request.mockImplementation(
    fetchImplementation(async (raw, init) => {
      const url = new URL(String(raw))
      seen.push(url.href)
      expect(init?.credentials).toBe('omit')
      expect(init?.redirect).toBe('error')
      if (url.pathname === '/game/payload.json') return Response.json(payload)
      const file = snapshot.files.find((file) => url.pathname === `/game/project/${file.path}`)
      return file ? new Response(file.bytes) : new Response('', { status: 404 })
    }),
  )
  return { snapshot, payload, seen }
}

test('standalone restores exactly the verified UTF-8 snapshot without fetching account or runtime URLs', async () => {
  const { snapshot, seen } = await fixture()
  const loaded = await loadPythonWebPayload(
    new URL('https://static.test/game/'),
    controller().signal,
  )
  expect(loaded.snapshot).toEqual(snapshot)
  expect(seen).toEqual([
    'https://static.test/game/payload.json',
    ...snapshot.files.map((file) => `https://static.test/game/project/${file.path}`),
  ])
  loaded.snapshot.files[0]!.bytes[0] = 0
  expect(loaded.snapshot.files[0]!.bytes).not.toEqual(snapshot.files[0]!.bytes)
})

test('invalid metadata rejects before any project fetch, including traversal and forged revision', async () => {
  for (const path of ['../outside.py', 'other.py']) {
    const { payload, seen } = await fixture()
    payload.snapshot.files[0]!.path = path
    await expect(
      loadPythonWebPayload(new URL('https://static.test/game/'), controller().signal),
    ).rejects.toThrow()
    expect(seen).toEqual(['https://static.test/game/payload.json'])
  }
  for (const url of [
    'file:///game/',
    'https://u:p@static.test/game/',
    'https://static.test/game/?x=1',
  ])
    await expect(loadPythonWebPayload(new URL(url), controller().signal)).rejects.toThrow('HTTP')
})

test('modified bytes are rejected even when the advertised metadata digest is internally valid', async () => {
  const { snapshot, payload } = await fixture()
  payload.snapshot.files[0]!.sha256 = '0'.repeat(64)
  const { projectId: _id, revision: _revision, ...content } = payload.snapshot
  payload.snapshot.revision = await studioPythonExecutionRevision(content)
  await expect(
    loadPythonWebPayload(new URL('https://static.test/game/'), controller().signal),
  ).rejects.toThrow('não corresponde')
  expect(await pythonWebBytesSha256(snapshot.files[0]!.bytes)).not.toBe('0'.repeat(64))
})

test('stream limits count actual bytes and cancel a body that understates its size', async () => {
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    start(stream) {
      stream.enqueue(new Uint8Array(3))
      stream.enqueue(new Uint8Array(3))
    },
    cancel() {
      cancelled = true
    },
  })
  await expect(
    readPythonWebBytes(
      new Response(body, { headers: { 'content-length': '1' } }),
      5,
      controller().signal,
    ),
  ).rejects.toThrow('limite')
  expect(cancelled).toBe(true)
  expect(
    await readPythonWebBytes(
      new Response('small', { headers: { 'content-length': '99' } }),
      5,
      controller().signal,
    ),
  ).toEqual(new TextEncoder().encode('small'))
  expect(await readPythonWebBytes(new Response(''), 0, controller().signal)).toEqual(
    new Uint8Array(),
  )
})

test('cancellation unblocks an in-flight stream without returning partial content', async () => {
  let reading!: () => void
  const started = new Promise<void>((resolve) => {
    reading = resolve
  })
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    pull() {
      reading()
    },
    cancel() {
      cancelled = true
    },
  })
  const scope = controller()
  const pending = readPythonWebBytes(new Response(body), 10, scope.signal)
  await started
  scope.abort(new Error('context changed'))
  await expect(pending).rejects.toThrow('context changed')
  expect(cancelled).toBe(true)
})
