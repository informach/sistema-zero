import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertRun, deadline, finalizeEvidence, selectNames } from './checks.ts'

test('rejects false positive runtime evidence', () => {
  const good = {
    result: { ok: true, error: '', elapsedMs: 51 },
    output: [{ type: 'stdout', text: '42' }],
  }
  assertRun(good, ['42'], 45)
  assert.throws(() => assertRun({ ...good, output: [] }, ['42']))
  assert.throws(() =>
    assertRun({ ...good, result: { ok: false, error: 'runtime failed' } }, ['42']),
  )
  assert.throws(() =>
    assertRun({ ...good, result: { ok: true, error: '', elapsedMs: 0 } }, ['42'], 45),
  )
  assert.throws(() =>
    assertRun({ ...good, output: [...good.output, { type: 'stderr', text: 'failure' }] }, ['42']),
  )
})

test('invalid filters cannot produce an empty successful qualification', () => {
  assert.deepEqual(selectNames(['chromium', 'firefox'], undefined), ['chromium', 'firefox'])
  assert.deepEqual(selectNames(['chromium', 'firefox'], 'chromium'), ['chromium'])
  assert.throws(() => selectNames(['chromium', 'firefox'], 'Chromium'))
  assert.throws(() => selectNames(['blob', 'direct'], ''))
})

test('hung evaluations become bounded failures', async () => {
  assert.equal(await deadline(Promise.resolve(42), 100, 'completed'), 42)
  await assert.rejects(deadline(new Promise(() => {}), 10, 'hung'), /hung exceeded/)
})

test('a report cannot retain a passing verdict after cleanup or source-integrity failure', () => {
  for (const key of ['failure', 'cleanupFailure', 'profileFailure']) {
    const evidence = { qualification: 'slice-passed', [key]: 'late failure', samples: [42] }
    finalizeEvidence(evidence)
    const stored = JSON.parse(JSON.stringify(evidence))
    assert.equal(stored.qualification, 'failed')
    assert.equal(stored[key], 'late failure')
    assert.deepEqual(stored.samples, [42])
  }
  const successful = { qualification: 'slice-passed', failure: undefined }
  finalizeEvidence(successful)
  assert.equal(successful.qualification, 'slice-passed')
  const invalidated = { qualification: 'failed-sources-changed' }
  finalizeEvidence(invalidated)
  assert.equal(invalidated.qualification, 'failed-sources-changed')
})
