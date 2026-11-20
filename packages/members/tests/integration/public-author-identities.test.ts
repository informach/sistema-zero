import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp } from '../helpers'

test('public identities preserve same-ID profiles, verify staff and omit archived profiles and regular accounts', async () => {
  const child = randomUUID(),
    staff = randomUUID(),
    archived = randomUUID(),
    parent = randomUUID()
  const ctx = buildApp({
    authGateway: {
      getAccountIdentities: async () => [],
      getProfileNames: async () => new Map(),
      getProfileIdentities: async () =>
        new Map([[child, { firstName: 'Fada Azul', public: false }]]),
      getPublicStaffNames: async (ids) => {
        expect(ids).toEqual([staff, archived, parent])
        return new Map([[staff, 'Ana']])
      },
    },
  })
  const response = await ctx.app.handle(
    new Request('http://localhost/members/internal/public-profile-identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: [child, staff, archived, parent] }),
    }),
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('private, no-store')
  expect(await response.json()).toEqual({
    profiles: [
      { id: child, publicNickname: 'Fada Azul', publicProfileEnabled: false },
      { id: staff, publicNickname: 'Ana', publicProfileEnabled: false },
    ],
  })
})
