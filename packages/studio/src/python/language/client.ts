import {
  applyPythonLanguagePatch,
  assertPythonLanguageQueryCurrent,
  isPythonLanguageSourcePath,
  PYTHON_LANGUAGE_LIMITS,
  type PythonLanguageCommand,
  type PythonLanguageMethod,
  type PythonLanguageSnapshot,
  parsePythonLanguageCommand,
} from '@sistemazero/core/studio/python-language'
import type {
  PythonLanguageConnection,
  PythonLanguageProvider,
  PythonLanguageResults,
} from '@sistemazero/core/studio/python-language-results'
import type { ProjectTree } from '../../core/proProject'

export class PythonLanguageUnavailable extends Error {}
export class PythonLanguageStale extends Error {}
const stale = () => new PythonLanguageStale('O código mudou durante a análise Python.')
async function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  let abort = () => {}
  const stopped = new Promise<never>((_, reject) => {
    abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
  })
  try {
    return await Promise.race([promise, stopped])
  } finally {
    signal.removeEventListener('abort', abort)
  }
}
const sourceFiles = (tree: ProjectTree) =>
  Object.fromEntries(
    Object.entries(tree).flatMap(([path, node]) =>
      node.kind === 'file' && isPythonLanguageSourcePath(path) ? [[path, node.content]] : [],
    ),
  )
const sameFiles = (left: Record<string, string>, right: Record<string, string>) =>
  Object.keys(left).length === Object.keys(right).length &&
  Object.entries(left).every(([path, source]) => right[path] === source)

/** An editor owns this connection; project/connection epochs protect even A→B→A replies. */
export function createPythonLanguageClient(
  provider: PythonLanguageProvider,
  projectId: string,
  entrypointInput: string | (() => string),
) {
  const readEntrypoint =
    typeof entrypointInput === 'string' ? () => entrypointInput : entrypointInput
  let entrypoint = readEntrypoint()
  let acknowledgedEntrypoint: string | null = null
  const lifetime = new AbortController()
  let connectionLifetime = new AbortController()
  let epoch = 0,
    connectionEpoch = 0
  let files: Record<string, string> = {}
  let acknowledged: PythonLanguageSnapshot = { revision: 0, files: {} }
  let versions = new Map<string, number>()
  let connection: PythonLanguageConnection | null = null
  let opening: Promise<PythonLanguageConnection> | null = null
  let queue: Promise<void> = Promise.resolve()
  let queued = 0
  const queries = new Set<AbortController>()
  const assertCurrent = (captured: number) => {
    if (lifetime.signal.aborted || captured !== epoch || readEntrypoint() !== entrypoint)
      throw stale()
  }
  const invalidate = () => {
    epoch++
    connectionEpoch++
    connectionLifetime.abort(stale())
    connectionLifetime = new AbortController()
    connection?.close()
    connection = null
    opening = null
    acknowledged = { revision: 0, files: {} }
    acknowledgedEntrypoint = null
    versions = new Map()
    for (const query of queries) query.abort()
  }
  function open() {
    if (connection) return Promise.resolve(connection)
    if (!opening) {
      const captured = connectionEpoch
      const signal = AbortSignal.any([
        lifetime.signal,
        connectionLifetime.signal,
        AbortSignal.timeout(45_000),
      ])
      const pending = provider.open({ projectId }, signal).then((value) => {
        if (signal.aborted || captured !== connectionEpoch) {
          value.close()
          throw stale()
        }
        connection = value
        return value
      })
      opening = abortable(pending, signal).catch((error) => {
        if (captured === connectionEpoch) opening = null
        throw error
      })
    }
    return opening
  }
  async function synchronize(captured: number, signal: AbortSignal) {
    if (queued >= PYTHON_LANGUAGE_LIMITS.maxPendingRequests)
      throw new PythonLanguageUnavailable('Aguarde a análise Python em andamento.')
    queued++
    let result!: {
      connection: PythonLanguageConnection
      snapshot: PythonLanguageSnapshot
      connectionEpoch: number
    }
    const operation = queue.then(async () => {
      assertCurrent(captured)
      signal.throwIfAborted()
      const ownedConnectionEpoch = connectionEpoch
      const changes = [
        ...new Set([...Object.keys(acknowledged.files), ...Object.keys(files)]),
      ].flatMap((path) => {
        const source = files[path] ?? null
        return source === acknowledged.files[path]?.source
          ? []
          : [{ path, source, version: (versions.get(path) ?? 0) + 1 }]
      })
      // Validate before paying for a remote session. Configurations and assets never enter changes.
      const parsed = parsePythonLanguageCommand({
        version: 1,
        id: crypto.randomUUID(),
        kind: 'sync',
        entrypoint,
        baseRevision: acknowledged.revision,
        revision: acknowledged.revision + 1,
        changes,
      })
      if (parsed.kind !== 'sync') throw new Error('Expected Python source update')
      const next = applyPythonLanguagePatch(acknowledged, versions, parsed)
      const target = await abortable(open(), signal)
      assertCurrent(captured)
      signal.throwIfAborted()
      if (ownedConnectionEpoch !== connectionEpoch) throw stale()
      if (
        changes.length ||
        acknowledged.revision === 0 ||
        acknowledgedEntrypoint !== parsed.entrypoint
      ) {
        try {
          const requestSignal = AbortSignal.any([
            signal,
            AbortSignal.timeout(PYTHON_LANGUAGE_LIMITS.requestTimeoutMs),
          ])
          const reply = await abortable(target.send(parsed, requestSignal), requestSignal)
          if (ownedConnectionEpoch !== connectionEpoch) throw stale()
          if (reply.kind !== 'synced' || reply.revision !== next.snapshot.revision)
            throw new PythonLanguageUnavailable('Não foi possível sincronizar a análise Python.')
          // Keep the acknowledged remote state even when a newer local edit arrived during the send.
          acknowledged = next.snapshot
          acknowledgedEntrypoint = parsed.entrypoint
          versions = next.versions
        } catch (error) {
          if (ownedConnectionEpoch === connectionEpoch) invalidate()
          throw error
        }
      }
      assertCurrent(captured)
      result = { connection: target, snapshot: acknowledged, connectionEpoch }
    })
    queue = operation
      .finally(() => {
        queued--
      })
      .catch(() => {})
    await abortable(operation, signal)
    return result
  }
  return {
    update(tree: ProjectTree) {
      const next = sourceFiles(tree)
      const nextEntrypoint = readEntrypoint()
      if (sameFiles(files, next) && entrypoint === nextEntrypoint) return
      files = next
      entrypoint = nextEntrypoint
      epoch++
      for (const query of queries) query.abort()
    },
    async query<K extends PythonLanguageMethod>(
      method: K,
      path: string,
      input: { offset?: number; name?: string; signal?: AbortSignal } = {},
    ): Promise<PythonLanguageResults[K]> {
      const nextEntrypoint = readEntrypoint()
      if (entrypoint !== nextEntrypoint) {
        entrypoint = nextEntrypoint
        epoch++
        for (const query of queries) query.abort()
      }
      const captured = epoch
      const controller = new AbortController()
      const signal = AbortSignal.any([
        lifetime.signal,
        connectionLifetime.signal,
        controller.signal,
        input.signal ?? new AbortController().signal,
      ])
      const current = await synchronize(captured, signal)
      assertCurrent(captured)
      const file = current.snapshot.files[path]
      if (!file) throw stale()
      const command = parsePythonLanguageCommand({
        version: 1,
        id: crypto.randomUUID(),
        kind: 'query',
        revision: current.snapshot.revision,
        path,
        documentVersion: file.version,
        method,
        ...(input.offset === undefined ? {} : { offset: input.offset }),
        ...(input.name === undefined ? {} : { name: input.name }),
      })
      if (command.kind !== 'query') throw new Error('Expected Python query')
      assertPythonLanguageQueryCurrent(current.snapshot, command)
      queries.add(controller)
      const requestSignal = AbortSignal.any([
        signal,
        AbortSignal.timeout(PYTHON_LANGUAGE_LIMITS.requestTimeoutMs),
      ])
      const cancel = () => {
        const commandCancel: PythonLanguageCommand = {
          version: 1,
          id: crypto.randomUUID(),
          kind: 'cancel',
          requestId: command.id,
        }
        void current.connection.send(commandCancel, AbortSignal.timeout(2000)).catch(() => {})
      }
      requestSignal.addEventListener('abort', cancel, { once: true })
      try {
        requestSignal.throwIfAborted()
        const reply = await abortable(
          current.connection.send(command, requestSignal),
          requestSignal,
        )
        assertCurrent(captured)
        if (current.connectionEpoch !== connectionEpoch) throw stale()
        if (reply.kind === 'error') {
          if (reply.code === 'cancelled' || reply.code === 'stale-document') throw stale()
          if (reply.code === 'expired' || reply.code === 'unavailable') invalidate()
          throw new PythonLanguageUnavailable(reply.message)
        }
        if (
          reply.kind !== 'result' ||
          reply.method !== method ||
          reply.revision !== current.snapshot.revision ||
          reply.path !== path ||
          reply.documentVersion !== file.version
        )
          throw new PythonLanguageUnavailable(
            'A análise Python devolveu uma resposta de outra versão.',
          )
        return reply.result as PythonLanguageResults[K]
      } catch (error) {
        if (
          !requestSignal.aborted &&
          !(error instanceof PythonLanguageStale) &&
          current.connectionEpoch === connectionEpoch
        )
          invalidate()
        throw error
      } finally {
        queries.delete(controller)
        requestSignal.removeEventListener('abort', cancel)
      }
    },
    retry() {
      invalidate()
    },
    dispose() {
      lifetime.abort()
      invalidate()
    },
  }
}
export type PythonLanguageClient = ReturnType<typeof createPythonLanguageClient>
