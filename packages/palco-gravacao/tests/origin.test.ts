import { expect, mock, test } from 'bun:test'
import { NextRequest } from 'next/server'

// Next supplies this build-time marker on the server. No session/provider is mocked.
mock.module('server-only', () => ({}))
const { proxy } = await import('../src/proxy')

test('a entrada recusa formulário de outro site antes de autenticar', async () => {
  const response = await proxy(
    new NextRequest('https://palco.example/api/entrar', {
      method: 'POST',
      headers: { origin: 'https://outro.example', 'sec-fetch-site': 'cross-site' },
    }),
  )
  expect(response.status).toBe(403)
})

test('um subdomínio irmão não pode usar a sessão do palco', async () => {
  const response = await proxy(
    new NextRequest('https://palco.example/api/sair', {
      method: 'POST',
      headers: { origin: 'https://admin.example', 'sec-fetch-site': 'same-site' },
    }),
  )
  expect(response.status).toBe(403)
})

test('a entrada pela própria página funciona atrás do proxy do Railway', async () => {
  const response = await proxy(
    new NextRequest('http://internal:3010/api/entrar', {
      method: 'POST',
      headers: { origin: 'https://palco.example', 'x-forwarded-host': 'palco.example' },
    }),
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('x-middleware-next')).toBe('1')
})

test('a página de entrada pode ser aberta por link externo', async () => {
  const response = await proxy(
    new NextRequest('https://palco.example/entrar', {
      headers: { 'sec-fetch-site': 'cross-site' },
    }),
  )
  expect(response.status).toBe(200)
})
