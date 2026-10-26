import { expect, test } from 'bun:test'
import {
  COMMUNITY_SEED_DEFINITIONS,
  type CommunitySeedPorts,
  communitySeedDifferences,
  parseCommunitySeedArgs,
  runCommunitySeed,
} from '../../scripts/community-seed-plan'
import type { Channel, Space } from '../../src/domain/space/space'

function fixture() {
  const spaces = new Map<string, Space>()
  const channels = new Map<string, Channel>()
  const ports: CommunitySeedPorts = {
    findSpace: async (slug) => structuredClone(spaces.get(slug) ?? null),
    findChannel: async (id, slug) => structuredClone(channels.get(`${id}/${slug}`) ?? null),
    insertSpace: async (definition) => {
      if (spaces.has(definition.slug)) return false
      spaces.set(definition.slug, {
        ...structuredClone(definition),
        sortOrder:
          definition.sortOrder ??
          Math.max(
            -1,
            ...[...spaces.values()]
              .filter((s) => s.audience === definition.audience)
              .map((s) => s.sortOrder),
          ) + 1,
        id: crypto.randomUUID(),
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      return true
    },
    insertChannel: async (expected, definition) => {
      const current = spaces.get(expected.slug)
      if (!current || communitySeedDifferences(expected, current).length) return 'parent-changed'
      const key = `${expected.id}/${definition.slug}`
      if (channels.has(key)) return 'exists'
      channels.set(key, {
        ...structuredClone(definition),
        sortOrder:
          definition.sortOrder ??
          Math.max(
            -1,
            ...[...channels.values()]
              .filter((c) => c.spaceId === expected.id)
              .map((c) => c.sortOrder),
          ) + 1,
        spaceId: expected.id,
        id: crypto.randomUUID(),
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      return 'created'
    },
  }
  return { ports, spaces, channels }
}

test('Hub default/plan/status perform no write; public override and unsupported args are refused', async () => {
  expect(parseCommunitySeedArgs([])).toBe('plan')
  for (const value of ['true', '1', 'yes'])
    expect(() => parseCommunitySeedArgs(['apply'], value)).toThrow()
  for (const args of [['apply', '--force'], ['--apply'], ['reseed']])
    expect(() => parseCommunitySeedArgs(args)).toThrow()
  const f = fixture()
  for (const mode of ['plan', 'status'] as const) {
    const result = await runCommunitySeed(mode, f.ports)
    expect(result.created).toEqual([])
    expect(result.before.entries.every((entry) => entry.state === 'missing')).toBe(true)
    expect(result.before.pendingDefinitions).toEqual([])
  }
  expect(f.spaces.size + f.channels.size).toBe(0)
})

test('Hub creates the exact approved structure once and repeats without mutation', async () => {
  const f = fixture()
  const first = await runCommunitySeed('apply', f.ports)
  expect(first.outcome).toBe('defined-scope-complete')
  expect(first.created).toHaveLength(10)
  const adultClub = f.spaces.get('clube-dos-criadores-adulto')!
  expect(adultClub).toMatchObject({
    name: 'Clube dos Criadores',
    audience: 'adult',
    requiresApproval: false,
    accessConfig: { visibility: 'community_gated', communities: ['adult-clube-dos-criadores'] },
  })
  expect(adultClub.id).not.toBe(f.spaces.get('clube-dos-criadores')!.id)
  expect(f.channels.get(`${adultClub.id}/geral`)).toMatchObject({ postingPolicy: 'members' })
  expect(f.channels.get(`${adultClub.id}/recados-da-equipe`)).toMatchObject({
    postingPolicy: 'staff_only',
  })
  expect(
    [...f.spaces.values()]
      .filter((space) => space.audience === 'kids')
      .every(
        (space) => space.requiresApproval && space.accessConfig.visibility === 'community_gated',
      ),
  ).toBe(true)
  expect(f.spaces.get('mural-dos-criadores-adulto')).toMatchObject({
    audience: 'adult',
    requiresApproval: false,
    accessConfig: { visibility: 'community_gated', communities: ['adult-mural-dos-criadores'] },
  })
  expect(JSON.stringify([...f.spaces.values()])).not.toContain('visitante')
  expect(
    [...f.channels.values()].every(
      (channel) => channel.accessConfig === null && channel.requiresApproval === null,
    ),
  ).toBe(true)
  const before = JSON.stringify([...f.spaces, ...f.channels])
  expect((await runCommunitySeed('apply', f.ports)).created).toEqual([])
  expect(JSON.stringify([...f.spaces, ...f.channels])).toBe(before)
})

test('Hub preserves Admin access/name/order/status/channel config and reports differences', async () => {
  const f = fixture()
  await runCommunitySeed('apply', f.ports)
  const space = f.spaces.get('clube-dos-criadores')!
  space.name = 'Configuração da equipe'
  space.teaserWhenLocked = false
  space.accessConfig = { visibility: 'role_gated', courses: [], communities: [], roles: ['staff'] }
  space.status = 'archived'
  space.sortOrder = 12
  const channel = f.channels.get(`${space.id}/geral`)!
  channel.postingPolicy = 'staff_only'
  const before = JSON.stringify([...f.spaces, ...f.channels])
  const result = await runCommunitySeed('apply', f.ports)
  expect(result.created).toEqual([])
  expect(result.after.entries[0]?.state).toBe('drift')
  expect(result.after.entries[0]?.differingFields).toContain('accessConfig')
  expect(result.after.entries[0]?.channels[0]?.state).toBe('drift')
  expect(JSON.stringify([...f.spaces, ...f.channels])).toBe(before)
})

test('Hub refuses audience identity conflicts without adding children or altering existing records', async () => {
  const f = fixture()
  await f.ports.insertSpace({ ...COMMUNITY_SEED_DEFINITIONS[0]!.space, audience: 'adult' })
  const result = await runCommunitySeed('apply', f.ports)
  expect(result.outcome).toBe('incomplete')
  expect(result.before.entries[0]?.state).toBe('blocked')
  expect(result.created).toEqual([])
  expect(f.channels.size).toBe(0)
})

test('Hub concurrent space insert/update cannot widen access or inherit modified permissions', async () => {
  const f = fixture()
  const insert = f.ports.insertSpace
  f.ports.insertSpace = async (definition) => {
    await insert({ ...definition, name: 'Admin concorrente' })
    return false
  }
  const race = await runCommunitySeed('apply', f.ports)
  expect(race.created).toEqual([])
  expect(f.channels.size).toBe(0)
  expect(race.after.entries[0]?.channels[0]?.state).toBe('blocked')
  const clean = fixture()
  const createChannel = clean.ports.insertChannel
  clean.ports.insertChannel = async (expected, definition) => {
    const stored = clean.spaces.get(expected.slug)!
    stored.version++
    stored.accessConfig = { visibility: 'public', courses: [], communities: [], roles: [] }
    return createChannel(expected, definition)
  }
  const changed = await runCommunitySeed('apply', clean.ports)
  expect(changed.failures[0]?.reason).toBe('parent-changed')
  expect(clean.channels.size).toBe(0)
})
