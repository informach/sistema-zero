import { expect, test } from 'bun:test'
import { StudioRuntimeSelectionSchema } from './project-environment'
import { readStudioRuntimeIdentity } from './runtime-identity'

test('lightweight identity has the same JSON acceptance as the full schema and detaches metadata', () => {
  const valid = {
    profileId: 'python-browser',
    releaseId: '2026-10',
    manifestSha256: 'a'.repeat(64),
  }
  const candidates: unknown[] = [null, [], {}, '', valid, { ...valid, url: 'https://invalid.test' }]
  for (const field of ['profileId', 'releaseId', 'manifestSha256'])
    for (const value of [
      null,
      undefined,
      1,
      '',
      'A',
      '../escape',
      'a'.repeat(65),
      'a'.repeat(96),
      'a'.repeat(97),
    ])
      candidates.push({ ...valid, [field]: value })
  for (const candidate of candidates) {
    const schema = StudioRuntimeSelectionSchema.safeParse(candidate)
    expect(readStudioRuntimeIdentity(candidate)).toEqual(schema.success ? schema.data : undefined)
  }
  const read = readStudioRuntimeIdentity(valid)!
  valid.profileId = 'changed'
  expect(read.profileId).toBe('python-browser')
})

test('metadata identity never evaluates accessors', () => {
  let called = false
  const value = { releaseId: 'test', manifestSha256: 'b'.repeat(64) }
  Object.defineProperty(value, 'profileId', {
    enumerable: true,
    get() {
      called = true
      return 'python'
    },
  })
  expect(readStudioRuntimeIdentity(value)).toBeUndefined()
  expect(called).toBe(false)
})
