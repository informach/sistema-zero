/** Process/immutability negatives only; no game, renderer, audio or acceptance claim. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const supervisor = resolve(dirname(fileURLToPath(import.meta.url)), 'run_space_arena_native.mjs')
function scope(callback) {
  const directory = mkdtempSync(resolve(tmpdir(), 'sz-space-supervisor-test-'))
  try {
    callback(directory)
  } finally {
    const child = relative(resolve(tmpdir()), directory)
    assert(
      !isAbsolute(child) &&
        !child.startsWith('..') &&
        child.startsWith('sz-space-supervisor-test-'),
    )
    rmSync(directory, { recursive: true })
  }
}
function run(directory, scenario = 'Q02') {
  return spawnSync(
    process.execPath,
    [
      supervisor,
      resolve(directory, 'missing-python.exe'),
      resolve(directory, 'unused-input'),
      resolve(directory, 'attempt'),
      scenario,
    ],
    { windowsHide: true, encoding: 'utf8', timeout: 15_000 },
  )
}

test('missing interpreter is preserved as a failed spawn, without cleanup/success claims', () =>
  scope((directory) => {
    const child = run(directory)
    assert.equal(child.status, 1, child.stderr)
    const result = JSON.parse(readFileSync(resolve(directory, 'attempt/supervisor.json')))
    assert.equal(result.state, 'failed-or-incomplete-preserved')
    assert.match(result.spawnError, /ENOENT/)
    assert.equal(result.pid, null)
    assert.equal(result.deadline, false)
    assert.equal(result.signalAttempted, false)
    assert.equal(result.nativeReceiptSha256, undefined)
    assert(existsSync(resolve(directory, 'attempt/owner.json')))
  }))

test('an existing attempt is never overwritten', () =>
  scope((directory) => {
    const first = run(directory)
    assert.equal(first.status, 1)
    const receipt = readFileSync(resolve(directory, 'attempt/supervisor.json'))
    const marker = resolve(directory, 'attempt/negative-sentinel.txt')
    writeFileSync(marker, 'preserve negative evidence', { flag: 'wx' })
    const second = run(directory)
    assert.equal(second.status, 1)
    assert.match(second.stderr, /EEXIST/)
    assert.deepEqual(readFileSync(resolve(directory, 'attempt/supervisor.json')), receipt)
    assert.equal(readFileSync(marker, 'utf8'), 'preserve negative evidence')
  }))

test('invalid scenarios fail before creating an output namespace', () =>
  scope((directory) => {
    const child = run(directory, 'Q99')
    assert.equal(child.status, 1)
    assert.match(child.stderr, /Usage:/)
    assert.equal(existsSync(resolve(directory, 'attempt')), false)
  }))
