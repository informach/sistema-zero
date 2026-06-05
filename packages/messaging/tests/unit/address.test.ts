import { describe, expect, it } from 'bun:test'
import { Message } from '../../src/domain/message/message.aggregate'
import { normalizeAddress } from '../../src/domain/services/address'
import { InMemorySuppressionRepository } from '../fakes/in-memory'

const NOW = new Date('2026-06-03T12:00:00Z')

describe('normalizeAddress', () => {
  it('e-mail vira minúsculo', () => {
    expect(normalizeAddress('email', '  User@Example.COM ')).toBe('user@example.com')
  })

  it('telefone vira só dígitos (remove +, espaços e separadores)', () => {
    expect(normalizeAddress('whatsapp', '+55 (11) 99999-9999')).toBe('5511999999999')
    expect(normalizeAddress('whatsapp', '5511999999999')).toBe('5511999999999')
  })
})

describe('supressão com endereços em formatos diferentes', () => {
  it('bounce gravado com +55 casa com envio sem + (e vice-versa)', async () => {
    const suppressions = new InMemorySuppressionRepository()
    await suppressions.add('whatsapp', '+5511999999999', 'blocked')
    expect(await suppressions.isSuppressed('whatsapp', '5511999999999')).toBe(true)

    await suppressions.add('email', 'User@Example.com', 'hard_bounce')
    expect(await suppressions.isSuppressed('email', 'user@example.com')).toBe(true)
  })
})

describe('Message.create normaliza o destinatário', () => {
  it('telefone com + é aceito e armazenado só com dígitos', () => {
    const m = Message.create({
      id: 'm-1',
      channel: 'whatsapp',
      templateKey: 'welcome',
      recipient: { name: 'Zé', phone: '+5511999999999' },
      renderedBody: 'Oi',
      now: NOW,
    })
    expect(m.recipient.phone).toBe('5511999999999')
  })

  it('e-mail é armazenado em minúsculas', () => {
    const m = Message.create({
      id: 'm-2',
      channel: 'email',
      templateKey: 'welcome',
      recipient: { name: 'Helena', email: 'Helena@Example.COM' },
      renderedSubject: 'Oi',
      renderedBody: '<p>Oi</p>',
      now: NOW,
    })
    expect(m.recipient.email).toBe('helena@example.com')
  })
})
