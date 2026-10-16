import { expect, test } from 'bun:test'
import { BrowserWorkspaceAdapter, WorkspaceHttpError } from '../src/browser-adapter'

test('consultas e escritas compartilham a pausa sem repetir pedidos ou perder o corpo da escrita', async () => {
  const calls: unknown[] = []
  const serverError = new WorkspaceHttpError(429, 'TOO_MANY_REQUESTS', 'Aguarde', 60000)
  const port = new BrowserWorkspaceAdapter('review', async (path, method, body) => {
    calls.push({ path, method, body })
    throw serverError
  })
  const input = { operationId: crypto.randomUUID(), text: 'Texto preservado' }
  await expect(port.request('/operations', 'POST', input)).rejects.toBe(serverError)
  for (const path of ['/projects', '/projects/review/changes', '/operations'])
    await expect(port.request(path)).rejects.toThrow('pausa')
  expect(calls).toEqual([{ path: '/operations', method: 'POST', body: input }])
})
test('falhas incertas não criam uma pausa de limite nem provocam replay automático', async () => {
  let calls = 0
  const port = new BrowserWorkspaceAdapter('review', async () => {
    calls++
    throw new WorkspaceHttpError(503, 'UNAVAILABLE', 'Servidor indisponível')
  })
  await expect(port.request('/projects')).rejects.toThrow('indisponível')
  await expect(port.request('/projects')).rejects.toThrow('indisponível')
  expect(calls).toBe(2)
})
