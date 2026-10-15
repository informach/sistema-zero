import { expect, test } from 'bun:test'
import {
  applyProStorageOperation,
  PRO_STORAGE_LIMITS,
  PRO_STORAGE_SOURCE,
  parseProStorageRequest,
} from '@sistemazero/core/studio'
import { connectProStorage } from './proStorageHost'

const token = 'a'.repeat(32)
test('only the current frame, origin, revision and instance receive a private storage port', () => {
  const source = {} as Window
  const event = {
    source,
    origin: 'null',
    data: { source: PRO_STORAGE_SOURCE, token, revision: 3, hello: true },
    ports: [{ start() {}, close() {}, postMessage() {} }],
  } as unknown as MessageEvent
  let loads = 0
  const options = {
    source,
    origin: 'null',
    token,
    revision: 3,
    backend: {
      load: async () => {
        loads++
        return {}
      },
      write: async () => {},
    },
  }
  expect(connectProStorage(event, { ...options, source: {} as Window })).toBeNull()
  expect(connectProStorage(event, { ...options, origin: 'https://other.test' })).toBeNull()
  expect(connectProStorage(event, { ...options, revision: 4 })).toBeNull()
  expect(connectProStorage(event, { ...options, token: 'b'.repeat(32) })).toBeNull()
  expect(loads).toBe(0)
  const disconnect = connectProStorage(event, options)
  expect(loads).toBe(1)
  disconnect?.()
})

test('storage validates message bounds and preserves literal prototype keys without pollution', () => {
  const message = {
    source: PRO_STORAGE_SOURCE,
    token,
    id: 1,
    operation: 'set',
    key: '__proto__',
    value: 'literal',
  }
  const request = parseProStorageRequest(message, token)!
  const result = applyProStorageOperation({}, request)
  expect(Object.getPrototypeOf(result.data)).toBeNull()
  expect(result.data.__proto__).toBe('literal')
  expect(
    parseProStorageRequest(
      { ...message, value: 'x'.repeat(PRO_STORAGE_LIMITS.maxValueChars + 1) },
      token,
    ),
  ).toBeNull()
  expect(parseProStorageRequest({ ...message, id: Infinity }, token)).toBeNull()
  expect(() =>
    applyProStorageOperation(
      Object.fromEntries(Array.from({ length: 500 }, (_, i) => [String(i), ''])),
      request,
    ),
  ).toThrow('Limite')
})

test('writes serialize and rejected persistence never changes the readable snapshot or acknowledges success', async () => {
  const sent: Record<string, unknown>[] = []
  const port = {
    onmessage: null as ((event: { data: unknown }) => void) | null,
    start() {},
    close() {},
    postMessage(message: Record<string, unknown>) {
      sent.push(message)
    },
  }
  const source = {} as Window
  let writes = 0
  const disconnect = connectProStorage(
    {
      source,
      origin: 'null',
      data: { source: PRO_STORAGE_SOURCE, token, revision: 3, hello: true },
      ports: [port],
    } as unknown as MessageEvent,
    {
      source,
      origin: 'null',
      token,
      revision: 3,
      backend: {
        load: async () => ({ score: '1' }),
        write: async () => {
          writes++
          throw new Error('quota')
        },
      },
    },
  )!
  const message = (id: number, operation: string) =>
    port.onmessage?.({
      data: { source: PRO_STORAGE_SOURCE, token, id, operation, key: 'score', value: '2' },
    })
  message(1, 'set')
  message(2, 'get')
  message(1, 'set')
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(writes).toBe(1)
  expect(sent.find((value) => value.id === 1)?.ok).toBe(false)
  expect(sent.find((value) => value.id === 2)).toMatchObject({ ok: true, value: '1' })
  disconnect()
  expect(port.onmessage).toBeNull()
})
