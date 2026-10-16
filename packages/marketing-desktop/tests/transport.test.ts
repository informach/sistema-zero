import { expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readBoundedJson } from '../src/main/bounded-json'
import { SerialQueue } from '../src/main/serial-queue'
import { workspaceRequestSchema, workspaceResponseSchema } from '../src/shared/connection'
import { parseDeepLink } from '../src/shared/deep-link'

test('consulta de equipe aceita acentos sem ampliar a ponte para outros caminhos', () => {
  const scope = { origin: 'https://marketing.example.test', userId: randomUUID() },
    project = randomUUID()
  for (const path of [
    `/projects/${project}/staff?q=Revis%C3%A3o`,
    `/projects/${project}/runs?entityId=${randomUUID()}&before=${randomUUID()}`,
    `/engagement/accounts/${randomUUID()}/conversations?before=${randomUUID()}`,
    `/projects/${project}/pieces/${randomUUID()}/engagement/commercial?from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-15T00%3A00%3A00.000Z`,
  ])
    expect(workspaceRequestSchema.safeParse({ scope, path, method: 'GET' }).success).toBe(true)
  for (const path of [
    'https://example.com/projects',
    '/projects/../auth',
    '/projects?q=x&q=y',
    '/projects?command=whoami',
    `/projects/${project}/staff?q=ok&redirect=https://evil.test`,
    `/engagement/accounts?from=2026-10-01T00:00:00.000Z`,
    `/projects/${project}/pieces/${randomUUID()}/engagement/summary?from=inválida`,
  ])
    expect(workspaceRequestSchema.safeParse({ scope, path, method: 'GET' }).success).toBe(false)
})
test('envelope IPC preserva erros definitivos para impedir retry cego de comandos', () => {
  const response = workspaceResponseSchema.parse(
    structuredClone({
      ok: false,
      error: { status: 409, code: 'CONCURRENCY_CONFLICT', message: 'O estado mudou' },
    }),
  )
  expect(response.ok).toBe(false)
  expect(workspaceResponseSchema.safeParse({ ok: true, value: { version: 2 } }).success).toBe(true)
  expect(workspaceResponseSchema.safeParse({ ok: false, error: new Error('Falhou') }).success).toBe(
    false,
  )
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
