import { expect, test } from 'bun:test'
import { Elysia, t } from 'elysia'
import { CreateSubscriptionBody } from '../../src/interfaces/http/dtos'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { silentLogger } from '../fakes/in-memory'

test('validação do pedido prova ausência de criação; validação da resposta nunca fornece essa prova', async () => {
  let created = 0
  const app = new Elysia()
    .onError(({ code, error }) => {
      const result = buildErrorResponse({ code, error, logger: silentLogger })
      return Response.json(result.body, { status: result.status })
    })
    .post(
      '/subscriptions',
      () => {
        created++
        return {}
      },
      { body: CreateSubscriptionBody },
    )
    .get('/invalid-receipt', () => JSON.parse('{"bad":true}'), {
      response: t.Object({ id: t.String() }),
    })
  const response = await app.handle(
    new Request('http://localhost/subscriptions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        amountInCents: 3700,
        intervalMonths: 1,
        card: { token: 'only-token', brand: 'visa', last4: '1111' },
        customer: {
          name: 'Teste',
          email: 'teste@example.com',
          document: '52998224725',
          phone: '11988887777',
          birth: '1985-01-01',
          address: {
            street: 'Rua',
            number: '10',
            neighborhood: 'Centro',
            zipcode: '',
            city: 'São Paulo',
            state: 'SP',
          },
        },
      }),
    }),
  )
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({
    paymentCreation: 'not_started',
    error: { code: 'VALIDATION_ERROR' },
  })
  expect(created).toBe(0)
  const invalidReceipt = await app.handle(new Request('http://localhost/invalid-receipt'))
  expect(invalidReceipt.status).toBe(400)
  expect(await invalidReceipt.json()).not.toHaveProperty('paymentCreation')
})
