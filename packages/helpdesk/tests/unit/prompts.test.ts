import { describe, expect, it } from 'bun:test'
import { buildDraftPrompt, buildThreadText } from '../../src/application/ai/prompts'
import { makeMessage, makeTicket } from '../helpers'

describe('buildThreadText', () => {
  it('inclui só e-mails, marca Cliente/Equipe e tira citação do inbound', () => {
    const ticket = makeTicket({ subject: 'Ajuda' })
    const inbound = makeMessage(ticket.id, {
      direction: 'inbound',
      bodyText: 'Não consigo acessar.\n\nEm 07/07 escreveu:\n> mensagem antiga',
    })
    const outbound = makeMessage(ticket.id, {
      direction: 'outbound',
      sentVia: 'human',
      bodyText: 'Já te ajudo.',
    })
    const note = makeMessage(ticket.id, { kind: 'note', direction: null, bodyText: 'nota interna' })
    const text = buildThreadText(ticket.subject, [inbound, outbound, note], 24_000)
    expect(text).toContain('Assunto: Ajuda')
    expect(text).toContain('Cliente: Não consigo acessar.')
    expect(text).not.toContain('mensagem antiga') // citação removida
    expect(text).toContain('Equipe: Já te ajudo.')
    expect(text).not.toContain('nota interna') // nota não vai p/ a IA
  })

  it('clampa mantendo a cauda quando passa do limite', () => {
    const ticket = makeTicket({ subject: 'x' })
    const long = makeMessage(ticket.id, { bodyText: 'a'.repeat(500) })
    const text = buildThreadText(ticket.subject, [long], 100)
    expect(text.startsWith('[conversa truncada]')).toBe(true)
    expect(text.endsWith('a'.repeat(100))).toBe(true) // manteve os 100 chars finais
  })
})

describe('buildDraftPrompt', () => {
  it('sem KB: omite o bloco da base', () => {
    const { system } = buildDraftPrompt({ threadText: 'oi', summary: 'resumo', kbArticles: [] })
    expect(system).not.toContain('Base de conhecimento')
  })

  it('com KB: injeta os artigos', () => {
    const { system } = buildDraftPrompt({
      threadText: 'oi',
      summary: 'resumo',
      kbArticles: [{ title: 'Acesso', content: 'passo a passo' }],
    })
    expect(system).toContain('Base de conhecimento')
    expect(system).toContain('# Acesso')
    expect(system).toContain('passo a passo')
  })
})
