import { expect, mock, test } from 'bun:test'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'

mock.module('server-only', () => ({}))
const { config } = await import('../src/proxy')

test('the service executor bypasses browser CSRF while browser Studio routes retain it', () => {
  expect(
    unstable_doesMiddlewareMatch({ config, url: '/api/internal/studio-builder/execute' }),
  ).toBe(false)
  expect(unstable_doesMiddlewareMatch({ config, url: '/api/studio/zappy/build' })).toBe(true)
  expect(unstable_doesMiddlewareMatch({ config, url: '/estudio' })).toBe(true)
})
