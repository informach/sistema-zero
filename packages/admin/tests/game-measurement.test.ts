import { expect, test } from 'bun:test'
import { gameAdminRequest } from '../src/lib/arquipelago-admin'

test('BFF permite só leitura agregada com período e público explícitos', () => {
  const query = new URLSearchParams({ de: '2026-10-01', ate: '2026-10-28', publico: 'adulto' })
  expect(gameAdminRequest('GET', ['medicao'], query, undefined)).toEqual({
    path: '/arquipelago/equipe/medicao',
    query: Object.fromEntries(query),
    body: undefined,
  })
  expect(() => gameAdminRequest('POST', ['medicao'], query, {})).toThrow()
  expect(() => gameAdminRequest('GET', ['medicao', 'pessoa'], query, undefined)).toThrow()
  query.set('perfilId', 'individual')
  expect(() => gameAdminRequest('GET', ['medicao'], query, undefined)).toThrow()
  query.delete('perfilId')
  query.delete('publico')
  expect(() => gameAdminRequest('GET', ['medicao'], query, undefined)).toThrow()
})
