import { expect, test } from 'bun:test'
import { mergeConversationPage } from '../src/conversation'

const page: {
  ticket: { id: string; version: number; updatedAt: string }
  messages: { id: string; body: string }[]
  latestCursor: string | null
  olderCursor: string | null
  hasOlder: boolean
  hasMore: boolean
} = {
  ticket: { id: 'ticket', version: 2, updatedAt: '2026-10-16T12:00:00Z' },
  messages: [{ id: 'message', body: 'sent' }],
  latestCursor: 'cursor-2',
  olderCursor: 'cursor-1',
  hasOlder: true,
  hasMore: false,
}

test('página tardia não regride cursor, estado da mensagem ou versão do ticket', () => {
  const result = mergeConversationPage(
    page,
    {
      ...page,
      ticket: { ...page.ticket, version: 1 },
      messages: [
        { id: 'message', body: 'pending' },
        { id: 'unseen', body: 'older' },
      ],
      latestCursor: 'cursor-stale',
    },
    'cursor-1',
  )
  expect(result?.latestCursor).toBe('cursor-2')
  expect(result?.ticket).toEqual(page.ticket)
  expect(result?.messages).toEqual([
    { id: 'message', body: 'sent' },
    { id: 'unseen', body: 'older' },
  ])
})

test('hidratação inicial mantém acesso ao histórico além da primeira página', () => {
  const result = mergeConversationPage(
    { ...page, latestCursor: null, olderCursor: null, hasOlder: false },
    page,
    null,
  )
  expect(result?.latestCursor).toBe('cursor-2')
  expect(result?.olderCursor).toBe('cursor-1')
  expect(result?.hasOlder).toBe(true)
})

test('resposta de outro ticket não mistura conversas', () => {
  expect(
    mergeConversationPage(
      page,
      { ...page, ticket: { ...page.ticket, id: 'other' } },
      page.latestCursor,
    ),
  ).toBe(page)
  expect(mergeConversationPage(null, page, null)).toBeNull()
})

test('atualização incremental preserva páginas antigas e a escrita de IA mais recente', () => {
  const result = mergeConversationPage(
    page,
    {
      ...page,
      ticket: { ...page.ticket, updatedAt: '2026-10-16T11:00:00Z' },
      latestCursor: 'cursor-3',
      olderCursor: 'cursor-2',
      hasOlder: false,
      messages: [{ id: 'new', body: 'reply' }],
    },
    page.latestCursor,
  )
  expect(result?.ticket.updatedAt).toBe(page.ticket.updatedAt)
  expect(result?.messages).toHaveLength(2)
  expect(result?.olderCursor).toBe('cursor-1')
  expect(result?.hasOlder).toBe(true)
  expect(result?.latestCursor).toBe('cursor-3')
})
