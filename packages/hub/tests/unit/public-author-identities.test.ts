import { expect, test } from 'bun:test'
import { PublicAuthorIdentities } from '../../src/application/public-author-identities'

const child = {
  authorId: 'child',
  authorAccountId: 'parent',
  authorDisplayName: 'Maria Silva Santos',
  authorPublic: true,
}
test('old posts and comments resolve the current full nickname in one batch, never the private snapshot', async () => {
  let calls = 0
  const names = new PublicAuthorIdentities({
    getPublicProfileIdentities: async (ids) => {
      calls++
      expect(ids).toEqual(['child'])
      return new Map([['child', { publicNickname: 'Fada Azul', publicProfileEnabled: false }]])
    },
  })
  const result = await names.project([child, { ...child, id: 'comment' }], 'kids')
  expect(result.map((r) => r.authorDisplayName)).toEqual(['Fada Azul', 'Fada Azul'])
  expect(result.every((r) => !r.authorPublic)).toBe(true)
  expect(calls).toBe(1)
  expect(child.authorDisplayName).toBe('Maria Silva Santos')
})
test('missing identity, old records and upstream failures are generic, including same-ID legacy profiles', async () => {
  const names = new PublicAuthorIdentities({
    getPublicProfileIdentities: async () => {
      throw new Error('offline')
    },
  })
  expect(await names.one(child, 'kids')).toMatchObject({
    authorDisplayName: 'Criador(a)',
    authorPublic: false,
  })
  expect(await names.one({ ...child, authorAccountId: null }, 'kids')).toMatchObject({
    authorDisplayName: 'Criador(a)',
    authorPublic: false,
  })
  expect(await names.one(child, 'adult')).toEqual(child)
  expect(await names.one({ ...child, authorAccountId: 'child' }, 'kids')).toMatchObject({
    authorDisplayName: 'Criador(a)',
    authorPublic: false,
  })
})

test('same-ID legacy profiles use the current alias and visibility; only verified staff retain account names', async () => {
  const names = new PublicAuthorIdentities({
    getPublicProfileIdentities: async () =>
      new Map([
        ['child', { publicNickname: 'Fada Azul', publicProfileEnabled: false }],
        ['staff', { publicNickname: 'Ana', publicProfileEnabled: false }],
      ]),
  })
  const result = await names.project(
    [
      { ...child, authorAccountId: 'child' },
      { ...child, authorId: 'staff', authorAccountId: 'staff' },
      { ...child, authorId: 'archived', authorAccountId: 'archived' },
    ],
    'kids',
  )
  expect(result.map((row) => [row.authorDisplayName, row.authorPublic])).toEqual([
    ['Fada Azul', false],
    ['Ana', false],
    ['Criador(a)', false],
  ])
})
