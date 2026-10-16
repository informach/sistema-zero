import { AsyncLocalStorage } from 'node:async_hooks'
import { createHash } from 'node:crypto'
import { mkdir, open, opendir, rename, statfs, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { type ArtifactRef, artifactSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Locks } from '../execution/locks'
import { hash } from '../tools/paths'
import { artifactRecordSchema } from './artifact-schema'
import type { Store } from './client'

type Storage = {
  store: Store
  locks: Locks
  initialized?: Promise<void>
  quota: number
  retentionDays: number
}
const profiles = new Map<string, Storage>()
const ownerScope = new AsyncLocalStorage<string>()
export class Artifacts {
  private directory: string
  constructor(directory: string) {
    this.directory = resolve(directory)
  }
  static bind(directory: string, store: Store) {
    profiles.set(resolve(directory), {
      store,
      locks: new Locks(),
      quota: 5 * 1024 ** 3,
      retentionDays: 30,
    })
  }
  static unbind(directory: string, store: Store) {
    if (profiles.get(resolve(directory))?.store === store) profiles.delete(resolve(directory))
  }
  static owned<T>(runId: string, work: () => T): T {
    return ownerScope.run(runId, work)
  }
  static configure(directory: string, quota: number, retentionDays: number) {
    const profile = profiles.get(resolve(directory))
    if (!profile) throw new Error('Artifact store unavailable')
    profile.quota = quota
    profile.retentionDays = retentionDays
  }
  private storage() {
    const value = profiles.get(this.directory)
    if (!value) throw new Error('Artifact access requires the profile journal')
    return value
  }
  private path(reference: ArtifactRef) {
    artifactSchema.parse(reference)
    if (
      !/^[a-f0-9]{64}$/.test(reference.id) ||
      reference.id !== reference.sha256 ||
      reference.bytes > 16_000_000
    )
      throw new Error('Invalid artifact identity or size')
    return join(this.directory, 'artifacts', reference.id.slice(0, 2), reference.id)
  }
  async initialize() {
    const profile = this.storage()
    profile.initialized ??= this.importLegacy(profile)
    return profile.initialized
  }
  private async importLegacy(profile: Storage) {
    const root = join(this.directory, 'artifacts')
    await mkdir(root, { recursive: true, mode: 0o700 })
    // Prior releases had immutable content files without a retention ledger. Preserve them pinned.
    for await (const prefix of await opendir(root)) {
      if (!prefix.isDirectory() || !/^[a-f0-9]{2}$/.test(prefix.name)) continue
      for await (const file of await opendir(join(root, prefix.name))) {
        if (
          file.isFile() &&
          /^[a-f0-9]{64}\.[a-f0-9-]{36}\.tmp$/.test(file.name) &&
          file.name.startsWith(prefix.name)
        ) {
          await unlink(join(root, prefix.name, file.name))
          continue
        }
        if (
          !file.isFile() ||
          !/^[a-f0-9]{64}$/.test(file.name) ||
          !file.name.startsWith(prefix.name)
        )
          continue
        const previous = await profile.store.call({ op: 'artifact.get', id: file.name })
        if (previous) {
          const record = artifactRecordSchema.parse(previous)
          if (record.state === 'prepared') {
            await this.verifyRange(record.reference, 0, 0)
            await profile.store.call({ op: 'artifact.commit', id: file.name })
          }
          continue
        }
        const handle = await open(join(root, prefix.name, file.name), 'r')
        let bytes: number
        try {
          bytes = (await handle.stat()).size
        } finally {
          await handle.close()
        }
        if (bytes > 16_000_000)
          throw new Error('Legacy artifact exceeds size limit; inspect storage before recovery')
        const reference = {
          id: file.name,
          sha256: file.name,
          bytes,
          mediaType: 'application/octet-stream',
        }
        await this.verifyRange(reference, 0, 0)
        await profile.store.call({
          op: 'artifact.reserve',
          reference,
          pinned: true,
          quota: Number.MAX_SAFE_INTEGER,
          now: Date.now(),
        })
        await profile.store.call({ op: 'artifact.commit', id: file.name })
      }
    }
  }
  async put(
    content: string | Uint8Array,
    mediaType = 'text/plain',
    options: { pinned?: boolean; owner?: string } = {},
  ): Promise<ArtifactRef> {
    const data = typeof content === 'string' ? Buffer.from(content) : content
    if (data.byteLength > 16_000_000) throw new Error('Artifact exceeds 16 MB')
    const digest = hash(data)
    const reference = artifactSchema.parse({
      id: digest,
      sha256: digest,
      mediaType,
      bytes: data.byteLength,
    })
    const profile = this.storage()
    await this.initialize()
    return profile.locks.with('files', async () => {
      const free = await statfs(this.directory, { bigint: true })
      if (free.bavail * free.bsize < BigInt(data.byteLength + 64 * 1024 ** 2))
        throw new Error(
          'Insufficient free disk space; preserve at least 64 MiB for journal recovery',
        )
      const owner = options.owner ?? ownerScope.getStore()
      const allocated = artifactRecordSchema.parse(
        await profile.store.call({
          op: 'artifact.reserve',
          reference,
          owner,
          pinned: options.pinned ?? !owner,
          quota: profile.quota,
          now: Date.now(),
        }),
      )
      const destination = this.path(reference)
      if (allocated.state === 'ready') {
        await this.verifyRange(reference, 0, 0)
        return reference
      }
      await mkdir(join(this.directory, 'artifacts', digest.slice(0, 2)), {
        recursive: true,
        mode: 0o700,
      })
      // A failed commit may have left a complete immutable file. Validate before adopting it.
      try {
        await this.verifyRange(reference, 0, 0)
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
        const temporary = `${destination}.${crypto.randomUUID()}.tmp`
        const handle = await open(temporary, 'wx', 0o600)
        try {
          try {
            await handle.writeFile(data)
            await handle.sync()
          } finally {
            await handle.close()
          }
          await rename(temporary, destination)
        } catch (error) {
          await unlink(temporary).catch((cleanup) => {
            if (cleanup.code !== 'ENOENT')
              throw new AggregateError([error, cleanup], 'Artifact allocation and cleanup failed')
          })
          throw error
        }
      }
      await profile.store.call({ op: 'artifact.commit', id: digest })
      return reference
    })
  }
  private async verifyRange(reference: ArtifactRef, offset: number, bytes: number) {
    const handle = await open(this.path(reference), 'r')
    try {
      const info = await handle.stat()
      if (!info.isFile() || info.size !== reference.bytes)
        throw new Error('Artifact integrity failure')
      const result = Buffer.alloc(Math.max(0, Math.min(bytes, reference.bytes - offset)))
      const chunk = Buffer.alloc(Math.min(256000, Math.max(1, reference.bytes)))
      const digest = createHash('sha256')
      let position = 0
      while (position < reference.bytes) {
        const read = await handle.read(
          chunk,
          0,
          Math.min(chunk.length, reference.bytes - position),
          position,
        )
        if (!read.bytesRead) throw new Error('Artifact was truncated during read')
        const data = chunk.subarray(0, read.bytesRead)
        digest.update(data)
        const start = Math.max(offset, position),
          end = Math.min(offset + result.length, position + data.length)
        if (end > start) data.copy(result, start - offset, start - position, end - position)
        position += data.length
      }
      if (
        digest.digest('hex') !== reference.sha256 ||
        (await handle.stat()).size !== reference.bytes
      )
        throw new Error('Artifact integrity failure')
      return result
    } finally {
      await handle.close()
    }
  }
  async read(reference: ArtifactRef) {
    return this.readRange(reference, 0, reference.bytes, true)
  }
  async range(reference: ArtifactRef, offset = 0, bytes = 256000) {
    return this.readRange(reference, offset, bytes, false)
  }
  private async readRange(reference: ArtifactRef, offset: number, bytes: number, full: boolean) {
    this.path(reference)
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(bytes) ||
      bytes < 0 ||
      bytes > (full ? 16_000_000 : 256000)
    )
      throw new Error('Invalid artifact range')
    const profile = this.storage()
    await this.initialize()
    return profile.locks.with('files', async () => {
      const saved = artifactRecordSchema.parse(
        await profile.store.call({ op: 'artifact.read', id: reference.id, now: Date.now() }),
      )
      if (saved.reference.bytes !== reference.bytes || saved.reference.sha256 !== reference.sha256)
        throw new Error('Artifact reference mismatch')
      return this.verifyRange(reference, offset, bytes)
    })
  }
  async collect(now = Date.now()) {
    const profile = this.storage()
    await this.initialize()
    return profile.locks.with('files', async () => {
      const references = z.array(artifactSchema).parse(
        await profile.store.call({
          op: 'artifact.gc',
          before: now - profile.retentionDays * 86400000,
          preparedBefore: now - 86400000,
        }),
      )
      let deleted = 0
      for (const reference of references) {
        try {
          await unlink(this.path(reference))
        } catch (error) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT')
            throw error
        }
        await profile.store.call({ op: 'artifact.deleted', id: reference.id })
        deleted++
      }
      return { deleted, more: references.length === 100 }
    })
  }
}
