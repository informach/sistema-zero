import { expect, test } from 'bun:test'
import { readPythonFrameMessage } from './frameMessages'
import { pythonFrameContentSecurityPolicy } from './framePolicy'

const identity = {
  projectId: 'project',
  revision: 'a'.repeat(64),
  instanceId: 'editor-1',
  runId: 'run-1',
  writerEpoch: null,
  runtimeManifestSha256: 'b'.repeat(64),
}
const packet = { protocol: 1 as const, challenge: 'c'.repeat(64), sequence: 1, identity }

test('audio requests preserve the session envelope without accepting media URLs or extra commands', () => {
  const request = JSON.stringify({ version: 1, op: 'stop', id: null })
  const message = { ...packet, type: 'audio-request' as const, requestId: 'sound-1', request }
  expect(readPythonFrameMessage({ ...message, url: 'https://evil.test' })).toEqual(message)
  expect(
    readPythonFrameMessage({ ...message, request: '{"version":1,"op":"shell"}' }),
  ).toBeUndefined()
  expect(readPythonFrameMessage({ ...message, requestId: 'bad\n' })).toBeUndefined()
})

test('capture responses validate the actual PNG header and bounded presentation identity', () => {
  const snapshot = {
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUioAAAAASUVORK5CYII=',
    width: 1,
    height: 1,
    frameSequence: 1,
  }
  const ack = { ...packet, type: 'ack' as const, ok: true, commandId: 1, snapshot }
  expect(readPythonFrameMessage(ack)).toEqual(ack)
  expect(readPythonFrameMessage({ ...ack, snapshot: null })).toMatchObject({ snapshot: null })
  for (const change of [
    { width: 1025 },
    { height: 0 },
    { width: 2 },
    { frameSequence: 0 },
    { frameSequence: NaN },
    { dataUrl: 'https://example.com/image.png' },
    { dataUrl: `${snapshot.dataUrl}=` },
    { dataUrl: snapshot.dataUrl + 'a'.repeat(6_000_000) },
  ])
    expect(readPythonFrameMessage({ ...ack, snapshot: { ...snapshot, ...change } })).toBeUndefined()
  expect(readPythonFrameMessage({ ...ack, ok: false })).toBeUndefined()
})
test('host copies identity and payload instead of accepting authority or executable fields', () => {
  const raw = {
    ...packet,
    identity: { ...identity },
    type: 'event',
    event: {
      type: 'console',
      stream: 'stdout',
      text: '🐢',
      omittedChars: 0,
      omittedLines: 0,
      save: { projectId: 'other' },
    },
  }
  const parsed = readPythonFrameMessage(raw)
  raw.identity.projectId = 'changed'
  raw.event.text = 'changed'
  expect(parsed).toEqual({
    ...packet,
    type: 'event',
    event: { type: 'console', stream: 'stdout', text: '🐢', omittedChars: 0, omittedLines: 0 },
  })
  expect(
    readPythonFrameMessage({
      ...packet,
      type: 'event',
      event: { type: 'save-project', content: {} },
    }),
  ).toBeUndefined()
})
test('host rejects malformed sequence, unbounded content, invalid identities and unknown capabilities', () => {
  for (const changes of [
    { sequence: 0 },
    { sequence: NaN },
    { challenge: 'x' },
    { identity: { ...identity, writerEpoch: -1 } },
    { protocol: 2 },
  ])
    expect(readPythonFrameMessage({ ...packet, type: 'prepared', ...changes })).toBeUndefined()
  for (const event of [
    { type: 'state', state: 'paused' },
    { type: 'repl-result', requestId: 'eval', status: 'completed', text: '🐢'.repeat(8001) },
    { type: 'diagnostic', path: '../other.py', line: 1, column: 1, message: '', traceback: '' },
    { type: 'failed', code: 'save-denied', message: '' },
  ])
    expect(readPythonFrameMessage({ ...packet, type: 'event', event })).toBeUndefined()
})
test('Python CSP is scoped to the immutable directory and opaque sandbox', () => {
  const policy = pythonFrameContentSecurityPolicy('https://runtime.example/distributions/abc/')
  expect(policy).toContain('sandbox allow-scripts allow-pointer-lock')
  expect(policy).not.toContain('allow-same-origin')
  expect(policy).not.toContain("'unsafe-eval'")
  expect(policy).toContain("require-trusted-types-for 'script'")
  expect(policy).toContain('trusted-types sz-python-bootstrap')
  expect(policy).toContain('connect-src data: blob: https://runtime.example/distributions/abc/')
  for (const url of [
    'http://runtime.example/x/',
    'https://u:p@runtime.example/x/',
    'https://runtime.example/x/?query',
    'https://runtime.example/x/#hash',
    'https://runtime.example/x',
    'data:text/html,test',
  ])
    expect(() => pythonFrameContentSecurityPolicy(url)).toThrow()
})

test('activity feedback keeps execution identity and refuses server authority or unbounded results', () => {
  const feedback = {
    version: 1,
    results: [{ checkId: 'check', kind: 'behavior', passed: true, verifiedBy: 'client' }],
  }
  const raw = { ...packet, type: 'activity-result', requestId: 'activity-1', feedback }
  const parsed: unknown = readPythonFrameMessage(raw)
  expect(parsed).toEqual(raw)
  feedback.results[0]!.passed = false
  expect(parsed).toMatchObject({ feedback: { results: [{ passed: true }] } })
  for (const changes of [
    { requestId: 'bad id' },
    { feedback: { ...feedback, results: [{ ...feedback.results[0], verifiedBy: 'server' }] } },
    { feedback: { ...feedback, results: [{ ...feedback.results[0], message: 'x'.repeat(2001) }] } },
    {
      feedback: {
        ...feedback,
        results: Array.from({ length: 51 }, (_, index) => ({
          ...feedback.results[0],
          checkId: `check${index}`,
        })),
      },
    },
  ])
    expect(readPythonFrameMessage({ ...raw, ...changes })).toBeUndefined()
})
