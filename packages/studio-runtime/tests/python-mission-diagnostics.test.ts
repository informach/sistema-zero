import { expect, test } from 'bun:test'
import { pythonInspectionFailurePhase } from '../src/python-inspection'
import { rethrowPythonMissionFailure } from '../src/python-mission-diagnostics'

test('a command result with success false carries its stage even when the SDK does not throw', async () => {
  const error = new Error('Protected mission command failed')
  let reads = 0
  await expect(
    rethrowPythonMissionFailure(error, {
      signal: new AbortController().signal,
      check() {},
      stderr: 'PRIVATE-OUTPUT\nSTUDIO_PYTHON_MISSION_PHASE:startup-next\n',
      read: async () => {
        reads++
        throw new Error('journal absent')
      },
    }),
  ).rejects.toBe(error)
  expect(pythonInspectionFailurePhase(error)).toBe('mission-startup-next')
  expect(reads).toBe(0)
})

test('a rejected SDK command without stderr uses only the trusted stage journal and preserves its error', async () => {
  const error = new Error('PRIVATE-COMMAND-DETAIL')
  let checked = 0,
    reads = 0
  await expect(
    rethrowPythonMissionFailure(error, {
      signal: new AbortController().signal,
      check: () => {
        checked++
      },
      read: async () => {
        reads++
        return JSON.stringify({ version: 1, phase: 'startup-next' })
      },
    }),
  ).rejects.toBe(error)
  expect(pythonInspectionFailurePhase(error)).toBe('mission-startup-next')
  expect([checked, reads]).toEqual([2, 1])
})

test('unknown, oversized and invalid diagnostic files never become stages or replace the original failure', async () => {
  for (const content of [
    'PRIVATE-SOURCE',
    JSON.stringify({ version: 2, phase: 'launch' }),
    JSON.stringify({ version: 1, phase: 'PRIVATE-SOURCE' }),
    'x'.repeat(256),
  ]) {
    const error = new Error('PRIVATE-ORIGINAL')
    await expect(
      rethrowPythonMissionFailure(error, {
        signal: new AbortController().signal,
        check() {},
        read: async () => content,
      }),
    ).rejects.toBe(error)
    expect(pythonInspectionFailurePhase(error)).toBeUndefined()
  }
})

test('retired owners neither read a diagnostic nor accept a result arriving after their fence', async () => {
  const controller = new AbortController()
  controller.abort()
  const error = new Error('original')
  let reads = 0
  await expect(
    rethrowPythonMissionFailure(error, {
      signal: controller.signal,
      check() {},
      read: async () => {
        reads++
        return '{}'
      },
    }),
  ).rejects.toBe(error)
  expect(reads).toBe(0)
  let checks = 0
  const changed = new Error('changed')
  await expect(
    rethrowPythonMissionFailure(changed, {
      signal: new AbortController().signal,
      check() {
        if (++checks === 2) throw new Error('retired')
      },
      read: async () => JSON.stringify({ version: 1, phase: 'launch' }),
    }),
  ).rejects.toBe(changed)
  expect(pythonInspectionFailurePhase(changed)).toBeUndefined()
})

test('stderr stages need no extra read and a missing file cannot hide a command failure', async () => {
  const error = Object.assign(new Error('PRIVATE-ORIGINAL'), {
    stderr: 'STUDIO_PYTHON_MISSION_PHASE:observe\nPRIVATE-STDERR',
  })
  let reads = 0
  await expect(
    rethrowPythonMissionFailure(error, {
      signal: new AbortController().signal,
      check() {},
      read: async () => {
        reads++
        return '{}'
      },
    }),
  ).rejects.toBe(error)
  expect(reads).toBe(0)
  expect(pythonInspectionFailurePhase(error)).toBe('mission-observe')
  const missing = new Error('missing')
  await expect(
    rethrowPythonMissionFailure(missing, {
      signal: new AbortController().signal,
      check() {},
      read: async () => {
        throw new Error('file unavailable')
      },
    }),
  ).rejects.toBe(missing)
  expect(pythonInspectionFailurePhase(missing)).toBeUndefined()
})
