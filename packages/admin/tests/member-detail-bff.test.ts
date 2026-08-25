import { describe, expect, test } from 'bun:test'
import { composeMemberDetail } from '../src/lib/member-detail-bff'

describe('composição da ficha do membro no BFF', () => {
  test('propaga falha ao listar perfis e não consulta Members', async () => {
    let memberCalls = 0
    const failure = {
      status: 503,
      body: { error: { code: 'AUTH_UNAVAILABLE', message: 'Auth indisponível' } },
    }

    const result = await composeMemberDetail(
      'account',
      { status: 200, body: { user: { id: 'account' } } },
      failure,
      async () => {
        memberCalls += 1
        return { status: 200, body: { userId: 'account', entitlements: [], progress: [] } }
      },
    )

    expect(result).toEqual(failure)
    expect(memberCalls).toBe(0)
  })

  test('propaga falha da identidade antes de consultar Members', async () => {
    let memberCalls = 0
    const failure = {
      status: 404,
      body: { error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado' } },
    }

    const result = await composeMemberDetail(
      'account',
      failure,
      { status: 200, body: { profiles: [] } },
      async () => {
        memberCalls += 1
        return { status: 200, body: { userId: 'account', entitlements: [], progress: [] } }
      },
    )

    expect(result).toEqual(failure)
    expect(memberCalls).toBe(0)
  })

  test('resposta 200 malformada do Auth falha fechada e não perde perfis silenciosamente', async () => {
    let memberCalls = 0
    const result = await composeMemberDetail(
      'account',
      { status: 200, body: { user: { id: 'account' } } },
      { status: 200, body: { profiles: [{ id: 'child-a' }] } },
      async () => {
        memberCalls += 1
        return { status: 200, body: { userId: 'account', entitlements: [], progress: [] } }
      },
    )

    expect(result).toEqual({
      status: 502,
      body: { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível carregar o membro.' } },
    })
    expect(memberCalls).toBe(0)
  })

  test('carrega Members com todos os perfis e devolve a ficha hidratada', async () => {
    const result = await composeMemberDetail(
      'account',
      { status: 200, body: { user: { id: 'account', firstName: 'Ana' } } },
      {
        status: 200,
        body: { profiles: [{ id: 'child-a', name: 'Bia', avatarUrl: null }] },
      },
      async (_accountId, profileIds) => ({
        status: 200,
        body: {
          userId: 'account',
          entitlements: [],
          progress: [],
          profilesProgress: [{ userId: profileIds[0], progress: [{ courseRef: 'kids' }] }],
        },
      }),
    )

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      user: { id: 'account', firstName: 'Ana' },
      profiles: [
        { id: 'child-a', name: 'Bia', avatarUrl: null, progress: [{ courseRef: 'kids' }] },
      ],
    })
  })
})
