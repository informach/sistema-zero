import { createApplication } from '../../src/composition-root'
import { loadEnv } from '../../src/infrastructure/config/env'
import { studioSealedRoutes } from '../../src/infrastructure/config/pinta-causal-routes'

// Separate QA process: no service composition root becomes a frontend library dependency.
const secret = process.env.LG04_GATEWAY_SECRET
const token = process.env.LG04_INTERNAL_TOKEN
if (process.env.NODE_ENV !== 'test' || !secret || !token)
  throw new Error('This listener requires the isolated LG04 QA configuration.')
const gateway = await createApplication(
  loadEnv({
    NODE_ENV: 'test',
    PORT: '19006',
    LOG_LEVEL: 'warn',
    SHUTDOWN_DRAIN_MS: '0',
    TRUST_PROXY: 'true',
    TRUSTED_PROXY_HOPS: '1',
  }),
  {
    rawConfig: {
      consumers: [{ id: 'member-shell', hmacSecret: secret, allowedCidrs: ['127.0.0.1/32'] }],
      services: {
        members: {
          name: 'members',
          upstreamGroups: { default: [{ id: 'lg04-members', url: 'http://127.0.0.1:19005' }] },
        },
      },
      routes: studioSealedRoutes([
        { type: 'header-inject', options: { headers: { 'x-internal-token': token } } },
      ]),
    },
  },
)
Bun.serve({
  hostname: '127.0.0.1',
  port: 19006,
  fetch(req, socket) {
    const headers = new Headers(req.headers),
      address = socket.requestIP(req)?.address
    if (!address) return new Response(null, { status: 503 })
    headers.set('x-forwarded-for', address)
    return gateway.handle(new Request(req, { headers }))
  },
})
