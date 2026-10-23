import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createServer as createNetServer } from 'node:net'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { createApplication } from '../../src/composition-root'
import type { CreateShowcaseThreadInput } from '../../src/domain/ports/thread-repository.port'
import { loadEnv } from '../../src/infrastructure/config/env'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { channels, spaces, threads } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleThreadRepository } from '../../src/infrastructure/persistence/drizzle/thread.repository'

const databaseUrl = process.env.TEST_DATABASE_URL
const available = databaseUrl
  ? await (async () => {
      const client = postgres(databaseUrl, { max: 1, connect_timeout: 2 })
      try {
        await client`select 1`
        return true
      } catch {
        return false
      } finally {
        await client.end({ timeout: 1 }).catch(() => {})
      }
    })()
  : false
if (!available)
  console.warn('[tests/db] TEST_DATABASE_URL indisponível — prova SQL Python/Mural pulada.')

describe.skipIf(!available)('public Python game visibility in real Hub PostgreSQL', () => {
  let connection: DbConnection
  let repository: DrizzleThreadRepository
  const ownedSpaces: string[] = []

  beforeAll(async () => {
    connection = createDbConnection(databaseUrl as string, { max: 3 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '..',
        '..',
        'src',
        'infrastructure',
        'persistence',
        'drizzle',
        'migrations',
      ),
      migrationsTable: 'hub_migrations',
      migrationsSchema: 'drizzle',
    })
    repository = new DrizzleThreadRepository(connection.db)
  })

  afterAll(async () => {
    if (!connection) return
    try {
      for (const spaceId of ownedSpaces)
        await connection.db.delete(spaces).where(eq(spaces.id, spaceId))
    } finally {
      await connection.close()
    }
  })

  async function wall(audience: 'kids' | 'adult') {
    const now = new Date('2026-10-19T12:00:00Z')
    const spaceId = randomUUID()
    const channelId = randomUUID()
    ownedSpaces.push(spaceId)
    await connection.db.insert(spaces).values({
      id: spaceId,
      slug: `python-play-${spaceId}`,
      name: 'Mural Python',
      audience,
      accessConfig: { visibility: 'public', courses: [], roles: [] },
      createdAt: now,
      updatedAt: now,
    })
    await connection.db.insert(channels).values({
      id: channelId,
      spaceId,
      slug: 'parede',
      name: 'Parede',
      createdAt: now,
      updatedAt: now,
    })
    return { channelId, now }
  }

  function publication(channelId: string, now: Date): CreateShowcaseThreadInput {
    const playId = randomUUID()
    return {
      id: randomUUID(),
      channelId,
      authorId: randomUUID(),
      authorAccountId: randomUUID(),
      authorDisplayName: 'Lia',
      authorPublic: false,
      title: 'Desenho Turtle',
      slug: randomUUID(),
      body: 'Meu jogo',
      coverImageUrl: `https://art.test/studio/cover/${playId}.webp`,
      playId,
      idempotencyKey: randomUUID(),
      studioMeta: {
        pro: false,
        extensions: ['python-turtle'],
        programmingLanguage: 'python',
        runtime: {
          profileId: 'python-browser',
          releaseId: 'python-1',
          manifestSha256: 'a'.repeat(64),
        },
      },
      now,
    }
  }

  async function availablePort(): Promise<number> {
    const server = createNetServer()
    return new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          server.close()
          reject(new Error('Porta HTTP de teste indisponível.'))
          return
        }
        server.close((error) => (error ? reject(error) : resolve(address.port)))
      })
    })
  }

  test('published Python survives SQL, plays only in its audience, and moderation revokes play without changing the edit version', async () => {
    const kids = await wall('kids')
    const adult = await wall('adult')
    const kid = publication(kids.channelId, kids.now)
    const grownup = publication(adult.channelId, adult.now)
    const first = await repository.createShowcaseThread(kid)
    expect(first.deduped).toBe(false)
    expect((await repository.createShowcaseThread({ ...kid, id: randomUUID() })).deduped).toBe(true)
    await repository.createShowcaseThread(grownup)

    const [stored] = await connection.db
      .select()
      .from(threads)
      .where(eq(threads.id, first.thread.id))
    expect(stored?.studioMeta).toEqual(kid.studioMeta)
    expect(await repository.hasVisibleShowcasePlayId(kid.playId!, false, 'adult')).toMatchObject({
      visible: false,
    })
    expect(await repository.showcaseCoverReference(kid.playId!, 'adult')).toEqual({
      status: 'absent',
      coverImageUrl: null,
    })
    expect(await repository.showcaseCoverReference(kid.playId!, 'kids')).toEqual({
      status: 'visible',
      coverImageUrl: kid.coverImageUrl,
    })
    expect(await repository.hasVisibleShowcasePlayId(grownup.playId!, false, 'kids')).toMatchObject(
      {
        visible: false,
      },
    )
    expect(await repository.hasVisibleShowcasePlayId(kid.playId!, false, 'kids')).toMatchObject({
      visible: true,
      playsCount: 0,
      authorDisplayName: 'Lia',
    })
    expect(await repository.hasVisibleShowcasePlayId(kid.playId!, true, 'kids')).toMatchObject({
      visible: true,
      playsCount: 1,
    })
    const [afterPlay] = await connection.db.select().from(threads).where(eq(threads.id, kid.id))
    expect(afterPlay?.version).toBe(0)
    await connection.db.update(threads).set({ status: 'hidden' }).where(eq(threads.id, kid.id))
    expect(await repository.hasVisibleShowcasePlayId(kid.playId!, true, 'kids')).toMatchObject({
      visible: false,
    })
    expect(await repository.showcaseCoverReference(kid.playId!, 'kids')).toEqual({
      status: 'hidden',
      coverImageUrl: kid.coverImageUrl,
    })
    const [afterModeration] = await connection.db
      .select()
      .from(threads)
      .where(eq(threads.id, kid.id))
    expect(afterModeration?.playsCount).toBe(1)
    expect(
      await repository.hasVisibleShowcasePlayId(grownup.playId!, false, 'adult'),
    ).toMatchObject({
      visible: true,
    })
  })

  test('real Hub HTTP resolves the Python game with audience and internal-token boundaries', async () => {
    const kids = await wall('kids')
    const adult = await wall('adult')
    const kid = publication(kids.channelId, kids.now)
    const grownup = publication(adult.channelId, adult.now)
    await repository.createShowcaseThread(kid)
    await repository.createShowcaseThread(grownup)

    const port = await availablePort()
    const token = `python-play-${randomUUID()}`
    const app = await createApplication(
      loadEnv({
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: String(port),
        DATABASE_URL: databaseUrl,
        DATABASE_POOL_MAX: '3',
        GATEWAY_HMAC_SECRET: `python-play-secret-${randomUUID()}`,
        INTERNAL_API_TOKEN: token,
      }),
    )
    const resolvePlay = async (playId: string, audience: 'kids' | 'adult', auth = true) => {
      const response = await fetch(
        `http://127.0.0.1:${port}/hub/internal/studio-play/${playId}?audience=${audience}`,
        { headers: auth ? { 'x-internal-token': token } : {} },
      )
      return { status: response.status, body: await response.json() }
    }
    const resolveCover = async (playId: string, audience: 'kids' | 'adult', auth = true) => {
      const response = await fetch(
        `http://127.0.0.1:${port}/hub/internal/studio-cover/${playId}?audience=${audience}`,
        { headers: auth ? { 'x-internal-token': token } : {} },
      )
      return { status: response.status, body: await response.json() }
    }
    let started = false
    try {
      await app.start()
      started = true
      expect((await resolvePlay(kid.playId!, 'kids')).body).toMatchObject({
        visible: true,
        authorDisplayName: 'Lia',
      })
      expect((await resolvePlay(kid.playId!, 'adult')).body).toMatchObject({ visible: false })
      expect((await resolvePlay(grownup.playId!, 'adult')).body).toMatchObject({
        visible: true,
        audience: 'adult',
      })
      expect((await resolvePlay(kid.playId!, 'kids', false)).status).toBe(401)
      expect((await resolveCover(kid.playId!, 'kids', false)).status).toBe(401)
      expect((await resolveCover(kid.playId!, 'adult')).body).toEqual({
        status: 'absent',
        coverImageUrl: null,
      })
      await connection.db.update(threads).set({ status: 'hidden' }).where(eq(threads.id, kid.id))
      expect((await resolvePlay(kid.playId!, 'kids')).body).toMatchObject({ visible: false })
      expect((await resolveCover(kid.playId!, 'kids')).body).toEqual({
        status: 'hidden',
        coverImageUrl: kid.coverImageUrl,
      })
    } finally {
      if (started) await app.stop()
    }
  })
})
