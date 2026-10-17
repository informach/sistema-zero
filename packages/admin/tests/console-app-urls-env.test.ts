import { expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { optionalAppUrl } = await import('../src/lib/env')

test('URL de outro console: em branco ou inválida vira ausente, sem derrubar o painel', () => {
  expect(optionalAppUrl.parse('https://atendimento.sistemazero.com.br')).toBe(
    'https://atendimento.sistemazero.com.br',
  )
  expect(optionalAppUrl.parse('http://localhost:3014')).toBe('http://localhost:3014')
  expect(optionalAppUrl.parse(undefined)).toBeUndefined()
  expect(optionalAppUrl.parse('')).toBeUndefined()
  expect(optionalAppUrl.parse('   ')).toBeUndefined()
  // Sem esquema, o link sairia relativo ao próprio admin.
  expect(optionalAppUrl.parse('atendimento.sistemazero.com.br')).toBeUndefined()
  // Vira `href`: só http(s).
  expect(optionalAppUrl.parse('javascript:alert(1)')).toBeUndefined()
})
