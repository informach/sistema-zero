import { mkdir, opendir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { artifactSchema, canonical } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Artifacts } from '../store/artifacts'
import type { Store } from '../store/client'
import { exists, hash, protectedName, readBounded, workspacePath } from '../tools/paths'
import { snapshotSchema } from './snapshot'

export const workspaceExportSchema = z.object({
  version: z.literal(1),
  snapshotId: z.string(),
  baseDigest: z.string(),
  digest: z.string(),
  changes: z.array(
    z.object({ path: z.string(), before: z.string().nullable(), after: artifactSchema.nullable() }),
  ),
})
export class WorkspaceExports {
  readonly artifacts: Artifacts
  constructor(
    private store: Store,
    directory: string,
  ) {
    this.artifacts = new Artifacts(directory)
  }
  async seed(snapshotId: string, root: string, signal: AbortSignal) {
    const snapshot = snapshotSchema.parse(
      await this.store.call({ op: 'document.get', namespace: 'snapshots', id: snapshotId }),
    )
    await mkdir(root, { recursive: true, mode: 0o700 })
    for (const file of snapshot.files) {
      signal.throwIfAborted()
      if (!file.artifact) continue
      const path = await workspacePath(root, file.path, true)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(
        await workspacePath(root, file.path, true),
        await this.artifacts.read(file.artifact),
        { flag: 'wx', mode: file.mode },
      )
    }
  }
  async capture(snapshotId: string, root: string, signal: AbortSignal) {
    const snapshot = snapshotSchema.parse(
      await this.store.call({ op: 'document.get', namespace: 'snapshots', id: snapshotId }),
    )
    const paths = new Set(snapshot.files.map((file) => file.path))
    const excluded = new Set([
      '.git',
      'node_modules',
      '.next',
      '.cache',
      '.turbo',
      'dist',
      'build',
      '.ssh',
      '.aws',
    ])
    let visited = 0
    const scan = async (directory: string, depth: number) => {
      if (depth > 30) throw new Error('Export directory depth exceeds limit')
      for await (const entry of await opendir(directory)) {
        signal.throwIfAborted()
        if (excluded.has(entry.name) || protectedName(entry.name)) continue
        if (++visited > 30000) throw new Error('Export exceeds file limit')
        if (entry.isSymbolicLink()) throw new Error('Export requires an explicit symlink policy')
        const path = join(directory, entry.name)
        if (entry.isDirectory()) await scan(path, depth + 1)
        else if (entry.isFile()) paths.add(relative(root, path))
      }
    }
    await scan(root, 0)
    const base = new Map(snapshot.files.map((file) => [file.path, file.artifact?.sha256 ?? null]))
    const changes: z.infer<typeof workspaceExportSchema>['changes'] = []
    let bytes = 0
    for (const name of [...paths].sort()) {
      signal.throwIfAborted()
      const path = await workspacePath(root, name, true)
      const data = (await exists(path)) ? await readBounded(path, 8_000_000) : null
      bytes += data?.length ?? 0
      if (bytes > 128_000_000) throw new Error('Export exceeds 128 MB')
      const before = base.get(name) ?? null
      if ((data ? hash(data) : null) === before) continue
      changes.push({
        path: name,
        before,
        after: data ? await this.artifacts.put(data, 'application/octet-stream') : null,
      })
    }
    const value = workspaceExportSchema.parse({
      version: 1,
      snapshotId,
      baseDigest: snapshot.digest,
      changes,
      digest: hash(canonical(changes)),
    })
    return {
      value,
      artifact: await this.artifacts.put(
        JSON.stringify(value),
        'application/vnd.sistemazero.workspace+json',
      ),
    }
  }
}
