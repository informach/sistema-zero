import { afterEach, expect, mock, test } from 'bun:test'
import { CustomerHelpdeskPortal } from '@sistemazero/member-shell/components/customer-helpdesk-portal'
import type {
  CustomerTicketDetail,
  CustomerTicketMessageView,
} from '@sistemazero/member-shell/lib/customer-helpdesk'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})
function conversation(): CustomerTicketDetail {
  const id = crypto.randomUUID(),
    at = new Date().toISOString()
  return {
    ticket: {
      id,
      version: 0,
      source: 'portal',
      subject: 'Bloco de movimento',
      status: 'open',
      category: 'studio',
      handlingMode: 'assistant',
      assistantState: 'thinking',
      handoffMessage: null,
      messageCount: 1,
      lastMessageAt: at,
      createdAt: at,
    },
    messages: [
      {
        id: crypto.randomUUID(),
        ticketId: id,
        kind: 'portal',
        visibility: 'customer',
        direction: 'inbound',
        authorKind: 'customer',
        citations: [],
        fromName: 'Responsável',
        bodyText: 'Como mover o personagem?',
        createdAt: at,
      },
    ],
    hasOlder: false,
    hasMore: false,
    olderCursor: 'cursor-inicial',
    latestCursor: 'cursor-inicial',
  }
}
function response(detail: CustomerTicketDetail): CustomerTicketMessageView {
  return {
    id: crypto.randomUUID(),
    ticketId: detail.ticket.id,
    kind: 'portal',
    visibility: 'customer',
    direction: 'outbound',
    authorKind: 'assistant',
    citations: [
      {
        id: crypto.randomUUID(),
        title: 'Movimento no Estúdio',
        section: 'Mover',
        revisionNumber: 1,
      },
    ],
    fromName: 'Assistente',
    bodyText: 'Use o bloco de movimento.',
    createdAt: new Date().toISOString(),
  }
}
function install(handler: (path: string, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)),
    { preconnect: originalFetch.preconnect },
  )
}
test('polling mostra autoria/fontes e preserva texto e foco; resolução repetida conserva chave', async () => {
  const initial = conversation(),
    bot = response(initial)
  let remote = initial,
    attempts = 0
  const keys: string[] = [],
    reads: string[] = []
  install((path, init) => {
    if (path.includes('/sources/'))
      return Response.json({ title: 'Movimento no Estúdio', text: 'Trecho aprovado da base.' })
    if (path.endsWith('/resolve')) {
      keys.push(JSON.parse(String(init?.body)).idempotencyKey)
      attempts++
      if (attempts === 1) return Response.json({ error: { code: 'UNAVAILABLE' } }, { status: 503 })
      return Response.json({
        ticket: {
          ...remote.ticket,
          status: 'resolved',
          assistantState: 'resolved',
          version: 2,
          handlingMode: 'human',
        },
      })
    }
    reads.push(path)
    return Response.json(remote)
  })
  render(
    <CustomerHelpdeskPortal
      initialPage={{ items: [initial.ticket], total: 1, hasMore: false, nextCursor: null }}
      parentAreaHref="/pais"
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /Bloco de movimento/ }))
  const editor = (await screen.findByRole('textbox', {
    name: 'Sua mensagem',
  })) as HTMLTextAreaElement
  fireEvent.change(editor, { target: { value: 'Estou escrevendo um detalhe importante.' } })
  editor.focus()
  remote = {
    ...initial,
    ticket: {
      ...initial.ticket,
      status: 'waiting',
      assistantState: 'waiting_customer',
      version: 1,
      messageCount: 2,
    },
    messages: [initial.messages[0]!, bot],
    latestCursor: 'cursor-bot',
  }
  await waitFor(() => expect(screen.getByText('Assistente de IA')).toBeTruthy(), { timeout: 3500 })
  expect(editor.value).toBe('Estou escrevendo um detalhe importante.')
  expect(document.activeElement).toBe(editor)
  expect(screen.getAllByText('Como mover o personagem?')).toHaveLength(1)
  expect(reads.some((path) => path.includes('/messages?limit=50&after='))).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: /Movimento no Estúdio/ }))
  expect(await screen.findByText('Trecho aprovado da base.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Resolveu meu problema' }))
  await screen.findByRole('alert')
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Resolveu meu problema' }) as HTMLButtonElement).disabled,
    ).toBe(false),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Resolveu meu problema' }))
  expect(await screen.findByText(/Obrigado por confirmar/)).toBeTruthy()
  expect(keys).toHaveLength(2)
  expect(keys[0]).toBe(keys[1])
  expect(editor.value).toBe('Estou escrevendo um detalhe importante.')
})
test('expiração parental interrompe atualização sem apagar a mensagem escrita', async () => {
  const initial = conversation()
  install((path) =>
    path.includes('/messages?')
      ? Response.json({ error: { code: 'PARENT_GATE_REQUIRED' } }, { status: 403 })
      : Response.json(initial),
  )
  render(
    <CustomerHelpdeskPortal
      initialPage={{ items: [initial.ticket], total: 1, hasMore: false, nextCursor: null }}
      parentAreaHref="/pais"
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /Bloco de movimento/ }))
  const editor = (await screen.findByRole('textbox', {
    name: 'Sua mensagem',
  })) as HTMLTextAreaElement
  fireEvent.change(editor, { target: { value: 'Texto preservado após expiração.' } })
  await waitFor(
    () => expect(screen.getByRole('link', { name: 'Voltar para a Área dos Pais' })).toBeTruthy(),
    { timeout: 3500 },
  )
  expect(editor.value).toBe('Texto preservado após expiração.')
})

test('resposta tardia de um comando não reverte estado mais recente recebido pelo polling', async () => {
  const initial = conversation()
  initial.messages.push(response(initial))
  let release!: (value: Response) => void
  const pending = new Promise<Response>((resolve) => {
    release = resolve
  })
  install((path) => {
    if (path.endsWith('/resolve')) return pending
    if (path.includes('/messages?'))
      return Response.json({
        ...initial,
        ticket: {
          ...initial.ticket,
          version: 3,
          handlingMode: 'human',
          assistantState: 'human',
          handoffMessage: 'A equipe já assumiu este atendimento.',
        },
      })
    return Response.json(initial)
  })
  render(
    <CustomerHelpdeskPortal
      initialPage={{ items: [initial.ticket], total: 1, hasMore: false, nextCursor: null }}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /Bloco de movimento/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'Resolveu meu problema' }))
  await waitFor(
    () => expect(screen.getByText('A equipe já assumiu este atendimento.')).toBeTruthy(),
    { timeout: 3500 },
  )
  release(
    Response.json({
      ticket: {
        ...initial.ticket,
        version: 2,
        status: 'resolved',
        assistantState: 'resolved',
        handlingMode: 'human',
      },
    }),
  )
  await screen.findByText(/Obrigado por confirmar/)
  expect(screen.getByText('A equipe já assumiu este atendimento.')).toBeTruthy()
})
