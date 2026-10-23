import { expect, test } from 'bun:test'
import { readPythonWorkerEvent } from './workerEvents'

test('audio messages carry only a bounded request and request identity', () => {
  const request = JSON.stringify({ version: 1, op: 'stop', id: null })
  expect(
    readPythonWorkerEvent({
      type: 'audio',
      requestId: 'sound-1',
      request,
      url: 'https://evil.test',
    }),
  ).toEqual({ type: 'audio', requestId: 'sound-1', request })
  for (const change of [
    { requestId: 'bad\n' },
    { request: JSON.stringify({ version: 1, op: 'stop', id: null, url: 'https://evil.test' }) },
    { request: ' '.repeat(2049) },
  ])
    expect(
      readPythonWorkerEvent({ type: 'audio', requestId: 'sound-1', request, ...change }),
    ).toBeUndefined()
})

test('graphics bounds reject shared memory, duplicate images and excessive payloads', () => {
  const event = {
    type: 'graphics' as const,
    requestId: 'gfx',
    request: '{}',
    images: [{ id: 1, bytes: new Uint8Array(4) }],
  }
  expect(readPythonWorkerEvent(event)).toEqual(event)
  expect(readPythonWorkerEvent({ ...event, request: 'x'.repeat(2_000_001) })).toBeUndefined()
  expect(
    readPythonWorkerEvent({ ...event, images: [...event.images, ...event.images] }),
  ).toBeUndefined()
  expect(
    readPythonWorkerEvent({
      ...event,
      images: [{ id: 1, bytes: new Uint8Array(new SharedArrayBuffer(4)) }],
    }),
  ).toBeUndefined()
  expect(
    readPythonWorkerEvent({
      ...event,
      images: [{ id: 1, bytes: new Uint8Array(16 * 1024 * 1024 + 1) }],
    }),
  ).toBeUndefined()
})

test('worker events copy only bounded fields and never forward privileged or unknown data', () => {
  const event = {
    type: 'result',
    requestId: 'run',
    ok: true,
    text: '🐢',
    saveProject: { id: 'other' },
  }
  expect(readPythonWorkerEvent(event)).toEqual({
    type: 'result',
    requestId: 'run',
    ok: true,
    text: '🐢',
  })
  expect(readPythonWorkerEvent({ type: 'fetch', url: 'https://example.com' })).toBeUndefined()
  expect(readPythonWorkerEvent(null)).toBeUndefined()
  expect(readPythonWorkerEvent('ready')).toBeUndefined()
  expect(readPythonWorkerEvent({ ...event, text: '🐢'.repeat(4001) })).toBeUndefined()
  expect(readPythonWorkerEvent({ ...event, requestId: 'x\n' })).toBeUndefined()
})
test('console refuses shape, count and aggregate quotas without traversing excess entries', () => {
  const batch = {
    stream: 'stdout' as const,
    text: 'x'.repeat(8000),
    omittedLines: 0,
    omittedChars: 0,
  }
  const value = { type: 'console', batches: [batch] }
  const parsed = readPythonWorkerEvent(value)
  batch.text = 'changed'
  expect(parsed).toEqual({ type: 'console', batches: [{ ...batch, text: 'x'.repeat(8000) }] })
  expect(readPythonWorkerEvent({ type: 'console', batches: Array(131).fill(null) })).toBeUndefined()
  expect(
    readPythonWorkerEvent({
      type: 'console',
      batches: Array(9).fill({ ...batch, text: 'x'.repeat(8000) }),
    }),
  ).toBeUndefined()
  for (const replacement of [
    { text: 1 },
    { omittedLines: -1 },
    { omittedChars: Infinity },
    { omittedLines: 1 },
    { stream: 'html' },
  ])
    expect(
      readPythonWorkerEvent({ type: 'console', batches: [{ ...batch, ...replacement }] }),
    ).toBeUndefined()
})
