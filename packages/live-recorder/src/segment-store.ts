import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3'
import type { RecordingManifest, RecordingSegment } from './contracts'

export class RecordingSegmentStore {
  private readonly owner = crypto.randomUUID()
  private prepared = false
  private persistence: Promise<void> = Promise.resolve()
  private lastPersistedSequence = -1
  private lastPersistedSegments = -1
  readonly prefix: string
  readonly directory: string
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly manifest: RecordingManifest,
    rootDirectory: string,
  ) {
    this.prefix = `live/recordings/${manifest.occurrenceId}/${manifest.jobId}/${manifest.generation}`
    this.directory = join(rootDirectory, manifest.jobId, String(manifest.generation))
  }

  get manifestKey(): string {
    return `${this.prefix}/manifest.json`
  }

  async prepare(): Promise<void> {
    if (this.prepared) return
    await mkdir(this.directory, { recursive: true })
    // A second container cannot capture the same generation, even with a different local volume.
    const key = `${this.prefix}/owner.json`
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: JSON.stringify({
            owner: this.owner,
            jobId: this.manifest.jobId,
            generation: this.manifest.generation,
          }),
          IfNoneMatch: '*',
          ContentType: 'application/json',
          Metadata: { owner: this.owner },
        }),
        { abortSignal: AbortSignal.timeout(15_000) },
      )
    } catch (error) {
      const existing = await this.client
        .send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }), {
          abortSignal: AbortSignal.timeout(5000),
        })
        .catch(() => null)
      if (existing?.Metadata?.owner !== this.owner) throw error
    }
    this.prepared = true
  }

  async persistManifest(snapshot: RecordingManifest = this.manifest): Promise<void> {
    const value = structuredClone(snapshot)
    const next = this.persistence
      .catch(() => undefined)
      .then(async () => {
        // Segment flushes and state callbacks share this queue. A delayed state snapshot cannot
        // replace a newer manifest or remove segments already confirmed in storage.
        if (
          value.eventSequence < this.lastPersistedSequence ||
          value.segments.length < this.lastPersistedSegments
        )
          return
        await this.prepare()
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: this.manifestKey,
            Body: JSON.stringify(value),
            ContentType: 'application/json',
            CacheControl: 'private, no-store',
          }),
          { abortSignal: AbortSignal.timeout(15_000) },
        )
        this.lastPersistedSequence = value.eventSequence
        this.lastPersistedSegments = value.segments.length
      })
    this.persistence = next
    await next
  }

  async segment(input: {
    base64: string
    startsAt: string
    endsAt: string
    durationMs: number
  }): Promise<RecordingSegment> {
    if (
      input.base64.length > 12 * 1024 * 1024 ||
      input.durationMs <= 0 ||
      input.durationMs > 30_000
    )
      throw new Error('Segment outside recording limits')
    const bytes = Buffer.from(input.base64, 'base64')
    if (!bytes.length || bytes.length > 8 * 1024 * 1024)
      throw new Error('Segment outside memory limit')
    const sequence = this.manifest.segments.length
    if (
      sequence >= 1440 ||
      this.manifest.segments.reduce((sum, item) => sum + item.bytes, 0) >= 4 * 1024 ** 3
    )
      throw new Error('Recording storage budget reached')
    const name = String(sequence).padStart(6, '0')
    const webm = join(this.directory, `${name}.webm`)
    const mp4 = join(this.directory, `${name}.mp4`)
    await writeFile(webm, bytes, { flag: 'wx' })
    await runFfmpeg([
      '-nostdin',
      '-v',
      'error',
      '-i',
      webm,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '26',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '15',
      '-c:a',
      'aac',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-movflags',
      '+faststart',
      '-y',
      mp4,
    ])
    const encoded = await readFile(mp4)
    if (encoded.length > 16 * 1024 * 1024) throw new Error('Encoded segment outside storage limit')
    const checksum = createHash('sha256').update(encoded).digest('hex')
    const key = `${this.prefix}/segments/${name}.mp4`
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: encoded,
          ContentLength: encoded.length,
          ContentType: 'video/mp4',
          CacheControl: 'private, no-store',
          IfNoneMatch: '*',
          Metadata: { sha256: checksum, sequence: String(sequence) },
        }),
        { abortSignal: AbortSignal.timeout(15_000) },
      )
    } catch (error) {
      // Lost acknowledgements are safe only when the existing bytes match this exact segment.
      const existing = await this.client
        .send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }), {
          abortSignal: AbortSignal.timeout(5000),
        })
        .catch(() => null)
      if (existing?.Metadata?.sha256 !== checksum || existing.ContentLength !== encoded.length)
        throw error
    }
    const segment: RecordingSegment = {
      sequence,
      key,
      checksum,
      bytes: encoded.length,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      durationMs: input.durationMs,
    }
    this.manifest.segments.push(segment)
    await this.persistManifest()
    await unlink(webm)
    return segment
  }

  async finalize(): Promise<string> {
    if (!this.manifest.segments.length) throw new Error('No durable recording segments')
    // Each object is independently playable. Recovery can rebuild the file from this manifest.
    for (const segment of this.manifest.segments) {
      const path = join(this.directory, `${String(segment.sequence).padStart(6, '0')}.mp4`)
      if (!(await stat(path).catch(() => null))) {
        const object = await this.client.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: segment.key }),
          { abortSignal: AbortSignal.timeout(15_000) },
        )
        const bytes = await object.Body?.transformToByteArray()
        if (!bytes || createHash('sha256').update(bytes).digest('hex') !== segment.checksum)
          throw new Error('Recording segment checksum mismatch')
        await writeFile(path, bytes)
      }
      if (
        createHash('sha256')
          .update(await readFile(path))
          .digest('hex') !== segment.checksum
      )
        throw new Error('Local recording segment checksum mismatch')
    }
    const playlist = join(this.directory, 'concat.txt')
    await writeFile(
      playlist,
      this.manifest.segments
        .map((segment) => `file '${String(segment.sequence).padStart(6, '0')}.mp4'`)
        .join('\n'),
    )
    const output = join(this.directory, 'replay.mp4')
    await runFfmpeg([
      '-nostdin',
      '-v',
      'error',
      '-f',
      'concat',
      '-safe',
      '1',
      '-i',
      playlist,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      '-y',
      output,
    ])
    const key = `${this.prefix}/replay.mp4`
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: createReadStream(output),
        ContentLength: (await stat(output)).size,
        ContentType: 'video/mp4',
        CacheControl: 'private, no-store',
      }),
      { abortSignal: AbortSignal.timeout(120_000) },
    )
    return key
  }

  async releaseLocalFiles(): Promise<void> {
    // Only exact files created by this job; never recursively remove a configured volume path.
    const names = [
      'concat.txt',
      'replay.mp4',
      ...this.manifest.segments.map(
        (segment) => `${String(segment.sequence).padStart(6, '0')}.mp4`,
      ),
    ]
    for (const name of names)
      await unlink(join(this.directory, name)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error
      })
  }
}

export async function runFfmpeg(args: string[]): Promise<void> {
  const process = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
  const timer = setTimeout(() => process.kill(), 120_000)
  try {
    let error = ''
    process.stderr.on('data', (chunk: Buffer) => {
      if (error.length < 1024) error += chunk.toString().slice(0, 1024 - error.length)
    })
    await new Promise<void>((resolve, reject) => {
      process.on('error', reject)
      process.on('close', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Recording transcoding failed (${error.slice(0, 160)})`)),
      )
    })
  } finally {
    clearTimeout(timer)
  }
}
