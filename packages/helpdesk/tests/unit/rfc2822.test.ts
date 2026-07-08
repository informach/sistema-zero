import { describe, expect, it } from 'bun:test'
import { buildReplyRaw } from '../../src/infrastructure/gateways/google/rfc2822'

/** Decodifica o raw base64url de volta para a mensagem RFC 2822. */
function decodeRaw(raw: string): { headers: Record<string, string>; body: string } {
  const text = Buffer.from(raw, 'base64url').toString('utf8')
  const [head, ...rest] = text.split('\r\n\r\n')
  const headers: Record<string, string> = {}
  for (const line of (head ?? '').split('\r\n')) {
    const idx = line.indexOf(': ')
    if (idx > 0) headers[line.slice(0, idx)] = line.slice(idx + 2)
  }
  const body = rest.join('\r\n\r\n')
  return { headers, body }
}

const BASE = {
  fromName: 'Sistema Zero',
  fromEmail: 'contato@sistemazero.com.br',
  toName: 'Maria Silva',
  toEmail: 'maria@example.com',
  subject: 'Re: Ajuda com acesso',
  bodyText: 'Oi Maria, seu acesso já está liberado.',
  inReplyTo: '<abc@mail.example.com>',
  references: ['<abc@mail.example.com>'],
  messageId: '<novo-123@sistemazero.com.br>',
}

describe('buildReplyRaw', () => {
  it('monta os headers e o corpo (base64) da resposta', () => {
    const { headers, body } = decodeRaw(buildReplyRaw(BASE))
    expect(headers.From).toBe('Sistema Zero <contato@sistemazero.com.br>')
    expect(headers.To).toBe('Maria Silva <maria@example.com>')
    expect(headers.Subject).toBe('Re: Ajuda com acesso')
    expect(headers['Message-ID']).toBe('<novo-123@sistemazero.com.br>')
    expect(headers['Content-Transfer-Encoding']).toBe('base64')
    expect(Buffer.from(body, 'base64').toString('utf8')).toBe(
      'Oi Maria, seu acesso já está liberado.',
    )
  })

  it('threading: In-Reply-To e References apontam pro último inbound', () => {
    const { headers } = decodeRaw(buildReplyRaw(BASE))
    expect(headers['In-Reply-To']).toBe('<abc@mail.example.com>')
    expect(headers.References).toBe('<abc@mail.example.com>')
  })

  it('sem inbound: omite In-Reply-To e References', () => {
    const { headers } = decodeRaw(buildReplyRaw({ ...BASE, inReplyTo: null, references: [] }))
    expect(headers['In-Reply-To']).toBeUndefined()
    expect(headers.References).toBeUndefined()
  })

  it('assunto com acento vira encoded-word RFC 2047', () => {
    const { headers } = decodeRaw(buildReplyRaw({ ...BASE, subject: 'Re: Dúvida sobre reembolso' }))
    const subject = headers.Subject ?? ''
    expect(subject).toMatch(/^=\?UTF-8\?B\?.+\?=$/)
    const encoded = subject.replace(/^=\?UTF-8\?B\?/, '').replace(/\?=$/, '')
    expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe('Re: Dúvida sobre reembolso')
  })

  it('nome do destinatário com acento é codificado', () => {
    const { headers } = decodeRaw(buildReplyRaw({ ...BASE, toName: 'João', toEmail: 'joao@x.com' }))
    expect(headers.To).toMatch(/^=\?UTF-8\?B\?.+\?= <joao@x\.com>$/)
  })

  it('sem nome: To é só o e-mail', () => {
    const { headers } = decodeRaw(buildReplyRaw({ ...BASE, toName: null }))
    expect(headers.To).toBe('maria@example.com')
  })
})
