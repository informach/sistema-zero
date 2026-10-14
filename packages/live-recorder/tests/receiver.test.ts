import { expect, test } from 'bun:test'
import { recordingCommand } from '../src/contracts'

test('recording contract rejects child, screen and arbitrary sources', () => {
  const value = {
    jobId: crypto.randomUUID(),
    occurrenceId: crypto.randomUUID(),
    commandId: crypto.randomUUID(),
    commandVersion: 1,
    generation: 1,
    desiredState: 'recording',
    leaseEndsAt: new Date().toISOString(),
    hardEndsAt: new Date().toISOString(),
    sources: [{ role: 'learner', kind: 'screen', sessionId: 'source', trackName: 'private' }],
  }
  expect(recordingCommand.safeParse(value).success).toBe(false)
  expect(
    recordingCommand.safeParse({
      ...value,
      sources: [{ role: 'teacher', kind: 'demo', sessionId: 'source', trackName: 'demo' }],
    }).success,
  ).toBe(true)
  expect(
    recordingCommand.safeParse({
      ...value,
      sources: [
        { role: 'teacher', kind: 'demo', sessionId: 'one', trackName: 'demo' },
        { role: 'teacher', kind: 'microphone', sessionId: 'two', trackName: 'mic' },
      ],
    }).success,
  ).toBe(false)
})

test('isolated Chromium receives media, flushes a playable segment, and FFmpeg creates the replay', async () => {
  // Playwright uses Node pipes: Bun 1.3.11 on Windows cannot complete its Chromium handshake.
  const output = await Bun.build({
    entrypoints: ['./tests/receiver-check.ts'],
    target: 'node',
    external: ['playwright', '@aws-sdk/client-s3'],
    outdir: './.cache/recorder-test',
  })
  expect(output.success).toBe(true)
  const process = Bun.spawn(['node', './.cache/recorder-test/receiver-check.js'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const diagnostic = await new Response(process.stderr).text()
  expect(await process.exited, diagnostic).toBe(0)
}, 40_000)

test('camera effects run in a worker and stop input on model failure without a raw fallback', async () => {
  const worker = await Bun.build({
    entrypoints: [
      '../member-shell/src/lib/live/media-camera-effects.ts',
      '../member-shell/src/lib/live/media-camera-effects.worker.ts',
    ],
    target: 'browser',
    outdir: './.cache/camera-effects-test',
  })
  expect(worker.success).toBe(true)
  const runner = await Bun.build({
    entrypoints: ['./tests/camera-effects-check.ts'],
    target: 'node',
    external: ['playwright'],
    outdir: './.cache/camera-effects-test',
  })
  expect(runner.success).toBe(true)
  const process = Bun.spawn(['node', './.cache/camera-effects-test/camera-effects-check.js'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const diagnostic = await new Response(process.stderr).text()
  expect(await process.exited, diagnostic).toBe(0)
}, 40_000)
