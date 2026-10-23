import { expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'
import type { EngagementEngine } from '../../src/domain/ports/engagement-engine.port'
import { parseMetaEvents } from '../../src/infrastructure/gateways/meta/engagement-webhook'
import { buildTestApp, INTERNAL_TOKEN } from '../helpers'

const secret = 'test-only-meta-secret',
  verifyToken = 'test-only-verification-token'
const raw = JSON.stringify(
  {
    object: 'instagram',
    entry: [
      {
        id: 'account',
        time: Date.now(),
        changes: [
          {
            field: 'comments',
            value: {
              id: 'comment-1',
              from: { id: 'person' },
              media: { id: 'media' },
              text: 'FÉRIAS',
            },
          },
          { field: 'unsupported' },
        ],
        messaging: [
          {
            sender: { id: 'person' },
            recipient: { id: 'account' },
            timestamp: Date.now(),
            message: { mid: 'message-1', text: 'FERIAS', attachments: [{ type: 'image' }] },
          },
          {
            sender: { id: 'person' },
            recipient: { id: 'account' },
            timestamp: Date.now(),
            postback: { mid: 'button-1', payload: 'sz:journey:offer' },
          },
        ],
      },
    ],
  },
  null,
  2,
)
const signature = (body: string) =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
test('webhook valida bytes originais, token interno e challenge; ACK depende da persistência', async () => {
  const received: unknown[] = []
  const logs: unknown[] = []
  let fail = false
  const engine: EngagementEngine = {
    async ingest(events) {
      if (fail) throw new Error('SQL params include private-message-must-not-leak')
      received.push(events)
      return events.length
    },
    async process() {
      return 0
    },
    async bindings() {
      return []
    },
    async bind() {},
    async claim() {
      return null
    },
    async finish() {},
    async maintain() {},
  }
  const { app } = buildTestApp({
    logger: {
      debug() {},
      info() {},
      warn() {},
      error(message, context) {
        logs.push({ message, context })
      },
    },
    engagementWebhook: { engine, internalToken: INTERNAL_TOKEN, appSecret: secret, verifyToken },
  })
  const request = (body: string, sig = signature(raw), internal = INTERNAL_TOKEN) =>
    app.handle(
      new Request('http://localhost/marketing/webhooks/instagram', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': internal,
          'x-hub-signature-256': sig,
        },
        body,
      }),
    )
  expect((await request(raw)).status).toBe(200)
  expect(received).toHaveLength(1)
  expect((await request(`${raw} `)).status).toBe(401)
  expect((await request(raw, signature(raw), 'forged')).status).toBe(401)
  expect(received).toHaveLength(1)
  const challenge = await app.handle(
    new Request(
      `http://localhost/marketing/webhooks/instagram?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=123`,
      { headers: { 'x-internal-token': INTERNAL_TOKEN } },
    ),
  )
  expect(await challenge.text()).toBe('123')
  fail = true
  expect((await request(raw)).status).toBe(500)
  expect(JSON.stringify(logs)).not.toContain('private-message-must-not-leak')
  expect(logs).toContainEqual({
    message: 'engagement.http.failed',
    context: { code: 'INTERNAL_ERROR' },
  })
})
test('normalização preserva todos os eventos conhecidos e anexos não acionam palavra', () => {
  const events = parseMetaEvents(Buffer.from(raw))
  expect(events.map((event) => event.kind)).toEqual(['comment', 'unsupported', 'postback'])
  expect(events[0]?.text).toBe('FÉRIAS')
  expect(new Set(events.map((e) => e.key)).size).toBe(3)
})
