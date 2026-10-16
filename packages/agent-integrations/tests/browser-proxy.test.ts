import { expect, test } from 'bun:test'
import { request } from 'node:http'
import { browserProxy } from '../src/browser/proxy'

test('browser proxy authenticates, scopes loopback and rechecks lease before forwarding', async () => {
  let forwarded = 0
  let granted = true
  const target = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: (request) => {
      forwarded++
      if (request.headers.has('proxy-authorization')) throw new Error('Proxy credential leaked')
      return new Response('owned preview')
    },
  })
  const proxy = await browserProxy({
    localOrigins: [target.url.origin],
    publicWeb: false,
    allowLocal: async () => granted,
  })
  const call = (url: string, authenticate = true) =>
    new Promise<{ status: number; text: string }>((resolve, reject) => {
      const endpoint = new URL(proxy.proxy.server)
      const req = request(
        {
          hostname: endpoint.hostname,
          port: endpoint.port,
          path: url,
          headers: authenticate
            ? {
                'proxy-authorization':
                  'Basic ' +
                  Buffer.from(proxy.proxy.username + ':' + proxy.proxy.password).toString('base64'),
              }
            : {},
        },
        (response) => {
          let text = ''
          response.on('data', (data) => {
            text += data
          })
          response.on('end', () => resolve({ status: response.statusCode ?? 0, text }))
        },
      )
      req.on('error', reject)
      req.end()
    })
  try {
    expect((await call(target.url.href, false)).status).toBe(407)
    expect((await call('http://127.0.0.1:1')).status).toBe(403)
    expect(await call(target.url.href)).toEqual({ status: 200, text: 'owned preview' })
    granted = false
    expect((await call(target.url.href)).status).toBe(403)
    expect(forwarded).toBe(1)
  } finally {
    await proxy.close()
    target.stop(true)
  }
})
