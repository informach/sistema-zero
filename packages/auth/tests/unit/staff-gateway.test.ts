import { expect, test } from 'bun:test'
import { createStaffGateway } from '../../src/infrastructure/messaging/staff-gateway'

test('staff gateway keeps HMAC and Studio credentials server-side and preserves build failure output', async () => {
  const calls: {
    path: string
    authorization: string | null
    signature: string | null
    body: unknown
  }[] = []
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname
      calls.push({
        path,
        authorization: request.headers.get('authorization'),
        signature: request.headers.get('x-signature'),
        body: await request.json(),
      })
      return path === '/v1/build'
        ? Response.json(
            {
              ok: false,
              code: 'BUILD_FAILED',
              message: 'Compile error',
              output: 'src/main.ts: invalid symbol',
            },
            { status: 422 },
          )
        : Response.json({ status: 'QUEUED' }, { status: 202 })
    },
  })
  try {
    const gateway = createStaffGateway({
      gatewayUrl: server.url.origin,
      studioUrl: server.url.origin,
      studioToken: 'studio-server-secret',
      consumerId: 'auth',
      hmacSecret: 'hmac-server-secret',
    })
    const actorId = crypto.randomUUID()
    const sent = await gateway.execute(
      {
        action: 'messages.send',
        message: {
          intentId: 'fixture-intent',
          channel: 'email',
          recipient: { name: 'Fixture', email: 'test@example.com' },
          templateKey: 'fixture',
          variables: {},
        },
      },
      actorId,
      'access-secret',
    )
    expect(sent.status).toBe(202)
    expect(calls[0]?.authorization).toBeNull()
    expect(calls[0]?.signature).toMatch(/^t=\d+,v1=/)
    expect(calls[0]?.body).toMatchObject({ actorId })
    const build = await gateway.execute(
      {
        action: 'studio.build',
        build: {
          executionId: crypto.randomUUID(),
          templateId: 'react-ts',
          files: { 'index.html': '<main/>', 'package.json': '{"scripts":{"malicious":"bad"}}' },
        },
      },
      actorId,
      'access-secret',
    )
    expect(build).toMatchObject({
      status: 200,
      value: {
        ok: false,
        code: 'BUILD_FAILED',
        output: 'src/main.ts: invalid symbol',
        upstreamStatus: 422,
      },
    })
    expect(calls[1]?.authorization).toBe('Bearer studio-server-secret')
    expect(calls[1]?.signature).toBeNull()
    expect(calls[1]?.body).toMatchObject({ files: { 'index.html': '<main/>' } })
    expect(JSON.stringify(calls[1]?.body)).not.toContain('malicious')
    expect(JSON.stringify(build)).not.toContain('secret')
  } finally {
    await server.stop(true)
  }
})
