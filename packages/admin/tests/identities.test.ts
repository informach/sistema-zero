import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

let failUsers = false
let failProfiles = false
let userBatchCalls: string[][] = []
let profileBatchCalls: string[][] = []
let accountProfileCalls: string[] = []
let profileAccounts = new Map<string, string>()

mock.module('@/server/users', () => ({
  batchGetUsers: async (ids: string[]) => {
    userBatchCalls.push(ids)
    if (failUsers) throw new Error('auth users unavailable')
    return {
      status: 200,
      body: {
        users: ids.map((id) => ({
          id,
          firstName: `Conta-${id.slice(-4)}`,
          lastName: 'Responsável',
          email: `${id}@example.com`,
        })),
      },
    }
  },
  batchGetProfiles: async (ids: string[]) => {
    profileBatchCalls.push(ids)
    if (failProfiles) throw new Error('auth profiles unavailable')
    return {
      status: 200,
      body: {
        profiles: ids.map((id) => ({
          id,
          accountUserId: profileAccounts.get(id) ?? id,
          name: `Criança-${id.slice(-4)}`,
        })),
      },
    }
  },
  getUserProfiles: async (accountId: string) => {
    accountProfileCalls.push(accountId)
    return { status: 200, body: { profiles: [] } }
  },
}))

const { resolveIdentities } = await import('../src/server/identities')

describe('resolveIdentities', () => {
  beforeEach(() => {
    failUsers = false
    failProfiles = false
    userBatchCalls = []
    profileBatchCalls = []
    accountProfileCalls = []
    profileAccounts = new Map()
  })

  test('hidrata contas e perfis em lotes por id, sem N+1 por responsável', async () => {
    const accountA = '00000000-0000-4000-8000-0000000000a1'
    const accountB = '00000000-0000-4000-8000-0000000000b2'
    const profileA = '00000000-0000-4000-8000-0000000000c3'
    const profileB = '00000000-0000-4000-8000-0000000000d4'
    const identityOf = await resolveIdentities([
      { userId: profileA, accountId: accountA },
      { userId: profileB, accountId: accountB },
    ])

    expect(userBatchCalls).toEqual([[accountA, accountB]])
    expect(profileBatchCalls).toEqual([[profileA, profileB]])
    expect(accountProfileCalls).toEqual([])
    expect(identityOf({ userId: profileA, accountId: accountA })).toEqual({
      accountName: 'Conta-00a1 Responsável',
      accountEmail: `${accountA}@example.com`,
      childName: 'Criança-00c3',
    })
  })

  test('falha do Auth degrada a identidade para null sem derrubar a moderação', async () => {
    failUsers = true
    failProfiles = true
    const accountId = '00000000-0000-4000-8000-0000000000a1'
    const profileId = '00000000-0000-4000-8000-0000000000c3'

    const identityOf = await resolveIdentities([{ userId: profileId, accountId }])

    expect(identityOf({ userId: profileId, accountId })).toEqual({
      accountName: null,
      accountEmail: null,
      childName: null,
    })
  })

  test('reconstrói perfil e responsável de denúncia legada sem snapshots', async () => {
    const accountId = '00000000-0000-4000-8000-0000000000a1'
    const profileId = '00000000-0000-4000-8000-0000000000c3'
    profileAccounts.set(profileId, accountId)

    const identityOf = await resolveIdentities([{ userId: profileId, accountId: null }])

    expect(profileBatchCalls).toEqual([[profileId]])
    expect(userBatchCalls).toEqual([[accountId]])
    expect(identityOf({ userId: profileId, accountId: null })).toEqual({
      accountName: 'Conta-00a1 Responsável',
      accountEmail: `${accountId}@example.com`,
      childName: 'Criança-00c3',
    })
  })
})
