import { describe, expect, it } from 'bun:test'
import {
  decodeEncodedWords,
  type GmailRawMessage,
  parseGmailMessage,
} from '../../src/infrastructure/gateways/google/mime'

const b64url = (text: string, charset: BufferEncoding = 'utf8') =>
  Buffer.from(text, charset).toString('base64url')

function message(overrides: Partial<GmailRawMessage>): GmailRawMessage {
  return { id: 'gm-1', threadId: 'thread-1', ...overrides }
}

describe('decodeEncodedWords (RFC 2047)', () => {
  it('decodifica base64 (B) e quoted (Q)', () => {
    const b = `=?UTF-8?B?${Buffer.from('Olá, tudo bem?', 'utf8').toString('base64')}?=`
    expect(decodeEncodedWords(b)).toBe('Olá, tudo bem?')
    expect(decodeEncodedWords('=?UTF-8?Q?Ol=C3=A1_mundo?=')).toBe('Olá mundo')
  })

  it('funde encoded-words adjacentes e passa texto puro adiante', () => {
    const part1 = `=?UTF-8?B?${Buffer.from('Olá ', 'utf8').toString('base64')}?=`
    const part2 = `=?UTF-8?B?${Buffer.from('mundo', 'utf8').toString('base64')}?=`
    expect(decodeEncodedWords(`${part1} ${part2}`)).toBe('Olá mundo')
    expect(decodeEncodedWords('assunto simples')).toBe('assunto simples')
  })
})

describe('parseGmailMessage', () => {
  it('text/plain no topo: corpo, remetente e assunto', () => {
    const parsed = parseGmailMessage(
      message({
        labelIds: ['INBOX', 'UNREAD'],
        internalDate: '1751976000000',
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'From', value: '"Maria Silva" <maria@example.com>' },
            { name: 'To', value: 'contato@sistemazero.com.br' },
            { name: 'Subject', value: 'Ajuda com acesso' },
            { name: 'Message-ID', value: '<abc@mail.example.com>' },
          ],
          body: { data: b64url('Olá, não consigo acessar o curso.') },
        },
      }),
    )
    expect(parsed.bodyText).toBe('Olá, não consigo acessar o curso.')
    expect(parsed.fromName).toBe('Maria Silva')
    expect(parsed.fromEmail).toBe('maria@example.com')
    expect(parsed.toEmails).toEqual(['contato@sistemazero.com.br'])
    expect(parsed.subject).toBe('Ajuda com acesso')
    expect(parsed.rfc822MessageId).toBe('<abc@mail.example.com>')
    expect(parsed.labelIds).toEqual(['INBOX', 'UNREAD'])
    expect(parsed.internalDate?.getTime()).toBe(1751976000000)
  })

  it('assunto e nome com encoded-word RFC 2047', () => {
    const subject = `=?UTF-8?B?${Buffer.from('Reembolso do pedido', 'utf8').toString('base64')}?=`
    const parsed = parseGmailMessage(
      message({
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'From', value: `=?UTF-8?Q?Jo=C3=A3o?= <joao@example.com>` },
            { name: 'Subject', value: subject },
          ],
          body: { data: b64url('texto') },
        },
      }),
    )
    expect(parsed.subject).toBe('Reembolso do pedido')
    expect(parsed.fromName).toBe('João')
    expect(parsed.fromEmail).toBe('joao@example.com')
  })

  it('multipart/alternative: prefere text/plain e guarda o html', () => {
    const parsed = parseGmailMessage(
      message({
        payload: {
          mimeType: 'multipart/alternative',
          headers: [{ name: 'From', value: 'ana@example.com' }],
          parts: [
            { mimeType: 'text/plain', body: { data: b64url('versão texto') } },
            { mimeType: 'text/html', body: { data: b64url('<p>versão <b>html</b></p>') } },
          ],
        },
      }),
    )
    expect(parsed.bodyText).toBe('versão texto')
    expect(parsed.bodyHtml).toBe('<p>versão <b>html</b></p>')
    expect(parsed.fromName).toBeNull()
    expect(parsed.fromEmail).toBe('ana@example.com')
  })

  it('somente HTML: deriva o texto do corpo html', () => {
    const parsed = parseGmailMessage(
      message({
        payload: {
          mimeType: 'text/html',
          headers: [{ name: 'From', value: 'ana@example.com' }],
          body: { data: b64url('<div>Oi<br>tudo bem?</div>') },
        },
      }),
    )
    expect(parsed.bodyText).toBe('Oi\ntudo bem?')
    expect(parsed.bodyHtml).toBe('<div>Oi<br>tudo bem?</div>')
  })

  it('multipart/mixed: extrai metadados do anexo (sem baixar bytes)', () => {
    const parsed = parseGmailMessage(
      message({
        payload: {
          mimeType: 'multipart/mixed',
          headers: [{ name: 'From', value: 'ana@example.com' }],
          parts: [
            { mimeType: 'text/plain', body: { data: b64url('segue o comprovante') } },
            {
              mimeType: 'image/png',
              filename: 'comprovante.png',
              body: { attachmentId: 'att-99', size: 20480 },
            },
          ],
        },
      }),
    )
    expect(parsed.bodyText).toBe('segue o comprovante')
    expect(parsed.attachments).toEqual([
      {
        filename: 'comprovante.png',
        mimeType: 'image/png',
        sizeBytes: 20480,
        gmailAttachmentId: 'att-99',
      },
    ])
  })

  it('To/Cc com múltiplos endereços', () => {
    const parsed = parseGmailMessage(
      message({
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'From', value: 'ana@example.com' },
            { name: 'To', value: '"Suporte" <contato@sistemazero.com.br>, outro@example.com' },
            { name: 'Cc', value: 'chefe@example.com' },
          ],
          body: { data: b64url('oi') },
        },
      }),
    )
    expect(parsed.toEmails).toEqual(['contato@sistemazero.com.br', 'outro@example.com'])
    expect(parsed.ccEmails).toEqual(['chefe@example.com'])
  })

  it('charset iso-8859-1 (latin1) no corpo', () => {
    const parsed = parseGmailMessage(
      message({
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'From', value: 'ana@example.com' },
            { name: 'Content-Type', value: 'text/plain; charset="ISO-8859-1"' },
          ],
          body: { data: b64url('função', 'latin1') },
        },
      }),
    )
    expect(parsed.bodyText).toBe('função')
  })

  it('detecta headers de autoresponder (anti-loop)', () => {
    const parsed = parseGmailMessage(
      message({
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'From', value: 'mailer-daemon@example.com' },
            { name: 'Auto-Submitted', value: 'auto-replied' },
            { name: 'List-Unsubscribe', value: '<https://x/unsub>' },
            { name: 'X-Autoreply', value: 'yes' },
          ],
          body: { data: b64url('estou de férias') },
        },
      }),
    )
    expect(parsed.autoSubmitted).toBe('auto-replied')
    expect(parsed.listUnsubscribe).toBe('<https://x/unsub>')
    expect(parsed.isAutoreply).toBe(true)
  })

  it('mensagem sem corpo cai no snippet, nunca lança', () => {
    const parsed = parseGmailMessage(
      message({
        snippet: 'prévia do e-mail',
        payload: { mimeType: 'multipart/mixed', headers: [{ name: 'From', value: 'a@b.com' }] },
      }),
    )
    expect(parsed.bodyText).toBe('prévia do e-mail')
  })
})
