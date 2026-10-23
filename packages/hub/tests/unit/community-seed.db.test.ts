import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { COMMUNITY_SEED_DEFINITIONS, runCommunitySeed } from '../../scripts/community-seed-plan'
import { communitySeedPorts } from '../../scripts/seed-community-spaces'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { channels, spaces } from '../../src/infrastructure/persistence/drizzle/schema'

// Explicit opt-in only; never consume an application's DATABASE_URL.
const url = process.env.HUB_SEED_TEST_DATABASE_URL
if (url) {
  const target = new URL(url)
  if (
    !['localhost', '127.0.0.1'].includes(target.hostname) ||
    target.port !== '55449' ||
    target.pathname !== '/hub_seed_review'
  )
    throw new Error('Hub seed test requires its isolated local database')
}
describe.skipIf(!url)('Hub seed PostgreSQL adapter', () => {
  const connection = url ? createDbConnection(url, { max: 2 }) : null
  beforeAll(async () => {
    if (!connection) throw new Error('Missing test connection')
    await migrate(connection.db, {
      migrationsFolder: fileURLToPath(
        new URL('../../src/infrastructure/persistence/drizzle/migrations', import.meta.url),
      ),
      migrationsTable: 'hub_migrations',
    })
  })
  afterAll(async () => {
    await connection?.close()
  })

  test('plan/status write nothing; apply is idempotent and preserves real Admin edits', async () => {
    if (!connection) throw new Error('Missing test connection')
    const db = connection.db
    const ports = communitySeedPorts(db)
    expect(await db.select().from(spaces)).toHaveLength(0)
    for (const mode of ['plan', 'status'] as const)
      expect((await runCommunitySeed(mode, ports)).created).toEqual([])
    expect(await db.select().from(spaces)).toHaveLength(0)
    expect(await db.select().from(channels)).toHaveLength(0)
    expect((await runCommunitySeed('apply', ports)).created).toHaveLength(7)
    expect((await runCommunitySeed('apply', ports)).created).toEqual([])
    const current = await ports.findSpace('clube-dos-criadores')
    if (!current) throw new Error('Missing seeded space')
    await db
      .update(spaces)
      .set({
        name: 'Admin SQL',
        teaserWhenLocked: false,
        accessConfig: { visibility: 'role_gated', courses: [], communities: [], roles: ['staff'] },
        version: current.version + 1,
      })
      .where(eq(spaces.id, current.id))
    const child = await ports.findChannel(current.id, 'geral')
    if (!child) throw new Error('Missing seeded channel')
    await db
      .update(channels)
      .set({ postingPolicy: 'staff_only', name: 'Admin channel', version: child.version + 1 })
      .where(eq(channels.id, child.id))
    const before = JSON.stringify({
      space: await ports.findSpace(current.slug),
      child: await ports.findChannel(current.id, child.slug),
    })
    const report = await runCommunitySeed('apply', ports)
    expect(report.created).toEqual([])
    expect(report.after.entries[0]?.differingFields).toContain('accessConfig')
    expect(report.after.entries[0]?.channels[0]?.differingFields).toContain('postingPolicy')
    expect(
      JSON.stringify({
        space: await ports.findSpace(current.slug),
        child: await ports.findChannel(current.id, child.slug),
      }),
    ).toBe(before)
  })

  test('database unique constraint preserves a concurrent winner, and changed parent rejects child insertion', async () => {
    if (!connection) throw new Error('Missing test connection')
    const ports = communitySeedPorts(connection.db)
    const definition = { ...COMMUNITY_SEED_DEFINITIONS[0]!.space, slug: 'seed-review-race' }
    const results = await Promise.all([
      ports.insertSpace(definition),
      ports.insertSpace({ ...definition, name: 'Concurrent Admin' }),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
    const expected = await ports.findSpace(definition.slug)
    if (!expected) throw new Error('Missing race winner')
    await connection.db
      .update(spaces)
      .set({ version: expected.version + 1, requiresApproval: !expected.requiresApproval })
      .where(eq(spaces.id, expected.id))
    const outcome = await ports.insertChannel(expected, COMMUNITY_SEED_DEFINITIONS[0]!.channels[0]!)
    expect(outcome).toBe('parent-changed')
    expect(await ports.findChannel(expected.id, 'geral')).toBeNull()
    const fresh = await ports.findSpace(definition.slug)
    if (!fresh) throw new Error('Missing parent')
    const childResults = await Promise.all([
      ports.insertChannel(fresh, COMMUNITY_SEED_DEFINITIONS[0]!.channels[0]!),
      ports.insertChannel(fresh, {
        ...COMMUNITY_SEED_DEFINITIONS[0]!.channels[0]!,
        name: 'Concurrent channel',
      }),
    ])
    expect(childResults.sort()).toEqual(['created', 'exists'])
    expect(
      await connection.db.select().from(channels).where(eq(channels.spaceId, fresh.id)),
    ).toHaveLength(1)
  })
})
