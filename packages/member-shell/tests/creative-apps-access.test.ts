import { describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

process.env.JWT_HS256_SECRET ??= 'test-jwt-secret-with-32-characters'

const { hasCreativeAppsLevel, meetsCreativeAppsLevel } = await import(
  '../src/server/creative-apps-access'
)
const { CREATIVE_APPS_MIN_LEVEL } = await import('../src/lib/studio-tier')

/** Só o que o gate consome do client — evita montar o MembersClient inteiro. */
function membersStub(result: { status: number; body?: unknown }) {
  return {
    getGamification: async () => result,
  } as unknown as Parameters<typeof hasCreativeAppsLevel>[0]
}

describe('portão de carreira dos apps criativos', () => {
  test('a barra é Inventor(a) (`hacker`), o 3º degrau', () => {
    // Trava a decisão de produto: mexer aqui é mexer no Zappy, no Pensa e no
    // Pinta ao mesmo tempo, que é justamente o ponto de a constante existir.
    expect(CREATIVE_APPS_MIN_LEVEL).toBe('hacker')
  })

  test('equipe passa em qualquer nível, inclusive sem nível', () => {
    for (const role of ['superadmin', 'admin', 'staff']) {
      expect(meetsCreativeAppsLevel(undefined, role), role).toBe(true)
      expect(meetsCreativeAppsLevel('noob', role), role).toBe(true)
    }
  })

  test('aluno só passa de Inventor(a) para cima', () => {
    expect(meetsCreativeAppsLevel('noob', 'student')).toBe(false)
    expect(meetsCreativeAppsLevel('coder', 'student')).toBe(false)
    expect(meetsCreativeAppsLevel('hacker', 'student')).toBe(true)
    expect(meetsCreativeAppsLevel('explorer', 'student')).toBe(true)
    expect(meetsCreativeAppsLevel('god', 'student')).toBe(true)
  })

  test('nível indeterminado NÃO destrava', () => {
    for (const bad of [undefined, null, '', 'inventor']) {
      expect(meetsCreativeAppsLevel(bad, 'student'), String(bad)).toBe(false)
    }
  })

  describe('variante do BFF', () => {
    test('lê o nível do members', async () => {
      const ok = membersStub({ status: 200, body: { level: { slug: 'hacker' } } })
      expect(await hasCreativeAppsLevel(ok, 'student')).toBe(true)
      const low = membersStub({ status: 200, body: { level: { slug: 'coder' } } })
      expect(await hasCreativeAppsLevel(low, 'student')).toBe(false)
    })

    test('equipe não consulta o members', async () => {
      // Se consultasse, o stub que lança derrubaria o teste — é a prova de que o
      // passe-livre da equipe corta antes da ida à rede.
      const exploding = {
        getGamification: async () => {
          throw new Error('não deveria ser chamado')
        },
      } as unknown as Parameters<typeof hasCreativeAppsLevel>[0]
      expect(await hasCreativeAppsLevel(exploding, 'admin')).toBe(true)
    })

    test('members fora do ar recusa (fail-closed)', async () => {
      // Um handler não tem tela de "tente de novo" p/ mostrar; liberar escrita por
      // causa de um soluço seria pior que recusar. As PÁGINAS fazem o oposto —
      // mostram indisponibilidade em vez de rebaixar o aluno.
      expect(await hasCreativeAppsLevel(membersStub({ status: 502 }), 'student')).toBe(false)
      expect(await hasCreativeAppsLevel(membersStub({ status: 200 }), 'student')).toBe(false)
      const throwing = {
        getGamification: async () => {
          throw new Error('rede caiu')
        },
      } as unknown as Parameters<typeof hasCreativeAppsLevel>[0]
      expect(await hasCreativeAppsLevel(throwing, 'student')).toBe(false)
    })
  })
})
