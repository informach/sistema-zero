import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createPieceBatch, type EditorialDocument } from '@sistemazero/marketing-contracts'
import { and, eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { validateEditorialGraph } from '../src/domain/workspace/editorial-graph'
import { references } from '../src/domain/workspace/references'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { readEditorialGraph } from '../src/infrastructure/persistence/drizzle/editorial-graph-query'
import { editorialItemReferences } from '../src/infrastructure/persistence/drizzle/editorial-reference-expression'
import {
  editorialItems as items,
  editorialProjects as projects,
} from '../src/infrastructure/persistence/drizzle/workspace-schema'
import { requireReviewDatabase } from './helpers/review-database'

const url = process.env.MARKETING_TEST_DATABASE_URL
;(url ? describe : describe.skip)('indexed editorial graph PostgreSQL', () => {
  let connection: DbConnection
  beforeAll(async () => {
    requireReviewDatabase(url)
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
  })
  afterAll(async () => connection?.close())
  test('indexed edges equal domain references and the neighborhood preserves forward/reverse validation for every kind', async () => {
    const projectId = randomUUID(),
      otherProject = randomUUID(),
      userId = randomUUID(),
      evidenceId = randomUUID()
    await connection.db.insert(projects).values(
      [projectId, otherProject].map((id) => ({
        id,
        name: 'Grafo de revisão',
        product: 'Review',
        createdBy: userId,
      })),
    )
    const batch = createPieceBatch({
      projectId,
      title: 'Peça',
      brief: '',
      format: 'carousel',
      medium: 'image',
    })
    const videoBatch = createPieceBatch({
      projectId,
      title: 'Vídeo',
      brief: '',
      format: 'reel',
      medium: 'video',
    })
    const pieceId = batch.changes[0]?.entityId
    if (!pieceId) throw new Error('Peça ausente')
    const evidence: EditorialDocument = {
      schemaVersion: 1,
      kind: 'evidence',
      title: 'Fonte',
      body: '',
      classification: 'reference',
      source: { label: 'review' },
      product: 'Review',
      validity: 'unverified',
      tags: [],
    }
    const documents = [
      { id: evidenceId, document: evidence },
      ...[...batch.changes, ...videoBatch.changes].map((change) => {
        if (!change.document) throw new Error('Documento ausente')
        return {
          id: change.entityId,
          document:
            change.document.kind === 'piece'
              ? { ...change.document, evidenceIds: [evidenceId] }
              : change.document,
        }
      }),
      {
        id: randomUUID(),
        document: {
          schemaVersion: 1,
          kind: 'direction',
          title: 'Direção',
          body: '',
          objective: '',
          audience: '',
          voice: '',
          protectedTerms: [],
          referenceIds: [evidenceId],
        } as EditorialDocument,
      },
      {
        id: randomUUID(),
        document: {
          schemaVersion: 1,
          kind: 'analysis',
          title: 'Análise',
          body: '',
          objective: '',
          evidenceIds: [evidenceId],
          hypothesis: '',
          proposedPieceId: pieceId,
        } as EditorialDocument,
      },
      {
        id: randomUUID(),
        document: {
          schemaVersion: 1,
          kind: 'analysis',
          title: 'Sem pauta',
          body: '',
          objective: '',
          evidenceIds: [],
          hypothesis: '',
          proposedPieceId: null,
        } as EditorialDocument,
      },
      {
        id: randomUUID(),
        document: {
          schemaVersion: 1,
          kind: 'watchlist',
          title: 'Acompanhar',
          body: '',
          subjectType: 'topic',
          url: null,
          source: { label: 'review' },
          objective: '',
          enabled: true,
          evidenceIds: [evidenceId],
        } as EditorialDocument,
      },
      {
        id: randomUUID(),
        document: {
          schemaVersion: 1,
          kind: 'comment',
          title: 'Comentário',
          body: 'Texto',
          revisionId: randomUUID(),
        } as EditorialDocument,
      },
      ...Array.from({ length: 200 }, () => ({ id: randomUUID(), document: evidence })),
    ]
    const outsideId = randomUUID()
    await connection.db.insert(items).values([
      ...documents.map((node) => ({
        ...node,
        projectId,
        kind: node.document.kind,
        revisionId: randomUUID(),
      })),
      {
        id: outsideId,
        projectId: otherProject,
        kind: 'evidence',
        revisionId: randomUUID(),
        document: evidence,
      },
    ])
    await connection.db.transaction(async (tx) => {
      const full = () =>
        tx
          .select({ id: items.id, document: items.document, archived: items.archived })
          .from(items)
          .where(eq(items.projectId, projectId))
      const edges = await tx
        .select({ id: items.id, refs: sql<unknown[]>`${editorialItemReferences(items.document)}` })
        .from(items)
        .where(eq(items.projectId, projectId))
      for (const node of documents)
        expect(
          new Set(
            edges
              .find((edge) => edge.id === node.id)
              ?.refs.filter((value) => typeof value === 'string'),
          ),
        ).toEqual(new Set(references(node.document).items))
      const verdict = (nodes: Awaited<ReturnType<typeof full>>, changed: Set<string>) => {
        try {
          validateEditorialGraph(nodes, changed)
          return 'valid'
        } catch (error) {
          return error instanceof Error ? error.message : 'error'
        }
      }
      for (const node of documents.slice(0, 12)) {
        for (const archived of [false, true]) {
          await tx
            .update(items)
            .set({ archived })
            .where(and(eq(items.projectId, projectId), eq(items.id, node.id)))
          const changed = new Set([node.id]),
            all = await full(),
            neighborhood = await readEditorialGraph(tx, projectId, changed)
          expect(neighborhood.length).toBeLessThan(20)
          expect(verdict(neighborhood, changed)).toBe(verdict(all, changed))
        }
        await tx.update(items).set({ archived: false }).where(eq(items.id, node.id))
      }
      const original = documents.find((node) => node.id === pieceId)?.document
      if (original?.kind !== 'piece') throw new Error('Peça ausente')
      await tx
        .update(items)
        .set({ document: { ...original, evidenceIds: [outsideId] } })
        .where(eq(items.id, pieceId))
      const changed = new Set([outsideId]),
        neighbors = await readEditorialGraph(tx, projectId, changed)
      expect(neighbors.some((node) => node.id === outsideId)).toBe(false)
      expect(verdict(neighbors, changed)).toBe(verdict(await full(), changed))
      expect(verdict(neighbors, changed)).not.toBe('valid')
    })
  })
})
