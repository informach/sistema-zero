import { expect, test } from 'bun:test'
import { publicAddress, publicFetch } from '../src/tools/web'

test('research blocks localhost, mapped IPv6 and private addressing before a request', async () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '172.16.2.1',
    '192.168.1.1',
    '169.254.169.254',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
  ])
    expect(publicAddress(address)).toBe(false)
  expect(publicAddress('1.1.1.1')).toBe(true)
  await expect(publicFetch('https://127.0.0.1', new AbortController().signal)).rejects.toThrow(
    'private',
  )
  await expect(
    publicFetch('https://example.com:9443', new AbortController().signal),
  ).rejects.toThrow('443')
})
