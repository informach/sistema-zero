import { expect, test } from 'bun:test'
import { validBrowserLease } from '../src/browser-lease'
import { recordingBrowserFactory } from '../src/recording-browser'
import { RecordingJob } from '../src/recording-job'
import type { RecordingSegmentStore } from '../src/segment-store'

test('browser authorization cannot outlive the occurrence or hide a stale lease', () => {
  expect(validBrowserLease(21_000, 60_000, 1_000)).toBe(true)
  for (const lease of [1_000, 31_001, Number.NaN, Infinity, 1_001.5])
    expect(validBrowserLease(lease, 60_000, 1_000)).toBe(false)
  expect(validBrowserLease(21_000, 20_000, 1_000)).toBe(false)
})

test('production cannot silently select a local browser or incomplete remote configuration', () => {
  expect(() => recordingBrowserFactory({ NODE_ENV: 'production' })).toThrow('must be configured')
  expect(() => recordingBrowserFactory({ LIVE_BROWSER_MODE: 'railway-sandbox' })).toThrow(
    'incomplete',
  )
})

test('real browser host terminates on lease expiry, invalid renewal and control-channel loss', async () => {
  const child = Bun.spawn(['node', './tests/browser-host-check.mjs'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const diagnostic = await new Response(child.stderr).text()
  expect(await child.exited, diagnostic).toBe(0)
}, 45_000)

test('failed browser termination never acknowledges captureStopped, retains ownership and can retry', async () => {
  let closes = 0
  const job = new RecordingJob(
    {
      version: 1,
      eventSequence: 0,
      jobId: crypto.randomUUID(),
      occurrenceId: crypto.randomUUID(),
      generation: 1,
      state: 'recording',
      segments: [],
      gaps: [],
      replayKey: null,
      error: null,
    },
    { persistManifest: async () => {}, manifestKey: 'test' } as unknown as RecordingSegmentStore,
    {
      sfuAppId: 'unused',
      sfuAppSecret: 'unused',
      supervisorUrl: 'unused',
      supervisorToken: 'unused',
      iceServers: async () => [],
      onState: async () => {},
    },
  )
  // Exercise the actual shutdown boundary with an already-running receiver.
  Object.assign(job, {
    captureStopped: false,
    browser: {
      close: async () => {
        if (++closes === 1) throw new Error('Termination uncertain')
      },
    },
  })
  let failed = false
  try {
    await job.shutdown()
  } catch {
    failed = true
  }
  expect(failed).toBe(true)
  expect(job.status().captureStopped).toBe(false)
  await job.shutdown()
  expect(closes).toBe(2)
  expect(job.status().captureStopped).toBe(true)
})
