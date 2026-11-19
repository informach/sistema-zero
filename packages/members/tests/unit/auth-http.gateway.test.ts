import { describe, expect, test } from 'bun:test'
import { createAuthHttpGateway } from '../../src/infrastructure/gateways/auth-http.gateway'

describe('AuthHttpGateway — identidade mínima da conta', () => {
  test('public account names come only from active staff, with bounded batches', async () => {
    let calls = 0
    const gateway = createAuthHttpGateway({
      baseUrl: 'http://auth.test',
      internalToken: 'secret',
      fetchImpl: async (url, init) => {
        expect(String(url)).toBe('http://auth.test/auth/internal/staff-directory')
        const { ids } = JSON.parse(String(init?.body))
        expect(ids.length).toBeLessThanOrEqual(100)
        expect(new Headers(init?.headers).get('x-internal-token')).toBe('secret')
        calls++
        return Response.json(
          ids.map((id: string) => ({ id, name: 'Ana Professora', active: id !== 'parent' })),
        )
      },
    })
    expect(await gateway.getPublicStaffNames?.([])).toEqual(new Map())
    expect(calls).toBe(0)
    const result = await gateway.getPublicStaffNames?.([
      'parent',
      ...Array.from({ length: 102 }, (_, i) => `staff-${i}`),
    ])
    expect(result?.has('parent')).toBe(false)
    expect(result?.get('staff-0')).toBe('Ana')
    expect(result?.size).toBe(102)
    expect(calls).toBe(2)
  })
  test('lotes públicos usam apenas o apelido explícito, inclusive com Auth antigo', async () => {
    const gateway = createAuthHttpGateway({
      baseUrl: 'http://auth.test',
      fetchImpl: async () =>
        Response.json({
          profiles: [
            {
              id: 'child',
              name: 'Maria Silva Santos',
              publicNickname: 'Fada Azul',
              publicProfileEnabled: false,
            },
            { id: 'legacy', name: 'Nome Privado Antigo', publicProfileEnabled: true },
          ],
        }),
    })
    expect(await gateway.getProfileNames(['child', 'legacy'])).toEqual(
      new Map([
        ['child', 'Fada Azul'],
        ['legacy', 'Criador(a)'],
      ]),
    )
    expect((await gateway.getProfileIdentities(['child', 'legacy'])).get('child')).toEqual({
      firstName: 'Fada Azul',
      public: false,
    })
    expect((await gateway.getProfileIdentities(['legacy'])).get('legacy')?.firstName).toBe(
      'Criador(a)',
    )
  })
  test('identidade privada do certificado consulta conta e perfil por S2S', async () => {
    const gateway = createAuthHttpGateway({
      baseUrl: 'http://auth.test',
      internalToken: 'secret',
      fetchImpl: async (url, init) => {
        expect(String(url)).toBe('http://auth.test/auth/internal/profiles/certificate-identity')
        expect(JSON.parse(String(init?.body))).toEqual({ accountId: 'parent', profileId: 'child' })
        expect(new Headers(init?.headers).get('x-internal-token')).toBe('secret')
        return Response.json({ fullName: 'Maria Silva Santos', confirmed: true })
      },
    })
    expect(await gateway.getCertificateIdentity?.('parent', 'child')).toEqual({
      fullName: 'Maria Silva Santos',
      confirmed: true,
    })
  })
  test('preserva o booleano autoritativo de ativação sem inferir pela existência da conta', async () => {
    const gateway = createAuthHttpGateway({
      baseUrl: 'http://auth.test',
      fetchImpl: async () =>
        Response.json({
          users: [
            {
              id: 'account-1',
              email: 'pai@example.com',
              firstName: 'Marcos',
              activated: false,
            },
            {
              id: 'account-2',
              email: 'mae@example.com',
              firstName: 'Ana',
              activated: true,
            },
            {
              id: 'account-3',
              email: 'avo@example.com',
              firstName: 'João',
            },
          ],
        }),
    })

    expect(await gateway.getAccountIdentities(['account-1', 'account-2', 'account-3'])).toEqual([
      {
        id: 'account-1',
        email: 'pai@example.com',
        firstName: 'Marcos',
        activated: false,
      },
      {
        id: 'account-2',
        email: 'mae@example.com',
        firstName: 'Ana',
        activated: true,
      },
      {
        id: 'account-3',
        email: 'avo@example.com',
        firstName: 'João',
        activated: null,
      },
    ])
  })
})
