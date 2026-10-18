import { describe, expect, test } from 'bun:test'
import type { CursorPage, TicketView } from '@sistemazero/helpdesk-contracts'
import {
  attentionDeadlineLabel,
  HELPDESK_PATHS,
  helpdeskHref,
  helpdeskTicketPath,
  isTicketPage,
  toAttentionView,
} from '../src/lib/helpdesk-panel'

function ticket(overrides: Partial<TicketView>): TicketView {
  return {
    id: 't-1',
    subject: 'Não consigo entrar no curso',
    requesterName: 'Ana',
    requesterEmail: 'ana@example.com',
    assignedTo: null,
    assignedToName: null,
    aiDraft: 'rascunho da IA que não sai do BFF',
    aiSummary: 'resumo da IA',
    sla: {
      state: 'breached',
      priority: 'normal',
      targetMinutes: 720,
      deadlineAt: '2026-10-17T10:00:00.000Z',
      remainingMinutes: -90,
    },
    ...overrides,
  } as TicketView
}

describe('toAttentionView', () => {
  test('leva só o que a lista mostra, sem rascunho nem resumo da IA', () => {
    const page: CursorPage<TicketView> = {
      items: [ticket({})],
      total: 7,
      hasMore: true,
      nextCursor: 'c',
    }
    const view = toAttentionView(page)
    expect(view).toEqual({
      total: 7,
      items: [
        {
          id: 't-1',
          subject: 'Não consigo entrar no curso',
          requester: 'Ana',
          assignedToName: null,
          slaState: 'breached',
          remainingMinutes: -90,
        },
      ],
    })
    expect(JSON.stringify(view)).not.toContain('rascunho')
  })

  test('sem nome, mostra o e-mail; ticket em risco continua em risco', () => {
    const view = toAttentionView({
      items: [
        ticket({
          requesterName: null,
          sla: {
            state: 'at_risk',
            priority: 'alta',
            targetMinutes: 240,
            deadlineAt: '2026-10-17T10:00:00.000Z',
            remainingMinutes: 30,
          },
        }),
      ],
      total: 1,
      hasMore: false,
      nextCursor: null,
    })
    expect(view.items[0]?.requester).toBe('ana@example.com')
    expect(view.items[0]?.slaState).toBe('at_risk')
  })
})

describe('links para o app de atendimento', () => {
  test('sem URL configurada não há link', () => {
    expect(helpdeskHref(null, HELPDESK_PATHS.attention)).toBeNull()
  })

  test('junta a URL do app ao caminho, com ou sem barra no fim', () => {
    expect(helpdeskHref('https://atendimento.sistemazero.com.br/', '/tickets?status=new')).toBe(
      'https://atendimento.sistemazero.com.br/tickets?status=new',
    )
    expect(helpdeskHref('https://atendimento.sistemazero.com.br', helpdeskTicketPath('a b'))).toBe(
      'https://atendimento.sistemazero.com.br/tickets/a%20b',
    )
  })

  test('os filtros são os que a caixa de entrada do atendimento lê da URL', () => {
    expect(HELPDESK_PATHS).toEqual({
      attention: '/tickets?queue=attention',
      unassigned: '/tickets?queue=unassigned',
      new: '/tickets?status=new',
      open: '/tickets?status=open',
      waiting: '/tickets?status=waiting',
    })
  })
})

describe('attentionDeadlineLabel', () => {
  test('fala como a fila do atendimento', () => {
    expect(attentionDeadlineLabel({ slaState: 'breached', remainingMinutes: -90 })).toBe(
      'Estourado há 1h 30min',
    )
    expect(attentionDeadlineLabel({ slaState: 'breached', remainingMinutes: 0 })).toBe(
      'SLA estourado agora',
    )
    expect(attentionDeadlineLabel({ slaState: 'at_risk', remainingMinutes: 45 })).toBe(
      'Vence em 45 min',
    )
    expect(attentionDeadlineLabel({ slaState: 'at_risk', remainingMinutes: 120 })).toBe(
      'Vence em 2h',
    )
  })
})

describe('resposta do helpdesk', () => {
  test('ticket sem prazo ou no prazo não entra na lista', () => {
    const view = toAttentionView({
      items: [
        ticket({ id: 'sem-prazo', sla: null }),
        ticket({
          id: 'no-prazo',
          sla: {
            state: 'on_track',
            priority: 'normal',
            targetMinutes: 720,
            deadlineAt: '2026-10-17T10:00:00.000Z',
            remainingMinutes: 500,
          },
        }),
        ticket({ id: 'estourado' }),
      ],
      total: 3,
      hasMore: false,
      nextCursor: null,
    })
    expect(view.items.map((i) => i.id)).toEqual(['estourado'])
  })

  test('isTicketPage recusa corpo fora do formato', () => {
    expect(isTicketPage({ items: [], total: 0 })).toBe(true)
    expect(isTicketPage(null)).toBe(false)
    expect(isTicketPage({ items: 'x', total: 1 })).toBe(false)
    expect(isTicketPage({ items: [] })).toBe(false)
  })
})
