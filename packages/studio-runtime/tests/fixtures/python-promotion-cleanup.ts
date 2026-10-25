import { mock } from 'bun:test'
import assert from 'node:assert/strict'
import * as filesystem from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve, sep } from 'node:path'
import { fixturePygameWheel, pythonDistributionFixture } from '../python-distribution-fixture'

// A separate process prevents this filesystem fault from changing any other test's imports.
// All file creation, plan validation and R2 storage behavior remain real/local.
const remove = filesystem.rm
const mode = process.argv[2]
assert(['connect', 'upload', 'dispose', 'success'].includes(mode ?? ''))
const plan = JSON.parse(await Bun.stdin.text())
const primary = new Error('primary')
const disposal = new Error('disposal')
const removal = new Error('removal')
let ownedDirectory = ''
let removalAttempts = 0
let disposals = 0
mock.module('node:fs/promises', () => ({
  ...filesystem,
  async rm(...args: Parameters<typeof remove>) {
    if (args[0] === ownedDirectory) {
      removalAttempts++
      throw removal
    }
    return remove(...args)
  },
}))
const { uploadPythonPromotion } = await import('../../scripts/python-promotion-r2')
const { setPinnedPygameWheelForTests } = await import('../../scripts/python-promotion-plan')
// The plan was made from the fixtures' stand-in wheel (python-promotion.test.ts does the same).
setPinnedPygameWheelForTests(fixturePygameWheel())
const storage = await pythonDistributionFixture()
let rejected = false
let failure: unknown
try {
  try {
    await uploadPythonPromotion(plan, plan.planSha256, async (configPath) => {
      ownedDirectory = dirname(configPath)
      assert(
        resolve(ownedDirectory).startsWith(
          `${resolve(tmpdir())}${sep}sz-python-runtime-promotion-`,
        ),
      )
      assert.equal(JSON.parse(await filesystem.readFile(configPath, 'utf8')).r2_buckets.length, 1)
      if (mode === 'connect') throw primary
      return {
        env: {
          PYTHON_RUNTIME: {
            ...storage.bucket,
            async put(...args: Parameters<typeof storage.bucket.put>) {
              if (mode === 'upload') throw primary
              return storage.bucket.put(...args)
            },
          },
        },
        async dispose() {
          disposals++
          if (mode === 'upload' || mode === 'dispose') throw disposal
        },
      }
    })
  } catch (error) {
    rejected = true
    failure = error
  }
  assert.equal(rejected, true)
  assert.equal(removalAttempts, 1)
  assert.equal(disposals, mode === 'connect' ? 0 : 1)
  const expected =
    mode === 'connect'
      ? [primary, removal]
      : mode === 'upload'
        ? [primary, disposal, removal]
        : mode === 'dispose'
          ? [disposal, removal]
          : [removal]
  if (expected.length === 1) {
    assert.equal(failure, removal)
  } else {
    assert(failure instanceof AggregateError)
    assert.equal(failure.errors.length, expected.length)
    for (const [index, error] of expected.entries()) assert.equal(failure.errors[index], error)
    assert.equal(failure.cause, expected[0])
  }
  assert.equal(
    storage.objects.has(`${plan.prefix}complete.json`),
    mode === 'dispose' || mode === 'success',
  )
  assert.equal(
    storage.objects.has(plan.workerCatalog.key),
    mode === 'dispose' || mode === 'success',
  )
  console.log(JSON.stringify({ mode, removalAttempts, disposals, failures: expected.length }))
} finally {
  // The fault is only for the uploader's attempt. Remove the exclusively owned real directory.
  if (ownedDirectory) {
    assert(
      resolve(ownedDirectory).startsWith(`${resolve(tmpdir())}${sep}sz-python-runtime-promotion-`),
    )
    await remove(ownedDirectory, { recursive: true, force: true })
  }
}
