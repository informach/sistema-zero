import { describe, expect, test } from 'bun:test'
import { createAuthHttpGateway } from '../../src/infrastructure/gateways/auth-http.gateway'

describe('AuthHttpGateway — identidade mínima da conta', () => {
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
