import { expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readBoundedJson } from '../src/main/bounded-json'
import { SerialQueue } from '../src/main/serial-queue'
import { workspaceRequestSchema } from '../src/shared/connection'
import { parseDeepLink } from '../src/shared/deep-link'

test('período analítico é aceito apenas no endpoint e intervalo previstos', () => {
  const scope = { origin: 'https://marketing.example.test', userId: randomUUID() }
  for (const endpoint of ['analytics', 'production']) {
    const base = `/projects/${randomUUID()}/${endpoint}`
    for (const path of [`${base}?days=1`, `${base}?days=365`])
      expect(workspaceRequestSchema.safeParse({ scope, path, method: 'GET' }).success).toBe(true)
    for (const path of [
      `${base}?days=0`,
      `${base}?days=366`,
      `${base}?days=90&days=7`,
      `${base}?days=-1`,
      `${base}/other?days=90`,
      `/projects?days=90`,
    ])
      expect(workspaceRequestSchema.safeParse({ scope, path, method: 'GET' }).success).toBe(false)
  }
})

test('consulta de equipe aceita acentos sem ampliar a ponte para outros caminhos', () => {
  const scope = { origin: 'https://marketing.example.test', userId: randomUUID() },
    project = randomUUID()
  for (const path of [
    `/projects/${project}/staff?q=Revis%C3%A3o`,
    `/projects/${project}/runs?entityId=${randomUUID()}&before=${randomUUID()}`,
  ])
    expect(workspaceRequestSchema.safeParse({ scope, path, method: 'GET' }).success).toBe(true)
  for (const path of [
    'https://example.com/projects',
    '/projects/../auth',
    '/projects?q=x&q=y',
    '/projects?command=whoami',
    `/projects/${project}/staff?q=ok&redirect=https://evil.test`,
  ])
    expect(workspaceRequestSchema.safeParse({ scope, path, method: 'GET' }).success).toBe(false)
})

test('passagem web aceita só referência opaca e origem válida, nunca comando ou caminho', () => {
  const id = randomUUID(),
    origin = 'https://marketing.example.test'
  expect(
    parseDeepLink(
      `sistema-zero-marketing://open/${id}?server=${encodeURIComponent(origin)}`,
      false,
    ),
  ).toEqual({ id, origin })
  for (const value of [
    `sistema-zero-marketing://run/${id}?server=${origin}`,
    `sistema-zero-marketing://open/${id}?server=file:///C:/secret`,
    `sistema-zero-marketing://open/${id}?server=${origin}&command=whoami`,
    `sistema-zero-marketing://open/../../secret?server=${origin}`,
  ])
    expect(() => parseDeepLink(value, false)).toThrow()
})

test('filtro de cobertura fica restrito à consulta do inventário e rejeita duplicatas', () => {
  const scope = { origin: 'https://marketing.example.test', userId: randomUUID() },
    coverage = `/projects/${randomUUID()}/imports/${randomUUID()}/coverage`
  for (const state of [
    'all',
    'loaded',
    'pending',
    'review',
    'blocked',
    'excluded',
    'other-product',
    'unbound',
  ])
    expect(
      workspaceRequestSchema.safeParse({
        scope,
        path: `${coverage}?state=${state}&cursor=100`,
        method: 'GET',
      }).success,
    ).toBe(true)
  for (const path of [
    `${coverage}?state=approved`,
    `${coverage}?state=loaded&state=pending`,
    '/projects?state=loaded',
    `${coverage}/other?state=loaded`,
    `${coverage}?state=loaded&cursor=-1`,
  ])
    expect(workspaceRequestSchema.safeParse({ scope, path, method: 'GET' }).success).toBe(false)
})

test('comparação de inventários aceita somente identidade opaca e estados próprios no caminho específico', () => {
  const scope = { origin: 'https://marketing.example.test', userId: randomUUID() },
    base = `/projects/${randomUUID()}/imports/${randomUUID()}/compare`,
    previousId = randomUUID()
  for (const state of ['all', 'added', 'removed', 'changed', 'reclassified', 'unchanged'])
    expect(
      workspaceRequestSchema.safeParse({
        scope,
        path: `${base}?previousId=${previousId}&state=${state}&cursor=200`,
        method: 'GET',
      }).success,
    ).toBe(true)
  for (const route of [
    `${base}?previousId=../outside`,
    `${base}?previousId=${previousId}&previousId=${randomUUID()}`,
    `${base}?state=loaded`,
    `/projects?previousId=${previousId}`,
    `${base}/other?state=changed`,
  ])
    expect(workspaceRequestSchema.safeParse({ scope, path: route, method: 'GET' }).success).toBe(
      false,
    )
})

test('limite de bytes aborta stream sem content-length, incluindo UTF-8', async () => {
  let cancelled = false
  const response = new Response(
    new ReadableStream({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode('á'.repeat(20)))
      },
      cancel() {
        cancelled = true
      },
    }),
  )
  await rejects(() => readBoundedJson(response, 50), /limite/)
  expect(cancelled).toBe(true)
  expect(await readBoundedJson(Response.json({ texto: 'ação' }), 100)).toEqual({ texto: 'ação' })
})
test('fila serial mantém ordem e propaga falha sem bloquear a próxima operação', async () => {
  const queue = new SerialQueue(),
    order: number[] = []
  const first = queue.run(async () => {
    await Promise.resolve()
    order.push(1)
    throw new Error('falha esperada')
  })
  const second = queue.run(async () => {
    order.push(2)
    return 'concluído'
  })
  await rejects(first, /falha esperada/)
  expect(await second).toBe('concluído')
  expect(order).toEqual([1, 2])
})
