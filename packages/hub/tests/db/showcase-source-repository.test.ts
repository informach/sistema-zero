import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { channels, spaces } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleThreadRepository } from '../../src/infrastructure/persistence/drizzle/thread.repository'

const databaseUrl = process.env.TEST_DATABASE_URL
describe.skipIf(!databaseUrl)('identidade do projeto no Mural (PostgreSQL)', () => {
  let connection: DbConnection
  const ownedSpaces: string[] = []
  const now = new Date('2026-06-15T12:00:00Z')
  const later = new Date('2026-07-01T12:00:00Z')

  beforeAll(async () => {
    const url = new URL(databaseUrl!)
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
      throw new Error('Use a dedicated loopback test database')
    connection = createDbConnection(databaseUrl!, { max: 4 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'hub_migrations',
      migrationsSchema: 'drizzle',
    })
  })
  afterEach(async () => {
    for (const id of ownedSpaces.splice(0))
      await connection.db.delete(spaces).where(eq(spaces.id, id))
  })
  afterAll(async () => {
    await connection?.close()
  })

  async function wall() {
    const spaceId = randomUUID(),
      channelId = randomUUID()
    ownedSpaces.push(spaceId)
    await connection.db.insert(spaces).values({
      id: spaceId,
      slug: spaceId,
      name: 'Mural QA',
      audience: 'kids',
      accessConfig: { visibility: 'public', courses: [], roles: [] },
      createdAt: now,
      updatedAt: now,
    })
    await connection.db.insert(channels).values({
      id: channelId,
      spaceId,
      slug: channelId,
      name: 'Parede',
      createdAt: now,
      updatedAt: now,
    })
    return { channelId, repo: new DrizzleThreadRepository(connection.db) }
  }
  const post = (channelId: string, authorId: string, sourceKey: string | null) => {
    const id = randomUUID()
    return {
      id,
      channelId,
      authorId,
      authorDisplayName: 'QA',
      authorPublic: false,
      title: 'Jogo',
      slug: id,
      body: 'Jogo',
      playId: randomUUID(),
      coverImageUrl: 'https://art.test/studio/cover/a.webp',
      challengeKey: 'm:2026-06',
      idempotencyKey: id,
      showcaseSourceKey: sourceKey,
      now,
    }
  }

  test('o post novo assume a chave; update mantém data, ordem e desafio; apagar solta a chave', async () => {
    const { channelId, repo } = await wall()
    const author = randomUUID(),
      key = randomUUID().replaceAll('-', '')
    const first = (await repo.createShowcaseThread(post(channelId, author, key))).thread
    expect((await repo.findShowcaseBySourceKey(key))?.id).toBe(first.id)
    const second = (await repo.createShowcaseThread(post(channelId, author, key))).thread
    expect((await repo.findShowcaseBySourceKey(key))?.id).toBe(second.id)

    const updated = await repo.updateShowcaseThread({
      authorId: author,
      sourceKey: key,
      playId: second.playId!,
      body: 'Versão 2',
      coverImageUrl: 'https://art.test/studio/cover/b.webp',
      studioMeta: null,
      now: later,
    })
    expect(updated?.previousCoverUrl).toBe('https://art.test/studio/cover/a.webp')
    expect(updated?.thread).toMatchObject({
      id: second.id,
      body: 'Versão 2',
      challengeKey: 'm:2026-06',
      createdAt: now,
      lastActivityAt: now,
      gameUpdatedAt: later,
    })
    expect(
      await repo.updateShowcaseThread({
        authorId: randomUUID(),
        sourceKey: key,
        playId: second.playId!,
        body: 'x',
        studioMeta: null,
        now: later,
      }),
    ).toBeNull()

    await repo.setThreadStatus(second.id, 'deleted', ['visible'], later)
    expect(await repo.findShowcaseBySourceKey(key)).toBeNull()
    expect(await repo.touchShowcaseGame(author, second.playId!, later)).toBe(false)
  })

  test('adoção só vale para post do próprio autor e sem outro vínculo', async () => {
    const { channelId, repo } = await wall()
    const author = randomUUID(),
      key = randomUUID().replaceAll('-', '')
    const legacy = (await repo.createShowcaseThread(post(channelId, author, null))).thread
    expect(await repo.adoptShowcaseSource(randomUUID(), legacy.playId!, key)).toBeNull()
    expect((await repo.adoptShowcaseSource(author, legacy.playId!, key))?.id).toBe(legacy.id)
    const other = (await repo.createShowcaseThread(post(channelId, author, null))).thread
    // A chave já é de outro post: o índice único não deixa dois posts representarem o projeto.
    expect((await repo.adoptShowcaseSource(author, other.playId!, key))?.id).toBe(legacy.id)
    expect(await repo.touchShowcaseGame(author, legacy.playId!, later)).toBe(true)
  })
})
