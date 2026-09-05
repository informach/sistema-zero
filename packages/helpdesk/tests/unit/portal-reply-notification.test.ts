import { describe, expect, it } from 'bun:test'
import {
  buildPortalReplyNotification,
  greetingFor,
  PORTAL_REPLY_TEMPLATE_KEY,
  portalHelpUrl,
} from '../../src/application/tickets/portal-reply-notification'
import { makeMessage, makeTicket } from '../helpers'

const urls = { adult: 'https://community.test/', kids: 'https://kids.test' }

describe('aviso de resposta do portal (puro)', () => {
  it('link por app: kids → /responsavel/ajuda, adult → /ajuda; nulo (legado) cai no adulto', () => {
    expect(portalHelpUrl('kids', urls)).toBe('https://kids.test/responsavel/ajuda')
    // Barra final da origem não duplica.
    expect(portalHelpUrl('adult', urls)).toBe('https://community.test/ajuda')
    expect(portalHelpUrl(null, urls)).toBe('https://community.test/ajuda')
  })

  it('saudação usa só o primeiro nome e sobrevive a nome nulo ou só espaços', () => {
    expect(greetingFor('Maria Silva')).toBe('Olá, Maria!')
    expect(greetingFor('  Ana  ')).toBe('Olá, Ana!')
    expect(greetingFor(null)).toBe('Olá!')
    expect(greetingFor('   ')).toBe('Olá!')
  })

  it('monta o envio: template, destinatário, variáveis do template e chave por MENSAGEM', () => {
    const ticket = makeTicket({
      source: 'portal',
      portal: 'kids',
      gmailThreadId: null,
      requesterName: 'Maria Silva',
      requesterEmail: 'maria@example.com',
      subject: 'Não consigo abrir a aula',
    })
    const message = makeMessage(ticket.id, { direction: 'outbound', sentVia: 'human' })

    expect(buildPortalReplyNotification({ ticket, message, urls })).toEqual({
      templateKey: PORTAL_REPLY_TEMPLATE_KEY,
      recipient: { name: 'Maria Silva', email: 'maria@example.com' },
      variables: {
        saudacao: 'Olá, Maria!',
        assunto: 'Não consigo abrir a aula',
        link: 'https://kids.test/responsavel/ajuda',
      },
      idempotencyKey: `helpdesk-reply:${message.id}`,
    })
  })

  // `recipient.name` é minLength 1 no DTO do messaging: sem fallback, o aviso de um
  // solicitante sem nome viraria 400 engolido pelo warn.
  it('solicitante sem nome: destinatário com fallback neutro e saudação sem nome, nunca pedaço de e-mail', () => {
    const ticket = makeTicket({ source: 'portal', portal: 'adult', requesterName: null })
    const sent = buildPortalReplyNotification({ ticket, message: makeMessage(ticket.id), urls })
    expect(sent.recipient.name).toBe('Cliente')
    expect(sent.variables.saudacao).toBe('Olá!')
    expect(JSON.stringify(sent.variables)).not.toContain('maria')
  })

  it('anti-vácuo: duas respostas no mesmo ticket são dois avisos (chaves diferentes)', () => {
    const ticket = makeTicket({ source: 'portal', portal: 'adult' })
    const first = buildPortalReplyNotification({ ticket, message: makeMessage(ticket.id), urls })
    const second = buildPortalReplyNotification({ ticket, message: makeMessage(ticket.id), urls })
    expect(first.idempotencyKey).not.toBe(second.idempotencyKey)
    expect(first.idempotencyKey.length).toBeLessThanOrEqual(200)
  })
})
