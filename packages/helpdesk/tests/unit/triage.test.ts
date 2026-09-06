import { describe, expect, it } from 'bun:test'
import {
  DEFAULT_TRIAGE_RULES,
  normalizeTriageRules,
  type TriageInput,
  triageByAddressOnly,
  triageEmail,
} from '../../src/domain/mail/triage'

/** Inbound de um cliente de verdade, sem cabeçalho suspeito. */
function inbound(overrides: Partial<TriageInput> = {}): TriageInput {
  return {
    direction: 'inbound',
    fromEmail: 'maria@example.com',
    toEmails: ['contato@sistemazero.com.br'],
    ccEmails: [],
    headers: {},
    labelIds: ['INBOX', 'CATEGORY_PERSONAL'],
    ...overrides,
  }
}

/** Outbound da própria caixa. */
function outbound(overrides: Partial<TriageInput> = {}): TriageInput {
  return {
    direction: 'outbound',
    fromEmail: 'contato@sistemazero.com.br',
    toEmails: ['maria@example.com'],
    ccEmails: [],
    headers: {},
    labelIds: ['SENT'],
    ...overrides,
  }
}

const rules = DEFAULT_TRIAGE_RULES

describe('triageEmail — o que é atendimento', () => {
  it('cliente de verdade é human', () => {
    expect(triageEmail(inbound(), rules)).toEqual({ kind: 'human', rule: 'human', evidence: null })
  })

  it('cliente respondendo numa thread (In-Reply-To, citação) segue human', () => {
    expect(
      triageEmail(
        inbound({ headers: { 'content-type': 'multipart/alternative; boundary=x' } }),
        rules,
      ).kind,
    ).toBe('human')
  })

  it('1:1 enviado por CRM com List-Unsubscribe SOZINHO é human (um sinal fraco não decide)', () => {
    expect(
      triageEmail(
        inbound({
          fromEmail: 'lead@parceiro.com.br',
          headers: { 'list-unsubscribe': '<https://hubspot.example/unsub>' },
        }),
        rules,
      ),
    ).toEqual({ kind: 'human', rule: 'human', evidence: null })
  })

  it('Precedence: bulk sozinho é human; categoria Atualizações sozinha é human', () => {
    expect(triageEmail(inbound({ headers: { precedence: 'bulk' } }), rules).kind).toBe('human')
    expect(triageEmail(inbound({ labelIds: ['INBOX', 'CATEGORY_UPDATES'] }), rules).kind).toBe(
      'human',
    )
  })

  it('encaminhamento interno RECEBIDO (equipe → contato@) é human, de propósito', () => {
    expect(triageEmail(inbound({ fromEmail: 'helena@sistemazero.com.br' }), rules).kind).toBe(
      'human',
    )
  })

  it('outbound de contato@ para CLIENTE é human (vira ticket waiting, como hoje)', () => {
    expect(triageEmail(outbound(), rules).kind).toBe('human')
    // Um interno no CC não torna a mensagem interna: o cliente está no To.
    expect(triageEmail(outbound({ ccEmails: ['helena@sistemazero.com.br'] }), rules).kind).toBe(
      'human',
    )
  })
})

describe('triageEmail — devolução (bounce)', () => {
  it('DSN do Gmail: mailer-daemon@ + Return-Path vazio + multipart/report', () => {
    const verdict = triageEmail(
      inbound({
        fromEmail: 'mailer-daemon@googlemail.com',
        headers: {
          'return-path': '<>',
          'content-type': 'multipart/report; boundary="x"; report-type=delivery-status',
          'auto-submitted': 'auto-replied',
        },
      }),
      rules,
    )
    // O Return-Path vazio decide antes do Auto-Submitted: bounce vence auto_reply.
    expect(verdict).toEqual({
      kind: 'bounce',
      rule: 'bounce:return-path-empty',
      evidence: 'Return-Path: <>',
    })
  })

  it('postmaster@ e X-Failed-Recipients também são bounce', () => {
    expect(triageEmail(inbound({ fromEmail: 'postmaster@outlook.com' }), rules).kind).toBe('bounce')
    expect(
      triageEmail(inbound({ headers: { 'x-failed-recipients': 'x@y.com' } }), rules).rule,
    ).toBe('bounce:failed-recipients')
  })
})

describe('triageEmail — resposta automática', () => {
  it('Auto-Submitted: auto-replied (resposta de férias)', () => {
    expect(
      triageEmail(
        inbound({ headers: { 'auto-submitted': 'auto-replied', precedence: 'bulk' } }),
        rules,
      ),
    ).toEqual({
      kind: 'auto_reply',
      rule: 'auto_reply:auto-submitted',
      evidence: 'Auto-Submitted: auto-replied',
    })
  })

  it('X-Autoreply e Precedence: auto_reply', () => {
    expect(triageEmail(inbound({ headers: { 'x-autoreply': 'yes' } }), rules).kind).toBe(
      'auto_reply',
    )
    expect(triageEmail(inbound({ headers: { precedence: 'auto_reply' } }), rules).kind).toBe(
      'auto_reply',
    )
  })

  it('não confunde X-Auto-Response-Suppress com uma resposta automática', () => {
    expect(triageEmail(inbound({ headers: { 'x-auto-response-suppress': 'All' } }), rules)).toEqual(
      { kind: 'human', rule: 'human', evidence: null },
    )
  })
})

describe('triageEmail — sistema', () => {
  it('alerta de segurança do Google (no-reply@accounts.google.com, sem cabeçalho de lista)', () => {
    expect(triageEmail(inbound({ fromEmail: 'no-reply@accounts.google.com' }), rules)).toEqual({
      kind: 'system',
      rule: 'system:sender-local-part',
      evidence: 'no-reply@accounts.google.com',
    })
  })

  it('local-part por SEGMENTO: payments-noreply@, alerts@, notification@, newsletter@, bounces+x@', () => {
    for (const from of [
      'payments-noreply@google.com',
      'alerts@railway.app',
      'notification@evolution.example',
      'newsletter@loja.com.br',
      'bounces+123@sendgrid.net',
      'DoNotReply@bank.example',
    ]) {
      expect(triageEmail(inbound({ fromEmail: from }), rules).rule).toBe('system:sender-local-part')
    }
    // Sem fronteira de segmento NÃO casa: é gente com nome parecido.
    expect(triageEmail(inbound({ fromEmail: 'noreplyteam@example.com' }), rules).kind).toBe('human')
    expect(triageEmail(inbound({ fromEmail: 'alertaandrade@example.com' }), rules).kind).toBe(
      'human',
    )
  })

  it('Auto-Submitted: auto-generated é sistema (não auto_reply)', () => {
    expect(
      triageEmail(inbound({ headers: { 'auto-submitted': 'auto-generated' } }), rules).rule,
    ).toBe('system:auto-submitted')
    // `no` é o valor neutro do RFC 3834: humano.
    expect(triageEmail(inbound({ headers: { 'auto-submitted': 'no' } }), rules).kind).toBe('human')
  })

  it('remetente ignorado por endereço exato e por @domínio (inclui subdomínio)', () => {
    const custom = {
      ignoredSenders: ['avisos@evolution.example', '@promo.example'],
      internalDomains: ['sistemazero.com.br'],
    }
    expect(triageEmail(inbound({ fromEmail: 'avisos@evolution.example' }), custom).rule).toBe(
      'system:ignored-sender',
    )
    expect(triageEmail(inbound({ fromEmail: 'Avisos@Evolution.Example' }), custom).kind).toBe(
      'system',
    )
    expect(triageEmail(inbound({ fromEmail: 'x@promo.example' }), custom).kind).toBe('system')
    expect(triageEmail(inbound({ fromEmail: 'x@mail.promo.example' }), custom).kind).toBe('system')
    // Sufixo parecido não é o domínio.
    expect(triageEmail(inbound({ fromEmail: 'x@notpromo.example' }), custom).kind).toBe('human')
    expect(triageEmail(inbound({ fromEmail: 'outro@evolution.example' }), custom).kind).toBe(
      'human',
    )
  })

  it('categoria Atualizações + um sinal fraco de massa = sistema (fatura do Workspace)', () => {
    expect(
      triageEmail(
        inbound({
          fromEmail: 'billing@empresa.example',
          headers: { 'list-unsubscribe': '<mailto:unsub@empresa.example>' },
          labelIds: ['INBOX', 'CATEGORY_UPDATES'],
        }),
        rules,
      ),
    ).toEqual({
      kind: 'system',
      rule: 'system:weak-signals',
      evidence: 'CATEGORY_UPDATES + List-Unsubscribe',
    })
  })
})

describe('triageEmail — newsletter/lista', () => {
  it('List-Id decide sozinho (Mailchimp, grupos)', () => {
    expect(
      triageEmail(
        inbound({
          fromEmail: 'news@loja.example',
          headers: { 'list-id': '<news.loja.example>', 'list-unsubscribe': '<https://x>' },
        }),
        rules,
      ),
    ).toEqual({ kind: 'bulk', rule: 'bulk:list-header', evidence: 'List-Id: <news.loja.example>' })
  })

  it('dois sinais fracos fecham bulk (List-Unsubscribe + Feedback-ID; Promoções + Precedence bulk)', () => {
    expect(
      triageEmail(
        inbound({
          fromEmail: 'ofertas@loja.example',
          headers: { 'list-unsubscribe': '<https://x>', 'feedback-id': 'abc:loja' },
        }),
        rules,
      ).rule,
    ).toBe('bulk:weak-signals')
    expect(
      triageEmail(
        inbound({
          fromEmail: 'ofertas@loja.example',
          headers: { precedence: 'bulk' },
          labelIds: ['INBOX', 'CATEGORY_PROMOTIONS'],
        }),
        rules,
      ).kind,
    ).toBe('bulk')
  })

  it('Precedence: list e List-Post decidem sozinhos', () => {
    expect(triageEmail(inbound({ headers: { precedence: 'list' } }), rules).kind).toBe('bulk')
    expect(triageEmail(inbound({ headers: { 'list-post': '<mailto:x>' } }), rules).kind).toBe(
      'bulk',
    )
  })
})

describe('triageEmail — interno', () => {
  it('enviado por nós SÓ para @sistemazero.com.br (To e CC) é interno', () => {
    expect(
      triageEmail(
        outbound({
          toEmails: ['helena@sistemazero.com.br'],
          ccEmails: ['equipe@kids.sistemazero.com.br'],
        }),
        rules,
      ),
    ).toEqual({
      kind: 'internal',
      rule: 'internal:all-recipients-internal',
      evidence: 'helena@sistemazero.com.br, equipe@kids.sistemazero.com.br',
    })
  })

  it('basta UM destinatário externo para ser atendimento', () => {
    expect(
      triageEmail(outbound({ toEmails: ['helena@sistemazero.com.br', 'maria@example.com'] }), rules)
        .kind,
    ).toBe('human')
  })

  it('sem destinatário visível não é interno (nunca decide no escuro)', () => {
    expect(triageEmail(outbound({ toEmails: [], ccEmails: [] }), rules).kind).toBe('human')
  })

  it('domínio parecido não é interno', () => {
    expect(
      triageEmail(outbound({ toEmails: ['x@sistemazero.com.br.evil.example'] }), rules).kind,
    ).toBe('human')
    expect(triageEmail(outbound({ toEmails: ['x@notsistemazero.com.br'] }), rules).kind).toBe(
      'human',
    )
  })
})

describe('triageEmail — ordem e pureza', () => {
  it('a primeira regra que casa vence: bounce > auto_reply > system > bulk > internal', () => {
    // auto-replied + List-Id → auto_reply (2 vence 4).
    expect(
      triageEmail(
        inbound({ headers: { 'auto-submitted': 'auto-replied', 'list-id': '<x>' } }),
        rules,
      ).kind,
    ).toBe('auto_reply')
    // noreply + List-Id → system (3 vence 4).
    expect(
      triageEmail(inbound({ fromEmail: 'noreply@x.example', headers: { 'list-id': '<x>' } }), rules)
        .kind,
    ).toBe('system')
  })

  it('é idempotente e não muta a entrada', () => {
    const input = inbound({ headers: { 'list-id': '<x>' } })
    const snapshot = structuredClone(input)
    const a = triageEmail(input, rules)
    const b = triageEmail(input, rules)
    expect(a).toEqual(b)
    expect(input).toEqual(snapshot)
  })

  it('triageByAddressOnly decide os casos que não precisam do Gmail (os 36 de produção)', () => {
    expect(
      triageByAddressOnly(
        {
          direction: 'inbound',
          fromEmail: 'no-reply@accounts.google.com',
          toEmails: [],
          ccEmails: [],
        },
        rules,
      ).kind,
    ).toBe('system')
    expect(
      triageByAddressOnly(
        {
          direction: 'outbound',
          fromEmail: 'contato@sistemazero.com.br',
          toEmails: ['helena@sistemazero.com.br'],
          ccEmails: [],
        },
        rules,
      ).kind,
    ).toBe('internal')
    expect(
      triageByAddressOnly(
        { direction: 'inbound', fromEmail: 'maria@example.com', toEmails: [], ccEmails: [] },
        rules,
      ).kind,
    ).toBe('human')
  })
})

describe('normalizeTriageRules', () => {
  it('põe em minúsculas, tira espaços e duplicatas', () => {
    const { rules: normalized, problems } = normalizeTriageRules({
      ignoredSenders: [
        ' Avisos@Evolution.Example ',
        'avisos@evolution.example',
        '@Promo.Example',
        '',
      ],
      internalDomains: ['Sistemazero.com.br', '@sistemazero.com.br', ' '],
    })
    expect(problems).toEqual([])
    expect(normalized).toEqual({
      ignoredSenders: ['avisos@evolution.example', '@promo.example'],
      internalDomains: ['sistemazero.com.br'],
    })
  })

  it('recusa entrada que não é endereço nem @domínio, e domínio interno vazio', () => {
    const { problems } = normalizeTriageRules({
      ignoredSenders: ['isso não é e-mail', '@', 'a@b'],
      internalDomains: [],
    })
    expect(problems.map((p) => p.field)).toEqual([
      'ignoredSenders',
      'ignoredSenders',
      'ignoredSenders',
      'internalDomains',
    ])
  })
})
