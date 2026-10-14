import { Database } from 'bun:sqlite'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { S3Client } from '@aws-sdk/client-s3'
import { type RecordingManifest, recordingCommand } from './contracts'
import { RecordingJob } from './recording-job'
import { RecordingSegmentStore } from './segment-store'

const required = (key: string) => {
  const value = process.env[key]
  if (!value) throw new Error(`${key} is required`)
  return value
}
const token = required('LIVE_RECORDER_TOKEN')
if (token.length < 32) throw new Error('LIVE_RECORDER_TOKEN must contain at least 32 characters')
const callbackUrl = new URL(required('LIVE_RECORDER_CALLBACK_URL'))
if (!['https:', 'http:'].includes(callbackUrl.protocol)) throw new Error('Invalid callback URL')
const dataDirectory = process.env.LIVE_RECORDER_DATA_DIR ?? '/data/live-recorder'
await mkdir(dataDirectory, { recursive: true })
const database = new Database(join(dataDirectory, 'jobs.sqlite'), { create: true, strict: true })
database.exec(
  'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS jobs (job_id TEXT PRIMARY KEY, occurrence_id TEXT NOT NULL UNIQUE, generation INTEGER NOT NULL, manifest TEXT NOT NULL, capture_stopped INTEGER NOT NULL DEFAULT 0)',
)
const storage = new S3Client({
  region: 'auto',
  endpoint: required('R2_ENDPOINT'),
  credentials: {
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})
const bucket = required('R2_BUCKET')
const active = new Map<string, RecordingJob>()
const maxJobs = Number(process.env.LIVE_RECORDER_MAX_JOBS ?? 1)
if (!Number.isInteger(maxJobs) || maxJobs < 1 || maxJobs > 4)
  throw new Error('LIVE_RECORDER_MAX_JOBS must be an integer from 1 to 4')
const recordingReservations = new Map<string, number>()
const inFlight = new Set<Promise<Response>>()
let stopping = false

async function authorize(request: Request) {
  const values = await Promise.all(
    [request.headers.get('authorization') ?? '', `Bearer ${token}`].map((value) =>
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  )
  const a = new Uint8Array(values[0]!),
    b = new Uint8Array(values[1]!)
  let difference = 0
  for (let i = 0; i < a.length; i++) difference |= a[i]! ^ b[i]!
  return difference === 0
}

async function iceServers(hardEndsAt: string): Promise<RTCIceServer[]> {
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(required('CF_TURN_KEY_ID'))}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${required('CF_TURN_API_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl: Math.max(
          60,
          Math.min(18_000, Math.ceil((Date.parse(hardEndsAt) - Date.now()) / 1000) + 900),
        ),
      }),
      signal: AbortSignal.timeout(5000),
    },
  )
  if (!response.ok) throw new Error('Recorder TURN credentials unavailable')
  const result = (await response.json()) as { iceServers?: RTCIceServer[] }
  if (!result.iceServers?.length) throw new Error('Recorder TURN credentials invalid')
  return result.iceServers
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3017),
  hostname: '::',
  maxRequestBodySize: 32_768,
  fetch(request) {
    const task = handleRequest(request)
    inFlight.add(task)
    void task.finally(() => inFlight.delete(task)).catch(() => undefined)
    return task
  },
})

async function handleRequest(request: Request): Promise<Response> {
  if (stopping) return new Response('Recorder is draining', { status: 503 })
  const url = new URL(request.url)
  if (url.pathname === '/health' && request.method === 'GET')
    return Response.json({ ok: true, activeJobs: active.size })
  if (!(await authorize(request))) return new Response('Unauthorized', { status: 401 })
  const match = /^\/occurrences\/([\da-f-]{36})$/.exec(url.pathname)
  if (!match) return new Response('Not found', { status: 404 })
  if (request.method === 'GET') {
    const job = [...active.values()].find((item) => item.manifest.occurrenceId === match[1])
    if (job) return Response.json(job.status())
    const stored = database
      .query<{ manifest: string; capture_stopped: number }, [string]>(
        'SELECT manifest, capture_stopped FROM jobs WHERE occurrence_id = ?',
      )
      .get(match[1]!)
    if (!stored) return Response.json({ absent: true, captureStopped: true })
    return Response.json({
      ...JSON.parse(stored.manifest),
      captureStopped: stored.capture_stopped === 1,
      orphaned: true,
    })
  }
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const parsed = recordingCommand.safeParse(await request.json().catch(() => null))
  if (!parsed.success || parsed.data.occurrenceId !== match[1])
    return new Response('Invalid recording command', { status: 400 })
  const command = parsed.data
  if (Date.parse(command.hardEndsAt) > Date.now() + 4 * 60 * 60 * 1000)
    return new Response('Recording duration exceeds four hours', { status: 400 })
  let reserved = false
  if (command.desiredState === 'recording') {
    const occupied = new Set([
      ...recordingReservations.keys(),
      ...[...active.values()]
        .filter((item) => !item.status().captureStopped)
        .map((item) => item.manifest.jobId),
    ])
    if (!occupied.has(command.jobId) && occupied.size >= maxJobs)
      return new Response('Recorder capacity reached', { status: 503 })
    recordingReservations.set(command.jobId, (recordingReservations.get(command.jobId) ?? 0) + 1)
    reserved = true
  }
  try {
    let job = active.get(command.jobId)
    if (!job) {
      const stored = database
        .query<{ job_id: string; generation: number }, [string]>(
          'SELECT job_id, generation FROM jobs WHERE occurrence_id = ?',
        )
        .get(command.occurrenceId)
      // A restarted worker must recover/inspect the prior generation; it cannot silently recapture.
      if (stored)
        return Response.json(
          {
            code: 'RECORDING_RECOVERY_REQUIRED',
            message: 'A gravação anterior precisa de recuperação antes de reiniciar.',
          },
          { status: 409 },
        )
      const manifest: RecordingManifest = {
        version: 1,
        eventSequence: 0,
        jobId: command.jobId,
        occurrenceId: command.occurrenceId,
        generation: command.generation,
        state: 'starting',
        segments: [],
        gaps: [],
        replayKey: null,
        error: null,
      }
      database
        .query(
          'INSERT INTO jobs(job_id, occurrence_id, generation, manifest, capture_stopped) VALUES (?, ?, ?, ?, 1)',
        )
        .run(command.jobId, command.occurrenceId, command.generation, JSON.stringify(manifest))
      const store = new RecordingSegmentStore(storage, bucket, manifest, dataDirectory)
      job = new RecordingJob(manifest, store, {
        sfuAppId: required('CF_SFU_APP_ID'),
        sfuAppSecret: required('CF_SFU_APP_SECRET'),
        supervisorUrl: required('LIVE_SUPERVISOR_URL'),
        supervisorToken: required('LIVE_SUPERVISOR_TOKEN'),
        iceServers,
        async onState(state) {
          const captureStopped = active.get(command.jobId)?.status().captureStopped === true
          database
            .query(
              'UPDATE jobs SET manifest = ?, capture_stopped = ? WHERE job_id = ? AND generation = ?',
            )
            .run(JSON.stringify(state), captureStopped ? 1 : 0, command.jobId, command.generation)
          const response = await fetch(callbackUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: state.jobId,
              occurrenceId: state.occurrenceId,
              generation: state.generation,
              eventSequence: state.eventSequence,
              state: state.state,
              manifestKey: store.manifestKey,
              replayKey: state.replayKey,
              error: state.error,
              captureStopped,
            }),
            signal: AbortSignal.timeout(5000),
          })
          if (!response.ok) throw new Error('Recording state callback not acknowledged')
        },
      })
      active.set(command.jobId, job)
    }
    const result = await job.command(command)
    database
      .query(
        'UPDATE jobs SET manifest = ?, capture_stopped = ? WHERE job_id = ? AND generation = ?',
      )
      .run(
        JSON.stringify(job.manifest),
        result.captureStopped ? 1 : 0,
        command.jobId,
        command.generation,
      )
    if (result.state === 'review') active.delete(command.jobId)
    return Response.json(result)
  } catch {
    return Response.json(
      { code: 'RECORDING_COMMAND_FAILED', message: 'O gravador não confirmou a operação.' },
      { status: 503 },
    )
  } finally {
    if (reserved) {
      const remaining = (recordingReservations.get(command.jobId) ?? 1) - 1
      if (remaining) recordingReservations.set(command.jobId, remaining)
      else recordingReservations.delete(command.jobId)
    }
  }
}

async function shutdown(): Promise<void> {
  if (stopping) return
  stopping = true
  const deadline = setTimeout(() => process.exit(1), 45_000)
  try {
    // Stop accepting connections, then let already accepted commands and uploads settle.
    const drained = server.stop(false)
    await Promise.allSettled([...inFlight])
    const results = await Promise.allSettled([...active.values()].map((job) => job.shutdown()))
    await drained
    database.close()
    storage.destroy()
    clearTimeout(deadline)
    process.exit(results.some((result) => result.status === 'rejected') ? 1 : 0)
  } catch {
    process.exit(1)
  }
}
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
