import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'

const { hasAiAppsLevel, meetsAiAppsLevel, meetsFreeCreationLevel, meetsThreeDCreationLevel } =
  await import('../src/server/creative-apps-access')
const { AI_APPS_MIN_LEVEL, FREE_CREATION_MIN_LEVEL, THREE_D_CREATION_MIN_LEVEL } = await import(
  '../src/lib/studio-tier'
)

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

  // Decisão dela (05/09/2026): o kit Jogo 3D, consumidor do que o Molda produz, é recompensa
  // do Explorador(a); abrir a oficina no Inventor(a) dava um modelo sem lugar para ser usado.
  test('a oficina 3D (Molda) abre no Explorador(a) de Mundos, um posto DEPOIS da IA', () => {
    expect(THREE_D_CREATION_MIN_LEVEL).toBe('explorer')
    expect(meetsThreeDCreationLevel('coder', 'student')).toBe(false)
    expect(meetsThreeDCreationLevel('hacker', 'student')).toBe(false)
    expect(meetsThreeDCreationLevel('explorer', 'student')).toBe(true)
    expect(meetsThreeDCreationLevel('elite', 'student')).toBe(true)
    expect(meetsThreeDCreationLevel('god', 'student')).toBe(true)
  })

  test('as três barras são distintas: Construtor(a) cria, Inventor(a) usa IA, Explorador(a) modela', () => {
    expect(
      new Set([FREE_CREATION_MIN_LEVEL, AI_APPS_MIN_LEVEL, THREE_D_CREATION_MIN_LEVEL]).size,
    ).toBe(3)
    expect(meetsAiAppsLevel('hacker', 'student')).toBe(true)
    expect(meetsThreeDCreationLevel('hacker', 'student')).toBe(false)
  })

  test('equipe passa sem consultar o nível', () => {
    expect(meetsAiAppsLevel(undefined, 'staff')).toBe(true)
    expect(meetsFreeCreationLevel(undefined, 'staff')).toBe(true)
    expect(meetsThreeDCreationLevel(undefined, 'admin')).toBe(true)
  })

  test('nível ausente ou inválido falha fechado nos três', () => {
    for (const slug of [undefined, null, '', 'inventor', 'explorador']) {
      expect(meetsAiAppsLevel(slug, 'student')).toBe(false)
      expect(meetsFreeCreationLevel(slug, 'student')).toBe(false)
      expect(meetsThreeDCreationLevel(slug, 'student')).toBe(false)
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
