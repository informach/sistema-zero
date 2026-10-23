import { expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { GetMessageService } from '../../src/application/get-message/get-message.service'
import { SendMessageService } from '../../src/application/send-message/send-message.service'
import { Template } from '../../src/domain/template/template.aggregate'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { staffRoutes } from '../../src/interfaces/http/routes/staff.routes'
import {
  InMemoryMessageRepository,
  InMemorySenderRepository,
  InMemorySuppressionRepository,
  InMemoryTemplateRepository,
  silentLogger,
} from '../fakes/in-memory'

test('staff delegation isolates receipts by actor, rejects non-auth consumers and keeps 202 distinct from delivery', async () => {
  const templates = new InMemoryTemplateRepository(),
    messages = new InMemoryMessageRepository()
  await templates.create(
    Template.create({
      id: crypto.randomUUID(),
      key: 'fixture',
      channel: 'whatsapp',
      name: 'Fixture',
      body: 'Hello {{name}}',
      variables: ['name'],
      now: new Date(),
    }),
  )
  const sendMessage = new SendMessageService(
    templates,
    messages,
    new InMemorySenderRepository(),
    new InMemorySuppressionRepository(),
    { now: () => new Date() },
    () => crypto.randomUUID(),
    5,
  )
  const app = new Elysia()
    .onError(({ code, error, set }) => {
      const result = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = result.status
      return result.body
    })
    .use(
      staffRoutes({
        sendMessage,
        getMessage: new GetMessageService(messages),
        internalToken: 'fixture-internal',
        authConsumerId: 'auth',
      }),
    )
  const actorId = crypto.randomUUID(),
    intentId = 'fixture-intent'
  const message = {
    intentId,
    channel: 'whatsapp',
    templateKey: 'fixture',
    recipient: { name: 'Receiver', phone: '5511999999999' },
    variables: { name: 'Fixture' },
  }
  const call = (path: string, body: unknown, consumer = 'auth', internal = 'fixture-internal') =>
    app.handle(
      new Request(`http://localhost/messaging/staff/${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': internal,
          'x-consumer-id': consumer,
        },
        body: JSON.stringify(body),
      }),
    )
  expect((await call('send', { actorId, message }, 'funnel')).status).toBe(401)
  expect((await call('send', { actorId, message }, 'auth', 'bad')).status).toBe(401)
  const first = await call('send', { actorId, message })
  expect(first.status).toBe(202)
  const receiptSchema = z.object({
    id: z.string(),
    status: z.string(),
    deliveredAt: z.string().nullable(),
  })
  const receipt = receiptSchema.parse(await first.json())
  expect(receipt.status).toBe('QUEUED')
  expect(receipt.deliveredAt).toBeNull()
  expect(receiptSchema.parse(await (await call('send', { actorId, message })).json()).id).toBe(
    receipt.id,
  )
  expect((await call('status', { actorId: crypto.randomUUID(), intentId })).status).toBe(404)
  expect(receiptSchema.parse(await (await call('status', { actorId, intentId })).json()).id).toBe(
    receipt.id,
  )
  expect(
    (await call('send', { actorId, message: { ...message, variables: { name: 'changed' } } }))
      .status,
  ).toBe(409)
})
