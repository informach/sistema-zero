import { expect, test } from 'bun:test'
import {
  HttpCooldown,
  retryAfterHeaders,
  retryAfterMilliseconds,
} from '@sistemazero/marketing-contracts'
import { rateLimitedTransport } from '../src/main/sync/rate-limit'
import { SyncTransportError } from '../src/main/sync/sync-engine'

test('pausa compartilhada termina no prazo do servidor e não é estendida por recusas locais', () => {
  let now = 0
  const cooldown = new HttpCooldown(() => now)
  cooldown.observe(429, 60000)
  now = 12000
  expect(cooldown.remainingMilliseconds()).toBe(48000)
  cooldown.observe(503, 120000)
  cooldown.observe(429, Infinity)
  cooldown.observe(429, 120001)
  cooldown.observe(429, undefined)
  expect(cooldown.remainingMilliseconds()).toBe(48000)
  now = 60000
  expect(cooldown.remainingMilliseconds()).toBe(0)
  cooldown.observe(429, 1000)
  cooldown.reset()
  expect(cooldown.remainingMilliseconds()).toBe(0)
})

test('Retry-After preserva segundos e data HTTP; não transforma entrada inválida em espera infinita', () => {
  expect(retryAfterMilliseconds('60')).toBe(60000)
  expect(
    retryAfterMilliseconds('Thu, 15 Oct 2026 12:01:00 GMT', Date.parse('2026-10-15T12:00:00Z')),
  ).toBe(60000)
  expect(
    retryAfterMilliseconds('Thu, 15 Oct 2026 12:00:00 GMT', Date.parse('2026-10-15T12:01:00Z')),
  ).toBe(0)
  for (const value of [null, '', '-1', '1.5', 'Infinity', '99999999999999999999999', '2026-10-15'])
    expect(retryAfterMilliseconds(value)).toBeUndefined()
  expect(retryAfterHeaders(1001)).toEqual({ 'retry-after': '2' })
  expect(retryAfterHeaders(undefined)).toEqual({})
  expect(retryAfterHeaders(NaN)).toEqual({})
})
test('429 espera a janela indicada e repete exatamente a operação, com limite de tentativas', async () => {
  const input = { operationId: crypto.randomUUID(), content: 'bytes preservados' }
  const requests: unknown[] = [],
    waits: number[] = []
  const transport = rateLimitedTransport(
    {
      request: async (path, method, body) => {
        requests.push({ path, method, body })
        if (requests.length === 1) throw new SyncTransportError(429, 'RATE_LIMIT', 'Aguarde', 60000)
        return { confirmed: true }
      },
    },
    AbortSignal.timeout(1000),
    (milliseconds) => waits.push(milliseconds),
    async () => {},
  )
  expect(await transport.request('/projects/a/imports/b/load-source', 'POST', input)).toEqual({
    confirmed: true,
  })
  expect(requests).toEqual(
    Array(2).fill({ path: '/projects/a/imports/b/load-source', method: 'POST', body: input }),
  )
  expect(waits).toEqual([60000])
  let attempts = 0
  const limited = rateLimitedTransport(
    {
      request: async () => {
        attempts++
        throw new SyncTransportError(429, 'RATE_LIMIT', 'Aguarde', 0)
      },
    },
    AbortSignal.timeout(1000),
    () => {},
    async () => {},
  )
  await expect(limited.request('/x')).rejects.toThrow('Aguarde')
  expect(attempts).toBe(4)
})
test('cancelamento interrompe a espera; erro incerto, revogação e janela excessiva não são repetidos', async () => {
  const controller = new AbortController(),
    reason = new Error('Cancelado pelo usuário')
  let requests = 0
  const transport = rateLimitedTransport(
    {
      request: async () => {
        requests++
        throw new SyncTransportError(429, 'RATE_LIMIT', 'Aguarde', 60000)
      },
    },
    controller.signal,
    () => controller.abort(reason),
  )
  await expect(transport.request('/x')).rejects.toThrow()
  expect(requests).toBe(1)
  for (const error of [
    new SyncTransportError(503, 'SERVER_ERROR', 'Falha'),
    new SyncTransportError(401, 'REVOKED', 'Falha'),
    new SyncTransportError(429, 'RATE_LIMIT', 'Falha'),
    new SyncTransportError(429, 'RATE_LIMIT', 'Falha', 180001),
  ]) {
    let attempts = 0
    const one = rateLimitedTransport(
      {
        request: async () => {
          attempts++
          throw error
        },
      },
      AbortSignal.timeout(1000),
      () => {
        throw new Error('Não deveria esperar')
      },
    )
    await expect(one.request('/x')).rejects.toBe(error)
    expect(attempts).toBe(1)
  }
})
