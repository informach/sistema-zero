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
      avatarUrl: 'https://cdn.example.com/a.webp',
      passwordSetAt: now,
      createdAt: now,
      updatedAt: now,
    }
    const restored = UserAggregate.restore(snapshot)
    expect(restored.toSnapshot()).toEqual(snapshot)
    expect(restored.isActive()).toBe(false)
  })

  describe('mutators admin (bumpam version/updatedAt)', () => {
    function customer() {
      const past = new Date('2020-01-01T00:00:00Z')
      return UserAggregate.restore({
        id: crypto.randomUUID(),
        version: 3,
        email: 'c@ex.com',
        passwordHash: 'h',
        firstName: 'Ana',
        lastName: 'Lima',
        role: 'customer',
        status: 'active',
        phone: null,
        signupSource: null,
        avatarUrl: null,
        passwordSetAt: null,
        createdAt: past,
        updatedAt: past,
      })
    }

    test('changeRole muda papel e bumpa version', () => {
      const u = customer()
      const now = new Date()
      u.changeRole('staff', now)
      expect(u.role).toBe('staff')
      expect(u.version).toBe(4)
      expect(u.updatedAt).toBe(now)
    })

    test('changeRole para o mesmo papel é no-op (não bumpa)', () => {
      const u = customer()
      u.changeRole('customer')
      expect(u.version).toBe(3)
    })

    test('changeStatus muda status e bumpa version', () => {
      const u = customer()
      u.changeStatus('blocked')
      expect(u.status).toBe('blocked')
      expect(u.version).toBe(4)
      expect(u.isActive()).toBe(false)
    })

    test('updateProfile só bumpa quando algo muda; ignora nome em branco e undefined', () => {
      const u = customer()
      u.updateProfile({ firstName: undefined, lastName: '   ' })
      expect(u.version).toBe(3) // nada mudou
      u.updateProfile({ firstName: 'Ana Paula', phone: '+5511' })
      expect(u.firstName).toBe('Ana Paula')
      expect(u.phone).toBe('+5511')
      expect(u.version).toBe(4)
    })

    test('updateProfile seta/limpa avatarUrl e preserva passwordHash', () => {
      const u = customer()
      u.updateProfile({ avatarUrl: 'https://cdn.example.com/a.webp' })
      expect(u.avatarUrl).toBe('https://cdn.example.com/a.webp')
      expect(u.version).toBe(4)
      expect(u.passwordHash).toBe('h') // update de avatar não toca a senha

      // Mesmo valor → no-op (não bumpa de novo).
      u.updateProfile({ avatarUrl: 'https://cdn.example.com/a.webp' })
      expect(u.version).toBe(4)

      // `null` (e string em branco) limpam a foto.
      u.updateProfile({ avatarUrl: null })
      expect(u.avatarUrl).toBeNull()
      expect(u.version).toBe(4) // mesma edição (dirty) — version sobe 1x por instância
    })
  })
})
