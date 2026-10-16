import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, rm, stat, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import sharp from 'sharp'
import {
  type AssetManifest,
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
import { beginProviderCheckpoint, saveProviderCheckpoint } from '../src/main/provider-checkpoint'
import { runProvider } from '../src/main/providers'
import { AssetTransfer } from '../src/main/sync/asset-transfer'
import { clearConfirmedAssets } from '../src/main/sync/clear-confirmed-cache'
import { DiskBudget } from '../src/main/sync/disk-budget'
import { prepareImportedFinal } from '../src/main/sync/import-final'
import { LocalWorkspaceStore } from '../src/main/sync/local-store'
import type { SyncTransport } from '../src/main/sync/sync-engine'
import { SyncTransportError, WorkspaceSyncEngine } from '../src/main/sync/sync-engine'
import { DesktopProjectProjection } from '../src/renderer/project-projection'

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

test('retrato paginado resiste a reinício e troca o cache somente ao terminar, preservando recibos novos e rascunhos', async () => {
  const f = await fixture()
  let store = f.store
  try {
    const ids = [randomUUID(), randomUUID()].sort(),
      first = receipt(operation({ entityId: ids[0] }), 1),
      second = receipt(operation({ entityId: ids[1] }), 2)
    const draft = operation()
    store.enqueue({ operation: draft, dependsOnOperationId: null })
    store.applySnapshotPage(project.id, null, {
      projectId: project.id,
      at: 1000,
      permissions: project.permissions,
      items: [{ ...first.item, sequence: 1 }],
      nextAfter: first.item.id,
    })
    assert.equal(store.cursor(project.id), 0)
    assert.equal(store.items(project.id).length, 0)
    store.close()
    store = new LocalWorkspaceStore(f.file, scope)
    assert.deepEqual(store.snapshotCursor(project.id), { at: 1000, after: first.item.id })
    const edited = operation({
      entityId: first.item.id,
      baseRevisionId: first.revisionId,
      document: { ...document, body: 'Revisão posterior ao retrato' },
    })
    store.enqueue({ operation: edited, dependsOnOperationId: null })
    store.settle(edited.operationId, receipt(edited, 1001))
    const cursor = store.snapshotCursor(project.id)
    assert.throws(
      () =>
        store.applySnapshotPage(project.id, cursor, {
          projectId: project.id,
          at: 1002,
          permissions: project.permissions,
          items: [{ ...second.item, sequence: 2 }],
          nextAfter: null,
        }),
      /sequência/,
    )
    store.applySnapshotPage(project.id, cursor, {
      projectId: project.id,
      at: 1000,
      permissions: project.permissions,
      items: [{ ...second.item, sequence: 2 }],
      nextAfter: null,
    })
    assert.equal(store.snapshotCursor(project.id), null)
    assert.equal(store.cursor(project.id), 1000)
    assert.equal(store.items(project.id).length, 2)
    assert.equal(
      store.items(project.id).find((item) => item.id === first.item.id)?.document.kind,
      'direction',
    )
    assert.deepEqual(
      store.items(project.id).find((item) => item.id === first.item.id)?.document,
      edited.document,
    )
    assert.equal(
      store.pending(project.id).some((item) => item.operation.operationId === draft.operationId),
      true,
    )
  } finally {
    store.close()
    await f.clean()
  }
})

test('sincronizador negocia snapshot e começa mudanças na sequência fixada, sem reler os eventos antigos', async () => {
  const f = await fixture()
  const value = receipt(operation(), 7),
    paths: string[] = []
  const engine = new WorkspaceSyncEngine(f.store, {
    async request(route) {
      paths.push(route)
      if (route === '/protocol') return { protocol: 1, minimumDesktopProtocol: 1, snapshotPages: 1 }
      if (route === '/projects') return [{ ...project, sequence: 1000 }]
      if (route.endsWith('/snapshot-page'))
        return {
          projectId: project.id,
          at: 1000,
          items: [{ ...value.item, sequence: 7 }],
          nextAfter: null,
          permissions: project.permissions,
        }
      if (route.endsWith('/changes?cursor=1000')) return page([], 1000, 1000)
      throw new Error(`Consulta inesperada: ${route}`)
    },
  })
  try {
    assert.equal((await engine.synchronize()).phase, 'idle')
    assert.equal(f.store.cursor(project.id), 1000)
    assert.equal(f.store.items(project.id)[0]?.id, value.item.id)
    assert.equal(paths.filter((route) => route.endsWith('/snapshot-page')).length, 1)
    assert.deepEqual(
      paths.filter((route) => route.includes('/changes?')),
      [`/projects/${project.id}/changes?cursor=1000`],
    )
  } finally {
    await engine.waitForIdle()
    f.store.close()
    await f.clean()
  }
})

test('consulta somente projetos alterados e busca o delta após uma gravação local', async () => {
  const f = await fixture(),
    first = receipt(operation(), 1)
  const second = receipt(
    operation({
      entityId: first.entityId,
      baseRevisionId: first.revisionId,
      document: { ...document, body: 'Pessoa B' },
    }),
    2,
  )
  const thirdOperation = operation({
      entityId: first.entityId,
      baseRevisionId: second.revisionId,
      document: { ...document, body: 'Pessoa A' },
    }),
    third = receipt(thirdOperation, 3)
  f.store.applyPage(project.id, 0, page([{ ...first.item, sequence: 1 }], 0, 1))
  const paths: string[] = []
  let sequence = 1
  const engine = new WorkspaceSyncEngine(f.store, {
    async request(route) {
      paths.push(route)
      if (route === '/protocol') return { protocol: 1, minimumDesktopProtocol: 1, snapshotPages: 1 }
      if (route === '/projects') return [{ ...project, sequence }]
      if (route === '/operations') {
        sequence = 3
        return third
      }
      if (route.endsWith('/changes?cursor=1'))
        return sequence === 1 ? page([], 1, 1) : page([{ ...second.item, sequence: 2 }], 1, 2)
      if (route.endsWith('/changes?cursor=2'))
        return sequence === 2 ? page([], 2, 2) : page([{ ...third.item, sequence: 3 }], 2, 3)
      if (route.endsWith('/changes?cursor=3')) return page([], 3, 3)
      throw new Error(`Consulta inesperada: ${route}`)
    },
  })
  try {
    assert.equal((await engine.synchronize()).phase, 'idle')
    assert.deepEqual(paths, ['/protocol', '/projects'])
    sequence = 2
    paths.length = 0
    assert.equal((await engine.synchronize()).phase, 'idle')
    assert.equal(paths.filter((route) => route.includes('/changes?')).length, 1)
    assert.equal(f.store.items(project.id)[0]?.revisionId, second.revisionId)
    f.store.enqueue({ operation: thirdOperation, dependsOnOperationId: null })
    paths.length = 0
    assert.equal((await engine.synchronize()).phase, 'idle')
    assert.equal(paths.filter((route) => route.includes('/changes?')).length, 1)
    assert.equal(f.store.cursor(project.id), 3)
    assert.equal(f.store.items(project.id)[0]?.revisionId, third.revisionId)
  } finally {
    await engine.waitForIdle()
    f.store.close()
    await f.clean()
  }
})

test('projeção incremental preserva recibos adiantados, revisões anteriores, reinício e reset', async () => {
  const f = await fixture()
  let store = f.store
  try {
    const first = receipt(operation(), 1),
      second = receipt(operation(), 2)
    store.applyPage(
      project.id,
      0,
      page(
        [
          { ...first.item, sequence: 1 },
          { ...second.item, sequence: 2 },
        ],
        0,
        2,
      ),
    )
    const requests: Array<number | null> = []
    const projection = new DesktopProjectProjection(async (id, version) => {
      requests.push(version)
      return {
        changes: store.itemProjection(id, version),
        pending: store.pending(id),
        pendingBatches: store.pendingBatches(id),
        transfers: store.transfers(id),
        resolvedDrafts: store.resolvedDrafts(id),
        report: { phase: 'idle', message: 'Sincronizado', pending: 0, confirmedAt: null },
      }
    })
    projection.retain([project.id])
    const before = await projection.read(project.id)
    assert.deepEqual(before.items, store.items(project.id))
    const unchanged = await projection.read(project.id)
    assert.equal(unchanged.items, before.items)
    const base = store.itemProjection(project.id, null).version
    assert.equal(store.itemProjection(project.id, base).items.length, 0)

    const local = operation()
    store.enqueue({ operation: local, dependsOnOperationId: null })
    store.next(project.id)
    store.settle(local.operationId, receipt(local, 5))
    const ahead = await projection.read(project.id)
    assert.deepEqual(ahead.items, store.items(project.id))
    assert.equal(ahead.items.length, 3)
    const third = receipt(operation(), 3),
      fourth = receipt(operation({ entityId: first.item.id }), 4)
    store.applyPage(
      project.id,
      2,
      page(
        [
          { ...third.item, sequence: 3 },
          { ...fourth.item, sequence: 4 },
        ],
        2,
        4,
      ),
    )
    const caughtUp = await projection.read(project.id)
    assert.deepEqual(caughtUp.items, store.items(project.id))
    assert.equal(
      caughtUp.items.find((item) => item.id === first.item.id)?.revisionId,
      fourth.revisionId,
    )
    assert.ok(requests.slice(1).every((version) => version !== null))
    store.close()
    store = new LocalWorkspaceStore(f.file, scope)
    assert.deepEqual((await projection.read(project.id)).items, store.items(project.id))
    store.applyPage(project.id, 4, {
      cursor: 0,
      events: [],
      items: [],
      permissions: project.permissions,
      hasMore: true,
      resetRequired: true,
    })
    assert.deepEqual((await projection.read(project.id)).items, [])
    store.applyPage(project.id, 0, page([{ ...first.item, sequence: 1 }], 0, 1))
    assert.deepEqual((await projection.read(project.id)).items, store.items(project.id))
    assert.equal(store.itemProjection(project.id, Number.MAX_SAFE_INTEGER).reset, true)
    const finalVersion = store.itemProjection(project.id, null).version
    store.applyPage(project.id, 1, page([], 1, 1))
    assert.equal(store.itemProjection(project.id, finalVersion).version, finalVersion)
    assert.equal(store.itemProjection(project.id, finalVersion).items.length, 0)
    const rejected = receipt(operation(), 2),
      outside = receipt(operation(), 999)
    assert.throws(
      () =>
        store.applyPage(
          project.id,
          1,
          page(
            [
              { ...rejected.item, sequence: 2 },
              { ...outside.item, sequence: 999 },
            ],
            1,
            3,
          ),
        ),
      /fora da página/,
    )
    assert.equal(store.itemProjection(project.id, finalVersion).version, finalVersion)
    assert.deepEqual((await projection.read(project.id)).items, [first.item])
  } finally {
    store.close()
    await f.clean()
  }
})

test('projeção migra cache v6 com conteúdo preservado e mantém leitura protegida por projeto', async () => {
  const prefix = path.join(os.tmpdir(), 'marketing-projection-v6-')
  const directory = await mkdtemp(prefix),
    file = path.join(directory, 'cache.sqlite')
  if (
    path.dirname(directory) !== path.resolve(os.tmpdir()) ||
    !path.basename(directory).startsWith('marketing-projection-v6-')
  )
    throw new Error('Pasta fora da prova')
  const original = receipt(operation(), 1).item
  const legacy = new DatabaseSync(file)
  legacy.exec(`CREATE TABLE projects(id TEXT PRIMARY KEY,payload TEXT NOT NULL,cursor INTEGER NOT NULL DEFAULT 0,accessible INTEGER NOT NULL DEFAULT 1) STRICT;
    CREATE TABLE items(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),payload TEXT NOT NULL,sequence INTEGER NOT NULL) STRICT;
    PRAGMA user_version=6;`)
  legacy
    .prepare('INSERT INTO projects(id,payload,cursor) VALUES(?,?,1)')
    .run(project.id, JSON.stringify(project))
  legacy
    .prepare('INSERT INTO items(id,project_id,payload,sequence) VALUES(?,?,?,1)')
    .run(original.id, project.id, JSON.stringify(original))
  legacy.close()
  const store = new LocalWorkspaceStore(file, scope)
  try {
    assert.deepEqual(store.itemProjection(project.id, null).items, [original])
    const version = store.itemProjection(project.id, null).version
    assert.equal(version, 1)
    assert.deepEqual(store.itemProjection(project.id, version).items, [])
    assert.throws(() => store.itemProjection(randomUUID(), null), /indisponível/)
    store.setInaccessible(project.id)
    assert.throws(() => store.itemProjection(project.id, version), /indisponível/)
  } finally {
    store.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('projeção compartilha leitura concorrente, cerca revogação e rejeita resposta de outro projeto', async () => {
  const release = Promise.withResolvers<void>()
  let reads = 0
  const projection = new DesktopProjectProjection(async (id) => {
    reads++
    await release.promise
    return {
      changes: { projectId: id, version: 0, reset: true, items: [], removed: [] },
      pending: [],
      pendingBatches: [],
      report: { phase: 'idle', message: '', pending: 0, confirmedAt: null },
    }
  })
  projection.retain([project.id])
  const a = projection.read(project.id),
    b = projection.read(project.id)
  assert.equal(a, b)
  projection.retain([])
  release.resolve()
  await assert.rejects(a, /acesso mudou/)
  assert.equal(reads, 1)
  await assert.rejects(projection.read(project.id), /indisponível/)
  const wrong = new DesktopProjectProjection(async () => ({
    changes: { projectId: randomUUID(), version: 1, reset: true, items: [], removed: [] },
    pending: [],
    pendingBatches: [],
    report: { phase: 'idle', message: '', pending: 0, confirmedAt: null },
  }))
  await assert.rejects(wrong.read(project.id), /base local/)
})
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
      if (route === '/projects') return [{ ...project, sequence: committed ? 1 : 0 }]
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

test('final de importação conserva bytes e origem, retoma o mesmo artefato e recusa hash/conta divergentes', async () => {
  const f = await fixture(),
    assets = new LocalAssets(path.join(path.dirname(f.file), 'assets'))
  await assets.start()
  try {
    const bytes = await sharp({
      create: { width: 20, height: 30, channels: 4, background: '#0044ff' },
    })
      .png()
      .toBuffer()
    const asset = await assets.addImage(bytes)
    const original: AssetManifest = {
      schemaVersion: 1,
      id: asset.id,
      projectId: project.id,
      name: '01-p01.png',
      role: 'original',
      sourceAssetId: null,
      sha256: asset.sha256,
      size: asset.size,
      mime: 'image/png',
      width: 20,
      height: 30,
      durationMs: null,
      codec: null,
      rotation: null,
    }
    const remote = new Map([[original.id, original]])
    const transport: SyncTransport = {
      async request(route) {
        const id = route.split('/').at(-2),
          manifest = id ? remote.get(id) : undefined
        if (!manifest) throw new Error(`Rota inesperada: ${route}`)
        return { manifest, url: 'https://storage.example.test/unused-cached-original' }
      },
    }
    const resources = { assets, store: f.store, transport },
      signal = new AbortController().signal
    f.store.stageTransfer({ operationId: randomUUID(), manifest: original })
    f.store.transferProgress(original.id, 'confirmed', original.size)
    const final = await prepareImportedFinal(
      resources,
      project.id,
      original.id,
      original.sha256,
      signal,
    )
    assert.notEqual(final.id, original.id)
    assert.equal(final.role, 'final')
    assert.equal(final.sourceAssetId, original.id)
    assert.equal(final.name, '01-p01.png')
    assert.deepEqual(await assets.bytes(final.id), bytes)
    assert.deepEqual(await assets.bytes(original.id), bytes)
    assert.deepEqual(
      await prepareImportedFinal(resources, project.id, original.id, original.sha256, signal),
      final,
    )
    assert.equal(f.store.transfers(project.id).length, 2)
    assert.equal(f.store.transfers(project.id)[0]?.input.manifest.role, 'original')
    await assert.rejects(
      () => prepareImportedFinal(resources, project.id, original.id, 'f'.repeat(64), signal),
      /não corresponde/,
    )
    await assert.rejects(
      () => prepareImportedFinal(resources, randomUUID(), original.id, original.sha256, signal),
      /não corresponde/,
    )
    remote.set(final.id, final)
    f.store.transferProgress(final.id, 'confirmed', final.size)
    assert.deepEqual(
      await prepareImportedFinal(resources, project.id, original.id, original.sha256, signal),
      final,
    )
    f.store.transferProgress(final.id, 'local', 0)
    await writeFile(assets.get(final.id).path, Buffer.alloc(bytes.length, 0))
    await assert.rejects(
      () => prepareImportedFinal(resources, project.id, original.id, original.sha256, signal),
      /alterado|corrompido|integridade|hash|arquivo/i,
    )
    assert.equal(f.store.transfers(project.id).length, 2)
  } finally {
    assets.close()
    f.store.close()
    await f.clean()
  }
})

test('limpeza libera cópia equivalente e preserva original, pendência e divergência do servidor', async () => {
  const f = await fixture(),
    assets = new LocalAssets(path.join(path.dirname(f.file), 'assets'))
  await assets.start()
  try {
    const source = path.join(path.dirname(f.file), 'source.mp4'),
      pendingSource = path.join(path.dirname(f.file), 'pending.mp4')
    await writeFile(source, Buffer.alloc(512, 7))
    await writeFile(pendingSource, Buffer.alloc(1024, 8))
    const confirmed = await assets.importFile(source),
      pending = await assets.importFile(pendingSource)
    const manifest: AssetManifest = {
      schemaVersion: 1,
      id: confirmed.id,
      projectId: project.id,
      name: confirmed.name,
      sha256: confirmed.sha256,
      size: confirmed.size,
      mime: 'video/mp4',
      role: 'original',
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    }
    const localSource = path.join(path.dirname(f.file), 'local.mp4')
    await writeFile(localSource, Buffer.alloc(768, 9))
    const local = await assets.importFile(localSource)
    let wrong = true,
      revoked = false
    const requested: string[] = []
    const input = {
      projectId: project.id,
      assets,
      protectedIds: new Set([pending.id]),
      signal: new AbortController().signal,
      transport: {
        async request(route: string, _method?: string, body?: unknown) {
          requested.push(route)
          assert.equal(route, `/projects/${project.id}/assets/confirmed`)
          assert.ok(!JSON.stringify(body).includes(pending.id))
          if (revoked)
            throw new SyncTransportError(404, 'OBJECT_INACCESSIBLE', 'Arquivo indisponível')
          return {
            projectId: project.id,
            manifests: [{ ...manifest, sha256: wrong ? 'f'.repeat(64) : manifest.sha256 }],
          }
        },
      },
    }
    await assert.rejects(clearConfirmedAssets(input, 1), /cópia equivalente/)
    assert.equal(assets.list().length, 3)
    wrong = false
    const result = await clearConfirmedAssets(input, 1)
    assert.deepEqual(result, {
      freedBytes: confirmed.size,
      removed: 1,
      preserved: 1,
      unavailable: 1,
    })
    assert.deepEqual(
      assets
        .list()
        .map((file) => file.id)
        .sort(),
      [pending.id, local.id].sort(),
    )
    assert.ok(requested.every((route) => !route.includes(pending.id)))
    assert.equal(requested.length, 2)
    assert.equal((await stat(source)).size, 512)
    assert.deepEqual(await assets.bytes(pending.id), Buffer.alloc(1024, 8))
    revoked = true
    await assert.rejects(clearConfirmedAssets(input, 1), /Arquivo indisponível/)
    assert.deepEqual(await assets.bytes(local.id), Buffer.alloc(768, 9))
  } finally {
    assets.close()
    f.store.close()
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
      lost = true,
      rejectedAtCompletion = false
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
          return {
            ...view,
            state: rejectedAtCompletion ? 'failed' : 'verifying',
            bytesReceived: true,
            error: rejectedAtCompletion ? 'Hash divergente' : null,
          }
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
    rejectedAtCompletion = true
    assert.equal((await transfer.upload(input, new AbortController().signal)).state, 'failed')
    assert.equal(f.store.transfers(project.id)[0]?.state, 'failed')
    assert.equal(f.store.transfers(project.id)[0]?.error, 'Hash divergente')
  } finally {
    assets.close()
    f.store.close()
    await f.clean()
  }
})

test('retomar a mesma imagem conserva identidade e recupera interrupção antes do catálogo', async () => {
  const f = await fixture(),
    directory = path.join(path.dirname(f.file), 'images'),
    id = randomUUID()
  let assets = new LocalAssets(directory)
  await assets.start()
  try {
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 4, background: '#123456' },
    })
      .png()
      .toBuffer()
    const first = await assets.addImage(bytes, id)
    assert.equal((await assets.addImage(bytes, id)).id, first.id)
    assert.equal(assets.list().length, 1)
    assets.close()
    // Simulate a crash after the bytes were written but before their catalog receipt.
    await unlink(path.join(directory, `${id}.json`))
    assets = new LocalAssets(directory)
    await assets.start()
    const recovered = await assets.addImage(bytes, id)
    assert.equal(recovered.id, first.id)
    assert.equal(recovered.sha256, first.sha256)
    assert.equal(assets.list().length, 1)
    await assert.rejects(
      () => assets.addImage(Buffer.concat([bytes, Buffer.from('changed')]), id),
      /difere/,
    )
    assert.equal((await assets.verify(id)).asset.sha256, first.sha256)
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
          epoch: remote.epoch + 1,
          attempt: {
            schemaVersion: 1,
            id: randomUUID(),
            runId: remote.request.id,
            deviceId: randomUUID(),
            epoch: remote.epoch + 1,
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
        remote = {
          ...remote,
          state: finish.outcome.status === 'succeeded' ? 'succeeded' : 'failed',
          outcome: finish.outcome,
        }
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
    for (const lostFailureAcknowledgement of [false, true]) {
      failFinish = lostFailureAcknowledgement
      remote = {
        ...remote,
        request: { ...remote.request, id: randomUUID() },
        state: 'queued',
        epoch: 0,
        attempt: null,
        outcome: null,
      }
      let generations = 0
      const recovering = new ExecutionSupervisor(
        {
          async resources() {
            return resources
          },
        },
        async (run, res, signal, progress, recovery) => {
          const input = {
            provider: 'codex',
            kind: 'copy',
            prompt: run.request.instruction,
          } as const
          const directory = path.join(
            res.runtimeDirectory,
            run.request.id,
            String(recovery.generationEpoch),
          )
          if (recovery.provider === 'checkpoint') {
            generations++
            await beginProviderCheckpoint(directory, input)
            await saveProviderCheckpoint(
              directory,
              input,
              'ChatGPT',
              {
                provider: 'codex',
                text: 'Resposta anterior preservada',
                inputTokens: 10,
                outputTokens: 4,
                observedUrls: [],
                researchCalls: 0,
                imageFailed: false,
              },
              [],
              true,
            )
            throw new Error('Interrupção antes de converter a resposta em resultado editorial')
          }
          assert.equal(run.epoch, lostFailureAcknowledgement ? 1 : 2)
          assert.equal(recovery.generationEpoch, 1)
          const result = await runProvider(input, directory, signal, progress, undefined, 'only')
          return {
            status: 'succeeded',
            text: result.text,
            mode: result.mode,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            assetIds: [],
            durationMs: 1,
          }
        },
        () => {},
      )
      const rawSelection = { ...selection, runId: remote.request.id }
      await assert.rejects(() => recovering.run(rawSelection), /Interrupção antes/)
      f.store.close()
      f.store = new LocalWorkspaceStore(f.file, scope)
      resources.store = f.store
      const recovered = await recovering.run({ ...rawSelection, strategy: 'resume' })
      assert.equal(recovered.state, 'succeeded')
      assert.equal(
        recovered.outcome?.status === 'succeeded' ? recovered.outcome.text : null,
        'Resposta anterior preservada',
      )
      assert.equal(generations, 1)
    }
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
