import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { EditorialDocument, EditorialOperation } from '@sistemazero/marketing-contracts'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Elysia } from 'elysia'
import type { Actor } from '../src/application/actor'
import { WorkspaceService } from '../src/application/workspace/workspace.service'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleWorkspaceRepository } from '../src/infrastructure/persistence/drizzle/workspace.repository'
import { workspaceRoutes } from '../src/interfaces/http/routes/workspace.routes'

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
    if (
      !url ||
      !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) ||
      new URL(url).pathname !== '/marketing_review'
    )
      throw new Error('Use o banco local exclusivo marketing_review')
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
    service = new WorkspaceService(new DrizzleWorkspaceRepository(connection.db),fixtureDirectory)
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
  test('peça e componentes são atômicos; conflito não grava metade e relações não ficam órfãs',async()=>{
    const {createPieceBatch}=await import('@sistemazero/marketing-contracts')
    const input=createPieceBatch({projectId,title:'Peça integrada',brief:'Aprender criando',format:'story',medium:'image'})
    const first=await service.applyBatch(owner,input)
    if(first.status!=='applied')throw new Error('Fixture')
    expect(first.items).toHaveLength(3)
    expect(await service.applyBatch(owner,input)).toEqual(first)
    const piece=first.items.find(item=>item.kind==='piece'),component=first.items.find(item=>item.kind==='component')
    if(!piece||!component)throw new Error('Fixture')
    await service.apply(colleague,{schemaVersion:1,operationId:randomUUID(),projectId,entityId:component.id,baseRevisionId:component.revisionId,action:'save',document:{...component.document,title:'Mudou em outro computador'}})
    const conflicting=await service.applyBatch(owner,{schemaVersion:1,operationId:randomUUID(),projectId,changes:[piece,component].map(item=>({entityId:item.id,baseRevisionId:item.revisionId,action:'save',document:{...item.document,title:'Tentativa conjunta'}}))})
    expect(conflicting.status).toBe('conflict')
    expect((await service.snapshot(owner,projectId)).items.find(item=>item.id===piece.id)?.revisionId).toBe(piece.revisionId)
    await rejects(()=>service.apply(owner,{schemaVersion:1,operationId:randomUUID(),projectId,entityId:piece.id,baseRevisionId:piece.revisionId,action:'archive'}),{code:'DEPENDENCY_MISSING'})
    const broken=createPieceBatch({projectId,title:'Relação inválida',brief:'',format:'carousel',medium:'image'})
    const child=broken.changes.find(change=>change.document?.kind==='component')
    if(child?.document?.kind!=='component')throw new Error('Fixture')
    child.document.representationId=piece.id
    await rejects(()=>service.applyBatch(owner,broken),{code:'DEPENDENCY_MISSING'})
    expect((await service.snapshot(owner,projectId)).items.some(item=>item.id===child.entityId)).toBe(false)
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
import {fixtureDirectory} from './helpers/staff-directory'
