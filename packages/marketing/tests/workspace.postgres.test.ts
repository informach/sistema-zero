import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  type EditorialDocument,
  type EditorialOperation,
  parseRevisionHistoryPage,
  workspaceHeadSchema,
} from '@sistemazero/marketing-contracts'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Elysia } from 'elysia'
import type { Actor } from '../src/application/actor'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { workspaceRoutes } from '../src/interfaces/http/routes/workspace.routes'
import { requireReviewDatabase } from './helpers/review-database'

const url = process.env.MARKETING_TEST_DATABASE_URL
const suite = url ? describe : describe.skip
suite('workspace PostgreSQL: atomicidade, autorização e migração aditiva', () => {
  let connection: DbConnection
  let service: WorkspaceService
  const owner: Actor = {
    userId: randomUUID(),
    displayName: 'Equipe A',
    role: 'staff',
    status: 'active',
  }
  const colleague: Actor = { ...owner, userId: randomUUID(), displayName: 'Equipe B' }
  let projectId: string
  const document: EditorialDocument = {
    schemaVersion: 1,
    kind: 'direction',
    title: 'Direção',
    body: 'Texto original',
    objective: 'Ensinar',
    audience: 'Responsáveis',
    voice: 'Clareza',
    protectedTerms: [],
    referenceIds: [],
  }
  beforeAll(async () => {
    requireReviewDatabase(url)
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
    service = new WorkspaceService(new DrizzleWorkspaceRepository(connection.db), fixtureDirectory)
    projectId = randomUUID()
    await service.create(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      id: projectId,
      name: 'Revisão',
      product: 'Sistema Zero',
    })
    await service.setMember(owner, projectId, {
      operationId: randomUUID(),
      userId: colleague.userId,
      permissions: ['read', 'edit'],
    })
  }, 30000) // Cold setup includes the complete migration history, not only fixture inserts.
  afterAll(async () => {
    await connection?.close()
  })
  const save = (extra: Partial<EditorialOperation> = {}): EditorialOperation => ({
    schemaVersion: 1,
    operationId: randomUUID(),
    projectId,
    entityId: randomUUID(),
    baseRevisionId: null,
    action: 'save',
    document,
    ...extra,
  })
  test('snapshot pages freeze revisions and archive state while later writes remain in the delta', async () => {
    const id = randomUUID()
    await service.create(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      id,
      name: 'Retrato paginado',
      product: 'Revisão',
    })
    const ids = Array.from({ length: 102 }, () => randomUUID()).sort()
    for (let offset = 0; offset < ids.length; offset += 50)
      await service.applyBatch(owner, {
        schemaVersion: 1,
        operationId: randomUUID(),
        projectId: id,
        changes: ids
          .slice(offset, offset + 50)
          .map((entityId) => ({ entityId, baseRevisionId: null, action: 'save', document })),
      })
    const first = await service.snapshotPage(owner, id, {})
    expect(first.items).toHaveLength(100)
    expect(first.nextAfter).toBe(ids[99] ?? null)
    const original = (await service.history(owner, id, ids[101] ?? ''))[0]
    if (!original) throw new Error('Revisão original ausente')
    await service.apply(
      owner,
      save({
        projectId: id,
        entityId: original.entityId,
        baseRevisionId: original.id,
        action: 'archive',
        document: undefined,
      }),
    )
    const created = await service.apply(owner, save({ projectId: id }))
    const second = await service.snapshotPage(owner, id, { at: first.at, after: first.nextAfter })
    expect(second.items.map((item) => item.id)).toEqual(ids.slice(100))
    expect(second.items.at(-1)?.archived).toBe(false)
    expect(second.items.at(-1)?.revisionId).toBe(original.id)
    expect(second.nextAfter).toBeNull()
    const delta = await service.changes(owner, id, first.at)
    expect(delta.items.find((item) => item.id === original.entityId)?.archived).toBe(true)
    expect(delta.items.some((item) => item.id === created.entityId)).toBe(true)
    await rejects(service.snapshotPage(colleague, id, { at: first.at, after: first.nextAfter }), {
      code: 'OBJECT_INACCESSIBLE',
    })
    await rejects(
      service.snapshotPage(owner, id, { at: first.at + 9999, after: first.nextAfter }),
      { code: 'CONTEXT_CHANGED' },
    )
    await rejects(async () => service.snapshotPage(owner, id, { after: first.nextAfter }), {
      code: 'VALIDATION_ERROR',
    })
    await service.setMember(owner, id, {
      operationId: randomUUID(),
      userId: colleague.userId,
      permissions: ['read'],
    })
    expect((await service.snapshotPage(colleague, id, {})).permissions).toEqual(['read'])
    await service.setMember(owner, id, {
      operationId: randomUUID(),
      userId: colleague.userId,
      permissions: [],
    })
    await rejects(service.snapshotPage(colleague, id, { at: first.at, after: first.nextAfter }), {
      code: 'OBJECT_INACCESSIBLE',
    })
  })
  test('snapshot pages bound text bytes as well as item count, preserving the complete next page', async () => {
    const id = randomUUID()
    await service.create(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      id,
      name: 'Textos longos',
      product: 'Revisão',
    })
    const ids = Array.from({ length: 24 }, () => randomUUID()).sort()
    for (let offset = 0; offset < ids.length; offset += 4)
      await service.applyBatch(owner, {
        schemaVersion: 1,
        operationId: randomUUID(),
        projectId: id,
        changes: ids.slice(offset, offset + 4).map((entityId) => ({
          entityId,
          baseRevisionId: null,
          action: 'save',
          document: { ...document, body: 'x'.repeat(99000) },
        })),
      })
    const first = await service.snapshotPage(owner, id, {})
    expect(first.items.length).toBeLessThan(24)
    expect(Buffer.byteLength(JSON.stringify(first))).toBeLessThan(2 * 1024 * 1024)
    const second = await service.snapshotPage(owner, id, { at: first.at, after: first.nextAfter })
    expect([...first.items, ...second.items].map((item) => item.id)).toEqual(ids)
    expect(second.nextAfter).toBeNull()
  })
  test('histórico paginado ultrapassa 200 versões, preserva microssegundos e revalida a autorização', async () => {
    const entityId = randomUUID(),
      ids: string[] = []
    let parent: string | null = null
    for (let index = 0; index < 205; index++) {
      const applied = await service.apply(
        owner,
        save({
          entityId,
          baseRevisionId: parent,
          document: { ...document, body: `Versão ${index}` },
        }),
      )
      if (applied.status !== 'applied') throw new Error('Revisão de prova em conflito')
      parent = applied.revisionId
      ids.push(parent)
    }
    await connection.db.execute(
      sql`update marketing.editorial_revisions set created_at = '2026-10-15T00:00:00.123456Z'::timestamptz where entity_id = ${entityId}`,
    )
    const expected = ids.sort().reverse()
    const first = await service.historyPage(owner, projectId, entityId, {})
    expect(first.items.map((item) => item.id)).toEqual(expected.slice(0, 50))
    const createdLater = await service.apply(
      owner,
      save({
        entityId,
        baseRevisionId: parent,
        document: { ...document, body: 'Criada durante a consulta' },
      }),
    )
    if (createdLater.status !== 'applied') throw new Error('Revisão de prova em conflito')
    const observed = first.items.map((item) => item.id)
    let before = first.nextBefore
    while (before) {
      const page = await service.historyPage(owner, projectId, entityId, { before })
      observed.push(...page.items.map((item) => item.id))
      before = page.nextBefore
    }
    expect(observed).toEqual(expected)
    expect(new Set(observed).size).toBe(205)
    expect(observed.includes(createdLater.revisionId)).toBe(false)
    const foreign = await service.apply(owner, save())
    if (foreign.status !== 'applied') throw new Error('Revisão de prova em conflito')
    await rejects(service.historyPage(owner, projectId, entityId, { before: foreign.revisionId }), {
      code: 'OBJECT_INACCESSIBLE',
    })
    await rejects(
      service.historyPage({ ...owner, userId: randomUUID() }, projectId, entityId, {
        before: first.nextBefore,
      }),
      { code: 'OBJECT_INACCESSIBLE' },
    )
    const api = new Elysia().use(
      workspaceRoutes({ workspace: service, internalToken: 'test-history-internal' }),
    )
    const response = await api.handle(
      new Request(
        `http://localhost/marketing/workspace/projects/${projectId}/items/${entityId}/history-page?before=${first.nextBefore}`,
        {
          headers: {
            'x-internal-token': 'test-history-internal',
            'x-auth-user-id': owner.userId,
            'x-auth-user-role': 'staff',
            'x-auth-user-status': 'active',
          },
        },
      ),
    )
    expect(response.status).toBe(200)
    expect(
      parseRevisionHistoryPage(
        await response.json(),
        projectId,
        entityId,
        first.nextBefore,
      ).items.map((item) => item.id),
    ).toEqual(expected.slice(50, 100))
  }, 30000)
  test('histórico limita bytes sem perder a próxima revisão', async () => {
    const entityId = randomUUID(),
      ids: string[] = []
    let parent: string | null = null
    for (let index = 0; index < 24; index++) {
      const result = await service.apply(
        owner,
        save({
          entityId,
          baseRevisionId: parent,
          document: { ...document, body: `${index}:${'x'.repeat(99000)}` },
        }),
      )
      if (result.status !== 'applied') throw new Error('Revisão de prova em conflito')
      parent = result.revisionId
      ids.push(parent)
    }
    const first = await service.historyPage(owner, projectId, entityId, {})
    expect(first.items.length).toBeLessThan(24)
    expect(Buffer.byteLength(JSON.stringify(first))).toBeLessThan(2 * 1024 * 1024)
    const second = await service.historyPage(owner, projectId, entityId, {
      before: first.nextBefore,
    })
    expect([...first.items, ...second.items].map((item) => item.id).sort()).toEqual(ids.sort())
    expect(second.nextBefore).toBeNull()
  })
  test('retry depois do commit devolve o mesmo recibo e uma única revisão', async () => {
    const op = save()
    const first = await service.apply(owner, op)
    expect(await service.apply(owner, op)).toEqual(first)
    expect(await service.history(owner, projectId, op.entityId)).toHaveLength(1)
    await rejects(
      () => service.apply(owner, { ...op, document: { ...document, body: 'Payload trocado' } }),
      { code: 'OPERATION_REUSED' },
    )
  })
  test('passagem para desktop pertence ao usuário e revalida permissão do projeto', async () => {
    const op = save(),
      result = await service.apply(owner, op)
    if (result.status !== 'applied') throw new Error('Fixture inválida')
    const reference = await service.createHandoff(owner, {
      schemaVersion: 1,
      projectId,
      entityId: op.entityId,
      revisionId: result.revisionId,
      selection: [],
      intent: 'adjust',
    })
    expect((await service.resolveHandoff(owner, reference.id)).revisionId).toBe(result.revisionId)
    await rejects(() => service.resolveHandoff(colleague, reference.id), {
      code: 'OBJECT_INACCESSIBLE',
    })
    await connection.sql`update marketing.editorial_handoffs set expires_at=now()-interval '1 second' where id=${reference.id}`
    await rejects(() => service.resolveHandoff(owner, reference.id), {
      code: 'OBJECT_INACCESSIBLE',
    })
  })
  test('duas pessoas na mesma revisão: apenas uma grava, a outra recebe conflito persistido', async () => {
    const initial = save()
    const first = await service.apply(owner, initial)
    if (first.status !== 'applied') throw new Error('Criação falhou')
    const left = save({
      entityId: initial.entityId,
      baseRevisionId: first.revisionId,
      document: { ...document, body: 'Pessoa A' },
    })
    const right = save({
      entityId: initial.entityId,
      baseRevisionId: first.revisionId,
      document: { ...document, body: 'Pessoa B' },
    })
    const results = await Promise.all([service.apply(owner, left), service.apply(colleague, right)])
    expect(results.map((r) => r.status).sort()).toEqual(['applied', 'conflict'])
    expect(await service.history(owner, projectId, initial.entityId)).toHaveLength(2)
    expect(await service.apply(owner, left)).toEqual(results[0])
    expect(await service.apply(colleague, right)).toEqual(results[1])
  })
  test('objetos independentes não conflitam e cursor observa commits completos', async () => {
    const before = await service.snapshot(owner, projectId)
    const results = await Promise.all([
      service.apply(owner, save()),
      service.apply(colleague, save()),
    ])
    expect(results.every((r) => r.status === 'applied')).toBe(true)
    const changes = await service.changes(owner, projectId, before.cursor)
    expect(changes.events).toHaveLength(2)
    expect(changes.events[1]?.sequence).toBe(before.cursor + 2)
    expect((await service.snapshot(owner, projectId)).cursor).toBe(changes.cursor)
  })
  test('nega outra equipe, conta inativa, alteração de tipo e referência cruzada', async () => {
    const outsider = { ...owner, userId: randomUUID() }
    await rejects(() => service.snapshot(outsider, projectId), { code: 'OBJECT_INACCESSIBLE' })
    expect(() =>
      service.create(
        { ...owner, status: 'inactive' },
        { schemaVersion: 1, operationId: randomUUID(), id: randomUUID(), name: 'X', product: 'X' },
      ),
    ).toThrow()
    const op = save()
    const first = await service.apply(owner, op)
    if (first.status !== 'applied') throw new Error('Criação falhou')
    await rejects(
      () => service.apply(owner, save({ document: { ...document, referenceIds: [randomUUID()] } })),
      { code: 'DEPENDENCY_MISSING' },
    )
    const other = randomUUID()
    await service.create(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      id: other,
      name: 'Outro produto',
      product: 'Outro',
    })
    await rejects(
      () =>
        service.apply(
          owner,
          save({ projectId: other, document: { ...document, referenceIds: [op.entityId] } }),
        ),
      { code: 'DEPENDENCY_MISSING' },
    )
    const noHistory = await service.history(owner, projectId, randomUUID())
    expect(noHistory).toHaveLength(0)
  })
  test('revogação vale inclusive para replay de operação antiga', async () => {
    const actor = { ...owner, userId: randomUUID() }
    await service.setMember(owner, projectId, {
      operationId: randomUUID(),
      userId: actor.userId,
      permissions: ['read', 'edit'],
    })
    const op = save()
    await service.apply(actor, op)
    await service.setMember(owner, projectId, {
      operationId: randomUUID(),
      userId: actor.userId,
      permissions: [],
    })
    await rejects(() => service.apply(actor, op), { code: 'OBJECT_INACCESSIBLE' })
    await rejects(
      () =>
        service.setMember(owner, projectId, {
          operationId: randomUUID(),
          userId: owner.userId,
          permissions: [],
        }),
      /administrador/,
    )
  })
  test('peça e componentes são atômicos; conflito não grava metade e relações não ficam órfãs', async () => {
    const { createPieceBatch } = await import('@sistemazero/marketing-contracts')
    const input = createPieceBatch({
      projectId,
      title: 'Peça integrada',
      brief: 'Aprender criando',
      format: 'story',
      medium: 'image',
    })
    const first = await service.applyBatch(owner, input)
    if (first.status !== 'applied') throw new Error('Fixture')
    expect(first.items).toHaveLength(3)
    expect(await service.applyBatch(owner, input)).toEqual(first)
    const piece = first.items.find((item) => item.kind === 'piece'),
      component = first.items.find((item) => item.kind === 'component')
    if (!piece || !component) throw new Error('Fixture')
    await service.apply(colleague, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId,
      entityId: component.id,
      baseRevisionId: component.revisionId,
      action: 'save',
      document: { ...component.document, title: 'Mudou em outro computador' },
    })
    const conflicting = await service.applyBatch(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      projectId,
      changes: [piece, component].map((item) => ({
        entityId: item.id,
        baseRevisionId: item.revisionId,
        action: 'save',
        document: { ...item.document, title: 'Tentativa conjunta' },
      })),
    })
    expect(conflicting.status).toBe('conflict')
    expect(
      (await service.snapshot(owner, projectId)).items.find((item) => item.id === piece.id)
        ?.revisionId,
    ).toBe(piece.revisionId)
    await rejects(
      () =>
        service.apply(owner, {
          schemaVersion: 1,
          operationId: randomUUID(),
          projectId,
          entityId: piece.id,
          baseRevisionId: piece.revisionId,
          action: 'archive',
        }),
      { code: 'DEPENDENCY_MISSING' },
    )
    const broken = createPieceBatch({
      projectId,
      title: 'Relação inválida',
      brief: '',
      format: 'carousel',
      medium: 'image',
    })
    const child = broken.changes.find((change) => change.document?.kind === 'component')
    if (child?.document?.kind !== 'component') throw new Error('Fixture')
    child.document.representationId = piece.id
    await rejects(() => service.applyBatch(owner, broken), { code: 'DEPENDENCY_MISSING' })
    expect(
      (await service.snapshot(owner, projectId)).items.some((item) => item.id === child.entityId),
    ).toBe(false)
  })
  test('rotas não aceitam headers de identidade sem prova do gateway', async () => {
    const app = new Elysia().use(
      workspaceRoutes({ workspace: service, internalToken: 'test-internal-workspace-token' }),
    )
    const response = await app.handle(
      new Request('http://localhost/marketing/workspace/projects', {
        headers: {
          'x-auth-user-id': owner.userId,
          'x-auth-user-role': 'staff',
          'x-auth-user-status': 'active',
        },
      }),
    )
    expect(response.status).not.toBe(200)
  })
  test('sync head contains only currently authorized projects and their latest sequences', async () => {
    const reader = { ...owner, userId: randomUUID() },
      id = randomUUID()
    await service.create(owner, {
      schemaVersion: 1,
      operationId: randomUUID(),
      id,
      name: 'Head',
      product: 'Revisão',
    })
    const app = new Elysia().use(
      workspaceRoutes({ workspace: service, internalToken: 'review-head-token' }),
    )
    const request = (internal = true) =>
      app.handle(
        new Request('http://localhost/marketing/workspace/head', {
          headers: {
            ...(internal ? { 'x-internal-token': 'review-head-token' } : {}),
            'x-auth-user-id': reader.userId,
            'x-auth-user-role': 'staff',
            'x-auth-user-status': 'active',
          },
        }),
      )
    expect((await request(false)).status).not.toBe(200)
    expect(workspaceHeadSchema.parse(await (await request()).json()).projects).toEqual([])
    await service.setMember(owner, id, {
      operationId: randomUUID(),
      userId: reader.userId,
      permissions: ['read'],
    })
    await service.apply(owner, save({ projectId: id }))
    const head = workspaceHeadSchema.parse(await (await request()).json())
    expect(head.projects.map((value) => value.id)).toEqual([id])
    expect(head.projects[0]?.permissions).toEqual(['read'])
    expect(head.projects[0]?.sequence).toBe((await service.snapshot(owner, id)).cursor)
    await service.setMember(owner, id, {
      operationId: randomUUID(),
      userId: reader.userId,
      permissions: [],
    })
    expect(workspaceHeadSchema.parse(await (await request()).json()).projects).toEqual([])
  })
  test('schema anterior permanece acessível e seus enums não mudaram', async () => {
    const rows = await connection.db.execute(
      sql`select enumlabel from pg_enum join pg_type on pg_enum.enumtypid=pg_type.oid join pg_namespace on pg_type.typnamespace=pg_namespace.oid where pg_namespace.nspname='marketing' and pg_type.typname='content_type' order by enumsortorder`,
    )
    expect(rows.map((r) => r.enumlabel)).toEqual([
      'reels',
      'video_long',
      'carousel',
      'static_post',
      'story',
    ])
    await connection.db.execute(sql`select id from marketing.contents limit 1`)
  })
})

import { fixtureDirectory } from './helpers/staff-directory'
