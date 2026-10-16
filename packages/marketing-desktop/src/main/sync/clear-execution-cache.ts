import type { Stats } from 'node:fs'
import { lstat, readdir, realpath, rm } from 'node:fs/promises'
import path from 'node:path'
import { canonicalJson, idSchema, runViewSchema } from '@sistemazero/marketing-contracts'
import { executionJournalSchema } from '../execution/journal'
import type { LocalWorkspaceStore } from './local-store'
import type { SyncTransport } from './sync-engine'

function inside(root: string, target: string) {
  const relative = path.relative(root, target)
  if (
    !relative ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error('A pasta temporária não pertence ao projeto')
}
async function inspect(root: string, directory: string, signal: AbortSignal) {
  let bytes = 0,
    files = 0,
    entries = 0
  const pending = [directory]
  while (pending.length) {
    signal.throwIfAborted()
    const current = pending.pop()
    if (!current) break
    inside(root, await realpath(current))
    const info = await lstat(current)
    if (info.isSymbolicLink() || !info.isDirectory())
      throw new Error('Pasta temporária irregular; arquivos preservados')
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (++entries > 100000) throw new Error('A execução contém arquivos demais para esta limpeza')
      const file = path.join(current, entry.name)
      const stat = await lstat(file)
      if (stat.isSymbolicLink())
        throw new Error('Vínculo inesperado na pasta temporária; arquivos preservados')
      if (stat.isDirectory()) pending.push(file)
      else if (stat.isFile()) {
        bytes += stat.size
        files++
      } else throw new Error('Arquivo temporário irregular; arquivos preservados')
    }
  }
  return { bytes, files }
}

/** Explicit maintenance, serialized against production by the main IPC gate.
 * Remove only per-run intermediates whose exact result is durable on the server.
 * Local journals, asset originals and incomplete jobs remain untouched. */
export async function clearExecutionCache(
  input: {
    projectId: string
    runtimeDirectory: string
    store: Pick<LocalWorkspaceStore, 'execution'>
    transport: SyncTransport
    signal: AbortSignal
  },
  targetBytes = 1024 ** 3,
) {
  const result = { removed: 0, freedBytes: 0, preserved: 0, unavailable: 0 }
  const root = path.resolve(input.runtimeDirectory)
  let rootInfo: Stats
  try {
    rootInfo = await lstat(root)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return result
    throw error
  }
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory())
    throw new Error('Cache de execução irregular; arquivos preservados')
  const canonicalRoot = await realpath(root)
  let confirmedRuns = 0
  for (const entry of await readdir(root, { withFileTypes: true })) {
    input.signal.throwIfAborted()
    if (result.freedBytes >= targetBytes || confirmedRuns >= 50) break
    if (!entry.isDirectory() || entry.isSymbolicLink() || !idSchema.safeParse(entry.name).success)
      continue
    const directory = path.resolve(root, entry.name)
    inside(canonicalRoot, await realpath(directory))
    const measured = await inspect(canonicalRoot, directory, input.signal)
    const receipt = executionJournalSchema.safeParse(input.store.execution(entry.name))
    if (
      !receipt.success ||
      receipt.data.projectId !== input.projectId ||
      receipt.data.runId !== entry.name ||
      receipt.data.stage !== 'confirmed' ||
      !receipt.data.result
    ) {
      result.preserved += measured.files
      continue
    }
    const journal = receipt.data
    const remote = runViewSchema.parse(
      await input.transport.request(`/projects/${input.projectId}/runs/${entry.name}`),
    )
    input.signal.throwIfAborted()
    if (
      remote.request.id !== journal.runId ||
      remote.request.projectId !== journal.projectId ||
      remote.request.contextHash !== journal.contextHash ||
      remote.state !== 'succeeded' ||
      canonicalJson(remote.outcome) !== canonicalJson(journal.result)
    ) {
      result.unavailable += measured.files
      continue
    }
    // Resolve immediately before recursive deletion. No user-supplied path reaches rm.
    inside(canonicalRoot, await realpath(directory))
    if ((await lstat(directory)).isSymbolicLink())
      throw new Error('A pasta temporária mudou; limpeza interrompida')
    await rm(directory, { recursive: true, force: false })
    result.removed += measured.files
    result.freedBytes += measured.bytes
    confirmedRuns++
  }
  return result
}
