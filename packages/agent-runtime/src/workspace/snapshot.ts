import { lstat, mkdir, realpath, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { artifactSchema, canonical } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Processes } from '../process/manager'
import { Artifacts } from '../store/artifacts'
import type { Store } from '../store/client'
import { exists, hash, protectedName, readBounded, workspacePath } from '../tools/paths'

export const snapshotSchema = z.object({
  id: z.string(),
  workspace: z.string(),
  head: z.string(),
  digest: z.string(),
  createdAt: z.string(),
  files: z.array(
    z.object({ path: z.string(), artifact: artifactSchema.nullable(), mode: z.number() }),
  ),
})
export class Workspaces {
  private artifacts: Artifacts
  constructor(
    private store: Store,
    private processes: Processes,
    private directory: string,
  ) {
    this.artifacts = new Artifacts(directory)
  }
  async git(workspace: string, args: string[], signal: AbortSignal) {
    const result = await this.processes.run(
      {
        executable: 'git',
        args,
        cwd: workspace,
        maxBytes: 2_000_000,
        timeoutMs: 60000,
        logMode: 'stdout',
      },
      signal,
    )
    if (result.code !== 0 || result.reason !== 'exited')
      throw new Error(`Git failed: ${result.output}`)
    return (await readBounded(join(this.directory, 'logs', result.log), 2_000_000)).toString('utf8')
  }
  async capture(workspace: string, signal: AbortSignal) {
    const root = (await this.git(workspace, ['rev-parse', '--show-toplevel'], signal)).trim()
    if ((await realpath(root)) !== (await realpath(workspace)))
      throw new Error(`Workspace snapshots require the repository root; open ${root}`)
    const head = (await this.git(workspace, ['rev-parse', 'HEAD'], signal)).trim()
    const names = [
      ...new Set(
        (
          await this.git(
            workspace,
            ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
            signal,
          )
        )
          .split('\0')
          .filter(Boolean),
      ),
    ]
    if (names.length > 20000) throw new Error('Snapshot exceeds 20000 files; narrow the workspace')
    const files: z.infer<typeof snapshotSchema>['files'] = []
    let total = 0
    for (const name of names) {
      signal.throwIfAborted()
      if (name.split('/').some(protectedName)) continue
      const path = await workspacePath(workspace, name, true)
      if (!(await exists(path))) {
        files.push({ path: name, artifact: null, mode: 0o644 })
        continue
      }
      const metadata = await lstat(join(workspace, name))
      if (metadata.isSymbolicLink())
        throw new Error(`Snapshot requires an explicit symlink policy: ${name}`)
      if (!metadata.isFile())
        throw new Error(`Snapshot does not support submodules or directories: ${name}`)
      const bytes = await readBounded(path, 8_000_000)
      total += bytes.length
      if (total > 128_000_000) throw new Error('Snapshot exceeds 128 MB')
      files.push({
        path: relative(workspace, path),
        artifact: await this.artifacts.put(bytes, 'application/octet-stream'),
        mode: metadata.mode,
      })
    }
    if ((await this.git(workspace, ['rev-parse', 'HEAD'], signal)).trim() !== head)
      throw new Error('HEAD changed during snapshot')
    const currentNames = [
      ...new Set(
        (
          await this.git(
            workspace,
            ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
            signal,
          )
        )
          .split('\0')
          .filter(Boolean),
      ),
    ]
    if (canonical([...names].sort()) !== canonical(currentNames.sort()))
      throw new Error('Workspace file set changed during snapshot')
    for (const file of files) {
      const path = await workspacePath(workspace, file.path, true)
      const current = (await exists(path)) ? hash(await readBounded(path, 8_000_000)) : null
      if (current !== file.artifact?.sha256 && !(current === null && file.artifact === null))
        throw new Error(`File changed during snapshot: ${file.path}`)
    }
    const snapshot = snapshotSchema.parse({
      id: crypto.randomUUID(),
      workspace,
      head,
      digest: hash(
        canonical(
          files.map((file) => ({
            path: file.path,
            hash: file.artifact?.sha256 ?? null,
            mode: file.mode,
          })),
        ),
      ),
      createdAt: new Date().toISOString(),
      files,
    })
    await this.store.call({
      op: 'document.put',
      namespace: 'snapshots',
      id: snapshot.id,
      value: snapshot,
    })
    return snapshot
  }
  async branch(
    snapshotId: string,
    owner: string,
    signal: AbortSignal,
    identity: string = crypto.randomUUID(),
  ) {
    const snapshot = snapshotSchema.parse(
      await this.store.call({ op: 'document.get', namespace: 'snapshots', id: snapshotId }),
    )
    const id = identity
    const path = join(this.directory, 'worktrees', id)
    await mkdir(dirname(path), { recursive: true, mode: 0o700 })
    await this.store.call({
      op: 'document.put',
      namespace: 'worktrees',
      id,
      value: { id, path, owner, snapshotId, state: 'creating' },
    })
    await this.git(snapshot.workspace, ['worktree', 'add', '--detach', path, snapshot.head], signal)
    // Capture contains tracked deletions, staged/unstaged content and non-ignored untracked files.
    const { unlink } = await import('node:fs/promises')
    for (const file of snapshot.files) {
      signal.throwIfAborted()
      const destination = join(path, file.path)
      await mkdir(dirname(destination), { recursive: true })
      const checked = await workspacePath(path, file.path, true)
      if (file.artifact)
        await writeFile(checked, await this.artifacts.read(file.artifact), { mode: file.mode })
      else if (await exists(checked)) await unlink(checked)
    }
    const lease = { id, path, owner, snapshotId, state: 'ready', generation: 1 }
    await this.store.call({ op: 'document.put', namespace: 'worktrees', id, value: lease })
    return lease
  }
}
