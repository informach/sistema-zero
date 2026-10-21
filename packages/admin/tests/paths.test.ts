import { describe, expect, test } from 'bun:test'
import { safeNextPath } from '../src/lib/paths'

describe('safeNextPath', () => {
  test('aceita caminhos internos do painel', () => {
    expect(safeNextPath('/admin')).toBe('/admin')
    expect(safeNextPath('/admin/pagamentos/transacoes?status=paid')).toBe(
      '/admin/pagamentos/transacoes?status=paid',
    )
  })

  test('o next do login mantém a autoria em cursos e recusa destinos externos codificados', () => {
    const origin = 'http://localhost:43107'
    const login = new URL('/login?next=/admin/membros/cursos', origin)
    const next = safeNextPath(login.searchParams.get('next'))
    expect(next).toBe('/admin/membros/cursos')
    if (next === null) throw new Error('Destino de cursos recusado')
    expect(new URL(next, origin).href).toBe(`${origin}/admin/membros/cursos`)
    for (const destination of ['https://example.invalid/admin', '//example.invalid/admin']) {
      login.searchParams.set('next', destination)
      expect(safeNextPath(new URL(login.href).searchParams.get('next'))).toBeNull()
    }
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
