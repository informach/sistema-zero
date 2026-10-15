import { randomBytes, timingSafeEqual } from 'node:crypto'
import {
  createServer,
  request as httpRequest,
  type IncomingHttpHeaders,
  type IncomingMessage,
} from 'node:http'
import { connect, type Socket } from 'node:net'
import type { Duplex } from 'node:stream'
import { publicAddresses } from '../network/address'

export interface BrowserNetwork {
  localOrigins: string[]
  allowLocal: (origin: string) => Promise<boolean>
  publicWeb: boolean
}
export async function browserProxy(policy: BrowserNetwork) {
  const username = 'zero'
  const password = randomBytes(32).toString('hex')
  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  const sockets = new Set<Socket>()
  const dns = new Map<string, { address: string; expires: number }>()
  let bytes = 0
  let active = 0
  let closed = false
  const authenticate = (request: IncomingMessage) => {
    const value = request.headers['proxy-authorization'] ?? ''
    return (
      Buffer.byteLength(value) === Buffer.byteLength(auth) &&
      timingSafeEqual(Buffer.from(value), Buffer.from(auth))
    )
  }
  const consume = (amount: number, socket: Duplex) => {
    bytes += amount
    if (bytes > 128_000_000) {
      closed = true
      for (const connection of sockets) connection.destroy()
      socket.destroy(new Error('Browser network quota reached'))
    }
  }
  async function target(url: URL) {
    if (closed || url.username || url.password || url.hash)
      throw new Error('Invalid browser network target')
    if (policy.localOrigins.includes(url.origin)) {
      if (
        url.hostname !== '127.0.0.1' ||
        url.protocol !== 'http:' ||
        !(await policy.allowLocal(url.origin))
      )
        throw new Error('Preview lease is no longer valid')
      return { address: '127.0.0.1', port: Number(url.port || 80) }
    }
    if (!policy.publicWeb || url.protocol !== 'https:' || (url.port && url.port !== '443'))
      throw new Error('Browser network requires public HTTPS or a granted preview origin')
    const cached = dns.get(url.hostname)
    if (cached && cached.expires > Date.now()) return { address: cached.address, port: 443 }
    const address = (await publicAddresses(url.hostname))[0]?.address
    if (closed) throw new Error('Browser proxy stopped')
    if (!address) throw new Error('No public network address')
    if (dns.size >= 64) dns.delete(dns.keys().next().value ?? '')
    dns.set(url.hostname, { address, expires: Date.now() + 30000 })
    return { address, port: 443 }
  }
  const server = createServer(
    { maxHeaderSize: 16000, requestTimeout: 30000, headersTimeout: 10000 },
    async (incoming, outgoing) => {
      if (!authenticate(incoming)) {
        outgoing.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="Sistema Zero"' }).end()
        return
      }
      if (++active > 32) {
        active--
        outgoing.writeHead(429).end()
        return
      }
      try {
        const url = new URL(incoming.url ?? '')
        if (url.protocol !== 'http:') throw new Error('Use CONNECT for HTTPS')
        const destination = await target(url)
        const headers: IncomingHttpHeaders = { ...incoming.headers, host: url.host }
        delete headers['proxy-authorization']
        delete headers['proxy-connection']
        delete headers.connection
        const upstream = httpRequest(
          {
            hostname: destination.address,
            port: destination.port,
            method: incoming.method,
            path: url.pathname + url.search,
            headers,
            timeout: 30000,
            agent: false,
          },
          (response) => {
            outgoing.writeHead(response.statusCode ?? 502, response.headers)
            response.on('data', (data: Buffer) =>
              consume(data.length, outgoing.socket ?? incoming.socket),
            )
            response.on('error', () => outgoing.destroy())
            response.pipe(outgoing)
          },
        )
        upstream.on('timeout', () => upstream.destroy(new Error('Browser proxy request timed out')))
        upstream.on('error', () => {
          if (!outgoing.headersSent) outgoing.writeHead(502)
          outgoing.end()
        })
        incoming.on('data', (data: Buffer) => consume(data.length, incoming.socket))
        incoming.on('aborted', () => upstream.destroy())
        outgoing.on('close', () => upstream.destroy())
        incoming.pipe(upstream)
        await new Promise<void>((resolve) => outgoing.once('close', resolve))
      } catch {
        if (!outgoing.headersSent) outgoing.writeHead(403)
        outgoing.end('Browser network policy denied this target')
      } finally {
        active--
      }
    },
  )
  server.on('connection', (socket) => {
    if (sockets.size >= 64 || closed) {
      socket.destroy()
      return
    }
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    socket.on('error', () => socket.destroy())
    socket.setTimeout(60000, () => socket.destroy())
  })
  server.on('connect', (incoming, downstream, head) => {
    if (!authenticate(incoming)) {
      downstream.end(
        'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Sistema Zero"\r\n\r\n',
      )
      return
    }
    if (active >= 32 || closed) {
      downstream.destroy()
      return
    }
    active++
    void (async () => {
      const url = new URL(`https://${incoming.url}`)
      const destination = await target(url)
      if (url.pathname !== '/' || url.search) throw new Error('Invalid tunnel authority')
      const upstream = connect({ host: destination.address, port: destination.port })
      sockets.add(upstream)
      upstream.setTimeout(30000, () => upstream.destroy())
      upstream.once('close', () => {
        sockets.delete(upstream)
        downstream.destroy()
      })
      downstream.once('close', () => upstream.destroy())
      upstream.once('error', () => downstream.destroy())
      downstream.once('error', () => upstream.destroy())
      await new Promise<void>((resolve, reject) => {
        upstream.once('connect', resolve)
        upstream.once('error', reject)
      })
      downstream.write('HTTP/1.1 200 Connection Established\r\n\r\n')
      if (head.length) upstream.write(head)
      upstream.on('data', (data: Buffer) => consume(data.length, downstream))
      downstream.on('data', (data: Buffer) => consume(data.length, downstream))
      upstream.pipe(downstream)
      downstream.pipe(upstream)
      await new Promise<void>((resolve) => downstream.once('close', resolve))
    })()
      .catch(() => downstream.destroy())
      .finally(() => {
        active--
      })
  })
  // WebSocket traffic to local previews uses the same origin/ownership checks.
  server.on('upgrade', (incoming, downstream, head) => {
    if (!authenticate(incoming) || active >= 32 || closed) {
      downstream.destroy()
      return
    }
    active++
    void (async () => {
      const url = new URL(incoming.url ?? '')
      if (url.protocol === 'ws:') url.protocol = 'http:'
      if (url.protocol !== 'http:') throw new Error('Invalid WebSocket origin')
      const destination = await target(url)
      const headers: IncomingHttpHeaders = { ...incoming.headers, host: url.host }
      delete headers['proxy-authorization']
      delete headers['proxy-connection']
      const upstream = httpRequest({
        hostname: destination.address,
        port: destination.port,
        path: url.pathname + url.search,
        headers,
        timeout: 10000,
        agent: false,
      })
      upstream.on('timeout', () => upstream.destroy())
      upstream.on('error', () => downstream.destroy())
      downstream.once('close', () => upstream.destroy())
      upstream.on('response', (response) => {
        response.destroy()
        downstream.destroy()
      })
      upstream.on('upgrade', (response, socket, upstreamHead) => {
        sockets.add(socket)
        socket.once('close', () => {
          sockets.delete(socket)
          downstream.destroy()
        })
        socket.on('error', () => downstream.destroy())
        downstream.on('error', () => socket.destroy())
        downstream.once('close', () => socket.destroy())
        downstream.write(
          'HTTP/1.1 101 Switching Protocols\r\n' +
            Object.entries(response.headers)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\r\n') +
            '\r\n\r\n',
        )
        if (upstreamHead.length) downstream.write(upstreamHead)
        if (head.length) socket.write(head)
        socket.on('data', (data: Buffer) => consume(data.length, downstream))
        downstream.on('data', (data: Buffer) => consume(data.length, downstream))
        socket.pipe(downstream)
        downstream.pipe(socket)
      })
      upstream.end()
      await new Promise<void>((resolve) => downstream.once('close', resolve))
    })()
      .catch(() => downstream.destroy())
      .finally(() => {
        active--
      })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Proxy listener unavailable')
  return {
    proxy: { server: `http://127.0.0.1:${address.port}`, username, password },
    inspect: () => ({ bytes, active, sockets: sockets.size }),
    close: async () => {
      closed = true
      for (const socket of sockets) socket.destroy()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    },
  }
}
