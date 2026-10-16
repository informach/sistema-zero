import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import {
  type ImportStart,
  type InventoryEntry,
  inventoryDigestInput,
} from '@sistemazero/marketing-contracts'
import { instagramSample } from '@sistemazero/marketing-import'
import { eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Actor } from '../src/application/actor'
import { ImportService } from '../src/application/workspace/import.service'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleImportRepository } from '../src/infrastructure/persistence/drizzle/import.repository'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import {
  editorialAssets,
  editorialProjects,
} from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { requireReviewDatabase } from './helpers/review-database'
import { fixtureDirectory } from './helpers/staff-directory'

const url = process.env.MARKETING_TEST_DATABASE_URL,
  suite = url ? describe : describe.skip
suite('import inventory PostgreSQL', () => {
  let connection: DbConnection, workspace: WorkspaceService, imports: ImportService
  const owner: Actor = {
      userId: randomUUID(),
      displayName: 'Revisão',
      role: 'staff',
      status: 'active',
    },
    outsider: Actor = { ...owner, userId: randomUUID() }
  beforeAll(async () => {
    requireReviewDatabase(url)
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
    workspace = new WorkspaceService(
      new DrizzleWorkspaceRepository(connection.db),
      fixtureDirectory,
    )
    imports = new ImportService(new DrizzleImportRepository(connection.db))
  })
  afterAll(async () => connection?.close())
  async function fixture(count = 205, bound = true) {
    const projectId = randomUUID()
    await workspace.create(owner, {
      schemaVersion: 1,
      id: projectId,
      operationId: randomUUID(),
      name: 'Acervo em preparação',
      product: 'Review',
    })
    if (bound)
      await imports.bindProduct(owner, projectId, {
        operationId: randomUUID(),
        origin: 'sistema-zero',
        product: 'comunidade-dos-criadores',
        includeShared: false,
        expectedRevisionId: null,
      })
    const entries: InventoryEntry[] = Array.from({ length: count }, (_, i) => ({
      path: `output/instagram/${String(i).padStart(5, '0')}.md`,
      kind: 'file',
      product: 'comunidade-dos-criadores',
      category: 'copy',
      disposition: 'eligible',
      validity: 'unverified',
      reason: 'Fonte preservada',
      bytes: 10,
      sha256: 'a'.repeat(64),
    }))
    const input: ImportStart = {
      id: randomUUID(),
      origin: 'sistema-zero',
      policyVersion: 'marketing-acervo-v1',
      capturedAt: new Date().toISOString(),
      entryCount: count,
      digest: createHash('sha256')
        .update(
          inventoryDigestInput({
            origin: 'sistema-zero',
            entries,
            policyVersion: 'marketing-acervo-v1',
          }),
        )
        .digest('hex'),
    }
    return { projectId, entries, input }
  }
  async function sourceVersion(
    projectId: string,
    text: string,
    product = 'comunidade-dos-criadores',
    sourcePath = 'docs/marketing/copy.md',
    category: InventoryEntry['category'] = 'copy',
  ) {
    const bytes = Buffer.from(text, 'utf8')
    const source: InventoryEntry = {
      path: sourcePath,
      kind: 'file',
      product,
      category,
      disposition: 'eligible',
      validity: 'unverified',
      reason: 'Copy existente',
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
    const input: ImportStart = {
      id: randomUUID(),
      origin: 'sistema-zero',
      policyVersion: 'marketing-acervo-v1',
      capturedAt: new Date().toISOString(),
      entryCount: 1,
      digest: createHash('sha256')
        .update(
          inventoryDigestInput({
            origin: 'sistema-zero',
            entries: [source],
            policyVersion: 'marketing-acervo-v1',
          }),
        )
        .digest('hex'),
    }
    await imports.start(owner, projectId, input)
    await imports.chunk(owner, projectId, input.id, { offset: 0, entries: [source] })
    await imports.finish(owner, projectId, input.id)
    return {
      runId: input.id,
      request: {
        operationId: randomUUID(),
        ordinal: 0,
        content: { kind: 'text', base64: bytes.toString('base64') },
      },
    }
  }
  test('release requires complete disposition and a fresh matching inventory, preserves pending work and detects changed origins', async () => {
    const f = await fixture(2)
    const original = Buffer.from('Conteúdo preservado para continuar no app.')
    const first = f.entries[0]
    if (!first) throw new Error('Fixture incompleta')
    first.sha256 = createHash('sha256').update(original).digest('hex')
    first.bytes = original.length
    f.input.digest = createHash('sha256')
      .update(
        inventoryDigestInput({
          origin: f.input.origin,
          policyVersion: f.input.policyVersion,
          entries: f.entries,
        }),
      )
      .digest('hex')
    await imports.start(owner, f.projectId, f.input)
    await imports.chunk(owner, f.projectId, f.input.id, { offset: 0, entries: f.entries })
    await imports.finish(owner, f.projectId, f.input.id)
    await imports.loadSource(owner, f.projectId, f.input.id, {
      operationId: randomUUID(),
      ordinal: 0,
      content: { kind: 'text', base64: original.toString('base64') },
    })
    const before = await imports.previewRelease(owner, f.projectId, f.input.id)
    expect(before.summary).toMatchObject({ preserved: 1, pending: 1 })
    expect(before.blockers).toContain(
      'Confira novamente a pasta no desktop para verificar mudanças desde a leitura desta carga.',
    )
    await rejects(
      imports.release(owner, f.projectId, f.input.id, {
        operationId: randomUUID(),
        expectedPlanHash: before.planHash,
      }),
      /origens ainda precisam/,
    )
    await imports.decideSource(owner, f.projectId, f.input.id, {
      operationId: randomUUID(),
      ordinal: 1,
      expectedRevisionId: null,
      state: 'deferred',
      reason: 'Conferir a referência histórica antes de carregar.',
    })
    const verification = {
      ...f.input,
      id: randomUUID(),
      // Another desktop can have a slow clock. Registration order on the server,
      // not that clock, determines the most recently received verification.
      capturedAt: new Date(new Date(f.input.capturedAt).getTime() - 3600000).toISOString(),
    }
    await imports.start(owner, f.projectId, verification)
    await imports.chunk(owner, f.projectId, verification.id, { offset: 0, entries: f.entries })
    expect((await imports.previewRelease(owner, f.projectId, f.input.id)).blockers).toContain(
      'Conclua a nova leitura da pasta antes de liberar a carga.',
    )
    await imports.finish(owner, f.projectId, verification.id)
    const plan = await imports.previewRelease(owner, f.projectId, f.input.id)
    expect(plan.blockers).toEqual([])
    expect(plan.summary).toMatchObject({ preserved: 1, deferred: 1, pending: 0 })
    await rejects(
      imports.release(owner, f.projectId, f.input.id, {
        operationId: randomUUID(),
        expectedPlanHash: before.planHash,
      }),
      /mudaram/,
    )
    const request = { operationId: randomUUID(), expectedPlanHash: plan.planHash }
    await rejects(imports.previewRelease(outsider, f.projectId, f.input.id))
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: outsider.userId,
      permissions: ['read', 'edit'],
    })
    await rejects(imports.release(outsider, f.projectId, f.input.id, request))
    const released = await imports.release(owner, f.projectId, f.input.id, request)
    expect(released.summary.deferred).toBe(1)
    expect(released.verifiedInventoryId).toBe(verification.id)
    expect(await imports.release(owner, f.projectId, f.input.id, request)).toEqual(released)
    expect(
      await imports.release(owner, f.projectId, f.input.id, {
        ...request,
        operationId: randomUUID(),
      }),
    ).toEqual(released)
    expect((await imports.previewRelease(outsider, f.projectId, f.input.id)).state).toBe('current')
    const reused = await imports.loadSource(outsider, f.projectId, f.input.id, {
      operationId: randomUUID(),
      ordinal: 0,
      content: { kind: 'text', base64: original.toString('base64') },
    })
    expect(reused.status).toBe('reused')
    expect((await imports.previewRelease(owner, f.projectId, f.input.id)).state).toBe('current')
    const snapshot = await workspace.snapshot(owner, f.projectId)
    expect(snapshot.items.map((item) => item.kind)).toEqual(['evidence'])
    const changedEntries = f.entries.map((entry, ordinal) =>
      ordinal ? entry : { ...entry, reason: 'Classificação revisada na pasta de origem.' },
    )
    const changed = {
      ...verification,
      id: randomUUID(),
      capturedAt: new Date(new Date(verification.capturedAt).getTime() + 1000).toISOString(),
      digest: createHash('sha256')
        .update(
          inventoryDigestInput({
            origin: f.input.origin,
            policyVersion: f.input.policyVersion,
            entries: changedEntries,
          }),
        )
        .digest('hex'),
    }
    await imports.start(owner, f.projectId, changed)
    await imports.chunk(owner, f.projectId, changed.id, { offset: 0, entries: changedEntries })
    await imports.finish(owner, f.projectId, changed.id)
    const stale = await imports.previewRelease(owner, f.projectId, f.input.id)
    expect(stale.state).toBe('changed')
    expect(stale.latest).toEqual(released)
    expect(stale.blockers).toContain(
      'A leitura mais recente mudou. Compare os inventários e reconcilie a nova carga antes de liberar.',
    )
    await rejects(
      imports.release(owner, f.projectId, f.input.id, {
        operationId: randomUUID(),
        expectedPlanHash: stale.planHash,
      }),
      /mais recente mudou/,
    )
    await imports.retire(owner, f.projectId, f.input.id)
    const retired = await imports.previewRelease(owner, f.projectId, f.input.id)
    expect(retired.state).toBe('retired')
    expect(retired.latest).toEqual(released)
    expect((await workspace.snapshot(owner, f.projectId)).items).toEqual(snapshot.items)
  })
  test('release keeps missing production conferences visible even after the source was preserved', async () => {
    const { projectId } = await fixture(1)
    const source = await sourceVersion(
      projectId,
      'Orientações de produção preservadas.',
      'comunidade-dos-criadores',
      'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/fixados/01-apresentacao/publicacao.txt',
    )
    await imports.loadSource(owner, projectId, source.runId, source.request)
    const plan = await imports.previewRelease(owner, projectId, source.runId)
    expect(plan.summary).toMatchObject({
      preserved: 1,
      pending: 0,
      productionFolders: 1,
      productionReports: 0,
      productionLinked: 0,
    })
    expect(plan.blockers).toContain(
      '1 pastas de produção ainda precisam de conferência compartilhada.',
    )
    await rejects(
      imports.release(owner, projectId, source.runId, {
        operationId: randomUUID(),
        expectedPlanHash: plan.planHash,
      }),
      /conferência compartilhada/,
    )
    await rejects(imports.previewRelease(owner, randomUUID(), source.runId))
  })
  test('source decisions serialize reviewers, preserve receipts and reopen without an ABA race', async () => {
    const { projectId } = await fixture(1)
    const source = await sourceVersion(projectId, 'Origem preservada depois da conferência.')
    const input = {
      operationId: randomUUID(),
      ordinal: 0,
      expectedRevisionId: null,
      state: 'deferred',
      reason: 'Conferir a versão da oferta antes de carregar.',
    }
    const racing = await Promise.allSettled([
      imports.decideSource(owner, projectId, source.runId, input),
      imports.decideSource(owner, projectId, source.runId, {
        ...input,
        operationId: randomUUID(),
        state: 'omitted',
      }),
    ])
    expect(racing.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(racing.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const result = racing.find((value) => value.status === 'fulfilled')
    if (result?.status !== 'fulfilled') throw new Error('Nenhuma decisão confirmada')
    const decided = result.value
    const page = await imports.coverage(owner, projectId, source.runId, { state: decided.state })
    expect(page.entries[0]?.decision).toEqual(decided)
    expect(page.summary).toEqual([
      {
        state: decided.state,
        count: 1,
        bytes: Buffer.byteLength('Origem preservada depois da conferência.'),
      },
    ])
    const sources = await imports.page(owner, projectId, source.runId, 0)
    expect(sources.entries[0]?.decision).toEqual(decided)
    await rejects(
      imports.loadSource(owner, projectId, source.runId, source.request),
      /Reabra a pendência/,
    )
    const reopen = {
      ...input,
      operationId: randomUUID(),
      expectedRevisionId: decided.revisionId,
      state: 'pending',
      reason: 'Origem conferida; pode retomar a preservação.',
    }
    const reopened = await imports.decideSource(owner, projectId, source.runId, reopen)
    expect(reopened.revisionId).not.toBe(decided.revisionId)
    expect(await imports.decideSource(owner, projectId, source.runId, reopen)).toEqual(reopened)
    await rejects(
      imports.decideSource(owner, projectId, source.runId, { ...input, operationId: randomUUID() }),
      /Outra pessoa/,
    )
    await rejects(
      imports.decideSource(owner, projectId, source.runId, {
        ...reopen,
        reason: 'Outro corpo para a mesma operação.',
      }),
      /operação|operation|conteúdo|diferente/i,
    )
    const loaded = await imports.loadSource(owner, projectId, source.runId, source.request)
    expect(loaded.status).toBe('imported')
    await rejects(
      imports.decideSource(owner, projectId, source.runId, {
        ...input,
        operationId: randomUUID(),
        expectedRevisionId: reopened.revisionId,
      }),
      /já foi preservada/,
    )
    await imports.retire(owner, projectId, source.runId)
    const retired = await imports.coverage(owner, projectId, source.runId, {})
    expect(retired.entries[0]?.decision).toEqual(reopened)
    expect(retired.entries[0]?.state).toBe('loaded')
    expect(retired.entries[0]?.result).toEqual(loaded)
    await rejects(
      imports.decideSource(owner, projectId, source.runId, {
        ...reopen,
        operationId: randomUUID(),
      }),
      /inventário ativo/,
    )
  })
  test('source decisions reject other projects, other products, unsafe origins and missing permission', async () => {
    const f = await fixture(4)
    const blocked = f.entries[0],
      excluded = f.entries[1],
      outside = f.entries[2]
    if (!blocked || !excluded || !outside) throw new Error('Fixture incompleta')
    Object.assign(blocked, { disposition: 'blocked', bytes: null, sha256: null })
    Object.assign(excluded, { disposition: 'excluded', bytes: null, sha256: null })
    outside.product = 'outro-produto'
    f.input.digest = createHash('sha256')
      .update(
        inventoryDigestInput({
          origin: f.input.origin,
          policyVersion: f.input.policyVersion,
          entries: f.entries,
        }),
      )
      .digest('hex')
    await imports.start(owner, f.projectId, f.input)
    await imports.chunk(owner, f.projectId, f.input.id, { offset: 0, entries: f.entries })
    const input = {
      operationId: randomUUID(),
      ordinal: 3,
      expectedRevisionId: null,
      state: 'deferred',
      reason: 'Conferir antes de carregar a origem.',
    }
    await rejects(imports.decideSource(owner, f.projectId, f.input.id, input), /inventário ativo/)
    await imports.finish(owner, f.projectId, f.input.id)
    await rejects(imports.decideSource(outsider, f.projectId, f.input.id, input))
    for (const ordinal of [0, 1])
      await rejects(
        imports.decideSource(owner, f.projectId, f.input.id, { ...input, ordinal }),
        /política de segurança/,
      )
    await rejects(
      imports.decideSource(owner, f.projectId, f.input.id, { ...input, ordinal: 2 }),
      /não pertence/,
    )
    const other = await fixture(1)
    await rejects(imports.decideSource(owner, other.projectId, f.input.id, input))
    await rejects(imports.decideSource(owner, f.projectId, f.input.id, { ...input, ordinal: 4 }))
    expect(() =>
      imports.decideSource(owner, f.projectId, f.input.id, { ...input, reason: 'curto' }),
    ).toThrow('>=10')
    const saved = await imports.decideSource(owner, f.projectId, f.input.id, input)
    expect(saved.state).toBe('deferred')
  })
  test('coverage pages the whole inventory, respects product binding and retains immutable receipts after retirement', async () => {
    const f = await fixture(205, false)
    const original = Buffer.from('Copy original preservada.')
    Object.assign(f.entries[0]!, {
      bytes: original.length,
      sha256: createHash('sha256').update(original).digest('hex'),
    })
    Object.assign(f.entries[1]!, { disposition: 'review' })
    Object.assign(f.entries[2]!, { disposition: 'blocked', bytes: null, sha256: null })
    Object.assign(f.entries[3]!, {
      disposition: 'excluded',
      kind: 'directory',
      bytes: null,
      sha256: null,
    })
    Object.assign(f.entries[4]!, { product: 'shared' })
    Object.assign(f.entries[5]!, { product: 'outro-produto' })
    f.input.digest = createHash('sha256')
      .update(
        inventoryDigestInput({
          origin: f.input.origin,
          policyVersion: f.input.policyVersion,
          entries: f.entries,
        }),
      )
      .digest('hex')
    await imports.start(owner, f.projectId, f.input)
    for (let offset = 0; offset < f.entries.length; offset += 100)
      await imports.chunk(owner, f.projectId, f.input.id, {
        offset,
        entries: f.entries.slice(offset, offset + 100),
      })
    await imports.finish(owner, f.projectId, f.input.id)
    const before = await imports.coverage(owner, f.projectId, f.input.id, {})
    expect(before.binding).toBeNull()
    expect(before.summary).toEqual([
      { state: 'unbound', count: 205, bytes: 2020 + original.length },
    ])
    expect(before.entries).toHaveLength(100)
    const second = await imports.coverage(owner, f.projectId, f.input.id, {
      cursor: String(before.nextCursor),
    })
    const third = await imports.coverage(owner, f.projectId, f.input.id, {
      cursor: second.nextCursor,
    })
    expect(
      [...before.entries, ...second.entries, ...third.entries].map((entry) => entry.ordinal),
    ).toEqual(Array.from({ length: 205 }, (_, index) => index))
    expect(third.nextCursor).toBeNull()
    const binding = await imports.bindProduct(owner, f.projectId, {
      operationId: randomUUID(),
      origin: f.input.origin,
      product: 'comunidade-dos-criadores',
      includeShared: false,
      expectedRevisionId: null,
    })
    const loaded = await imports.loadSource(owner, f.projectId, f.input.id, {
      operationId: randomUUID(),
      ordinal: 0,
      content: { kind: 'text', base64: original.toString('base64') },
    })
    const covered = await imports.coverage(owner, f.projectId, f.input.id, { state: 'pending' })
    expect(Object.fromEntries(covered.summary.map((row) => [row.state, row.count]))).toEqual({
      loaded: 1,
      pending: 199,
      review: 1,
      blocked: 1,
      excluded: 1,
      'other-product': 2,
    })
    expect(covered.entries.map((entry) => entry.ordinal)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 6),
    )
    expect(covered.nextCursor).toBe(106)
    const preserved = await imports.coverage(owner, f.projectId, f.input.id, { state: 'loaded' })
    expect(preserved.entries).toHaveLength(1)
    expect(preserved.entries[0]?.result).toEqual(loaded)
    expect(preserved.entries[0]?.source.sha256).toBe(f.entries[0]?.sha256)
    await imports.bindProduct(owner, f.projectId, {
      operationId: randomUUID(),
      origin: f.input.origin,
      product: binding.product,
      includeShared: true,
      expectedRevisionId: binding.revisionId,
    })
    const shared = await imports.coverage(owner, f.projectId, f.input.id, { state: 'pending' })
    expect(shared.summary.find((row) => row.state === 'pending')?.count).toBe(200)
    expect(shared.entries[0]?.ordinal).toBe(4)
    await imports.retire(owner, f.projectId, f.input.id)
    const retired = await imports.coverage(owner, f.projectId, f.input.id, { state: 'loaded' })
    expect(retired.run.state).toBe('retired')
    expect(retired.entries).toEqual(preserved.entries)
    const snapshot = await workspace.snapshot(owner, f.projectId)
    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.items[0]?.document).toMatchObject({ kind: 'evidence', validity: 'unverified' })
  })
  test('coverage rejects unauthorized and cross-project reads and malformed filters', async () => {
    const f = await fixture(1),
      other = await fixture(1)
    await imports.start(owner, f.projectId, f.input)
    await rejects(imports.coverage(outsider, f.projectId, f.input.id, {}), /disponível/)
    await rejects(imports.coverage(owner, other.projectId, f.input.id, {}), /disponível/)
    for (const query of [
      { state: 'approved' },
      { cursor: -1 },
      { cursor: 'NaN' },
      { cursor: 100001 },
      { state: ['loaded', 'pending'] },
      { extra: 'value' },
    ])
      await rejects(async () => imports.coverage(owner, f.projectId, f.input.id, query))
    const empty = await imports.coverage(owner, f.projectId, f.input.id, {})
    expect(empty.run.state).toBe('receiving')
    expect(empty.summary).toEqual([])
    expect(empty.entries).toEqual([])
  })
  test('read-only coverage and comparison finish from a consistent snapshot while another writer holds the project lock', async () => {
    const f = await fixture(1)
    await imports.start(owner, f.projectId, f.input)
    await imports.chunk(owner, f.projectId, f.input.id, { offset: 0, entries: f.entries })
    await imports.finish(owner, f.projectId, f.input.id)
    let unlock!: () => void, locked!: () => void
    const lockReady = new Promise<void>((resolve) => {
      locked = resolve
    })
    const release = new Promise<void>((resolve) => {
      unlock = resolve
    })
    const writer = connection.db.transaction(async (tx) => {
      await tx
        .update(editorialProjects)
        .set({ sequence: sql`${editorialProjects.sequence}+1` })
        .where(eq(editorialProjects.id, f.projectId))
      locked()
      await release
    })
    await lockReady
    const read = Promise.all([
      imports.coverage(owner, f.projectId, f.input.id, {}),
      imports.delta(owner, f.projectId, f.input.id, { previousId: f.input.id }),
    ]).then(
      (value) => ({ value, error: null }),
      (error: unknown) => ({ value: null, error }),
    )
    let beforeCommit: Awaited<typeof read> | null = null
    try {
      // A deadlock guard, not a response-time target: the writer is released only
      // after the read completed or this guard fired.
      beforeCommit = await Promise.race([
        read,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ])
    } finally {
      unlock()
      await writer
    }
    const completed = await read
    expect(beforeCommit).not.toBeNull()
    expect(completed.error).toBeNull()
    expect(completed.value?.[0].summary).toEqual([{ state: 'pending', count: 1, bytes: 10 }])
    expect(completed.value?.[1].summary).toEqual([{ state: 'unchanged', count: 1 }])
  })
  test('snapshot comparison accounts for additions, removals, content and classification changes without editing the project', async () => {
    const f = await fixture(205),
      other = await fixture(1)
    async function seal(entries: InventoryEntry[]) {
      const input = {
        ...f.input,
        id: randomUUID(),
        entryCount: entries.length,
        digest: createHash('sha256')
          .update(
            inventoryDigestInput({
              origin: f.input.origin,
              policyVersion: f.input.policyVersion,
              entries,
            }),
          )
          .digest('hex'),
      }
      await imports.start(owner, f.projectId, input)
      for (let offset = 0; offset < entries.length; offset += 100)
        await imports.chunk(owner, f.projectId, input.id, {
          offset,
          entries: entries.slice(offset, offset + 100),
        })
      await imports.finish(owner, f.projectId, input.id)
      return input
    }
    const previous = await seal(f.entries)
    const changed = f.entries
      .filter((_, index) => index !== 2)
      .map((entry, index) =>
        index === 0
          ? { ...entry, sha256: 'b'.repeat(64) }
          : index === 1
            ? { ...entry, category: 'history' as const, validity: 'historical' as const }
            : entry,
      )
    changed.push({ ...f.entries[0]!, path: 'output/instagram/new.md' })
    const current = await seal(changed)
    const first = await imports.delta(owner, f.projectId, current.id, { previousId: previous.id })
    expect(Object.fromEntries(first.summary.map((row) => [row.state, row.count]))).toEqual({
      unchanged: 202,
      changed: 1,
      reclassified: 1,
      removed: 1,
      added: 1,
    })
    expect(first.entries).toHaveLength(100)
    expect(first.entries[0]).toMatchObject({
      state: 'changed',
      previous: { sha256: 'a'.repeat(64) },
      current: { sha256: 'b'.repeat(64) },
    })
    const second = await imports.delta(owner, f.projectId, current.id, {
      previousId: previous.id,
      cursor: String(first.nextCursor),
    })
    const third = await imports.delta(owner, f.projectId, current.id, {
      previousId: previous.id,
      cursor: second.nextCursor,
    })
    const all = [...first.entries, ...second.entries, ...third.entries]
    expect(all).toHaveLength(206)
    expect(new Set(all.map((entry) => entry.path)).size).toBe(206)
    expect(third.nextCursor).toBeNull()
    const removed = await imports.delta(owner, f.projectId, current.id, {
      previousId: previous.id,
      state: 'removed',
    })
    expect(removed.entries).toHaveLength(1)
    expect(removed.entries[0]).toMatchObject({
      path: f.entries[2]?.path,
      previous: f.entries[2],
      current: null,
    })
    const added = await imports.delta(owner, f.projectId, current.id, {
      previousId: previous.id,
      state: 'added',
    })
    expect(added.entries[0]?.previous).toBeNull()
    expect(
      (await imports.delta(owner, f.projectId, current.id, { previousId: current.id })).summary,
    ).toEqual([{ state: 'unchanged', count: 205 }])
    await rejects(
      imports.delta(outsider, f.projectId, current.id, { previousId: previous.id }),
      /disponível/,
    )
    await rejects(
      imports.delta(owner, other.projectId, current.id, { previousId: previous.id }),
      /disponível/,
    )
    await imports.start(owner, f.projectId, f.input)
    await rejects(
      imports.delta(owner, f.projectId, current.id, { previousId: f.input.id }),
      /confirmados/,
    )
    await imports.retire(owner, f.projectId, f.input.id)
    await rejects(
      imports.delta(owner, f.projectId, current.id, { previousId: f.input.id }),
      /incompleto/,
    )
    const invalid = { ...f.input, id: randomUUID(), entryCount: 1, digest: '0'.repeat(64) }
    await imports.start(owner, f.projectId, invalid)
    await imports.chunk(owner, f.projectId, invalid.id, { offset: 0, entries: [f.entries[0]!] })
    await imports.retire(owner, f.projectId, invalid.id)
    await rejects(imports.delta(owner, f.projectId, current.id, { previousId: invalid.id }), /hash/)
    for (const query of [
      { previousId: '../outside' },
      { previousId: previous.id, cursor: -1 },
      { previousId: previous.id, state: 'loaded' },
    ])
      await rejects(async () => imports.delta(owner, f.projectId, current.id, query))
    expect((await workspace.snapshot(owner, f.projectId)).items).toEqual([])
    await imports.retire(owner, f.projectId, previous.id)
    expect(
      (await imports.delta(owner, f.projectId, current.id, { previousId: previous.id })).summary,
    ).toEqual(first.summary)
  })
  test('calendar links exact sources, preserves dates and copy, rejects stale previews and protects team planning on reimport', async () => {
    const { projectId } = await fixture(1)
    const copy = await sourceVersion(
      projectId,
      '## P01 · Copy\n**Formato:** Carrossel.\n### Slide 1\n> Literal.',
    )
    const loadedCopy = await imports.loadSource(owner, projectId, copy.runId, copy.request)
    const copyPreview = await imports.previewStructure(owner, projectId, loadedCopy.sourceVersionId)
    const piece = await imports.applyStructure(owner, projectId, {
      operationId: randomUUID(),
      sourceVersionId: loadedCopy.sourceVersionId,
      parserVersion: copyPreview.parserVersion,
      key: 'P01',
      expectedMappingId: null,
    })
    const calendar = (week: number) =>
      `| ${week} | [P01 · Copy](copy.md#p01)<br>Carrossel | [ST01 · Falta](stories.md#st01) |`
    async function loadCalendar(week: number) {
      const source = await sourceVersion(
        projectId,
        calendar(week),
        'comunidade-dos-criadores',
        'docs/marketing/calendar.md',
      )
      return imports.loadSource(owner, projectId, source.runId, source.request)
    }
    const source = await loadCalendar(1)
    const preview = await imports.previewCalendar(owner, projectId, source.sourceVersionId)
    expect(preview.entries.map((entry) => entry.state)).toEqual(['new', 'missing'])
    expect(preview.entries[0]?.pieceId).toBe(piece.pieceId)
    const input = {
      operationId: randomUUID(),
      sourceVersionId: source.sourceVersionId,
      parserVersion: preview.parserVersion,
      key: 'P01',
      pieceId: piece.pieceId,
      expectedRevisionId: preview.entries[0]?.revisionId,
      expectedMappingId: null,
    }
    const current = (await workspace.snapshot(owner, projectId)).items.find(
      (item) => item.id === piece.pieceId,
    )
    if (current?.document.kind !== 'piece') throw new Error('Peça ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId,
      operationId: randomUUID(),
      entityId: current.id,
      baseRevisionId: current.revisionId,
      action: 'save',
      document: {
        ...current.document,
        brief: 'Brief revisto pela equipe',
        editorialDate: '2026-11-20',
      },
    })
    expect((await imports.applyCalendar(owner, projectId, input)).status).toBe('conflict')
    const fresh = await imports.previewCalendar(owner, projectId, source.sourceVersionId)
    const accepted = {
      ...input,
      operationId: randomUUID(),
      expectedRevisionId: fresh.entries[0]?.revisionId,
    }
    const result = await imports.applyCalendar(owner, projectId, accepted)
    expect(result.status).toBe('applied')
    expect(await imports.applyCalendar(owner, projectId, accepted)).toEqual(result)
    const after = (await workspace.snapshot(owner, projectId)).items.find(
      (item) => item.id === piece.pieceId,
    )
    expect(after?.document).toMatchObject({
      week: 1,
      position: 1,
      editorialDate: '2026-11-20',
      brief: 'Brief revisto pela equipe',
      state: 'incomplete',
    })
    const source2 = await loadCalendar(4),
      preview2 = await imports.previewCalendar(owner, projectId, source2.sourceVersionId)
    expect(preview2.entries[0]?.state).toBe('update')
    const next = await imports.applyCalendar(owner, projectId, {
      ...input,
      operationId: randomUUID(),
      sourceVersionId: source2.sourceVersionId,
      expectedMappingId: result.mappingId,
      expectedRevisionId: preview2.entries[0]?.revisionId,
    })
    expect(next.status).toBe('applied')
    expect(
      (await imports.applyCalendar(owner, projectId, { ...accepted, operationId: randomUUID() }))
        .status,
    ).toBe('reused')
    const later = (await workspace.snapshot(owner, projectId)).items.find(
      (item) => item.id === piece.pieceId,
    )
    if (later?.document.kind !== 'piece') throw new Error('Peça ausente')
    expect(later.document.week).toBe(4)
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId,
      operationId: randomUUID(),
      entityId: later.id,
      baseRevisionId: later.revisionId,
      action: 'save',
      document: { ...later.document, week: 8 },
    })
    const source3 = await loadCalendar(7),
      preview3 = await imports.previewCalendar(owner, projectId, source3.sourceVersionId)
    expect(preview3.entries[0]?.state).toBe('conflict')
    expect(
      (
        await imports.applyCalendar(owner, projectId, {
          ...input,
          operationId: randomUUID(),
          sourceVersionId: source3.sourceVersionId,
          expectedMappingId: next.mappingId,
          expectedRevisionId: preview3.entries[0]?.revisionId,
        })
      ).status,
    ).toBe('conflict')
    await rejects(
      imports.previewCalendar(outsider, projectId, source.sourceVersionId),
      /disponível/,
    )
    await rejects(imports.applyCalendar(outsider, projectId, accepted), /disponível/)
    const other = await fixture(1)
    await rejects(
      imports.previewCalendar(owner, other.projectId, source.sourceVersionId),
      /disponível/,
    )
  })
  test('product binding is explicit, revisioned, scoped by origin and cannot reassign loaded or archived sources', async () => {
    const { projectId } = await fixture(1, false)
    const source = await sourceVersion(projectId, 'Copy preservada')
    await rejects(imports.loadSource(owner, projectId, source.runId, source.request), /Vincule/)
    expect((await workspace.snapshot(owner, projectId)).items).toHaveLength(0)
    const input = {
      operationId: randomUUID(),
      origin: 'sistema-zero',
      product: 'comunidade-dos-criadores',
      includeShared: false,
      expectedRevisionId: null,
    }
    await rejects(imports.bindProduct(outsider, projectId, input), /disponível/)
    await workspace.setMember(owner, projectId, {
      operationId: randomUUID(),
      userId: outsider.userId,
      permissions: ['read', 'edit'],
    })
    await rejects(imports.bindProduct(outsider, projectId, input), /disponível/)
    const bound = await imports.bindProduct(owner, projectId, input)
    expect(await imports.bindProduct(owner, projectId, input)).toEqual(bound)
    await rejects(
      imports.bindProduct(owner, projectId, { ...input, product: 'cade-todo-mundo' }),
      /outro conteúdo/,
    )
    await rejects(
      imports.bindProduct(owner, projectId, { ...input, operationId: randomUUID() }),
      /outra pessoa/,
    )
    expect(await imports.productBindings(outsider, projectId)).toEqual([bound])
    const loaded = await imports.loadSource(outsider, projectId, source.runId, source.request)
    expect(loaded.status).toBe('imported')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId,
      entityId: loaded.destinations[0]?.entityId,
      baseRevisionId: loaded.destinations[0]?.revisionId,
      operationId: randomUUID(),
      action: 'archive',
    })
    await imports.retire(owner, projectId, source.runId)
    await rejects(
      imports.bindProduct(owner, projectId, {
        ...input,
        operationId: randomUUID(),
        expectedRevisionId: bound.revisionId,
        product: 'cade-todo-mundo',
      }),
      /já recebeu/,
    )
    const other = await sourceVersion(
      projectId,
      'Outro produto',
      'cade-todo-mundo',
      'docs/marketing/outro.md',
    )
    await rejects(imports.loadSource(owner, projectId, other.runId, other.request), /não pertence/)
    const shared = await sourceVersion(
      projectId,
      'Referência comum',
      'shared',
      'docs/marketing/comum.md',
    )
    await rejects(
      imports.loadSource(owner, projectId, shared.runId, shared.request),
      /não pertence/,
    )
    const widened = await imports.bindProduct(owner, projectId, {
      ...input,
      operationId: randomUUID(),
      expectedRevisionId: bound.revisionId,
      includeShared: true,
    })
    await imports.loadSource(owner, projectId, shared.runId, shared.request)
    await rejects(
      imports.bindProduct(owner, projectId, {
        ...input,
        operationId: randomUUID(),
        expectedRevisionId: widened.revisionId,
      }),
      /já recebeu conteúdo de shared/,
    )
    await imports.bindProduct(owner, projectId, {
      ...input,
      operationId: randomUUID(),
      origin: 'fluxo-criativo',
      product: 'nome-explicito-na-outra-origem',
    })
    expect(await imports.productBindings(owner, projectId)).toHaveLength(2)
    const fresh = await fixture(1, false)
    const choices = await Promise.allSettled(
      ['produto-a', 'produto-b'].map((product) =>
        imports.bindProduct(owner, fresh.projectId, {
          ...input,
          operationId: randomUUID(),
          product,
        }),
      ),
    )
    expect(choices.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(choices.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect(await imports.productBindings(owner, fresh.projectId)).toHaveLength(1)
  })
  test('adota IDs da amostra por recibo e caminho exato, preserva calendário e bloqueia edição humana', async () => {
    const root = 'docs/marketing/kids/comunidade-dos-criadores/instagram'
    const sourcePath = `${root}/postagens/copy.md`
    const text =
      '## P01 · Título\n**Formato:** Carrossel.\n### Slide 1\n> Literal.\n**Visual:** Nota preservada.\n### Legenda\n> Legenda.'
    const source = (key: string, text: string) => ({
      key,
      text,
      sha256: createHash('sha256').update(text).digest('hex'),
    })
    for (const selected of [true, false]) {
      const { projectId } = await fixture(1)
      const batches = await instagramSample(projectId, {
        direction: source(`${root}/direcao.md`, 'Direção de origem'),
        research: source(`${root}/pesquisa.md`, 'Pesquisa de origem'),
        calendar: source(
          `${root}/03-postagens.md`,
          '| 8 | [P01 · Título](postagens/copy.md#p01) · Carrossel |',
        ),
        copies: [source(sourcePath, text)],
        selectedCopies: selected ? ['P01'] : [],
      })
      for (const batch of batches)
        expect((await workspace.applyBatch(owner, batch)).status).toBe('applied')
      const before = await workspace.snapshot(owner, projectId),
        oldPiece = before.items.find((item) => item.document.kind === 'piece'),
        oldRepresentation = before.items.find((item) => item.document.kind === 'representation')
      if (!oldPiece || !oldRepresentation) throw new Error('Amostra ausente')
      const loaded = await sourceVersion(projectId, text, 'comunidade-dos-criadores', sourcePath)
      const origin = await imports.loadSource(owner, projectId, loaded.runId, loaded.request)
      const preview = await imports.previewStructure(owner, projectId, origin.sourceVersionId)
      expect(preview.pieces[0]).toMatchObject({ pieceId: oldPiece.id, state: 'update' })
      const input = {
        operationId: randomUUID(),
        sourceVersionId: origin.sourceVersionId,
        parserVersion: preview.parserVersion,
        key: 'P01',
        expectedMappingId: null,
      }
      expect((await imports.applyStructure(owner, projectId, input)).status).toBe('applied')
      const after = await workspace.snapshot(owner, projectId),
        piece = after.items.find((item) => item.id === oldPiece.id)
      expect(after.items.filter((item) => item.document.kind === 'piece')).toHaveLength(1)
      expect(piece?.document).toMatchObject({
        kind: 'piece',
        week: 8,
        position: 1,
        state: 'incomplete',
        sourceKey: `sistema-zero:${sourcePath}#P01`,
        representationIds: [oldRepresentation.id],
      })
      for (const component of before.items.filter((item) => item.document.kind === 'component'))
        expect(after.items.find((item) => item.id === component.id)?.document.kind).toBe(
          'component',
        )
      const updated = await sourceVersion(
        projectId,
        text.replace('Literal.', 'Nova versão.'),
        'comunidade-dos-criadores',
        sourcePath,
      )
      const next = await imports.loadSource(owner, projectId, updated.runId, updated.request)
      const nextPreview = await imports.previewStructure(owner, projectId, next.sourceVersionId)
      expect(nextPreview.pieces[0]).toMatchObject({ pieceId: oldPiece.id, state: 'update' })
      expect(
        (
          await imports.applyStructure(owner, projectId, {
            ...input,
            operationId: randomUUID(),
            sourceVersionId: next.sourceVersionId,
            expectedMappingId: nextPreview.pieces[0]?.mappingId ?? null,
          })
        ).status,
      ).toBe('applied')
      expect(
        (await workspace.snapshot(owner, projectId)).items.filter(
          (item) => item.document.kind === 'piece',
        ),
      ).toHaveLength(1)
    }
    const { projectId } = await fixture(1)
    for (const batch of await instagramSample(projectId, {
      direction: source(`${root}/direcao.md`, 'Direção'),
      research: source(`${root}/pesquisa.md`, 'Pesquisa'),
      calendar: source(
        `${root}/03-postagens.md`,
        '| 8 | [P01 · Título](postagens/copy.md#p01) · Carrossel |',
      ),
      copies: [source(sourcePath, text)],
      selectedCopies: ['P01'],
    }))
      await workspace.applyBatch(owner, batch)
    const component = (await workspace.snapshot(owner, projectId)).items.find(
      (item) => item.document.kind === 'component',
    )
    if (component?.document.kind !== 'component') throw new Error('Amostra ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId,
      operationId: randomUUID(),
      entityId: component.id,
      baseRevisionId: component.revisionId,
      action: 'save',
      document: { ...component.document, body: 'Edição humana' },
    })
    const loaded = await sourceVersion(projectId, text, 'comunidade-dos-criadores', sourcePath),
      origin = await imports.loadSource(owner, projectId, loaded.runId, loaded.request)
    const preview = await imports.previewStructure(owner, projectId, origin.sourceVersionId)
    expect(preview.pieces[0]?.state).toBe('conflict')
    expect(
      (
        await imports.applyStructure(owner, projectId, {
          operationId: randomUUID(),
          sourceVersionId: origin.sourceVersionId,
          parserVersion: preview.parserVersion,
          key: 'P01',
          expectedMappingId: null,
        })
      ).status,
    ).toBe('conflict')
    expect(
      (await workspace.snapshot(owner, projectId)).items.filter(
        (item) => item.document.kind === 'piece',
      ),
    ).toHaveLength(1)
  })
  test('structured conversion keeps source revisions, direct messages and team edits across retries and changed origins', async () => {
    const f = await fixture(1)
    const original =
      '## MC01 · Primeira peça\n**Formato:** Carrossel.\n### Slide 1\n> Copy original.\n**Visual:** Cenário real.\n### Legenda\n> Legenda original.\n### Direct\n**DM1**\n> Mensagem um.\n**DM2**\n> Mensagem dois.\nhttps://example.com/oferta\n'
    const loaded = await sourceVersion(f.projectId, original)
    const source = await imports.loadSource(owner, f.projectId, loaded.runId, loaded.request)
    const preview = await imports.previewStructure(owner, f.projectId, source.sourceVersionId)
    expect(
      preview.pieces.map((piece) => [
        piece.key,
        piece.state,
        piece.components,
        piece.directMessages,
      ]),
    ).toEqual([['MC01', 'new', 4, 2]])
    const request = {
      operationId: randomUUID(),
      sourceVersionId: source.sourceVersionId,
      parserVersion: preview.parserVersion,
      key: 'MC01',
      expectedMappingId: null,
    }
    const result = await imports.applyStructure(owner, f.projectId, request)
    expect(result.status).toBe('applied')
    expect(await imports.applyStructure(owner, f.projectId, request)).toEqual(result)
    const snapshot = await workspace.snapshot(owner, f.projectId)
    const representations = snapshot.items.filter((item) => item.document.kind === 'representation')
    expect(
      representations.map(
        (item) =>
          item.document.kind === 'representation' && [item.document.format, item.document.caption],
      ),
    ).toEqual(
      expect.arrayContaining([
        ['carousel', ''],
        ['campaign', ''],
      ]),
    )
    const component = snapshot.items.find(
      (item) => item.document.kind === 'component' && item.document.body === 'Copy original.',
    )
    if (component?.document.kind !== 'component') throw new Error('Componente não criado')
    expect(component.document.productionNotes).toBe('**Visual:** Cenário real.')
    expect(component.document.sourceRevisionId).toBeNull()
    expect(snapshot.items.find((item) => item.id === result.pieceId)?.document).toMatchObject({
      evidenceIds: source.destinations.map((value) => value.entityId),
    })
    await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.projectId,
      entityId: component.id,
      baseRevisionId: component.revisionId,
      action: 'save',
      document: { ...component.document, body: 'Edição da equipe' },
    })
    expect(
      (await imports.applyStructure(owner, f.projectId, { ...request, operationId: randomUUID() }))
        .status,
    ).toBe('reused')
    const updated = await sourceVersion(
      f.projectId,
      original.replace('Copy original.', 'Copy da origem atualizada.'),
    )
    const source2 = await imports.loadSource(owner, f.projectId, updated.runId, updated.request)
    const preview2 = await imports.previewStructure(owner, f.projectId, source2.sourceVersionId)
    expect(preview2.pieces[0]?.state).toBe('conflict')
    expect(
      (
        await imports.applyStructure(owner, f.projectId, {
          ...request,
          operationId: randomUUID(),
          sourceVersionId: source2.sourceVersionId,
          expectedMappingId: result.mappingId,
        })
      ).status,
    ).toBe('conflict')
    expect(
      (await workspace.snapshot(owner, f.projectId)).items.find((item) => item.id === component.id)
        ?.document,
    ).toMatchObject({ body: 'Edição da equipe' })
    await rejects(
      imports.previewStructure(outsider, f.projectId, source.sourceVersionId),
      /disponível/,
    )
    await rejects(imports.applyStructure(outsider, f.projectId, request), /disponível/)
    const other = await fixture(1)
    await rejects(imports.applyStructure(owner, other.projectId, request), /Origem/)
  })
  test('structured delta keeps IDs, rejects stale mapping and archives only unchanged removed components', async () => {
    const f = await fixture(1)
    const original =
      '## P01 · Primeira\n**Formato:** Carrossel.\n### Slide 1\n> Um.\n### Slide 2\n> Dois.\n'
    const load = async (text: string) => {
      const input = await sourceVersion(f.projectId, text)
      return imports.loadSource(owner, f.projectId, input.runId, input.request)
    }
    const source = await load(original)
    const request = {
      operationId: randomUUID(),
      sourceVersionId: source.sourceVersionId,
      parserVersion: 'editorial-markdown-v3',
      key: 'P01',
      expectedMappingId: null,
    }
    const first = await imports.applyStructure(owner, f.projectId, request)
    const before = await workspace.snapshot(owner, f.projectId)
    const scheduled = before.items.find((item) => item.id === first.pieceId)
    if (scheduled?.document.kind !== 'piece') throw new Error('Peça ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      operationId: randomUUID(),
      entityId: scheduled.id,
      baseRevisionId: scheduled.revisionId,
      action: 'save',
      document: { ...scheduled.document, week: 4, position: 2, editorialDate: '2026-12-01' },
    })
    const source2 = await load(
      original.replace('Um.', 'Um revisto.').replace('### Slide 2\n> Dois.\n', ''),
    )
    expect(
      (await imports.previewStructure(owner, f.projectId, source2.sourceVersionId)).pieces[0]
        ?.state,
    ).toBe('update')
    expect(
      (
        await imports.applyStructure(owner, f.projectId, {
          ...request,
          operationId: randomUUID(),
          sourceVersionId: source2.sourceVersionId,
        })
      ).status,
    ).toBe('conflict')
    const second = await imports.applyStructure(owner, f.projectId, {
      ...request,
      operationId: randomUUID(),
      sourceVersionId: source2.sourceVersionId,
      expectedMappingId: first.mappingId,
    })
    expect(second.status).toBe('applied')
    expect(second.pieceId).toBe(first.pieceId)
    const after = await workspace.snapshot(owner, f.projectId)
    expect(after.items.find((item) => item.id === first.pieceId)?.document).toMatchObject({
      week: 4,
      position: 2,
      editorialDate: '2026-12-01',
    })
    const old = before.items.find(
      (item) => item.document.kind === 'component' && item.document.body === 'Um.',
    )
    expect(after.items.find((item) => item.id === old?.id)?.document).toMatchObject({
      body: 'Um revisto.',
    })
    expect(
      after.items.filter((item) => item.document.kind === 'component' && !item.archived),
    ).toHaveLength(1)
    const cursor = after.cursor
    expect(
      (await imports.applyStructure(owner, f.projectId, { ...request, operationId: randomUUID() }))
        .status,
    ).toBe('reused')
    expect((await workspace.snapshot(owner, f.projectId)).cursor).toBe(cursor)
  })
  test('source loading preserves bytes, exact provenance and the team edits across reimports and changed files', async () => {
    const f = await fixture(1),
      original = '\uFEFFCopy já criada.\r\nSegunda linha.'
    const v1 = await sourceVersion(f.projectId, original)
    await rejects(
      imports.loadSource(owner, f.projectId, v1.runId, {
        ...v1.request,
        content: { kind: 'text', base64: Buffer.from('changed').toString('base64') },
      }),
      /bytes/,
    )
    const first = await imports.loadSource(owner, f.projectId, v1.runId, v1.request)
    expect(await imports.loadSource(owner, f.projectId, v1.runId, v1.request)).toEqual(first)
    const snapshot = await workspace.snapshot(owner, f.projectId),
      item = snapshot.items[0]
    if (item?.document.kind !== 'evidence') throw new Error('Referência não carregada')
    expect(item.document.body).toBe(original)
    expect(first.destinations).toEqual([{ entityId: item.id, revisionId: item.revisionId }])
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      entityId: item.id,
      operationId: randomUUID(),
      baseRevisionId: item.revisionId,
      action: 'save',
      document: { ...item.document, body: 'Edição feita pela equipe' },
    })
    const same = await sourceVersion(f.projectId, original)
    const reused = await imports.loadSource(owner, f.projectId, same.runId, same.request)
    expect(reused.status).toBe('reused')
    expect(reused.destinations).toEqual(first.destinations)
    expect(reused.classificationReview).toBe(false)
    const otherProduct = await sourceVersion(f.projectId, original, 'cade-todo-mundo')
    await rejects(
      imports.loadSource(owner, f.projectId, otherProduct.runId, otherProduct.request),
      /não pertence/,
    )
    const reclassified = await sourceVersion(
      f.projectId,
      original,
      'comunidade-dos-criadores',
      'docs/marketing/copy.md',
      'research',
    )
    const classification = await imports.loadSource(
      owner,
      f.projectId,
      reclassified.runId,
      reclassified.request,
    )
    expect(classification.classificationReview).toBe(true)
    expect(classification.destinations).toEqual(first.destinations)
    const changed = await sourceVersion(f.projectId, 'Nova versão na origem')
    const next = await imports.loadSource(owner, f.projectId, changed.runId, changed.request)
    expect(next.previousSourceVersion).toBe(true)
    const final = await workspace.snapshot(owner, f.projectId)
    expect(final.items).toHaveLength(2)
    expect(final.items.find((i) => i.id === item.id)?.document).toMatchObject({
      body: 'Edição feita pela equipe',
    })
    expect((await imports.page(owner, f.projectId, changed.runId, 0)).entries[0]?.result).toEqual(
      next,
    )
    const history = await workspace.history(owner, f.projectId, item.id)
    expect(history.find((r) => r.id === item.revisionId)?.document).toMatchObject({
      body: original,
    })
    await rejects(
      imports.loadSource(outsider, f.projectId, v1.runId, {
        ...v1.request,
        operationId: randomUUID(),
      }),
      /disponível/,
    )
  })
  test('large text is split without loss and cannot introduce credentials as source evidence', async () => {
    const f = await fixture(1),
      text = `${'a'.repeat(98000)}\n${'b'.repeat(70000)}`
    const source = await sourceVersion(f.projectId, text)
    const result = await imports.loadSource(owner, f.projectId, source.runId, source.request)
    const snapshot = await workspace.snapshot(owner, f.projectId)
    const restored = result.destinations
      .map((destination) => {
        const doc = snapshot.items.find((i) => i.id === destination.entityId)?.document
        if (doc?.kind !== 'evidence') throw new Error('Fragmento ausente')
        return doc.body
      })
      .join('')
    expect(restored).toBe(text)
    expect(result.destinations).toHaveLength(2)
    const secret = await sourceVersion(f.projectId, `client_secret: "${'Z'.repeat(40)}"`)
    await rejects(
      imports.loadSource(owner, f.projectId, secret.runId, secret.request),
      /credencial/,
    )
  })
  test('original-file binding requires confirmed hash, size and project ownership', async () => {
    const f = await fixture(1),
      other = await fixture(1)
    const text = 'Fonte original preservada',
      source = await sourceVersion(f.projectId, text)
    const assetId = randomUUID(),
      bytes = Buffer.from(text)
    const manifest = {
      schemaVersion: 1 as const,
      id: assetId,
      projectId: f.projectId,
      name: 'copy.md',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      size: bytes.length,
      mime: 'text/markdown' as const,
      role: 'original' as const,
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    }
    const request = { operationId: randomUUID(), ordinal: 0, content: { kind: 'asset', assetId } }
    // Only the database authorization/binding boundary is exercised here; this is not an R2 upload proof.
    await connection.db.insert(editorialAssets).values({
      id: assetId,
      projectId: f.projectId,
      createdBy: owner.userId ?? '',
      storageKey: `review-only/${assetId}`,
      manifest,
      confirmed: false,
    })
    await rejects(imports.loadSource(owner, f.projectId, source.runId, request), /Confirme/)
    await connection.db
      .update(editorialAssets)
      .set({ confirmed: true, projectId: other.projectId })
      .where(eq(editorialAssets.id, assetId))
    await rejects(imports.loadSource(owner, f.projectId, source.runId, request), /Confirme/)
    await connection.db
      .update(editorialAssets)
      .set({ projectId: f.projectId, manifest: { ...manifest, size: bytes.length + 1 } })
      .where(eq(editorialAssets.id, assetId))
    await rejects(imports.loadSource(owner, f.projectId, source.runId, request), /mesmo hash/)
    await connection.db
      .update(editorialAssets)
      .set({ manifest: { ...manifest, role: 'final', sourceAssetId: null } })
      .where(eq(editorialAssets.id, assetId))
    await rejects(imports.loadSource(owner, f.projectId, source.runId, request), /arquivo original/)
    await connection.db
      .update(editorialAssets)
      .set({ manifest: { ...manifest, role: 'original', sourceAssetId: randomUUID() } })
      .where(eq(editorialAssets.id, assetId))
    await rejects(imports.loadSource(owner, f.projectId, source.runId, request), /arquivo original/)
    await connection.db
      .update(editorialAssets)
      .set({ manifest })
      .where(eq(editorialAssets.id, assetId))
    const loaded = await imports.loadSource(owner, f.projectId, source.runId, request)
    expect(await imports.loadSource(owner, f.projectId, source.runId, request)).toEqual(loaded)
    const snapshot = await workspace.snapshot(owner, f.projectId)
    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.items[0]?.document).toMatchObject({
      kind: 'evidence',
      assetIds: [assetId],
      validity: 'unverified',
    })
  })
  test('Office extraction binds exact original bytes, deduplicates concurrent requests and preserves edited references', async () => {
    const f = await fixture(1),
      other = await fixture(1)
    const bytes = Buffer.from(
      'UEsDBBQAAAAIANMiUF2k5s/qgwAAAK8AAAARAAAAd29yZC9kb2N1bWVudC54bWw1jkEOwyAMBL+C8oAQ9dADSrn0JRRcQhUwwo5ofl+jKpexLe+udu0moD8yFFbfvBcy/TFtzNVoTX6D7GjGCkV+b2zZsZwt6o4t1IYeiFKJede3Zbnr7FKZrES+MJxj1oE2wPaJ9VQBFAMxGOVbAkVwqA9GnFc9JIOiFopR+I+R5apof1BLAQIUABQAAAAIANMiUF2k5s/qgwAAAK8AAAARAAAAAAAAAAAAAAAAAAAAAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAQABAD8AAACyAAAAAAA=',
      'base64',
    )
    const source = f.entries[0]
    if (!source) throw new Error('Fixture incompleta')
    source.path = 'output/instagram/copy.docx'
    source.bytes = bytes.length
    source.sha256 = createHash('sha256').update(bytes).digest('hex')
    f.input.digest = createHash('sha256')
      .update(
        inventoryDigestInput({
          origin: f.input.origin,
          policyVersion: f.input.policyVersion,
          entries: f.entries,
        }),
      )
      .digest('hex')
    await imports.start(owner, f.projectId, f.input)
    await imports.chunk(owner, f.projectId, f.input.id, { offset: 0, entries: f.entries })
    await imports.finish(owner, f.projectId, f.input.id)
    const assetId = randomUUID()
    await connection.db.insert(editorialAssets).values({
      id: assetId,
      projectId: f.projectId,
      createdBy: owner.userId ?? '',
      storageKey: `review-only/${assetId}`,
      confirmed: true,
      manifest: {
        schemaVersion: 1,
        id: assetId,
        projectId: f.projectId,
        name: 'copy.docx',
        sha256: source.sha256,
        size: bytes.length,
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        role: 'original',
        sourceAssetId: null,
        width: null,
        height: null,
        durationMs: null,
        codec: null,
        rotation: null,
      },
    })
    const loaded = await imports.loadSource(owner, f.projectId, f.input.id, {
      operationId: randomUUID(),
      ordinal: 0,
      content: { kind: 'asset', assetId },
    })
    expect(
      (await imports.officeText(owner, f.projectId, loaded.sourceVersionId)).destinations,
    ).toEqual([])
    const input = { operationId: randomUUID(), base64: bytes.toString('base64') }
    await rejects(
      imports.extractOfficeText(outsider, f.projectId, loaded.sourceVersionId, input),
      /permissão|acess|projeto/i,
    )
    await rejects(
      imports.extractOfficeText(owner, other.projectId, loaded.sourceVersionId, input),
      /Origem não disponível/,
    )
    await rejects(
      imports.extractOfficeText(owner, f.projectId, loaded.sourceVersionId, {
        ...input,
        base64: Buffer.from('divergente').toString('base64'),
      }),
      /diverge/,
    )
    const pair = await Promise.all([
      imports.extractOfficeText(owner, f.projectId, loaded.sourceVersionId, input),
      imports.extractOfficeText(owner, f.projectId, loaded.sourceVersionId, {
        ...input,
        operationId: randomUUID(),
      }),
    ])
    expect(pair[0]).toEqual(pair[1])
    expect(pair[0]?.destinations).toHaveLength(1)
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: outsider.userId,
      permissions: ['read'],
    })
    expect(await imports.officeText(outsider, f.projectId, loaded.sourceVersionId)).toEqual(pair[0])
    await rejects(
      imports.extractOfficeText(outsider, f.projectId, loaded.sourceVersionId, {
        ...input,
        operationId: randomUUID(),
      }),
      { code: 'OBJECT_INACCESSIBLE' },
    )
    const snapshot = await workspace.snapshot(owner, f.projectId)
    expect(snapshot.items).toHaveLength(2)
    const extracted = snapshot.items.find((item) => item.id === pair[0]?.destinations[0]?.entityId)
    if (extracted?.document.kind !== 'evidence') throw new Error('Extração ausente')
    expect(extracted.document.body).toContain('Copy de teste: crie seu jogo.')
    expect(extracted.document.assetIds).toEqual([assetId])
    expect(extracted.document.source.sha256).toBe(source.sha256)
    await workspace.apply(owner, {
      schemaVersion: 1,
      projectId: f.projectId,
      entityId: extracted.id,
      operationId: randomUUID(),
      baseRevisionId: extracted.revisionId,
      action: 'save',
      document: { ...extracted.document, body: 'Copy revisada pela equipe' },
    })
    expect(
      await imports.extractOfficeText(owner, f.projectId, loaded.sourceVersionId, input),
    ).toEqual(pair[0])
    expect(
      await imports.extractOfficeText(owner, f.projectId, loaded.sourceVersionId, {
        ...input,
        operationId: randomUUID(),
      }),
    ).toEqual(pair[0])
    expect(
      (await workspace.snapshot(owner, f.projectId)).items.find((item) => item.id === extracted.id)
        ?.document,
    ).toMatchObject({ body: 'Copy revisada pela equipe' })
    await rejects(
      imports.extractOfficeText(owner, f.projectId, loaded.sourceVersionId, {
        ...input,
        base64: '',
      }),
      /outro conteúdo/i,
    )
    expect((await imports.page(owner, f.projectId, f.input.id, 0)).entries[0]?.result).toEqual(
      loaded,
    )
  })
  test('lost responses, repeated chunks and concurrent sealing preserve one immutable manifest', async () => {
    const f = await fixture()
    const a = await imports.start(owner, f.projectId, f.input)
    expect(await imports.start(owner, f.projectId, f.input)).toEqual(a)
    await rejects(imports.finish(owner, f.projectId, f.input.id), /incompleto/)
    await rejects(
      imports.chunk(owner, f.projectId, f.input.id, {
        offset: 1,
        entries: f.entries.slice(0, 100),
      }),
      /sequência/,
    )
    const first = { offset: 0, entries: f.entries.slice(0, 100) }
    const repeated = await Promise.all([
      imports.chunk(owner, f.projectId, f.input.id, first),
      imports.chunk(owner, f.projectId, f.input.id, first),
    ])
    expect(repeated.map((r) => r.received)).toEqual([100, 100])
    await rejects(
      imports.chunk(owner, f.projectId, f.input.id, {
        ...first,
        entries: first.entries.map((e) => ({ ...e, bytes: 11 })),
      }),
      /diferente/,
    )
    for (let i = 100; i < f.entries.length; i += 100)
      await imports.chunk(owner, f.projectId, f.input.id, {
        offset: i,
        entries: f.entries.slice(i, i + 100),
      })
    const finished = await Promise.all([
      imports.finish(owner, f.projectId, f.input.id),
      imports.finish(owner, f.projectId, f.input.id),
    ])
    expect(finished[0]).toEqual(finished[1])
    expect(finished[0]?.state).toBe('inventoried')
    expect((await imports.page(owner, f.projectId, f.input.id, 0)).nextCursor).toBe(100)
    expect((await imports.page(owner, f.projectId, f.input.id, 200)).entries).toHaveLength(5)
    expect((await workspace.snapshot(owner, f.projectId)).items).toHaveLength(0)
    expect(await imports.chunk(owner, f.projectId, f.input.id, first)).toEqual(finished[0])
    await rejects(
      imports.start(owner, f.projectId, { ...f.input, digest: 'f'.repeat(64) }),
      /outra origem/,
    )
  })
  test('reconciliation reuses only identical sources and decisions, preserves human edits and concurrent receipts', async () => {
    const f = await fixture(6)
    const bytes = Buffer.from('Original preservado, nunca substitui o texto humano.')
    const entries = f.entries.map((entry) => ({
      ...entry,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }))
    async function seal(values: InventoryEntry[]) {
      const start = {
        ...f.input,
        id: randomUUID(),
        entryCount: values.length,
        digest: createHash('sha256')
          .update(
            inventoryDigestInput({
              origin: f.input.origin,
              policyVersion: f.input.policyVersion,
              entries: values,
            }),
          )
          .digest('hex'),
      }
      await imports.start(owner, f.projectId, start)
      await imports.chunk(owner, f.projectId, start.id, { offset: 0, entries: values })
      await imports.finish(owner, f.projectId, start.id)
      return start
    }
    const old = await seal(entries)
    for (let ordinal = 0; ordinal < 6; ordinal++) {
      if (ordinal === 2) continue
      await imports.loadSource(owner, f.projectId, old.id, {
        operationId: randomUUID(),
        ordinal,
        content: { kind: 'text', base64: bytes.toString('base64') },
      })
    }
    const decision = await imports.decideSource(owner, f.projectId, old.id, {
      operationId: randomUUID(),
      ordinal: 2,
      expectedRevisionId: null,
      state: 'deferred',
      reason: 'Conferir com a equipe antes de carregar.',
    })
    const before = await workspace.snapshot(owner, f.projectId)
    const reference = before.items.find((item) => item.document.kind === 'evidence')
    if (reference?.document.kind !== 'evidence') throw new Error('Referência ausente')
    await workspace.apply(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId: f.projectId,
      entityId: reference.id,
      baseRevisionId: reference.revisionId,
      action: 'save',
      document: { ...reference.document, body: 'Edição humana preservada.' },
    })
    const currentEntries = entries
      .slice(0, 5)
      .map((entry, index) =>
        index === 3
          ? { ...entry, validity: 'historical' as const }
          : index === 4
            ? { ...entry, sha256: 'b'.repeat(64) }
            : entry,
      )
    const sample = entries[0]
    if (!sample) throw new Error('Origem ausente')
    currentEntries.push({ ...sample, path: 'output/instagram/99999.md' })
    const current = await seal(currentEntries)
    const ownDecision = await imports.decideSource(owner, f.projectId, current.id, {
      operationId: randomUUID(),
      ordinal: 1,
      expectedRevisionId: null,
      state: 'omitted',
      reason: 'Decisão nova desta carga, preservar.',
    })
    const command = {
      operationId: randomUUID(),
      previousId: old.id,
      previousDigest: old.digest,
      currentDigest: current.digest,
    }
    await rejects(imports.reconcile(outsider, f.projectId, current.id, command), /disponível/)
    await workspace.setMember(owner, f.projectId, {
      operationId: randomUUID(),
      userId: outsider.userId,
      permissions: ['read'],
    })
    await rejects(imports.reconcile(outsider, f.projectId, current.id, command), /disponível/)
    const foreign = await fixture(1)
    const foreignSource = await sourceVersion(foreign.projectId, 'Outra origem, mesmo autor.')
    await rejects(
      imports.reconcile(owner, f.projectId, current.id, {
        ...command,
        operationId: randomUUID(),
        previousId: foreignSource.runId,
      }),
      /disponível/,
    )
    await rejects(
      imports.reconcile(owner, f.projectId, current.id, {
        ...command,
        currentDigest: 'f'.repeat(64),
      }),
      /inventários/,
    )
    await rejects(
      imports.reconcile(owner, f.projectId, old.id, {
        ...command,
        previousId: current.id,
        previousDigest: current.digest,
        currentDigest: old.digest,
      }),
      /inventários/,
    )
    const [first, replay] = await Promise.all([
      imports.reconcile(owner, f.projectId, current.id, command),
      imports.reconcile(owner, f.projectId, current.id, command),
    ])
    expect(first).toEqual(replay)
    expect(first).toMatchObject({ sources: 1, decisions: 1, reports: 0, links: 0 })
    const page = await imports.page(owner, f.projectId, current.id, 0)
    expect(page.entries.filter((entry) => entry.result)).toHaveLength(1)
    expect(page.entries[0]?.result?.status).toBe('reused')
    expect(page.entries[1]?.decision).toEqual(ownDecision)
    expect(page.entries[2]?.decision).toMatchObject({
      state: 'deferred',
      reason: decision.reason,
      inheritedFrom: { inventoryId: old.id, ordinal: 2, revisionId: decision.revisionId },
    })
    expect(
      (await workspace.snapshot(owner, f.projectId)).items.find((item) => item.id === reference.id)
        ?.document,
    ).toMatchObject({ body: 'Edição humana preservada.' })
    expect(
      await imports.reconcile(owner, f.projectId, current.id, {
        ...command,
        operationId: randomUUID(),
      }),
    ).toMatchObject({ sources: 0, decisions: 0 })
    await rejects(
      imports.reconcile(owner, f.projectId, current.id, { ...command, previousId: randomUUID() }),
      /reutilizad|outro|diferente/,
    )
    await imports.retire(owner, f.projectId, old.id)
    await rejects(
      imports.reconcile(owner, f.projectId, current.id, { ...command, operationId: randomUUID() }),
      /inventários/,
    )
  })
  test('wrong digest never seals; ACL and retirement preserve records without publishing or deleting', async () => {
    const f = await fixture(1),
      input = { ...f.input, digest: '0'.repeat(64) }
    await imports.start(owner, f.projectId, input)
    await imports.chunk(owner, f.projectId, input.id, { offset: 0, entries: f.entries })
    await rejects(imports.finish(owner, f.projectId, input.id), /hash/)
    await rejects(imports.page(outsider, f.projectId, input.id, 0), /disponível/)
    await rejects(imports.list(outsider, f.projectId, undefined), /disponível/)
    await imports.retire(owner, f.projectId, input.id)
    expect((await imports.page(owner, f.projectId, input.id, 0)).entries).toHaveLength(1)
    await rejects(imports.finish(owner, f.projectId, input.id), /desativado/)
    await rejects(
      imports.chunk(owner, f.projectId, input.id, { offset: 0, entries: f.entries }),
      /desativada/,
    )
    expect((await imports.list(owner, f.projectId, undefined))[0]?.state).toBe('retired')
  })
})
