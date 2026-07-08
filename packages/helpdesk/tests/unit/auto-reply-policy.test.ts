import { describe, expect, it } from 'bun:test'
import {
  type AutoReplyPolicyInput,
  decideAutoReply,
} from '../../src/domain/ticket/auto-reply-policy'

/** Entrada que PASSA em todas as regras → send. Cada teste quebra uma. */
function eligible(): AutoReplyPolicyInput {
  return {
    settings: {
      autoReplyEnabled: true,
      autoReplyCategories: ['curso_acesso'],
      autoReplyConfidenceMin: 0.75,
    },
    classification: {
      category: 'curso_acesso',
      confidence: 0.9,
      sentiment: 'neutro',
      flags: { reembolso: false, juridico: false },
    },
    kbCoverage: 'covered',
    ticket: { autoReplyState: 'none', hasOutbound: false },
    inbound: { isAutoreply: false, fromEmail: 'maria@example.com' },
  }
}

describe('decideAutoReply', () => {
  it('todas as condições OK → send', () => {
    const d = decideAutoReply(eligible())
    expect(d.action).toBe('send')
  })

  it('toggle desligado → draft', () => {
    const i = eligible()
    i.settings.autoReplyEnabled = false
    expect(decideAutoReply(i)).toEqual({
      action: 'draft',
      reason: expect.stringContaining('desligada'),
    })
  })

  it('categoria não habilitada → draft', () => {
    const i = eligible()
    i.settings.autoReplyCategories = ['outro']
    expect(decideAutoReply(i).action).toBe('draft')
  })

  it('ticket já respondido (hasOutbound) → draft', () => {
    const i = eligible()
    i.ticket.hasOutbound = true
    expect(decideAutoReply(i).reason).toContain('já teve resposta')
  })

  it('auto_reply_state ≠ none → draft (máx. 1 por ticket)', () => {
    const i = eligible()
    i.ticket.autoReplyState = 'sent'
    expect(decideAutoReply(i).action).toBe('draft')
  })

  it('inbound é autoresponder → draft (anti-loop)', () => {
    const i = eligible()
    i.inbound.isAutoreply = true
    expect(decideAutoReply(i).reason).toContain('automática')
  })

  it('remetente no-reply/mailer-daemon → draft (anti-loop)', () => {
    const i = eligible()
    i.inbound.fromEmail = 'mailer-daemon@example.com'
    expect(decideAutoReply(i).action).toBe('draft')
    const j = eligible()
    j.inbound.fromEmail = 'no-reply@loja.com'
    expect(decideAutoReply(j).action).toBe('draft')
  })

  it('flag reembolso/juridico ou categoria pagamento → draft', () => {
    const i = eligible()
    i.classification.flags.reembolso = true
    expect(decideAutoReply(i).reason).toContain('sensível')
    const j = eligible()
    j.classification.flags.juridico = true
    expect(decideAutoReply(j).action).toBe('draft')
    const k = eligible()
    k.settings.autoReplyCategories = ['pagamento_reembolso']
    k.classification.category = 'pagamento_reembolso'
    expect(decideAutoReply(k).action).toBe('draft')
  })

  it('cliente irritado → draft', () => {
    const i = eligible()
    i.classification.sentiment = 'irritado'
    expect(decideAutoReply(i).reason).toContain('irritado')
  })

  it('confiança abaixo do mínimo → draft', () => {
    const i = eligible()
    i.classification.confidence = 0.5
    expect(decideAutoReply(i).reason).toContain('Confiança')
  })

  it('KB não cobre → draft', () => {
    const i = eligible()
    i.kbCoverage = 'partial'
    expect(decideAutoReply(i).reason).toContain('base de conhecimento')
    const j = eligible()
    j.kbCoverage = 'not_covered'
    expect(decideAutoReply(j).action).toBe('draft')
  })
})
