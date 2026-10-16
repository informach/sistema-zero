import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import {
  UPLOAD_PART_BYTES,
  type UploadedPart,
  type UploadView,
  uploadPartSchema,
} from '../../marketing-contracts/src/assets'
import type {
  EditorialItem,
  EditorialOperation,
  Project,
} from '../../marketing-contracts/src/editorial'
import { type ExecutionRun, runViewSchema } from '../../marketing-contracts/src/execution'
import type { ChangePage } from '../../marketing-contracts/src/sync'
import { LocalAssets } from '../src/main/assets'
import { type ExecutionResources, ExecutionSupervisor } from '../src/main/execution/supervisor'
import { AssetTransfer } from '../src/main/sync/asset-transfer'
import { DiskBudget } from '../src/main/sync/disk-budget'
import { LocalWorkspaceStore } from '../src/main/sync/local-store'
import type { SyncTransport } from '../src/main/sync/sync-engine'
import { SyncTransportError, WorkspaceSyncEngine } from '../src/main/sync/sync-engine'

const scope = { origin: 'https://marketing.example.test', userId: randomUUID() }
test('post-mutation synchronization waits for a fresh project list instead of an in-flight stale read', async () => {
  const f = await fixture(),
    started = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  let reads = 0
  const created: Project = { ...project, id: randomUUID(), name: 'Criado durante a consulta' }
  const engine = new WorkspaceSyncEngine(f.store, {
    async request(route) {
      if (route === '/protocol') return { protocol: 1, minimumDesktopProtocol: 1 }
      if (route === '/projects') {
        reads++
        if (reads === 1) {
          started.resolve()
          await release.promise
          return [project]
        }
        return [project, created]
      }
      if (route.includes('/changes?'))
        return {
          cursor: 0,
          events: [],
          items: [],
          permissions: project.permissions,
          hasMore: false,
          resetRequired: false,
        }
      throw new Error(`Unexpected ${route}`)
    },
  })
  try {
    const background = engine.synchronize()
    await started.promise
    const explicit = engine.synchronize(true),
      concurrent = engine.synchronize(true)
    release.resolve()
    await Promise.all([background, explicit, concurrent])
    assert.equal(reads, 2)
    assert.equal(
      f.store.projects().some((value) => value.id === created.id),
      true,
    )
  } finally {
    release.resolve()
    await engine.waitForIdle()
    f.store.close()
    await f.clean()
  }
})
const project: Project = {
  id: randomUUID(),
  name: 'Equipe',
  product: 'Zero',
  createdBy: scope.userId,
  createdAt: new Date().toISOString(),
  sequence: 0,
  permissions: ['read', 'edit', 'execute'],
}
const document = {
  schemaVersion: 1 as const,
  kind: 'direction' as const,
  title: 'Direção',
  body: 'Original',
  objective: 'Ensinar',
  audience: 'Famílias',
  voice: 'Clareza',
  protectedTerms: [],
  referenceIds: [],
}
function operation(extra: Partial<EditorialOperation> = {}): EditorialOperation {
  return {
    schemaVersion: 1,
    operationId: randomUUID(),
    projectId: project.id,
    entityId: randomUUID(),
    baseRevisionId: null,
    action: 'save',
    document,
    ...extra,
  }
}
function receipt(op: EditorialOperation, sequence: number) {
  const revisionId = randomUUID()
  const item: EditorialItem = {
    id: op.entityId,
    projectId: op.projectId,
    kind: 'direction',
    revisionId,
    document: op.document ?? document,
    archived: false,
    updatedAt: new Date().toISOString(),
  }
  return {
    status: 'applied' as const,
    operationId: op.operationId,
    entityId: op.entityId,
    revisionId,
    sequence,
    item,
  }
}
function page(items: ChangePage['items'], from: number, to: number): ChangePage {
  return {
    items,
    cursor: to,
    hasMore: false,
    resetRequired: false,
    permissions: project.permissions,
    events: Array.from({ length: to - from }, (_, i) => ({
      schemaVersion: 1,
      projectId: project.id,
      sequence: from + i + 1,
      type: 'revision',
      entityId: items.find((item) => item.sequence === from + i + 1)?.id ?? null,
      revisionId: items.find((item) => item.sequence === from + i + 1)?.revisionId ?? null,
      actorId: scope.userId,
      createdAt: new Date().toISOString(),
    })),
  }
}
async function fixture() {
  const prefix = path.join(os.tmpdir(), 'marketing-sync-review-'),
    directory = await mkdtemp(prefix),
    file = path.join(directory, 'cache.sqlite')
  const store = new LocalWorkspaceStore(file, scope)
  store.saveProjects([project])
  return {
    store,
    file,
    async clean() {
      if (!path.resolve(directory).startsWith(path.resolve(prefix)))
        throw new Error('Pasta fora da revisão')
      await rm(directory, { recursive: true, force: true })
    },
  }
}
test('reinício preserva envio exato; confirmação não salta commits de outra pessoa', async () => {
  const f = await fixture()
  let store = f.store
  try {
    const a = operation(),
      b = operation({ entityId: a.entityId, document: { ...document, body: 'Segunda alteração' } })
    store.enqueue({ operation: a, dependsOnOperationId: null })
    store.enqueue({ operation: b, dependsOnOperationId: a.operationId })
    assert.deepEqual(store.next(project.id), a)
    store.close()
    store = new LocalWorkspaceStore(f.file, scope)
    assert.deepEqual(store.next(project.id), a)
    const accepted = receipt(a, 2)
    store.settle(a.operationId, accepted)
    assert.equal(store.cursor(project.id), 0)
    assert.equal(store.items(project.id)[0]?.revisionId, accepted.revisionId)
    const unrelated = receipt(operation(), 1)
    store.applyPage(
      project.id,
      0,
      page(
        [
          { ...unrelated.item, sequence: 1 },
          { ...accepted.item, sequence: 2 },
        ],
        0,
        2,
      ),
    )
    assert.equal(store.items(project.id).length, 2)
    const next = store.next(project.id)
    assert.equal(next?.baseRevisionId, accepted.revisionId)
    assert.equal(next?.operationId, b.operationId)
    assert.equal(
      store.enqueue({ operation: b, dependsOnOperationId: a.operationId }).operation.operationId,
      b.operationId,
    )
  } finally {
    store.close()
    await f.clean()
  }
})
test('reservas simultâneas não ultrapassam disco e pendências protegem o original', async () => {
  const f = await fixture()
  try {
    const budget = new DiskBudget(path.join(path.dirname(f.file), 'quota'), 100, 0)
    const attempts = await Promise.allSettled([budget.reserve(80), budget.reserve(80)])
    assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1)
    for (const result of attempts) if (result.status === 'fulfilled') result.value()
    const release = await budget.reserve(100)
    release()
    release()
    assert.equal((await budget.usage()).reserved, 0)
    const assetId = randomUUID(),
      op = operation({ document: { ...document, body: `Referência preservada ${assetId}` } })
    f.store.enqueue({ operation: op, dependsOnOperationId: null })
    assert.equal(f.store.protectedAssets(project.id, [assetId]).has(assetId), true)
    f.store.next(project.id)
    f.store.settle(op.operationId, receipt(op, 1))
    assert.equal(f.store.protectedAssets(project.id, [assetId]).has(assetId), false)
  } finally {
    f.store.close()
    await f.clean()
  }
})
test('resolução é atômica, preserva conflito e sobrevive ao reinício com uma única substituição', async () => {
  const f = await fixture()
  let store = f.store
  try {
    const op = operation()
    store.enqueue({ operation: op, dependsOnOperationId: null })
    store.next(project.id)
    store.settle(op.operationId, {
      status: 'conflict',
      code: 'REVISION_CONFLICT',
      operationId: op.operationId,
      entityId: op.entityId,
      baseRevisionId: null,
      currentRevisionId: randomUUID(),
    })
    const replacement = {
      schemaVersion: 1,
      projectId: project.id,
      operationId: randomUUID(),
      changes: [{ entityId: op.entityId, baseRevisionId: randomUUID(), action: 'save', document }],
    }
    assert.throws(() =>
      store.resolveDrafts({
        projectId: project.id,
        operationIds: [op.operationId],
        replacement: {
          ...replacement,
          changes: [{ ...replacement.changes[0], entityId: randomUUID() }],
        },
      }),
    )
    assert.equal(store.pending(project.id).length, 1)
    store.resolveDrafts({ projectId: project.id, operationIds: [op.operationId], replacement })
    assert.equal(store.pending(project.id).length, 0)
    store.close()
    store = new LocalWorkspaceStore(f.file, scope)
    assert.equal(store.summary().pending, 1)
    assert.equal(
      store.pendingBatches(project.id)[0]?.operation.operationId,
      replacement.operationId,
    )
    assert.deepEqual(store.resolvedDrafts(project.id)[0]?.operation, op)
    assert.equal(store.resolvedDrafts(project.id)[0]?.replacementId, replacement.operationId)
    assert.throws(() =>
      store.resolveDrafts({ projectId: project.id, operationIds: [op.operationId], replacement }),
    )
    assert.equal(store.pendingBatches(project.id).length, 1)
  } finally {
    store.close()
    await f.clean()
  }
})
test('conflito mantém versões, bloqueia dependentes e identidade do cache é validada', async () => {
  const f = await fixture()
  try {
    const a = operation(),
      b = operation({ entityId: a.entityId })
    f.store.enqueue({ operation: a, dependsOnOperationId: null })
    f.store.enqueue({ operation: b, dependsOnOperationId: a.operationId })
    assert.equal(f.store.next(project.id)?.operationId, a.operationId)
    f.store.settle(a.operationId, {
      status: 'conflict',
      code: 'REVISION_CONFLICT',
      operationId: a.operationId,
      entityId: a.entityId,
      baseRevisionId: null,
      currentRevisionId: randomUUID(),
    })
    assert.equal(f.store.next(project.id), null)
    assert.deepEqual(
      f.store.pending(project.id).map((entry) => entry.state),
      ['conflict', 'blocked'],
    )
    assert.throws(
      () => new LocalWorkspaceStore(f.file, { ...scope, userId: randomUUID() }),
      /outra conta/,
    )
    assert.throws(() => f.store.applyPage(project.id, 0, page([], 2, 3)), /incompleta/)
    assert.equal(f.store.cursor(project.id), 0)
  } finally {
    f.store.close()
    await f.clean()
  }
})
test('resposta perdida depois do commit reenvia mesma operação e encerra uma única revisão', async () => {
  const f = await fixture(),
    op = operation(),
    accepted = receipt(op, 1)
  let sends = 0,
    committed = false
  f.store.enqueue({ operation: op, dependsOnOperationId: null })
  const engine = new WorkspaceSyncEngine(f.store, {
    async request(route, method, body) {
      if (route === '/protocol') return { protocol: 1, minimumDesktopProtocol: 1 }
      if (route === '/projects') return [project]
      if (method === 'POST') {
        assert.deepEqual(body, op)
        sends++
        committed = true
        if (sends === 1) throw new SyncTransportError(503, 'UNAVAILABLE', 'Resposta perdida')
        return accepted
      }
      const cursor = Number(new URL(route, 'https://example.test').searchParams.get('cursor'))
      return committed && cursor === 0
        ? page([{ ...accepted.item, sequence: 1 }], 0, 1)
        : page([], cursor, cursor)
    },
  })
  try {
    assert.equal((await engine.synchronize()).phase, 'offline')
    assert.equal(f.store.pending(project.id)[0]?.state, 'local')
    assert.equal((await engine.synchronize()).phase, 'idle')
    assert.equal(sends, 2)
    assert.equal(f.store.pending(project.id).length, 0)
    assert.equal(f.store.items(project.id).length, 1)
  } finally {
    f.store.close()
    await f.clean()
  }
})

test('protocolo incompatível bloqueia a fila; revogação mantém pendências visíveis', async () => {
  const f = await fixture()
  f.store.enqueue({ operation: operation(), dependsOnOperationId: null })
  try {
    let calls = 0
    const incompatible = new WorkspaceSyncEngine(f.store, {
      async request() {
        calls++
        return { protocol: 999, minimumDesktopProtocol: 999 }
      },
    })
    assert.equal((await incompatible.synchronize()).phase, 'blocked')
    assert.equal(calls, 1)
    const revoked = new WorkspaceSyncEngine(f.store, {
      async request(route) {
        return route === '/protocol' ? { protocol: 1, minimumDesktopProtocol: 1 } : []
      },
    })
    const report = await revoked.synchronize()
    assert.equal(report.phase, 'blocked')
    assert.equal(report.pending, 1)
    assert.match(report.message, /preservados/)
    assert.equal(f.store.pending(project.id).length, 1)
  } finally {
    f.store.close()
    await f.clean()
  }
})
test('alteração conjunta sobrevive ao reinício e não confirma metade de uma peça', async () => {
  const f = await fixture()
  let store = f.store
  try {
    const { createPieceBatch } = await import('../../marketing-contracts/src/factories')
    const input = createPieceBatch({
      projectId: project.id,
      title: 'Story',
      brief: 'Ensinar',
      format: 'story',
      medium: 'image',
    })
    store.enqueueBatch(input)
    assert.deepEqual(store.nextBatch(project.id), input)
    store.close()
    store = new LocalWorkspaceStore(f.file, scope)
    assert.deepEqual(store.nextBatch(project.id), input)
    const confirmed = input.changes.map((change) => {
      if (!change.document) throw new Error('Fixture')
      return {
        id: change.entityId,
        projectId: project.id,
        revisionId: randomUUID(),
        kind: change.document.kind,
        document: change.document,
        archived: false,
        updatedAt: new Date().toISOString(),
      }
    })
    assert.throws(
      () =>
        store.settleBatch(input.operationId, {
          status: 'applied',
          operationId: input.operationId,
          items: confirmed.slice(0, 1),
          cursor: 3,
        }),
      /incompleto/,
    )
    assert.equal(store.items(project.id).length, 0)
    store.settleBatch(input.operationId, {
      status: 'applied',
      operationId: input.operationId,
      items: confirmed,
      cursor: 3,
    })
    assert.equal(store.items(project.id).length, 3)
    assert.equal(store.cursor(project.id), 0)
    assert.equal(store.pendingBatches(project.id).length, 0)
  } finally {
    store.close()
    await f.clean()
  }
})

test('multipart retomado após resposta perdida não reenvia a parte já recebida', async () => {
  const f = await fixture(),
    assets = new LocalAssets(path.join(path.dirname(f.file), 'assets'))
  await assets.start()
  try {
    const source = path.join(path.dirname(f.file), 'video.mp4'),
      bytes = Buffer.alloc(UPLOAD_PART_BYTES + 100, 7)
    await writeFile(source, bytes)
    const asset = await assets.importFile(source),
      { url: _url, ...identity } = asset
    const input = {
      operationId: randomUUID(),
      manifest: {
        ...identity,
        schemaVersion: 1 as const,
        projectId: project.id,
        mime: 'video/mp4' as const,
        role: 'original' as const,
        sourceAssetId: null,
        width: null,
        height: null,
        durationMs: null,
        codec: null,
        rotation: null,
      },
    }
    const parts: UploadedPart[] = [],
      sent: number[] = []
    let completed = false,
      lost = true
    const transport: SyncTransport = {
      async request(route, _method, body) {
        const view: UploadView = {
          manifest: input.manifest,
          state: completed ? 'verifying' : 'uploading',
          partBytes: UPLOAD_PART_BYTES,
          bytesReceived: completed,
          parts: [...parts],
          error: null,
        }
        if (route === '/assets') return view
        if (route.endsWith('/complete')) {
          assert.equal(parts.length, 2)
          completed = true
          return { ...view, state: 'verifying', bytesReceived: true }
        }
        const part = uploadPartSchema.parse(body)
        const size = Math.min(
          UPLOAD_PART_BYTES,
          bytes.length - (part.number - 1) * UPLOAD_PART_BYTES,
        )
        return {
          url: `https://storage.example.test/${part.number}`,
          size,
          headers: { 'content-md5': part.md5, 'content-length': String(size) },
        }
      },
    }
    const transfer = new AssetTransfer(f.store, assets, transport, async (url, part) => {
      const number = Number(new URL(url).pathname.slice(1))
      sent.push(number)
      parts.push({
        number,
        size: part.byteLength,
        etag: `"${createHash('md5').update(part).digest('hex')}"`,
      })
      if (lost) {
        lost = false
        throw new Error('Resposta perdida')
      }
    })
    await assert.rejects(
      () => transfer.upload(input, new AbortController().signal),
      /Resposta perdida/,
    )
    assert.equal((await transfer.upload(input, new AbortController().signal)).state, 'verifying')
    assert.deepEqual(sent, [1, 2])
    assert.equal(f.store.transfers(project.id)[0]?.uploadedBytes, bytes.length)
  } finally {
    assets.close()
    f.store.close()
    await f.clean()
  }
})

test('supervisor retoma sem inferência duplicada e cancelamento local sobrevive à queda da rede e reinício', async () => {
  const f = await fixture(),
    assets = new LocalAssets(path.join(path.dirname(f.file), 'assets'))
  await assets.start()
  const revision = {
    id: randomUUID(),
    projectId: project.id,
    entityId: randomUUID(),
    parentRevisionId: null,
    document,
    createdBy: scope.userId,
    createdAt: new Date().toISOString(),
  }
  let remote: ExecutionRun = runViewSchema.parse({
    request: {
      schemaVersion: 1,
      operationId: randomUUID(),
      id: randomUUID(),
      projectId: project.id,
      entityId: revision.entityId,
      revisionId: revision.id,
      intent: 'adjust',
      capability: 'copy',
      provider: 'codex',
      instruction: 'Ajuste a copy',
      selection: [],
      protectedIds: [],
      contextHash: 'a'.repeat(64),
      limits: { timeoutMs: 360000, maxCalls: 1, maxVariants: 1, maxRepairs: 0 },
    },
    context: {
      schemaVersion: 1,
      source: revision,
      selected: [],
      directions: [],
      evidence: [],
      protectedIds: [],
    },
    state: 'queued',
    epoch: 0,
    createdBy: scope.userId,
    createdAt: new Date().toISOString(),
    attempt: null,
    outcome: null,
    leaseExpired: false,
  })
  let calls = 0,
    failFinish = true,
    failCancel = true
  const transport: SyncTransport = {
    async request(route, _method, body) {
      if (route.endsWith('/cancel')) {
        if (failCancel) throw new SyncTransportError(503, 'NETWORK', 'Cancelamento sem rede')
        remote = { ...remote, state: 'canceled' }
      }
      if (route.endsWith('/claim'))
        remote = {
          ...remote,
          state: 'running',
          epoch: 1,
          attempt: {
            schemaVersion: 1,
            id: randomUUID(),
            runId: remote.request.id,
            deviceId: randomUUID(),
            epoch: 1,
            state: 'running',
            leaseExpiresAt: new Date(Date.now() + 90000).toISOString(),
            checkpoint: {
              phase: 'working',
              stage: 'Produzindo',
              artifactIds: [],
              progress: 0,
              inputTokens: null,
              outputTokens: null,
            },
          },
        }
      if (route.endsWith('/finish')) {
        if (failFinish) {
          failFinish = false
          throw new SyncTransportError(503, 'NETWORK', 'Resposta indisponível')
        }
        const finish = (
          await import('../../marketing-contracts/src/execution')
        ).finishRunSchema.parse(body)
        remote = { ...remote, state: 'succeeded', outcome: finish.outcome }
      }
      return remote
    },
  }
  const resources: ExecutionResources = {
    store: f.store,
    assets,
    transport,
    directory: path.dirname(f.file),
    runtimeDirectory: path.dirname(f.file),
    project,
    transfer: new AssetTransfer(f.store, assets, transport),
  }
  const supervisor = new ExecutionSupervisor(
    {
      async resources() {
        return resources
      },
    },
    async () => {
      calls++
      return {
        status: 'succeeded',
        text: 'Copy revisada',
        assetIds: [],
        mode: 'ChatGPT',
        durationMs: 10,
        inputTokens: null,
        outputTokens: null,
      }
    },
    () => {},
  )
  const selection = {
    scope,
    projectId: project.id,
    runId: remote.request.id,
    strategy: 'start' as const,
  }
  try {
    await assert.rejects(() => supervisor.run(selection), /Resposta indisponível/)
    await assert.rejects(() => supervisor.run(selection), /tentativa anterior/)
    assert.equal((await supervisor.run({ ...selection, strategy: 'resume' })).state, 'succeeded')
    assert.equal(calls, 1)
    remote = {
      ...remote,
      request: { ...remote.request, id: randomUUID() },
      state: 'queued',
      epoch: 0,
      attempt: null,
      outcome: null,
    }
    const started = Promise.withResolvers<void>()
    let stopped = false
    const canceling = new ExecutionSupervisor(
      {
        async resources() {
          return resources
        },
      },
      async (_run, _resources, signal) => {
        started.resolve()
        await new Promise<void>((_resolve, reject) => {
          const abort = () => {
            stopped = true
            reject(signal.reason)
          }
          signal.addEventListener('abort', abort, { once: true })
          if (signal.aborted) abort()
        })
        throw new Error('Execução não pode terminar sem cancelamento')
      },
      () => {},
    )
    const completion = assert.rejects(
      () => canceling.run({ ...selection, runId: remote.request.id }),
      /cancelado/,
    )
    await started.promise
    await assert.rejects(() => canceling.cancel(), /sem rede/)
    await completion
    assert.equal(stopped, true)
    const queued = f.store.cancellation(remote.request.id)
    assert.equal(queued?.state, 'pending')
    f.store.close()
    f.store = new LocalWorkspaceStore(f.file, scope)
    resources.store = f.store
    assert.equal(f.store.cancellation(remote.request.id)?.operationId, queued?.operationId)
    failCancel = false
    const engine = new WorkspaceSyncEngine(f.store, {
      async request(route, method, body) {
        if (route === '/protocol') return { protocol: 1, minimumDesktopProtocol: 1 }
        if (route === '/projects') return [project]
        if (route.includes('/changes?'))
          return {
            cursor: 0,
            events: [],
            items: [],
            permissions: project.permissions,
            hasMore: false,
            resetRequired: false,
          }
        return transport.request(route, method, body)
      },
    })
    assert.equal((await engine.synchronize()).phase, 'idle')
    assert.equal(f.store.cancellation(remote.request.id)?.state, 'confirmed')
    assert.equal(remote.state, 'canceled')
  } finally {
    await supervisor.stop()
    assets.close()
    f.store.close()
    await f.clean()
  }
})
