import { expect, mock, test } from 'bun:test'
import { createHash as nativeCreateHash } from 'node:crypto'
import * as nativeFs from 'node:fs/promises'

// Deterministically withdraw at the hash/await boundary while preserving native SHA.
// This module lives in an exclusive test child; it never mocks another suite's crypto.
const owner = new AbortController()
const capturedCreateHash = nativeCreateHash
const reason = new Error('withdrawn after cache verification')
const mode = process.env.STDLIB_CANCEL_MODE
const expectedChecks = mode === 'hit' ? 1 : 2
let checks = 0
mock.module('node:crypto', () => ({
  createHash: (...args: Parameters<typeof nativeCreateHash>) => {
    const hash = capturedCreateHash(...args)
    const digest = hash.digest.bind(hash)
    hash.digest = ((...input: Parameters<typeof digest>) => {
      const value = digest(...input)
      checks++
      if (mode !== 'cleanup' && checks === expectedChecks) queueMicrotask(() => owner.abort(reason))
      return value
    }) as typeof hash.digest
    return hash
  },
}))
if (mode === 'cleanup') {
  const filesystem = { ...nativeFs }
  mock.module('node:fs/promises', () => ({
    ...filesystem,
    rmdir: async (...args: Parameters<typeof nativeFs.rmdir>) => {
      const value = await filesystem.rmdir(...args)
      queueMicrotask(() => owner.abort(reason))
      return value
    },
  }))
}

test('a verified result cannot settle successfully after caller withdrawal', async () => {
  const { preparePythonStandardLibrary } = await import('../prepare-stdlib')
  const outcome = await preparePythonStandardLibrary({
    cacheDirectory: process.env.STDLIB_CANCEL_CACHE!,
    vendorDirectory: process.env.STUDIO_PYTHON_BUILD_TEST_VENDOR_DIRECTORY!,
    signal: owner.signal,
  }).then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  )
  expect(checks).toBe(expectedChecks)
  expect(owner.signal.aborted).toBe(true)
  expect(outcome.ok).toBe(false)
  if (!outcome.ok) expect(outcome.error).toBe(reason)
}, 70000)
