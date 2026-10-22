import type { Channel, Space } from '../src/domain/space/space'

export type SeedSpace = Omit<Space, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'sortOrder'> & {
  sortOrder?: number
}
export type SeedChannel = Omit<
  Channel,
  'id' | 'version' | 'spaceId' | 'createdAt' | 'updatedAt' | 'sortOrder'
> & { sortOrder?: number }
type Definition = { space: SeedSpace; channels: readonly SeedChannel[] }

function space(slug: string, name: string, description: string): SeedSpace {
  return {
    slug,
    name,
    description,
    iconUrl: null,
    audience: 'kids',
    accessConfig: { visibility: 'community_gated', courses: [], communities: [slug], roles: [] },
    requiresApproval: true,
    teaserWhenLocked: true,
    sortOrder: 0,
    status: 'active',
  }
}
function channel(
  slug: string,
  name: string,
  postingPolicy: SeedChannel['postingPolicy'],
  sortOrder: number,
): SeedChannel {
  return {
    slug,
    name,
    topic: null,
    accessConfig: null,
    postingPolicy,
    requiresApproval: null,
    sortOrder,
    status: 'active',
  }
}
/** Same Kids definitions as the original seed. No SEED_PUBLIC access override. */
export const COMMUNITY_SEED_DEFINITIONS: readonly Definition[] = [
  {
    space: space(
      'clube-dos-criadores',
      'Clube dos Criadores',
      'Converse com os colegas e mostre o que você criou! 🎉',
    ),
    channels: [
      channel('geral', 'Geral', 'members', 0),
      channel('recados-da-equipe', 'Recados da equipe', 'staff_only', 1),
    ],
  },
  {
    space: space(
      'mural-dos-criadores',
      'Mural dos Criadores',
      'A vitrine dos projetos! Curta e comente o que os colegas criaram. 🎨',
    ),
    channels: [channel('parede', 'Parede', 'staff_only', 0)],
  },
  // Approved ensureAdultMural from local-studio-stack/curriculum.ts; ordering
  // appends like the Admin API. Visitor access is resolved at read time, never persisted.
  {
    space: {
      slug: 'mural-dos-criadores-adulto',
      name: 'Mural dos Criadores',
      description: 'A vitrine dos projetos da comunidade adulta.',
      iconUrl: null,
      audience: 'adult',
      accessConfig: {
        visibility: 'community_gated',
        courses: [],
        communities: ['adult-mural-dos-criadores'],
        roles: [],
      },
      requiresApproval: false,
      teaserWhenLocked: true,
      status: 'active',
    },
    channels: [
      {
        slug: 'parede',
        name: 'Parede',
        topic: null,
        accessConfig: null,
        postingPolicy: 'staff_only',
        requiresApproval: null,
        status: 'active',
      },
    ],
  },
]
export const COMMUNITY_SEED_PENDING = [
  {
    audience: 'adult',
    communityRef: 'adult-clube-dos-criadores',
    reason: 'Definição completa de espaço e canais ainda não aprovada.',
  },
] as const

export type CommunitySeedMode = 'plan' | 'status' | 'apply'
export function parseCommunitySeedArgs(
  args: readonly string[],
  publicOverride?: string,
): CommunitySeedMode {
  if (publicOverride && !['false', '0'].includes(publicOverride.toLowerCase()))
    throw new Error('SEED_PUBLIC não é permitido; configure acesso pelo Admin.')
  if (args.length === 0) return 'plan'
  if (args.length !== 1 || !['plan', 'status', 'apply'].includes(args[0] ?? ''))
    throw new Error('Uso: db:seed-community [plan|status|apply].')
  return args[0] as CommunitySeedMode
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`
  return JSON.stringify(value)
}
export function communitySeedDifferences(expected: object, actual: object): string[] {
  const fields = new Map(Object.entries(actual))
  return Object.entries(expected)
    .filter(([key, value]) => canonical(value) !== canonical(fields.get(key)))
    .map(([key]) => key)
}

export interface CommunitySeedPorts {
  findSpace(slug: string): Promise<Space | null>
  findChannel(spaceId: string, slug: string): Promise<Channel | null>
  insertSpace(definition: SeedSpace): Promise<boolean>
  /** Compare/lock the current parent before insert; never inherit unreviewed access. */
  insertChannel(
    expectedSpace: Space,
    definition: SeedChannel,
  ): Promise<'created' | 'exists' | 'parent-changed'>
}
type State = 'missing' | 'present' | 'drift' | 'blocked'
interface Entry {
  key: string
  state: State
  differingFields: string[]
}
export async function planCommunitySeed(ports: CommunitySeedPorts) {
  const entries = []
  for (const definition of COMMUNITY_SEED_DEFINITIONS) {
    const current = await ports.findSpace(definition.space.slug)
    const differingFields = current ? communitySeedDifferences(definition.space, current) : []
    const state: State = !current
      ? 'missing'
      : current.audience !== definition.space.audience
        ? 'blocked'
        : differingFields.length
          ? 'drift'
          : 'present'
    const childEntries = []
    for (const child of definition.channels) {
      const actual = current ? await ports.findChannel(current.id, child.slug) : null
      const fields = actual ? communitySeedDifferences(child, actual) : []
      const entry: Entry = {
        key: child.slug,
        state: actual
          ? fields.length
            ? 'drift'
            : 'present'
          : state === 'drift' || state === 'blocked'
            ? 'blocked'
            : 'missing',
        differingFields: fields,
      }
      childEntries.push({ ...entry, definition: child })
    }
    entries.push({
      key: definition.space.slug,
      state,
      differingFields,
      definition: definition.space,
      channels: childEntries,
    })
  }
  return { entries, pendingDefinitions: COMMUNITY_SEED_PENDING }
}

export async function runCommunitySeed(mode: CommunitySeedMode, ports: CommunitySeedPorts) {
  const before = await planCommunitySeed(ports)
  const created: string[] = []
  const failures: { key: string; reason: 'create-failed' | 'parent-changed' }[] = []
  if (mode === 'apply' && !before.entries.some((entry) => entry.state === 'blocked')) {
    for (const definition of COMMUNITY_SEED_DEFINITIONS) {
      const key = definition.space.slug
      try {
        if (!(await ports.findSpace(key)) && (await ports.insertSpace(definition.space)))
          created.push(key)
        const current = await ports.findSpace(key)
        if (!current || communitySeedDifferences(definition.space, current).length) continue
        for (const child of definition.channels) {
          if (await ports.findChannel(current.id, child.slug)) continue
          const outcome = await ports.insertChannel(current, child)
          if (outcome === 'created') created.push(`${key}/${child.slug}`)
          if (outcome === 'parent-changed') {
            failures.push({ key: `${key}/${child.slug}`, reason: outcome })
            break
          }
        }
      } catch {
        failures.push({ key, reason: 'create-failed' })
        break
      }
    }
  }
  const after = mode === 'apply' ? await planCommunitySeed(ports) : before
  const incomplete =
    failures.length > 0 ||
    after.entries.some((entry) =>
      [entry, ...entry.channels].some(
        (item) => item.state === 'missing' || item.state === 'blocked',
      ),
    )
  return {
    schemaVersion: 1,
    domain: 'hub',
    mode,
    before,
    after,
    created,
    failures,
    outcome: mode !== 'apply' ? 'read-only' : incomplete ? 'incomplete' : 'defined-scope-complete',
  }
}
