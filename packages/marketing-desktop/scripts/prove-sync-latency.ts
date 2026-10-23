import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { operationResultSchema, projectSchema } from '@sistemazero/marketing-contracts'
import { app, session } from 'electron'
import { z } from 'zod'
import { readBoundedJson } from '../src/main/bounded-json'
import { DesktopServerSession } from '../src/main/server-session'
import { DesktopWorkspaceManager } from '../src/main/sync/workspace-manager'

// Two independent authenticated transports on ONE computer. This measurement is
// server receipt -> native projection, not a claim of the two-person UI pilot.
const label = process.argv.includes('--baseline') ? 'baseline' : 'candidate'
const directory = path.resolve('.cache/native-connected-proof', `sync-latency-${label}`)
app.setName('Marketing Sync Review')
app.setPath('userData', path.join(directory, 'profile'))
async function main() {
  await app.whenReady()
  await mkdir(directory, { recursive: true })
  let manager: DesktopWorkspaceManager | undefined
  try {
    const fixture = z
      .object({
        userId: z.string().uuid(),
        email: z.string(),
        password: z.string(),
        origin: z.literal('http://127.0.0.1:15334'),
      })
      .parse(JSON.parse(await readFile('.cache/native-connected-proof/fixture.json', 'utf8')))
    const browser = session.fromPartition(`sync-writer-${randomUUID()}`)
    const counts = new Map<string, number>()
    async function request(route: string, body?: unknown) {
      counts.set(route, (counts.get(route) ?? 0) + 1)
      const response = await browser.fetch(`${fixture.origin}${route}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { origin: fixture.origin, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`HTTP ${response.status}: ${route}`)
      }
      return readBoundedJson(response)
    }
    await request('/api/auth/login', { email: fixture.email, password: fixture.password })
    const server = new DesktopServerSession(path.join(directory, 'connection'))
    await server.initialize()
    if ((await server.status()).status !== 'connected') {
      const pair = await server.start({
        origin: fixture.origin,
        label: `Medição de sincronização ${label}`,
      })
      await request('/api/desktop', { action: 'approve', code: pair.code })
      assert.equal((await server.poll()).status, 'connected')
    }
    assert.equal(server.cachedState.userId, fixture.userId)
    const nativeCounts = new Map<string, number>()
    server.electronSession.webRequest.onBeforeRequest(
      { urls: [`${fixture.origin}/api/marketing/workspace/*`] },
      (details, callback) => {
        const route = new URL(details.url).pathname
        nativeCounts.set(route, (nativeCounts.get(route) ?? 0) + 1)
        callback({})
      },
    )
    const project = projectSchema.parse(
      await request('/api/marketing/workspace/projects', {
        schemaVersion: 1,
        operationId: randomUUID(),
        id: randomUUID(),
        name: `Medição de sincronização ${label}`,
        product: 'Revisão técnica isolada',
      }),
    )
    let observed: (() => void) | undefined
    manager = new DesktopWorkspaceManager(path.join(directory, 'workspace'), server, (report) => {
      if (report.phase === 'idle') observed?.()
    })
    const initial = await manager.synchronize()
    assert.equal(initial.phase, 'idle', initial.message)
    nativeCounts.clear()
    const entityId = randomUUID()
    let baseRevisionId: string | null = null
    const samples: number[] = []
    const started = performance.now()
    for (let index = 0; index < 23; index++) {
      const receipt = operationResultSchema.parse(
        await request('/api/marketing/workspace/operations', {
          schemaVersion: 1,
          operationId: randomUUID(),
          projectId: project.id,
          entityId,
          baseRevisionId,
          action: 'save',
          document: {
            schemaVersion: 1,
            kind: 'direction',
            title: 'Medição isolada',
            body: `Amostra ${index}`,
            objective: 'Conferir propagação',
            audience: 'Equipe de revisão',
            voice: 'Direta',
            protectedTerms: [],
            referenceIds: [],
          },
        }),
      )
      assert.equal(receipt.status, 'applied')
      if (receipt.status !== 'applied') throw new Error('Conflito na medição')
      baseRevisionId = receipt.revisionId
      const confirmed = performance.now()
      const projection = manager
      await new Promise<void>((resolve, reject) => {
        const deadline = setTimeout(() => {
          observed = undefined
          reject(new Error('A revisão não chegou em 20 s'))
        }, 20000)
        let reading = false
        observed = () => {
          if (reading) return
          reading = true
          void projection
            .view(project.id)
            .then((view) => {
              if (
                view.items.some(
                  (item) => item.id === entityId && item.revisionId === receipt.revisionId,
                )
              ) {
                clearTimeout(deadline)
                observed = undefined
                resolve()
              }
            })
            .catch((error) => {
              clearTimeout(deadline)
              observed = undefined
              reject(error)
            })
            .finally(() => {
              reading = false
            })
        }
        observed()
      })
      const milliseconds = performance.now() - confirmed
      if (index >= 3) samples.push(milliseconds)
      console.log(JSON.stringify({ syncSample: index, milliseconds }))
    }
    const durationMs = performance.now() - started
    const ordered = [...samples].sort((a, b) => a - b)
    const result = {
      label,
      samples,
      p50: ordered[Math.ceil(ordered.length * 0.5) - 1],
      p95: ordered[Math.ceil(ordered.length * 0.95) - 1],
      durationMs,
      nativeRequests: [...nativeCounts],
      nativeRequestsPerMinute:
        ([...nativeCounts.values()].reduce((a, b) => a + b, 0) * 60000) / durationMs,
      projectId: project.id,
      computerCount: 1,
      identityCount: 1,
      transportCount: 2,
      boundary: 'server-response-to-native-projection',
      uiMeasured: false,
      electron: process.versions.electron,
      cpu: os.cpus()[0]?.model,
      memoryBytes: os.totalmem(),
    }
    await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
    await manager.stop()
    manager = undefined
    app.exit(0)
  } catch (error) {
    await manager?.stop()
    console.error(error instanceof Error ? error.message : 'Medição falhou')
    app.exit(1)
  }
}
void main()
