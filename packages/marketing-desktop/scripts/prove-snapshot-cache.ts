import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { retryAfterMilliseconds } from '@sistemazero/marketing-contracts'
import { app, session } from 'electron'
import { z } from 'zod'
import { readBoundedJson } from '../src/main/bounded-json'
import { LocalWorkspaceStore } from '../src/main/sync/local-store'
import { rateLimitedTransport } from '../src/main/sync/rate-limit'
import { SyncTransportError, WorkspaceSyncEngine } from '../src/main/sync/sync-engine'

// Isolated native cache; never opens or copies the importing device's credentials/cache.
const directory = path.resolve('.cache/native-connected-proof')
app.setName('Marketing Snapshot Review')
app.setPath('userData', path.join(directory, 'snapshot-review-profile'))
async function main() {
  await app.whenReady()
  let store: LocalWorkspaceStore | undefined
  try {
    const fixture = z
      .object({
        userId: z.string().uuid(),
        email: z.string(),
        password: z.string(),
        origin: z.literal('http://127.0.0.1:15334'),
      })
      .parse(JSON.parse(await readFile(path.join(directory, 'fixture.json'), 'utf8')))
    const evidence = z
      .object({ projectId: z.string().uuid() })
      .parse(JSON.parse(await readFile(path.join(directory, 'inventory-evidence.json'), 'utf8')))
    const browser = session.fromPartition(`snapshot-review-${crypto.randomUUID()}`)
    const login = await browser.fetch(`${fixture.origin}/api/auth/login`, {
      method: 'POST',
      headers: { origin: fixture.origin, 'content-type': 'application/json' },
      body: JSON.stringify({ email: fixture.email, password: fixture.password }),
      signal: AbortSignal.timeout(15000),
    })
    await login.body?.cancel()
    if (!login.ok) throw new Error(`Login da revisão: HTTP ${login.status}`)
    const counts = new Map<string, number>(),
      waits: number[] = []
    const transport = rateLimitedTransport(
      {
        async request(route, method = 'GET') {
          if (method !== 'GET') throw new Error('A prova de cache só permite leitura do acervo')
          counts.set(route, (counts.get(route) ?? 0) + 1)
          const response = await browser.fetch(
            `${fixture.origin}/api/marketing/workspace${route}`,
            { signal: AbortSignal.timeout(60000) },
          )
          const body = await readBoundedJson(response)
          if (!response.ok)
            throw new SyncTransportError(
              response.status,
              'REVIEW_READ_FAILED',
              `Leitura da revisão: HTTP ${response.status}`,
              retryAfterMilliseconds(response.headers.get('retry-after')),
            )
          return body
        },
      },
      AbortSignal.timeout(10 * 60000),
      (ms) => waits.push(ms),
    )
    const cacheDirectory = await mkdtemp(path.join(directory, 'snapshot-cache-'))
    const cache = path.join(cacheDirectory, 'workspace.sqlite'),
      scope = { origin: fixture.origin, userId: fixture.userId }
    store = new LocalWorkspaceStore(cache, scope)
    assert.equal(store.projects().length, 0)
    const started = performance.now()
    const initial = await new WorkspaceSyncEngine(store, transport).synchronize()
    assert.equal(initial.phase, 'idle', initial.message)
    assert.ok(initial.confirmedAt)
    assert.ok(store.cursor(evidence.projectId) > 0)
    const piece = store
      .items(evidence.projectId)
      .find((item) => item.id === '4cdc6bac-5454-5347-9246-68a406b6ab15')
    assert.equal(piece?.document.kind, 'component')
    if (piece?.document.kind !== 'component') throw new Error('Componente P01 não recebido')
    const initialMilliseconds = performance.now() - started
    const itemCount = store.items(evidence.projectId).length,
      cursor = store.cursor(evidence.projectId)
    const snapshots = [...counts.keys()].filter((route) => route.includes('/snapshot-page'))
    assert.ok(snapshots.some((route) => route.startsWith(`/projects/${evidence.projectId}/`)))
    assert.equal(store.snapshotCursor(evidence.projectId), null)
    store.close()
    store = new LocalWorkspaceStore(cache, scope)
    assert.equal(store.cursor(evidence.projectId), cursor)
    const restarted = await new WorkspaceSyncEngine(store, transport).synchronize()
    assert.equal(restarted.phase, 'idle', restarted.message)
    assert.ok(restarted.confirmedAt)
    assert.deepEqual(
      [...counts.keys()].filter((route) => route.includes('/snapshot-page')),
      snapshots,
    )
    assert.ok(snapshots.every((route) => counts.get(route) === 1))
    const result = {
      nativeElectron: process.versions.electron,
      initialMilliseconds,
      itemCount,
      cursor,
      retainedAfterRestart: true,
      snapshots: snapshots.length,
      requests: [...counts],
      waits,
      published: false,
    }
    await writeFile(
      path.join(directory, 'snapshot-cache-evidence.json'),
      JSON.stringify(result, null, 2),
    )
    console.log(JSON.stringify({ ...result, requests: result.requests.length }))
    store.close()
    store = undefined
    app.exit(0)
  } catch (error) {
    store?.close()
    console.error(error instanceof Error ? error.message : 'Falha na prova do cache')
    app.exit(1)
  }
}
void main()
