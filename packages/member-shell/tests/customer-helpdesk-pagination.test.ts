import { describe, expect, it } from 'bun:test'
import { mergeCustomerTicketPages } from '../src/components/customer-helpdesk-portal'
import type { CustomerTicketPage } from '../src/lib/customer-helpdesk'

describe('paginação do portal de atendimento', () => {
  it('preserva a primeira página, anexa a próxima e remove duplicatas por id', () => {
    const current = {
      total: 3,
      hasMore: true,
      nextCursor: 'cursor-1',
      items: [
        {
          id: 'ticket-1',
          version: 0,
          source: 'portal',
          subject: 'Mais novo',
          status: 'new',
          category: null,
          messageCount: 1,
          lastMessageAt: '2026-09-02T12:00:00.000Z',
          createdAt: '2026-09-02T12:00:00.000Z',
        },
      ],
    } as CustomerTicketPage & { nextCursor: string | null }
    const first = current.items[0]
    if (!first) throw new Error('primeira página sem ticket')
    const next = {
      total: 3,
      hasMore: false,
      nextCursor: null,
      items: [
        { ...first, status: 'open' },
        {
          ...first,
          id: 'ticket-2',
          subject: 'Mais antigo',
        },
      ],
    } as CustomerTicketPage & { nextCursor: string | null }

    expect(mergeCustomerTicketPages(current, next) as typeof next).toEqual({
      total: 3,
      hasMore: false,
      nextCursor: null,
      // Se a fila mudou entre requests, o item já exibido recebe os dados mais recentes.
      items: [next.items[0]!, next.items[1]!],
    })
  })
})
