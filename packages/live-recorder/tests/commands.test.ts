import { expect, test } from 'bun:test'
import type { RecordingCommand, RecordingManifest } from '../src/contracts'
import { RecordingJob } from '../src/recording-job'
import type { RecordingSegmentStore } from '../src/segment-store'

test('pause retires SFU tracks before disconnecting the browser, including already-closed mids', async () => {
  const manifest: RecordingManifest = {
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
  }
  let browserClosed = false
  const job = new RecordingJob(
    manifest,
    {
      manifestKey: 'manifest',
      persistManifest: async () => {},
    } as unknown as RecordingSegmentStore,
    {
      sfuAppId: 'app',
      sfuAppSecret: 'test',
      supervisorUrl: 'https://unused.invalid',
      supervisorToken: 'test',
      iceServers: async () => [],
      onState: async () => {},
    },
  )
  Object.assign(job, {
    captureStopped: false,
    sessionId: 'session',
    mids: ['0', '1'],
    browser: {
      close: async () => {
        browserClosed = true
      },
    },
  })
  const originalFetch = globalThis.fetch
  globalThis.fetch = Object.assign(
    async () =>
      browserClosed
        ? Response.json({ errorCode: 'session_error' }, { status: 410 })
        : Response.json({ tracks: [{ mid: '0' }, { mid: '1', errorCode: 'close_track_error' }] }),
    { preconnect: originalFetch.preconnect },
  )
  try {
    await job.shutdown()
    expect(job.status()).toMatchObject({ state: 'paused', captureStopped: true, error: null })
    expect(browserClosed).toBe(true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('a delayed recording renewal cannot undo an acknowledged pause', async () => {
  const manifest: RecordingManifest = {
    version: 1,
    eventSequence: 0,
    jobId: crypto.randomUUID(),
    occurrenceId: crypto.randomUUID(),
    generation: 1,
    state: 'paused',
    segments: [],
    gaps: [],
    replayKey: null,
    error: null,
  }
  const job = new RecordingJob(manifest, { manifestKey: 'manifest' } as RecordingSegmentStore, {
    sfuAppId: 'unused',
    sfuAppSecret: 'unused',
    supervisorUrl: 'https://unused.invalid',
    supervisorToken: 'unused',
    iceServers: async () => [],
    onState: async () => undefined,
  })
  const pause: RecordingCommand = {
    jobId: manifest.jobId,
    occurrenceId: manifest.occurrenceId,
    generation: 1,
    commandId: crypto.randomUUID(),
    commandVersion: 2,
    desiredState: 'paused',
    leaseEndsAt: new Date(Date.now() + 20_000).toISOString(),
    hardEndsAt: new Date(Date.now() + 60_000).toISOString(),
    sources: [],
  }
  const acknowledged = await job.command(pause)
  expect(acknowledged.captureStopped).toBe(true)
  expect(acknowledged.commandVersion).toBe(2)
  await expect(
    job.command({
      ...pause,
      commandId: crypto.randomUUID(),
      commandVersion: 1,
      desiredState: 'recording',
    }),
  ).rejects.toThrow('Recording command superseded')
  await expect(
    job.command({ ...pause, commandId: crypto.randomUUID(), desiredState: 'recording' }),
  ).rejects.toThrow('Recording command superseded')
  expect((await job.command(pause)).state).toBe('paused')
  await job.shutdown()
  await expect(job.command({ ...pause, commandVersion: 3 })).rejects.toThrow(
    'Recorder is shutting down',
  )
})

test('shutdown waits for an accepted command to persist before confirming capture stopped', async () => {
  const manifest: RecordingManifest = {
    version: 1,
    eventSequence: 0,
    jobId: crypto.randomUUID(),
    occurrenceId: crypto.randomUUID(),
    generation: 1,
    state: 'paused',
    segments: [],
    gaps: [],
    replayKey: null,
    error: null,
  }
  let entered!: () => void, release!: () => void
  const writing = new Promise<void>((resolve) => {
    entered = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let writes = 0
  const store = {
    manifestKey: 'manifest',
    async persistManifest() {
      writes++
      if (writes === 1) {
        entered()
        await gate
      }
    },
  } as unknown as RecordingSegmentStore
  const job = new RecordingJob(manifest, store, {
    sfuAppId: 'unused',
    sfuAppSecret: 'unused',
    supervisorUrl: 'https://unused.invalid',
    supervisorToken: 'unused',
    iceServers: async () => [],
    onState: async () => undefined,
  })
  const command = job.command({
    jobId: manifest.jobId,
    occurrenceId: manifest.occurrenceId,
    generation: 1,
    commandId: crypto.randomUUID(),
    commandVersion: 1,
    desiredState: 'recording',
    leaseEndsAt: new Date(Date.now() + 20_000).toISOString(),
    hardEndsAt: new Date(Date.now() + 60_000).toISOString(),
    sources: [],
  })
  await writing
  let drained = false
  const shutdown = job.shutdown().then(() => {
    drained = true
  })
  await Promise.resolve()
  expect(drained).toBe(false)
  release()
  await command
  await shutdown
  expect(writes).toBe(2)
  expect(job.status()).toMatchObject({ state: 'paused', captureStopped: true })
})

test('pause and shutdown preserve a finalized replay and cannot resume it', async () => {
  const manifest: RecordingManifest = {
    version: 1,
    eventSequence: 8,
    jobId: crypto.randomUUID(),
    occurrenceId: crypto.randomUUID(),
    generation: 1,
    state: 'review',
    segments: [],
    gaps: [],
    replayKey: 'confirmed/replay.mp4',
    error: null,
  }
  const job = new RecordingJob(manifest, { manifestKey: 'manifest' } as RecordingSegmentStore, {
    sfuAppId: 'unused',
    sfuAppSecret: 'unused',
    supervisorUrl: 'https://unused.invalid',
    supervisorToken: 'unused',
    iceServers: async () => [],
    onState: async () => undefined,
  })
  const command: RecordingCommand = {
    jobId: manifest.jobId,
    occurrenceId: manifest.occurrenceId,
    generation: 1,
    commandId: crypto.randomUUID(),
    commandVersion: 1,
    desiredState: 'paused',
    leaseEndsAt: new Date(Date.now() + 20_000).toISOString(),
    hardEndsAt: new Date(Date.now() + 60_000).toISOString(),
    sources: [],
  }
  expect(await job.command(command)).toMatchObject({
    state: 'review',
    captureStopped: true,
    replayKey: 'confirmed/replay.mp4',
  })
  await expect(
    job.command({
      ...command,
      commandId: crypto.randomUUID(),
      commandVersion: 2,
      desiredState: 'recording',
    }),
  ).rejects.toThrow('A finalized recording cannot resume')
  await job.shutdown()
  expect(job.status().state).toBe('review')
})
