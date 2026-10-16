import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDbConnection, type DbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzlePublicationAssetRepository } from '../src/infrastructure/persistence/drizzle/publication-asset.repository'
import {
  contents,
  mediaAssets,
  publications,
} from '../src/infrastructure/persistence/drizzle/schema'
import { requireReviewDatabase } from './helpers/review-database'

const url = process.env.MARKETING_TEST_DATABASE_URL
const suite = url ? describe : describe.skip
suite('mídia de publicação PostgreSQL: concorrência e checkpoints', () => {
  let connection: DbConnection, repo: DrizzlePublicationAssetRepository
  beforeAll(async () => {
    requireReviewDatabase(url)
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'marketing_migrations',
    })
    repo = new DrizzlePublicationAssetRepository(connection.db)
  })
  afterAll(async () => connection?.close())
  async function fixture() {
    const contentId = randomUUID(),
      id = randomUUID(),
      userId = randomUUID(),
      now = new Date(),
      assetIds = [randomUUID(), randomUUID()]
    await connection.db.insert(contents).values({
      id: contentId,
      title: 'Revisão de carrossel',
      contentType: 'carousel',
      stage: 'approved',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    await connection.db.insert(mediaAssets).values(
      assetIds.map((id) => ({
        id,
        contentId,
        kind: 'final' as const,
        status: 'ready' as const,
        filename: `${id}.png`,
        contentType: 'image/png',
        sizeBytes: 1024,
        r2Key: `review/${id}`,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })),
    )
    await connection.db.insert(publications).values({
      id,
      contentId,
      network: 'instagram',
      format: 'ig_carousel',
      createdAt: now,
      updatedAt: now,
    })
    return { id, assetIds, now }
  }
  test('apenas uma edição confirma a mesma versão; arquivo inválido ou em arquivo não muda a lista', async () => {
    const f = await fixture()
    const results = await Promise.all([
      repo.replaceForPublication(f.id, f.assetIds, 0, f.now),
      repo.replaceForPublication(f.id, [...f.assetIds].reverse(), 0, f.now),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
    const winner = results.findIndex(Boolean),
      expected = winner === 0 ? f.assetIds : [...f.assetIds].reverse()
    expect(await repo.listByPublication(f.id)).toEqual(expected)
    expect(results[winner]?.version).toBe(1)
    expect(await repo.replaceForPublication(f.id, [randomUUID()], 1, f.now)).toBeNull()
    await connection.db
      .update(mediaAssets)
      .set({ status: 'archiving' })
      .where(eq(mediaAssets.id, f.assetIds[0]!))
    expect(await repo.replaceForPublication(f.id, [...f.assetIds].reverse(), 1, f.now)).toBeNull()
    expect(await repo.listByPublication(f.id)).toEqual(expected)
    expect(
      (await connection.db.select().from(publications).where(eq(publications.id, f.id)))[0]
        ?.version,
    ).toBe(1)
  })
  test('checkpoint e claim do publicador bloqueiam troca, mesmo com versão atual', async () => {
    const f = await fixture()
    await repo.replaceForPublication(f.id, f.assetIds, 0, f.now)
    await connection.db
      .update(publications)
      .set({ version: 2, status: 'failed', providerSession: { childContainerIds: ['já-enviado'] } })
      .where(eq(publications.id, f.id))
    expect(await repo.replaceForPublication(f.id, [...f.assetIds].reverse(), 2, f.now)).toBeNull()
    await connection.db
      .update(publications)
      .set({ version: 3, status: 'publishing', providerSession: {} })
      .where(eq(publications.id, f.id))
    expect(await repo.replaceForPublication(f.id, [...f.assetIds].reverse(), 3, f.now)).toBeNull()
    expect(await repo.listByPublication(f.id)).toEqual(f.assetIds)
  })
})
