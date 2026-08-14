import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'

const { hasAiAppsLevel, meetsAiAppsLevel, meetsFreeCreationLevel } = await import(
  '../src/server/creative-apps-access'
)
const { AI_APPS_MIN_LEVEL, FREE_CREATION_MIN_LEVEL } = await import('../src/lib/studio-tier')

function membersStub(result: { status: number; body?: unknown }) {
  return {
    getGamification: async () => result,
  } as unknown as Parameters<typeof hasAiAppsLevel>[0]
}

describe('portão de carreira dos apps criativos', () => {
  test('o que chama IA (Pensa e Zappy) abre em Inventor(a)', () => {
    expect(AI_APPS_MIN_LEVEL).toBe('hacker')
    expect(meetsAiAppsLevel('coder', 'student')).toBe(false)
    expect(meetsAiAppsLevel('hacker', 'student')).toBe(true)
    expect(meetsAiAppsLevel('god', 'student')).toBe(true)
  })

  test('criação livre (Estúdio e Pinta) abre em Construtor(a)', () => {
    expect(FREE_CREATION_MIN_LEVEL).toBe('coder')
    expect(meetsFreeCreationLevel('noob', 'student')).toBe(false)
    expect(meetsFreeCreationLevel('coder', 'student')).toBe(true)
    expect(meetsFreeCreationLevel('god', 'student')).toBe(true)
  })

  test('os dois portões são MESMO distintos — o Construtor(a) cria mas não usa IA', () => {
    expect(meetsFreeCreationLevel('coder', 'student')).toBe(true)
    expect(meetsAiAppsLevel('coder', 'student')).toBe(false)
  })

  test('equipe passa sem consultar o nível', () => {
    expect(meetsAiAppsLevel(undefined, 'staff')).toBe(true)
    expect(meetsFreeCreationLevel(undefined, 'staff')).toBe(true)
  })

  test('nível ausente ou inválido falha fechado nos dois', () => {
    for (const slug of [undefined, null, '', 'inventor']) {
      expect(meetsAiAppsLevel(slug, 'student')).toBe(false)
      expect(meetsFreeCreationLevel(slug, 'student')).toBe(false)
    }
  })

  test('o guard do BFF usa getGamification e falha fechado', async () => {
    expect(
      await hasAiAppsLevel(
        membersStub({ status: 200, body: { level: { slug: 'hacker' } } }),
        'student',
      ),
    ).toBe(true)
    expect(
      await hasAiAppsLevel(
        membersStub({ status: 200, body: { level: { slug: 'coder' } } }),
        'student',
      ),
    ).toBe(false)
    expect(await hasAiAppsLevel(membersStub({ status: 502 }), 'student')).toBe(false)
  })
})
