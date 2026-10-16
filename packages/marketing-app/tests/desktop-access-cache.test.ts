import { expect, test } from 'bun:test'
import { type DesktopAccess, DesktopAccessCache } from '../src/server/desktop-access-cache'

test('desktop issuance is single-flight, bounded by TTL and identity; failures are not retained', async () => {
  let now = 0,
    issued = 0
  const cache = new DesktopAccessCache(() => now, 2)
  const issue = async (): Promise<DesktopAccess> => ({
    ok: true,
    accessToken: `access-${++issued}`,
    expiresIn: 60,
    tokenType: 'Bearer',
  })
  const first = await Promise.all(
    Array.from({ length: 40 }, () => cache.get('https://a.test', 'device-a', issue)),
  )
  expect(issued).toBe(1)
  expect(new Set(first).size).toBe(1)
  await cache.get('https://a.test', 'device-b', issue)
  expect(issued).toBe(2)
  now = 30000
  await cache.get('https://a.test', 'device-a', issue)
  expect(issued).toBe(3)
  await cache.get('https://b.test', 'device-a', issue)
  expect(issued).toBe(4)
  cache.forget('https://b.test', 'device-a')
  expect(
    await cache.get('https://b.test', 'device-a', async () => ({ ok: false, status: 429 })),
  ).toEqual({ ok: false, status: 429 })
  await cache.get('https://b.test', 'device-a', issue)
  expect(issued).toBe(5)
})
test('disconnect while issuance is in flight cannot repopulate the credential cache', async () => {
  const cache = new DesktopAccessCache()
  let finish: (result: DesktopAccess) => void = () => {
    throw new Error('Not started')
  }
  const pending = new Promise<DesktopAccess>((resolve) => {
    finish = resolve
  })
  const flight = cache.get('https://a.test', 'credential', () => pending)
  cache.forget('https://a.test', 'credential')
  finish({ ok: true, accessToken: 'old', tokenType: 'Bearer', expiresIn: 3600 })
  await flight
  expect(
    await cache.get('https://a.test', 'credential', async () => ({ ok: false, status: 401 })),
  ).toEqual({ ok: false, status: 401 })
})
