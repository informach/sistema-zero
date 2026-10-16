import { expect, test } from 'bun:test'
import type { CORSRule } from '@aws-sdk/client-s3'
import { marketingStorageCors, storageOrigin } from '../scripts/storage-cors-policy'

test('multipart adds checksum and exact origin while preserving external rules and old clients', () => {
  const before: CORSRule[] = [
    { ID: 'unmanaged', AllowedOrigins: ['https://other.example'], AllowedMethods: ['GET'] },
    {
      ID: 'marketing-direct-upload',
      AllowedOrigins: ['http://localhost:3012'],
      AllowedMethods: ['PUT', 'GET', 'HEAD'],
      AllowedHeaders: ['content-type'],
      MaxAgeSeconds: 3600,
    },
  ]
  const baseline = structuredClone(before)
  const after = marketingStorageCors(before, ['http://127.0.0.1:15334'])
  expect(before).toEqual(baseline)
  expect(after[0]).toEqual(before[0])
  expect(after[1]?.AllowedOrigins).toEqual(['http://localhost:3012', 'http://127.0.0.1:15334'])
  expect(after[1]?.AllowedHeaders).toContain('content-md5')
  expect(after[1]?.AllowedHeaders).toContain('content-type')
  expect(after[1]?.AllowedMethods).toEqual(['PUT', 'GET', 'HEAD'])
  expect(marketingStorageCors(after, ['http://127.0.0.1:15334'])).toEqual(after)
})

test('configuration refuses wildcard, credential, path, insecure remote origin and duplicate managed rule', () => {
  for (const input of [
    '*',
    'https://*.example.com',
    'https://app.example/path',
    'https://app.example/',
    'https://app.example?x=1',
    'https://user:secret@app.example',
    'http://remote.example',
  ])
    expect(() => storageOrigin(input)).toThrow()
  expect(storageOrigin('https://marketing.sistemazero.com.br')).toBe(
    'https://marketing.sistemazero.com.br',
  )
  expect(() => marketingStorageCors([], [])).toThrow()
  const rule: CORSRule = {
    ID: 'marketing-direct-upload',
    AllowedOrigins: ['https://app.example'],
    AllowedMethods: ['GET'],
  }
  expect(() => marketingStorageCors([rule, rule], ['https://app.example'])).toThrow()
})
