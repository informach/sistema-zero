/** Admission/process negatives only. No game, Tk, media or browser is started. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const runner = resolve(dirname(fileURLToPath(import.meta.url)), 'run_pacman_native.mjs')
function probe(windowEnd, verify) {
  const folder = mkdtempSync(resolve(tmpdir(), 'sz-pacman-admission-'))
  const output = resolve(folder, 'attempt')
  const invoke = () =>
    spawnSync(
      process.execPath,
      [runner, resolve(folder, 'absent-python.exe'), folder, output, 'geometry', windowEnd],
      { windowsHide: true, encoding: 'utf8', timeout: 5000 },
    )
  try {
    verify(invoke(), output, invoke)
  } finally {
    const child = relative(resolve(tmpdir()), folder)
    assert(
      !isAbsolute(child) && !child.startsWith('..') && child.startsWith('sz-pacman-admission-'),
    )
    rmSync(folder, { recursive: true })
  }
}

test('expired UTC authorization refuses before creating output or spawning', () => {
  probe('2000-01-01T00:00:00Z', (result, output) => {
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Authorized window expired or too short/)
    assert(!existsSync(output))
  })
})

test('short remaining window refuses a child whose full budget cannot fit', () => {
  probe(new Date(Date.now() + 1000).toISOString(), (result, output) => {
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Authorized window expired or too short/)
    assert(!existsSync(output))
  })
})

test('local/ambiguous timestamps and nonexistent calendar dates are refused', () => {
  for (const value of ['2026-10-20 17:52:00', '2026-02-30T17:52:00Z']) {
    probe(value, (result, output) => {
      assert.equal(result.status, 1)
      assert.match(result.stderr, /UTC ISO deadline|required|Invalid UTC date/)
      assert(!existsSync(output))
    })
  }
})

test('a preflight spawn failure is preserved and an existing attempt cannot be overwritten', () => {
  probe('preflight', (result, output, invoke) => {
    assert.equal(result.status, 1)
    const raw = readFileSync(resolve(output, 'supervisor.json'))
    const receipt = JSON.parse(raw)
    assert.equal(receipt.state, 'failed-or-incomplete-preserved')
    assert.equal(receipt.preflightOnly, true)
    assert.equal(receipt.pid, null)
    assert.match(receipt.spawnError, /ENOENT/)
    assert.equal(receipt.signalAttempted, false)
    assert.equal(receipt.deadline, false)
    assert.equal(receipt.nativeReceiptSha256, undefined)
    const second = invoke()
    assert.equal(second.status, 1)
    assert.match(second.stderr, /EEXIST/)
    assert.deepEqual(readFileSync(resolve(output, 'supervisor.json')), raw)
  })
})
