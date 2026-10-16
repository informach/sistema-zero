import { mkdir, open, rename, stat, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { artifactSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Locks } from '../execution/locks'
import { Artifacts } from '../store/artifacts'
import type { Store } from '../store/client'
import { exists, hash, readBounded, workspacePath } from '../tools/paths'

const changeSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('artifact'),
    path: z.string(),
    expectedHash: z.string().nullable(),
    artifact: artifactSchema,
    mode: z.number().int().optional(),
  }),
  z.object({
    operation: z.literal('write'),
    path: z.string(),
    expectedHash: z.string().nullable(),
    content: z.string().max(1_000_000),
  }),
  z.object({
    operation: z.literal('replace'),
    path: z.string(),
    expectedHash: z.string(),
    edits: z
      .array(z.object({ oldText: z.string().min(1), newText: z.string() }))
      .min(1)
      .max(50),
  }),
  z.object({ operation: z.literal('delete'), path: z.string(), expectedHash: z.string() }),
])
export const patchSchema = z.object({ changes: z.array(changeSchema).min(1).max(30) })
const entrySchema = z.object({
  path: z.string(),
  before: z.string().nullable(),
  after: z.string().nullable(),
  state: z.enum(['prepared', 'applied']),
  artifact: z
    .object({ id: z.string(), sha256: z.string(), mediaType: z.string(), bytes: z.number() })
    .nullable(),
  mode: z.number().int().optional(),
  temporary: z.string().optional(),
})
export const checkpointSchema = z.object({
  id: z.string(),
  runId: z.string(),
  workspace: z.string(),
  createdAt: z.string(),
  state: z.enum(['prepared', 'applied', 'partial', 'restored']),
  entries: z.array(entrySchema),
  reconciledAt: z.string().optional(),
  conflicts: z.array(z.string()).default([]),
})
export class Patches {
  private locks = new Locks()
  private artifacts: Artifacts
  constructor(
    private store: Store,
    directory: string,
  ) {
    this.artifacts = new Artifacts(directory)
  }
  async reconcile() {
    let after = '',
      reconciled = 0
    do {
      const page = z
        .object({ values: z.array(checkpointSchema), nextCursor: z.string().optional() })
        .parse(
          await this.store.call({
            op: 'document.page',
            namespace: 'checkpoints',
            after,
            states: ['prepared', 'partial'],
            limit: 30,
          }),
        )
      for (const checkpoint of page.values)
        await this.locks.with(checkpoint.workspace, async () => {
          checkpoint.conflicts = []
          for (const entry of checkpoint.entries) {
            try {
              const path = await workspacePath(checkpoint.workspace, entry.path, true)
              const current = (await exists(path)) ? hash(await readBounded(path, 8_000_000)) : null
              if (current === entry.after) entry.state = 'applied'
              else if (current === entry.before) entry.state = 'prepared'
              else checkpoint.conflicts.push(entry.path)
              if (entry.temporary) {
                const temporary = await workspacePath(checkpoint.workspace, entry.temporary, true)
                if (
                  dirname(temporary) !== dirname(path) ||
                  !/\.zero-[a-f0-9-]{36}\.tmp$/.test(temporary)
                )
                  throw new Error('Invalid checkpoint temporary file')
                if (await exists(temporary)) await unlink(temporary)
                entry.temporary = undefined
              }
            } catch {
              checkpoint.conflicts.push(entry.path)
            }
          }
          checkpoint.state =
            !checkpoint.conflicts.length &&
            checkpoint.entries.every((entry) => entry.state === 'applied')
              ? 'applied'
              : 'partial'
          checkpoint.reconciledAt = new Date().toISOString()
          if (checkpoint.state === 'partial')
            for (const entry of checkpoint.entries)
              if (entry.artifact)
                await this.store.call({ op: 'artifact.pin', id: entry.artifact.id, pinned: true })
          await this.store.call({
            op: 'document.put',
            namespace: 'checkpoints',
            id: checkpoint.id,
            value: checkpoint,
          })
          reconciled++
        })
      after = page.nextCursor ?? ''
    } while (after)
    return { reconciled }
  }
  async apply(
    workspace: string,
    runId: string,
    input: z.infer<typeof patchSchema>,
    signal: AbortSignal,
  ) {
    return this.locks.with(workspace, async () => {
      signal.throwIfAborted()
      const prepared: {
        path: string
        relative: string
        before: Buffer | null
        content: Buffer | null
        mode: number
      }[] = []
      for (const change of input.changes) {
        const path = await workspacePath(workspace, change.path, true)
        const before = (await exists(path)) ? await readBounded(path, 8_000_000) : null
        if ((before ? hash(before) : null) !== change.expectedHash)
          throw new Error(`Content conflict: ${change.path}`)
        let content: Buffer | null
        if (change.operation === 'delete') content = null
        else if (change.operation === 'artifact')
          content = await this.artifacts.read(change.artifact)
        else if (change.operation === 'write') content = Buffer.from(change.content)
        else {
          if (!before) throw new Error('Cannot replace a missing file')
          let text = before.toString('utf8')
          if (!Buffer.from(text).equals(before) || before.includes(0))
            throw new Error('Patch requires UTF-8 text')
          for (const edit of change.edits) {
            const first = text.indexOf(edit.oldText)
            if (first < 0 || text.indexOf(edit.oldText, first + 1) >= 0)
              throw new Error(`Replacement must match exactly once: ${change.path}`)
            text = text.slice(0, first) + edit.newText + text.slice(first + edit.oldText.length)
          }
          content = Buffer.from(text)
        }
        if (content && content.length > (change.operation === 'artifact' ? 8_000_000 : 1_000_000))
          throw new Error('Resulting file exceeds patch size limit')
        if (prepared.some((item) => item.path.toLowerCase() === path.toLowerCase()))
          throw new Error('Duplicate file in patch')
        prepared.push({
          path,
          relative: change.path,
          before,
          content,
          mode: before
            ? (await stat(path)).mode
            : change.operation === 'artifact'
              ? (change.mode ?? 0o644)
              : 0o644,
        })
      }
      const checkpoint = checkpointSchema.parse({
        id: crypto.randomUUID(),
        runId,
        workspace,
        createdAt: new Date().toISOString(),
        state: 'prepared',
        entries: await Promise.all(
          prepared.map(async (item) => ({
            path: item.relative,
            before: item.before ? hash(item.before) : null,
            after: item.content ? hash(item.content) : null,
            state: 'prepared',
            mode: item.mode,
            artifact: item.before
              ? await this.artifacts.put(item.before, 'application/octet-stream')
              : null,
          })),
        ),
      })
      const save = () =>
        this.store.call({
          op: 'document.put',
          namespace: 'checkpoints',
          id: checkpoint.id,
          value: checkpoint,
        })
      await save()
      try {
        for (let index = 0; index < prepared.length; index++) {
          signal.throwIfAborted()
          const item = prepared[index]
          const entry = checkpoint.entries[index]
          if (!item || !entry) throw new Error('Invalid patch journal')
          const resolved = await workspacePath(workspace, item.relative, true)
          if (resolved !== item.path) throw new Error('Path identity changed')
          const current = (await exists(item.path))
            ? hash(await readBounded(item.path, 8_000_000))
            : null
          if (current !== entry.before) throw new Error(`Concurrent edit: ${item.relative}`)
          if (item.content === null) await unlink(item.path)
          else {
            await mkdir(dirname(item.path), { recursive: true })
            if ((await workspacePath(workspace, item.relative, true)) !== item.path)
              throw new Error('Path identity changed while creating parent')
            const temporary = join(dirname(item.path), `.zero-${crypto.randomUUID()}.tmp`)
            entry.temporary = join(dirname(item.relative), basename(temporary))
            await save()
            const file = await open(temporary, 'wx', item.mode)
            try {
              await file.writeFile(item.content)
              await file.sync()
            } finally {
              await file.close()
            }
            try {
              if (
                ((await exists(item.path))
                  ? hash(await readBounded(item.path, 8_000_000))
                  : null) !== entry.before
              )
                throw new Error(`Concurrent edit: ${item.relative}`)
              await rename(temporary, item.path)
            } finally {
              if (await exists(temporary)) await unlink(temporary)
            }
          }
          entry.state = 'applied'
          entry.temporary = undefined
          await save()
        }
        for (const entry of checkpoint.entries) {
          const path = await workspacePath(workspace, entry.path, true)
          if (
            ((await exists(path)) ? hash(await readBounded(path, 8_000_000)) : null) !== entry.after
          )
            throw new Error(`External edit during patch verification: ${entry.path}`)
        }
        checkpoint.state = 'applied'
        await save()
        return {
          checkpointId: checkpoint.id,
          files: checkpoint.entries.map((entry) => ({
            path: entry.path,
            before: entry.before,
            after: entry.after,
          })),
        }
      } catch (error) {
        checkpoint.state = 'partial'
        await save()
        for (const entry of checkpoint.entries)
          if (entry.artifact)
            await this.store.call({ op: 'artifact.pin', id: entry.artifact.id, pinned: true })
        throw new Error(
          `Patch ${checkpoint.id} interrupted; inspect checkpoint before retry: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    })
  }
  async restore(id: string, runId: string, signal: AbortSignal, workspace?: string) {
    const checkpoint = checkpointSchema.parse(
      await this.store.call({ op: 'document.get', namespace: 'checkpoints', id }),
    )
    if (workspace !== undefined && checkpoint.workspace !== workspace)
      throw new Error('Checkpoint belongs to a different workspace')
    const changes: z.infer<typeof patchSchema>['changes'] = []
    for (const entry of checkpoint.entries) {
      const path = await workspacePath(checkpoint.workspace, entry.path, true)
      const current = (await exists(path)) ? hash(await readBounded(path, 8_000_000)) : null
      if (current === entry.before) continue
      if (current !== entry.after)
        throw new Error(`External changes prevent restore: ${entry.path}`)
      if (entry.artifact) {
        changes.push({
          operation: 'artifact',
          path: entry.path,
          expectedHash: entry.after,
          artifact: entry.artifact,
          mode: entry.mode,
        })
      } else if (entry.after)
        changes.push({ operation: 'delete', path: entry.path, expectedHash: entry.after })
    }
    const result = changes.length
      ? await this.apply(checkpoint.workspace, runId, { changes }, signal)
      : { files: [] }
    await this.store.call({
      op: 'document.put',
      namespace: 'checkpoints',
      id,
      value: { ...checkpoint, state: 'restored' },
    })
    return result
  }
}
