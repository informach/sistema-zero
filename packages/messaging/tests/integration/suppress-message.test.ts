import { expect, test } from 'bun:test'
import { Message } from '../../src/domain/message/message.aggregate'
import { buildApp, postJson } from '../helpers'

test('retirada S2S exige token e consumidor próprio, recusando corpo extra', async () => {
  const now = new Date('2026-10-24T12:00:00Z')
  const { app, messages } = buildApp({ internalToken: 'qa-internal-messaging', now })
  const item = Message.create({
    id: crypto.randomUUID(),
    channel: 'email',
    templateKey: 'recovery-qa',
    recipient: { name: 'QA', email: 'qa@example.test' },
    renderedSubject: 'Aviso QA',
    renderedBody: 'Aviso QA',
    consumerId: 'payments',
    now,
  })
  await messages.create(item)
  const path = `/messaging/messages/${item.id}/suppress`
  expect((await app.handle(postJson(path, {}))).status).toBe(401)
  const headers = { 'x-internal-token': 'qa-internal-messaging' }
  expect((await app.handle(postJson(path, {}, headers))).status).toBe(401)
  expect(
    (await app.handle(postJson(path, {}, { ...headers, 'x-consumer-id': 'other' }))).status,
  ).toBe(404)
  expect(
    (
      await app.handle(
        postJson(path, { unexpected: true }, { ...headers, 'x-consumer-id': 'payments' }),
      )
    ).status,
  ).toBe(400)
  expect((await messages.findById(item.id))?.status).toBe('QUEUED')
  const result = await app.handle(postJson(path, {}, { ...headers, 'x-consumer-id': 'payments' }))
  expect(result.status).toBe(200)
  expect(await result.json()).toMatchObject({
    suppressed: true,
    message: { id: item.id, status: 'SUPPRESSED' },
  })
})
