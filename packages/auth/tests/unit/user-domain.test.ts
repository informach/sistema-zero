import { describe, expect, test } from 'bun:test'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { Email } from '../../src/domain/value-objects/email'
import { assertPasswordPolicy } from '../../src/domain/value-objects/password-policy'

describe('Email VO', () => {
  test('normaliza (trim + lowercase)', () => {
    expect(Email.create('  Maria@Example.COM ').value).toBe('maria@example.com')
  })

  test('rejeita formato inválido', () => {
    expect(() => Email.create('sem-arroba')).toThrow()
    expect(() => Email.create('a@b')).toThrow()
  })
})

describe('password policy', () => {
  test('rejeita abaixo do mínimo', () => {
    expect(() => assertPasswordPolicy('curta', 10)).toThrow()
  })

  test('aceita no mínimo', () => {
    expect(() => assertPasswordPolicy('1234567890', 10)).not.toThrow()
  })
})

describe('UserAggregate', () => {
  test('register usa defaults (customer/active), normaliza opcionais e emite evento', () => {
    const user = UserAggregate.register({
      id: crypto.randomUUID(),
      email: Email.create('a@b.com'),
      passwordHash: 'hash',
      firstName: ' Ana ',
      lastName: ' Lima ',
      phone: '   ',
      signupSource: '',
    })
    expect(user.role).toBe('customer')
    expect(user.status).toBe('active')
    expect(user.firstName).toBe('Ana')
    expect(user.fullName).toBe('Ana Lima')
    expect(user.phone).toBeNull()
    expect(user.signupSource).toBeNull()
    expect(user.isActive()).toBe(true)

    const events = user.pullEvents()
    expect(events[0]?.eventName).toBe('user.registered')
  })

  test('restore/toSnapshot é roundtrip fiel', () => {
    const now = new Date()
    const snapshot = {
      id: crypto.randomUUID(),
      version: 2,
      email: 'x@y.com',
      passwordHash: 'h',
      firstName: 'X',
      lastName: 'Y',
      role: 'admin' as const,
      status: 'suspended' as const,
      phone: '+55',
      signupSource: 'admin',
      createdAt: now,
      updatedAt: now,
    }
    const restored = UserAggregate.restore(snapshot)
    expect(restored.toSnapshot()).toEqual(snapshot)
    expect(restored.isActive()).toBe(false)
  })
})
