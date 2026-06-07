import { describe, expect, test } from 'bun:test'
import { canImpersonate, impersonationUrl } from '../src/lib/impersonation'

const target = (over: Partial<{ id: string; role: string; status: string }> = {}) => ({
  id: over.id ?? 'alvo-1',
  role: over.role ?? 'customer',
  status: over.status ?? 'active',
})

describe('canImpersonate (matriz de UX — o auth re-checa no serviço)', () => {
  const superadmin = { id: 'sa-1', role: 'superadmin' }
  const admin = { id: 'adm-1', role: 'admin' }

  test('superadmin impersona qualquer role ativo', () => {
    for (const role of ['customer', 'staff', 'admin', 'superadmin']) {
      expect(canImpersonate(superadmin, target({ role }))).toBe(true)
    }
  })

  test('admin só impersona customer/staff', () => {
    expect(canImpersonate(admin, target({ role: 'customer' }))).toBe(true)
    expect(canImpersonate(admin, target({ role: 'staff' }))).toBe(true)
    expect(canImpersonate(admin, target({ role: 'admin' }))).toBe(false)
    expect(canImpersonate(admin, target({ role: 'superadmin' }))).toBe(false)
  })

  test('staff/customer nunca impersonam', () => {
    expect(canImpersonate({ id: 's-1', role: 'staff' }, target())).toBe(false)
    expect(canImpersonate({ id: 'c-1', role: 'customer' }, target())).toBe(false)
  })

  test('nunca a própria conta; nunca alvo inativo', () => {
    expect(canImpersonate(superadmin, target({ id: 'sa-1', role: 'superadmin' }))).toBe(false)
    for (const status of ['pending', 'suspended', 'blocked']) {
      expect(canImpersonate(superadmin, target({ status }))).toBe(false)
    }
  })
})

describe('impersonationUrl', () => {
  test('monta a URL da rota /impersonar com o token escapado', () => {
    expect(impersonationUrl('https://comunidade.sistemazero.com.br', 'abc+/=')).toBe(
      'https://comunidade.sistemazero.com.br/impersonar?token=abc%2B%2F%3D',
    )
    // Barra(s) final(is) da base não duplicam o path.
    expect(impersonationUrl('http://localhost:3007/', 't1')).toBe(
      'http://localhost:3007/impersonar?token=t1',
    )
  })
})
