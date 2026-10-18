import { expect, test } from 'bun:test'
import { creatorStorageNamespace } from '../src/lib/creator-storage-namespace'

test('biblioteca adulta não abre armazenamento legado Kids da mesma conta', () => {
  expect(creatorStorageNamespace('account-1', 'adult')).toBe('adult:account-1')
  expect(creatorStorageNamespace('account-1', 'kids')).toBe('account-1')
  expect(creatorStorageNamespace('child-1', 'kids')).toBe('child-1')
  expect(creatorStorageNamespace(null, 'kids')).toBe('')
})
