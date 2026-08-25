import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleModerationRepository } from '../../src/infrastructure/persistence/drizzle/moderation.repository'
import {
  channels,
  comments,
  spaces,
  threads,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleThreadRepository } from '../../src/infrastructure/persistence/drizzle/thread.repository'

const TEST_DB_NAME = 'sistemazero_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'

function withDatabase(url: string, dbName: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

async function prepareTestDatabase(): Promise<string | null> {
  const override = process.env.TEST_DATABASE_URL
  const baseUrl = override ?? process.env.DATABASE_URL ?? FALLBACK_URL
  const admin = postgres(baseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    if (override) return override
    try {
      await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`)
    } catch (error) {
      if ((error as { code?: string }).code !== '42P04') throw error
    }
    return withDatabase(baseUrl, TEST_DB_NAME)
  } catch {
    return null
  } finally {
    await admin.end({ timeout: 1 }).catch(() => {})
  }
}

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível — teste SQL da moderação PULADO.')
}

describe.skipIf(!testDatabaseUrl)('moderação no Postgres real', () => {
  let conn: DbConnection
  let moderation: DrizzleModerationRepository
  let threadRepo: DrizzleThreadRepository

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string, { max: 5 })
    await migrate(conn.db, {
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
    moderation = new DrizzleModerationRepository(conn.db)
    threadRepo = new DrizzleThreadRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    await conn.sql`truncate table hub.spaces cascade`
  })

  test('migration + SQL cru carregam fila, contexto, snapshots e denúncia com datas reais', async () => {
    const now = new Date('2026-08-15T12:00:00.000Z')
    const spaceId = randomUUID()
    const channelId = randomUUID()
    const threadId = randomUUID()
    const replyId = randomUUID()
    const pendingId = randomUUID()
    const reporterId = randomUUID()
    const reporterAccountId = randomUUID()

    await conn.db.insert(spaces).values({
      id: spaceId,
      slug: `space-${spaceId}`,
      name: 'Clube Kids',
      audience: 'kids',
      accessConfig: { visibility: 'public', courses: [], roles: [] },
      requiresApproval: true,
      createdAt: now,
      updatedAt: now,
    })
    await conn.db.insert(channels).values({
      id: channelId,
      spaceId,
      slug: `channel-${channelId}`,
      name: 'Projetos',
      createdAt: now,
      updatedAt: now,
    })
    await conn.db.insert(threads).values({
      id: threadId,
      channelId,
      authorId: randomUUID(),
      authorAccountId: randomUUID(),
      authorDisplayName: 'Lia',
      title: 'Tópico pai',
      slug: `thread-${threadId}`,
      body: 'Contexto completo do tópico',
      status: 'visible',
      lastActivityAt: now,
      createdAt: now,
    })
    await conn.db.insert(comments).values([
      {
        id: replyId,
        threadId,
        authorId: randomUUID(),
        authorAccountId: randomUUID(),
        authorDisplayName: 'Bia',
        body: 'Comentário respondido',
        status: 'visible',
        createdAt: new Date(now.getTime() + 1_000),
      },
      {
        id: pendingId,
        threadId,
        authorId: randomUUID(),
        authorAccountId: randomUUID(),
        authorDisplayName: 'Nina',
        body: 'Comentário aguardando decisão',
        status: 'pending',
        replyToId: replyId,
        createdAt: new Date(now.getTime() + 2_000),
      },
    ])
    await moderation.createReport({
      targetType: 'comment',
      targetId: pendingId,
      spaceId,
      reporterId,
      reporterAccountId,
      reporterDisplayName: 'Luna',
      reason: 'Precisa de revisão',
      now: new Date(now.getTime() + 3_000),
    })

    const pending = await moderation.listPending({
      spaceId,
      audience: 'kids',
      limit: 20,
      offset: 0,
    })
    expect(pending.total).toBe(1)
    expect(pending.items[0]).toMatchObject({
      id: pendingId,
      authorDisplayName: 'Nina',
      context: {
        spaceName: 'Clube Kids',
        spaceAudience: 'kids',
        channelName: 'Projetos',
        thread: { id: threadId, title: 'Tópico pai' },
        replyTo: { id: replyId, body: 'Comentário respondido' },
      },
    })
    expect(pending.items[0]?.createdAt).toBeInstanceOf(Date)
    expect(pending.items[0]?.context.thread?.createdAt).toBeInstanceOf(Date)
    expect((await moderation.listPending({ audience: 'adult', limit: 20, offset: 0 })).total).toBe(
      0,
    )

    const listedReports = await moderation.listReports({
      spaceId,
      audience: 'kids',
      status: 'open',
      limit: 20,
      offset: 0,
    })
    expect(listedReports.total).toBe(1)
    expect(listedReports.items[0]).toMatchObject({
      reporterId,
      reporterAccountId,
      reporterDisplayName: 'Luna',
      content: {
        id: pendingId,
        status: 'pending',
        context: { thread: { id: threadId }, replyTo: { id: replyId } },
      },
    })
    expect(listedReports.items[0]?.content?.createdAt).toBeInstanceOf(Date)
    expect(listedReports.items[0]?.spaceAudience).toBe('kids')

    await conn.db.delete(comments).where(eq(comments.id, pendingId))
    const orphaned = await moderation.listReports({
      audience: 'kids',
      status: 'open',
      limit: 20,
      offset: 0,
    })
    expect(orphaned.items[0]).toMatchObject({ spaceAudience: 'kids', content: null })
    expect(
      (
        await moderation.listReports({
          audience: 'adult',
          status: 'open',
          limit: 20,
          offset: 0,
        })
      ).total,
    ).toBe(0)
  })

  test('UPDATE condicional impede transição terminal concorrente no adapter Drizzle', async () => {
    const now = new Date('2026-08-15T12:00:00.000Z')
    const spaceId = randomUUID()
    const channelId = randomUUID()
    const threadId = randomUUID()
    await conn.db.insert(spaces).values({
      id: spaceId,
      slug: `space-${spaceId}`,
      name: 'Adulto',
      accessConfig: { visibility: 'public', courses: [], roles: [] },
      createdAt: now,
      updatedAt: now,
    })
    await conn.db.insert(channels).values({
      id: channelId,
      spaceId,
      slug: `channel-${channelId}`,
      name: 'Geral',
      createdAt: now,
      updatedAt: now,
    })
    await conn.db.insert(threads).values({
      id: threadId,
      channelId,
      authorId: randomUUID(),
      title: 'Terminal',
      slug: `thread-${threadId}`,
      body: 'corpo',
      status: 'deleted',
      lastActivityAt: now,
      createdAt: now,
    })

    expect(await threadRepo.setThreadStatus(threadId, 'hidden', ['visible'], now)).toBe(
      'invalid_state',
    )
    expect((await threadRepo.findThreadById(threadId))?.status).toBe('deleted')
  })

  test('activityByAuthors agrega Clube × Mural em LOTE com Date real e números (sum não vaza string)', async () => {
    const now = new Date('2026-08-15T12:00:00.000Z')
    const at = (ms: number) => new Date(now.getTime() + ms)
    const spaceId = randomUUID()
    const channelId = randomUUID()
    const kidA = randomUUID()
    const kidB = randomUUID()
    await conn.db.insert(spaces).values({
      id: spaceId,
      slug: `space-${spaceId}`,
      name: 'Clube Kids',
      audience: 'kids',
      accessConfig: { visibility: 'public', courses: [], roles: [] },
      createdAt: now,
      updatedAt: now,
    })
    await conn.db.insert(channels).values({
      id: channelId,
      spaceId,
      slug: `channel-${channelId}`,
      name: 'Geral',
      createdAt: now,
      updatedAt: now,
    })
    const clubThreadId = randomUUID()
    const showcaseId = randomUUID()
    await conn.db.insert(threads).values([
      // Clube: 1 visível (conta) + 1 pendente (fora — participação APROVADA).
      {
        id: clubThreadId,
        channelId,
        authorId: kidA,
        title: 'Clube visível',
        slug: `t-${clubThreadId}`,
        body: 'corpo',
        status: 'visible',
        lastActivityAt: now,
        createdAt: now,
      },
      {
        id: randomUUID(),
        channelId,
        authorId: kidA,
        title: 'Clube pendente',
        slug: `t-${randomUUID()}`,
        body: 'corpo',
        status: 'pending',
        lastActivityAt: at(1_000),
        createdAt: at(1_000),
      },
      // Mural: 1 vitrine visível com plays (conta) + 1 oculta (fora).
      {
        id: showcaseId,
        channelId,
        authorId: kidA,
        title: 'Vitrine',
        slug: `t-${showcaseId}`,
        body: 'corpo',
        status: 'visible',
        isShowcase: true,
        playsCount: 7,
        lastActivityAt: at(3_000),
        createdAt: at(3_000),
      },
      {
        id: randomUUID(),
        channelId,
        authorId: kidA,
        title: 'Vitrine oculta',
        slug: `t-${randomUUID()}`,
        body: 'corpo',
        status: 'hidden',
        isShowcase: true,
        playsCount: 100,
        lastActivityAt: at(4_000),
        createdAt: at(4_000),
      },
    ])
    await conn.db.insert(comments).values([
      // Conta (visible, pai não-vitrine) — e é o item do Clube mais NOVO.
      {
        id: randomUUID(),
        threadId: clubThreadId,
        authorId: kidA,
        body: 'no clube',
        status: 'visible',
        createdAt: at(2_000),
      },
      // Fora: pendente no clube.
      {
        id: randomUUID(),
        threadId: clubThreadId,
        authorId: kidA,
        body: 'pendente',
        status: 'pending',
        createdAt: at(5_000),
      },
      // Fora do Clube: comentário em post de VITRINE (pai isShowcase).
      {
        id: randomUUID(),
        threadId: showcaseId,
        authorId: kidA,
        body: 'na vitrine',
        status: 'visible',
        createdAt: at(6_000),
      },
    ])

    const res = await threadRepo.activityByAuthors([kidA, kidB])
    expect(res.length).toBe(2)
    const a = res[0]
    expect(a).toMatchObject({
      authorId: kidA,
      clubThreads: 1,
      clubComments: 1,
      showcasePublished: 1,
      showcasePlays: 7,
    })
    // Gotcha postgres.js: sum/count viriam STRING sem o ::int — pinamos o tipo.
    expect(typeof a?.showcasePlays).toBe('number')
    expect(typeof a?.clubThreads).toBe('number')
    // max(created_at) mapeia p/ Date REAL (não string) via o builder tipado.
    expect(a?.lastClubActivityAt).toBeInstanceOf(Date)
    expect(a?.lastClubActivityAt?.toISOString()).toBe(at(2_000).toISOString())
    expect(a?.lastShowcaseAt).toBeInstanceOf(Date)
    expect(a?.lastShowcaseAt?.toISOString()).toBe(at(3_000).toISOString())
    // Régua do lote: autor sem atividade volta com zeros/nulls, na ordem pedida.
    expect(res[1]).toEqual({
      authorId: kidB,
      clubThreads: 0,
      clubComments: 0,
      lastClubActivityAt: null,
      showcasePublished: 0,
      showcasePlays: 0,
      lastShowcaseAt: null,
    })
  })
})
