import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { createDbConnection, type Database } from '../src/infrastructure/persistence/drizzle/db'
import { channels, spaces } from '../src/infrastructure/persistence/drizzle/schema'
import {
  type CommunitySeedPorts,
  communitySeedDifferences,
  parseCommunitySeedArgs,
  runCommunitySeed,
} from './community-seed-plan'

export function communitySeedPorts(db: Database): CommunitySeedPorts {
  return {
    findSpace: async (slug) =>
      (await db.select().from(spaces).where(eq(spaces.slug, slug)).limit(1))[0] ?? null,
    findChannel: async (spaceId, slug) =>
      (
        await db
          .select()
          .from(channels)
          .where(and(eq(channels.spaceId, spaceId), eq(channels.slug, slug)))
          .limit(1)
      )[0] ?? null,
    insertSpace: async (definition) => {
      const now = new Date()
      const inserted = await db
        .insert(spaces)
        .values({
          ...definition,
          sortOrder:
            definition.sortOrder ??
            sql`coalesce((select max(${spaces.sortOrder}) + 1 from ${spaces} where ${spaces.audience} = ${definition.audience}), 0)`,
          id: randomUUID(),
          version: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: spaces.slug })
        .returning({ id: spaces.id })
      return inserted.length === 1
    },
    insertChannel: async (expected, definition) =>
      db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(spaces)
          .where(eq(spaces.id, expected.id))
          .limit(1)
          .for('update')
        if (!current || communitySeedDifferences(expected, current).length) return 'parent-changed'
        const now = new Date()
        const inserted = await tx
          .insert(channels)
          .values({
            ...definition,
            sortOrder:
              definition.sortOrder ??
              sql`coalesce((select max(${channels.sortOrder}) + 1 from ${channels} where ${channels.spaceId} = ${current.id}), 0)`,
            spaceId: current.id,
            id: randomUUID(),
            version: 0,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: [channels.spaceId, channels.slug] })
          .returning({ id: channels.id })
        return inserted.length === 1 ? 'created' : 'exists'
      }),
  }
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const mode = parseCommunitySeedArgs(args, process.env.SEED_PUBLIC)
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) throw new Error('DATABASE_URL ausente')
  const connection = createDbConnection(databaseUrl, { max: 1 })
  try {
    const report = await runCommunitySeed(mode, communitySeedPorts(connection.db))
    console.log(JSON.stringify(report, null, 2))
    if (report.outcome === 'incomplete') process.exitCode = 1
  } finally {
    await connection.close()
  }
}
if (import.meta.main)
  main().catch(() => {
    console.error(
      JSON.stringify({
        domain: 'hub',
        outcome: 'failed',
        reason:
          'Confira argumentos, SEED_PUBLIC, conexão e schema; configuração existente preservada.',
      }),
    )
    process.exitCode = 1
  })
