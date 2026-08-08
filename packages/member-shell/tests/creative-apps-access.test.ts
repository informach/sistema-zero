import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'

const { hasCreativeAppsLevel, meetsCreativeAppsLevel } = await import(
  '../src/server/creative-apps-access'
)
const { CREATIVE_APPS_MIN_LEVEL } = await import('../src/lib/studio-tier')

function membersStub(result: { status: number; body?: unknown }) {
  return {
    getGamification: async () => result,
  } as unknown as Parameters<typeof hasCreativeAppsLevel>[0]
}

describe('portão de carreira dos apps criativos', () => {
  test('Pensa, Pinta e Zappy abrem em Inventor(a)', () => {
    expect(CREATIVE_APPS_MIN_LEVEL).toBe('hacker')
    expect(meetsCreativeAppsLevel('coder', 'student')).toBe(false)
    expect(meetsCreativeAppsLevel('hacker', 'student')).toBe(true)
    expect(meetsCreativeAppsLevel('god', 'student')).toBe(true)
  })

  test('equipe passa sem consultar o nível', () => {
    expect(meetsCreativeAppsLevel(undefined, 'staff')).toBe(true)
  })

  test('nível ausente ou inválido falha fechado', () => {
    for (const slug of [undefined, null, '', 'inventor']) {
      expect(meetsCreativeAppsLevel(slug, 'student')).toBe(false)
    }
  })

  test('o guard do BFF usa getGamification e falha fechado', async () => {
    expect(
      await hasCreativeAppsLevel(
        membersStub({ status: 200, body: { level: { slug: 'hacker' } } }),
        'student',
      ),
    ).toBe(true)
    expect(
      await hasCreativeAppsLevel(
        membersStub({ status: 200, body: { level: { slug: 'coder' } } }),
        'student',
      ),
    ).toBe(false)
    expect(await hasCreativeAppsLevel(membersStub({ status: 502 }), 'student')).toBe(false)
  })
})
