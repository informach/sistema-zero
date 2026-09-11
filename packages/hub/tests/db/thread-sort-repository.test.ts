import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import type { CursorPos } from '../../src/application/cursor'
import type { ThreadSort } from '../../src/domain/ports/thread-repository.port'
import type { Thread } from '../../src/domain/thread/thread'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import {
  channels,
  comments,
  spaces,
  threads,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleThreadRepository } from '../../src/infrastructure/persistence/drizzle/thread.repository'

/**
 * As três ordens da listagem (filtros do Mural) no SQL de VERDADE: a comparação de
 * linha com três colunas e os casts do cursor só se provam num Postgres. O arquivo de
 * integração cobre o mesmo contrato sobre os fakes; este cobre o que o fake não tem.
 */
const TEST_DB_NAME = 'sistemazero_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'

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
    const parsed = new URL(baseUrl)
    parsed.pathname = `/${TEST_DB_NAME}`
    return parsed.toString()
  } catch {
    return null
  } finally {
    await admin.end({ timeout: 1 }).catch(() => {})
  }
}

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível — teste SQL das ordens do Mural PULADO.')
}

function cursorFor(t: Thread, sort: ThreadSort): CursorPos {
  if (sort === 'recent') return { t: t.createdAt, id: t.id, s: 'recent' }
  if (sort === 'plays') return { t: t.createdAt, id: t.id, s: 'plays', n: t.playsCount }
  return { t: t.lastActivityAt, id: t.id }
}

describe.skipIf(!testDatabaseUrl)('ordens da listagem no Postgres real', () => {
  let conn: DbConnection
  let repo: DrizzleThreadRepository
  let channelId: string
  let spaceId: string
  const titleById = new Map<string, string>()

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string, { max: 3 })
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
    repo = new DrizzleThreadRepository(conn.db)

    const now = new Date('2026-09-01T12:00:00Z')
    spaceId = randomUUID()
    channelId = randomUUID()
    await conn.db.insert(spaces).values({
      id: spaceId,
      slug: `ordem-${spaceId}`,
      name: 'Mural',
      audience: 'kids',
      accessConfig: { visibility: 'public', courses: [], roles: [] },
      createdAt: now,
      updatedAt: now,
    })
    await conn.db.insert(channels).values({
      id: channelId,
      spaceId,
      slug: `parede-${channelId}`,
      name: 'Parede',
      createdAt: now,
      updatedAt: now,
    })
    // A (mais antigo) … E (mais novo); jogadas e atividade embaralhadas. A e C empatam
    // em jogadas E em minuto de publicação: só o `id` desempata, que é o caso difícil.
    const minuto = (m: number) => new Date(now.getTime() + m * 60_000)
    const linhas = [
      { t: 'A', created: 1, plays: 7, activity: 30, pinned: false },
      { t: 'B', created: 2, plays: 3, activity: 10, pinned: false },
      { t: 'C', created: 1, plays: 7, activity: 50, pinned: true },
      { t: 'D', created: 4, plays: 0, activity: 40, pinned: false },
      { t: 'E', created: 5, plays: 9, activity: 20, pinned: false },
    ]
    for (const l of linhas) {
      const id = randomUUID()
      titleById.set(id, l.t)
      await conn.db.insert(threads).values({
        id,
        channelId,
        authorId: randomUUID(),
        title: l.t,
        slug: `${l.t}-${id}`,
        body: `Jogo ${l.t}`,
        isShowcase: true,
        isPinned: l.pinned,
        playsCount: l.plays,
        createdAt: minuto(l.created),
        lastActivityAt: minuto(100 + l.activity),
      })
    }
  })

  afterAll(async () => {
    if (conn) {
      await conn.db
        .delete(spaces)
        .where(eq(spaces.id, spaceId))
        .catch(() => {})
      await conn.close()
    }
  })

  async function tudo(sort: ThreadSort): Promise<string[]> {
    const vistos: string[] = []
    let cursor: CursorPos | null = null
    for (let i = 0; i < 10; i++) {
      const { items, hasMore } = await repo.listThreads(channelId, {
        viewerId: randomUUID(),
        includeAllPending: false,
        cursor,
        limit: 2,
        sort,
      })
      vistos.push(...items.map((t) => titleById.get(t.id) ?? '?'))
      const ultimo = items[items.length - 1]
      if (!hasMore || !ultimo) break
      cursor = cursorFor(ultimo, sort)
    }
    return vistos
  }

  test('"Novidades" percorre tudo sem pular nem repetir, desempatando pelo id', async () => {
    const vistos = await tudo('recent')
    expect(vistos.slice(0, 3)).toEqual(['E', 'D', 'B'])
    expect(new Set(vistos.slice(3))).toEqual(new Set(['A', 'C']))
    expect(vistos).toHaveLength(5)
  })

  test('"Mais jogados" percorre tudo sem pular nem repetir, com o empate triplo resolvido', async () => {
    const vistos = await tudo('plays')
    expect(vistos[0]).toBe('E')
    expect(new Set(vistos.slice(1, 3))).toEqual(new Set(['A', 'C']))
    expect(vistos.slice(3)).toEqual(['B', 'D'])
    expect(vistos).toHaveLength(5)
  })

  test('"Todos os jogos" segue fixados primeiro e depois atividade', async () => {
    expect(await tudo('activity')).toEqual(['C', 'D', 'A', 'E', 'B'])
  })

  test('a 2ª página de RESPOSTAS também anda pelo cursor (o mesmo defeito do Date cru)', async () => {
    const [primeiro] = [...titleById.keys()]
    if (!primeiro) throw new Error('sem tópico')
    const base = Date.parse('2026-09-03T12:00:00Z')
    for (const m of [1, 2, 3]) {
      await conn.db.insert(comments).values({
        id: randomUUID(),
        threadId: primeiro,
        authorId: randomUUID(),
        body: `Resposta ${m}`,
        createdAt: new Date(base + m * 60_000),
      })
    }
    const opts = { viewerId: randomUUID(), includeAllPending: false, limit: 2 }
    const p1 = await repo.listComments(primeiro, { ...opts, after: null })
    const ultimo = p1.items[p1.items.length - 1]
    if (!ultimo) throw new Error('sem resposta')
    const p2 = await repo.listComments(primeiro, {
      ...opts,
      after: { t: ultimo.createdAt, id: ultimo.id },
    })
    expect([...p1.items, ...p2.items].map((c) => c.body)).toEqual([
      'Resposta 1',
      'Resposta 2',
      'Resposta 3',
    ])
    expect(p2.hasMore).toBe(false)
  })

  test('a migration criou os dois índices parciais das ordens novas', async () => {
    const rows = await conn.sql<{ indexname: string }[]>`
      select indexname from pg_indexes
      where schemaname = 'hub' and tablename = 'threads'
        and indexname in ('threads_showcase_recent_idx', 'threads_showcase_plays_idx')`
    expect(rows.map((r) => r.indexname).sort()).toEqual([
      'threads_showcase_plays_idx',
      'threads_showcase_recent_idx',
    ])
  })
})
