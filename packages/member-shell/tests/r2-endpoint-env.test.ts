import { expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { EnvSchema } = await import('../src/lib/env')

const base = { JWT_HS256_SECRET: 'private-test-auth-secret-with-32-chars' }

test('R2 uses its account endpoint by default and accepts a local S3 integration endpoint', () => {
  expect(EnvSchema.parse(base).R2_S3_ENDPOINT).toBeUndefined()
  expect(
    EnvSchema.parse({ ...base, R2_S3_ENDPOINT: 'http://127.0.0.1:55435' }).R2_S3_ENDPOINT,
  ).toBe('http://127.0.0.1:55435')
  expect(
    EnvSchema.parse({ ...base, R2_S3_ENDPOINT: 'https://objects.example.test' }).R2_S3_ENDPOINT,
  ).toBe('https://objects.example.test')
})

test.each([
  'http://objects.example.test',
  'http://user:secret@127.0.0.1:55435',
  'http://127.0.0.1:55435?secret=value',
  'http://127.0.0.1:55435#fragment',
  'ftp://127.0.0.1:55435',
])('R2 refuses unsafe S3 integration endpoint %s', (endpoint) => {
  const result = EnvSchema.safeParse({ ...base, R2_S3_ENDPOINT: endpoint })
  expect(result.success).toBe(false)
  if (!result.success)
    expect(result.error.issues.some((issue) => issue.path[0] === 'R2_S3_ENDPOINT')).toBe(true)
})
