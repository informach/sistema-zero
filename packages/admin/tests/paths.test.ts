import { describe, expect, test } from 'bun:test'
import { safeNextPath } from '../src/lib/paths'

describe('safeNextPath', () => {
  test('aceita caminhos internos do painel', () => {
    expect(safeNextPath('/admin')).toBe('/admin')
    expect(safeNextPath('/admin/pagamentos/transacoes?status=paid')).toBe(
      '/admin/pagamentos/transacoes?status=paid',
    )
  })

  test('rejeita tudo que não é caminho do painel (anti open-redirect)', () => {
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
    expect(safeNextPath('')).toBeNull()
    expect(safeNextPath('/login')).toBeNull()
    expect(safeNextPath('https://evil.com/admin')).toBeNull()
    expect(safeNextPath('//evil.com/admin')).toBeNull()
    expect(safeNextPath('/admin\\..\\x')).toBeNull()
    expect(safeNextPath('/admin/x://y')).toBeNull()
  })
})
