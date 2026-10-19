import { expect, mock, test } from 'bun:test'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'

mock.module('server-only', () => ({}))
const { config } = await import('../src/proxy')

test('adult service routes bypass the browser proxy while Studio browser routes retain it', () => {
  expect(unstable_doesMiddlewareMatch({ config, url: '/api/internal/studio-play' })).toBe(false)
  expect(unstable_doesMiddlewareMatch({ config, url: '/api/studio/reservation-cleanup' })).toBe(
    false,
  )
  expect(
    unstable_doesMiddlewareMatch({ config, url: '/api/internal/studio-publication-cleanup' }),
  ).toBe(false)
  expect(unstable_doesMiddlewareMatch({ config, url: '/api/studio/describe' })).toBe(true)
  expect(unstable_doesMiddlewareMatch({ config, url: '/estudio' })).toBe(true)
})
