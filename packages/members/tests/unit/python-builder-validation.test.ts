import { expect, test } from 'bun:test'
import { validateStudioPythonBuilderCandidate } from '@sistemazero/core/studio/python-builder-validation'
import { PNG } from '../fakes/gallery-python-source'
import { pythonBuilderNetworkFixture as fixture } from '../fakes/python-builder-network'

test('candidate pipeline uses real TCP clients and immutable Pinta/source bytes for controlled receipts', async () => {
  const f = await fixture('passed')
  try {
    const expectedHash = f.options.revision.hash
    const pending = validateStudioPythonBuilderCandidate(f.options)
    f.options.revision.files['src/main.py'] = 'print("altered")'
    Object.values(f.options.binaries)[0]!.base64 = Buffer.from('altered').toString('base64')
    const result = await pending
    expect(result.status).toBe('passed')
    if (result.status !== 'passed') throw new Error('Expected passing controlled receipt')
    expect(result.preview.revisionHash).toBe(expectedHash)
    expect(result.preview.reference.revision).not.toBe(expectedHash)
    expect(result.evidence.map((item) => item.kind)).toEqual(['types', 'build', 'playtest'])
    // Console validation has no graphics capture; do not fabricate capture evidence.
    expect(
      [...f.uploaded.values()].some(
        (bytes) => new TextDecoder().decode(bytes) === 'from helper import n\nprint("ação", n)\n',
      ),
    ).toBe(true)
    expect(
      [...f.uploaded.values()].some(
        (bytes) => Buffer.from(bytes).toString('base64') === PNG.split(',')[1],
      ),
    ).toBe(true)
    expect(f.operations.slice(0, 6)).toEqual(Array.from({ length: 6 }, () => 'analyze'))
    expect(f.operations.slice(6).every((value) => value === 'execute')).toBe(true)
    expect(f.requests.at(-1)).toBe('POST /v1/python/inputs/remove')
    expect(f.cleanup).toEqual([])
    await Promise.all([result.discardPreview(), result.discardPreview()])
    expect(f.requests.filter((path) => path === 'POST /v1/python/previews/remove')).toHaveLength(1)
  } finally {
    f.stop()
  }
})

test.each([
  'types-failed',
  'types-incomplete',
] as const)('%s never dispatches the execution service', async (mode) => {
  const f = await fixture(mode)
  try {
    const result = await validateStudioPythonBuilderCandidate(f.options)
    expect(result.status).toBe(mode === 'types-failed' ? 'failed' : 'unavailable')
    expect(f.requests.some((path) => path.includes('/v1/python/'))).toBe(false)
    expect(f.requests.at(-1)?.startsWith('DELETE ')).toBe(true)
    expect(result.evidence).toHaveLength(1)
  } finally {
    f.stop()
  }
})

test.each([
  'compile-failed',
  'playtest-failed',
] as const)('%s cannot produce a passing proposal', async (mode) => {
  const f = await fixture(mode)
  try {
    const result = await validateStudioPythonBuilderCandidate(f.options)
    expect(result.status).toBe('failed')
    expect(result).not.toHaveProperty('preview')
    expect(result.evidence.some((item) => item.status === 'failed')).toBe(true)
    expect(f.requests.at(-1)).toBe('POST /v1/python/inputs/remove')
  } finally {
    f.stop()
  }
})

test('preview from an unapproved origin is refused and its resources are retired', async () => {
  const f = await fixture('bad-origin')
  try {
    const error = await validateStudioPythonBuilderCandidate(f.options).then(
      () => null,
      (reason: Error) => reason,
    )
    expect(error).toBeInstanceOf(Error)
    expect(f.requests).toContain('POST /v1/python/inputs/remove')
    expect(f.requests).toContain('POST /v1/python/previews/remove')
  } finally {
    f.stop()
  }
})

test.each([
  1, 4, 5, 6,
])('withdrawal at client/pipeline settlement boundary %s retires the owned preview', async (depth) => {
  const f = await fixture('passed')
  const controller = new AbortController()
  f.options.signal = controller.signal
  const initialAuthorize = f.options.authorize
  let scheduled = false
  f.options.authorize = async (base, metadata, operation) => {
    await initialAuthorize(base, metadata, operation)
    if (
      !scheduled &&
      operation === 'execute' &&
      f.requests.at(-1) === 'POST /v1/python/inputs/remove'
    ) {
      scheduled = true
      // Cross the nested await continuations after the last authorization:
      // 1 is the client control; 4/5/6 reproduced refusal outside its old owner.
      let remaining = depth
      const tick = () => {
        if (--remaining <= 0)
          controller.abort(new DOMException('Outer candidate owner withdrawn', 'AbortError'))
        else queueMicrotask(tick)
      }
      queueMicrotask(tick)
    }
  }
  try {
    const outcome = await validateStudioPythonBuilderCandidate(f.options).then(
      (value) => ({ value }),
      (error: Error) => ({ error }),
    )
    expect(scheduled).toBe(true)
    expect('error' in outcome).toBe(true)
    if (!('error' in outcome)) throw new Error('Withdrawn candidate was accepted')
    expect(outcome.error.name).toBe('AbortError')
    expect(controller.signal.aborted).toBe(true)
    expect(f.requests.filter((path) => path === 'POST /v1/python/previews/remove')).toHaveLength(1)
    expect(f.cleanup).toEqual([])
  } finally {
    f.stop()
  }
})
