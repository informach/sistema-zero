import { describe, expect, test } from 'bun:test'
import { composeMemberToolUsage } from '../src/lib/member-tool-usage-bff'

describe('composição do uso de ferramentas no BFF', () => {
  test('propaga falha do Auth e não consulta Members com perfis vazios', async () => {
    const authFailure = {
      status: 503,
      body: { error: { code: 'AUTH_UNAVAILABLE', message: 'Auth indisponível' } },
    }
    let usageCalls = 0

    const result = await composeMemberToolUsage('account', authFailure, async () => {
      usageCalls += 1
      return { status: 200, body: { learners: [] } }
    })

    expect(result).toEqual(authFailure)
    expect(usageCalls).toBe(0)
  })

  test('consulta Members com todos os ids retornados pelo Auth', async () => {
    const calls: [string, string[]][] = []
    const result = await composeMemberToolUsage(
      'account',
      { status: 200, body: { profiles: [{ id: 'child-a' }, { id: 'child-b' }] } },
      async (accountId, profileIds) => {
        calls.push([accountId, profileIds])
        return { status: 200, body: { learners: [] } }
      },
    )

    expect(calls).toEqual([['account', ['child-a', 'child-b']]])
    expect(result.status).toBe(200)
  })
})
