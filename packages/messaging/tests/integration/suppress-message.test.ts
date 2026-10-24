import { expect, test } from 'bun:test'
import { Message } from '../../src/domain/message/message.aggregate'
import { buildApp, postJson } from '../helpers'

test('retirada de intenção exige consumer/token/key e impede enqueue posterior sem template ativo', async () => {
  const { app, messages } = buildApp({
    internalToken: 'qa-internal-messaging',
    now: new Date('2026-10-24T12:00:00Z'),
  })
  const path = '/messaging/intents/suppress'
  const body = {
    channel: 'email',
    templateKey: 'qa-missing-template',
    recipient: { name: 'QA', email: 'qa@example.test' },
  }
  const headers = {
    'x-internal-token': 'qa-internal-messaging',
    'x-consumer-id': 'payments',
    'idempotency-key': 'qa-withdrawn-intent',
  }
  for (const absent of ['x-internal-token', 'x-consumer-id', 'idempotency-key']) {
    const incomplete: Record<string, string> = { ...headers }
    delete incomplete[absent]
    expect((await app.handle(postJson(path, body, incomplete))).status).toBe(401)
  }
  const response = await app.handle(postJson(path, body, headers))
  expect(response.status).toBe(200)
  const receipt = await response.json()
  const stored = await messages.findByIdempotency('payments', 'qa-withdrawn-intent')
  expect(receipt).toMatchObject({
    suppressed: true,
    message: { id: stored?.id, status: 'SUPPRESSED', attempts: 0 },
  })
  const late = await app.handle(postJson('/messaging/send', body, headers))
  expect(late.status).toBe(202)
  expect(await late.json()).toMatchObject({ id: stored?.id, status: 'SUPPRESSED' })
  expect(await messages.claimDueEmail(10, new Date('2026-10-24T12:01:00Z'), 60_000)).toHaveLength(0)
  const changed = await app.handle(
    postJson(path, { ...body, variables: { extra: 'different' } }, headers),
  )
  expect(changed.status).toBe(409)
})

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
