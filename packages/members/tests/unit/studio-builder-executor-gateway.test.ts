import { expect, test } from 'bun:test'
import { createStudioBuilderExecutorDelivery } from '../../src/infrastructure/gateways/studio-builder-executor.gateway'

const job = {
  id: crypto.randomUUID(),
  projectId: 'qa-project',
  parentOrigin: 'https://adult.test',
  actor: {
    userId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    privileged: false,
    audience: 'adult' as const,
  },
}

test('builder callback selects the owning audience and preserves the signed actor', async () => {
  const calls: { url: string; body: unknown; redirect: unknown }[] = []
  const fetchImpl: typeof fetch = Object.assign(
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(init?.body)),
        redirect: init?.redirect,
      })
      return Response.json({ ok: true })
    },
    { preconnect: fetch.preconnect },
  )
  const deliver = createStudioBuilderExecutorDelivery({
    kidsUrl: 'https://kids.test/execute',
    adultUrl: 'https://adult.test/execute',
    secret: 'qa-only',
    fetchImpl,
  })
  await deliver(job, new AbortController().signal)
  await deliver({ ...job, actor: { ...job.actor, audience: 'kids' } }, new AbortController().signal)
  expect(calls.map((call) => call.url)).toEqual([
    'https://adult.test/execute',
    'https://kids.test/execute',
  ])
  expect(calls[0]?.body).toEqual(job)
  expect(calls.every((call) => call.redirect === 'error')).toBe(true)
})

test('missing adult executor fails before transport even when the Kids executor exists', async () => {
  let called = false
  const fetchImpl: typeof fetch = Object.assign(
    async () => {
      called = true
      return Response.json({ ok: true })
    },
    { preconnect: fetch.preconnect },
  )
  const deliver = createStudioBuilderExecutorDelivery({
    kidsUrl: 'https://kids.test/execute',
    secret: 'qa-only',
    fetchImpl,
  })
  await expect(deliver(job, new AbortController().signal)).rejects.toThrow('não configurado')
  expect(called).toBe(false)
})
