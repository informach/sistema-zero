import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'

// Mantém o módulo completo: outros testes do mesmo processo usam exports adicionais.
const navigation = await import('next/navigation')
const push = mock(() => {})
mock.module('next/navigation', () => ({ ...navigation, useRouter: () => ({ push }) }))

const { RecadoThreadClient } = await import(
  '../src/app/(app)/recados/[threadId]/recado-thread-client'
)
const { KidsSpaceViewClient } = await import('../src/components/kids/kids-space-view-client')

const originalFetch = globalThis.fetch

function installFetch() {
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path === '/api/hub/spaces/clube') {
        return Response.json({
          id: 'space-1',
          slug: 'clube',
          name: 'Clube dos Criadores',
          description: null,
          iconUrl: null,
          audience: 'kids',
          locked: false,
        })
      }
      if (path === '/api/hub/spaces/clube/channels') {
        return Response.json({
          items: [
            {
              id: 'channel-1',
              spaceId: 'space-1',
              slug: 'geral',
              name: 'Geral',
              topic: null,
              postingPolicy: 'members',
              requiresApproval: false,
              hasUnread: false,
            },
          ],
        })
      }
      if (path === '/api/hub/channels/channel-1/threads') {
        return Response.json({ items: [], nextCursor: null, hasMore: false })
      }
      if (path === '/api/members/teacher-threads/thread-1') {
        return Response.json({
          id: 'thread-1',
          userId: 'profile-1',
          accountId: 'account-1',
          audience: 'kids',
          contextType: 'general',
          contextRef: null,
          courseId: null,
          lessonId: null,
          title: 'Conversa com o professor',
          lastMessageAt: '2026-08-16T12:00:00.000Z',
          createdAt: '2026-08-16T12:00:00.000Z',
          messages: [],
          nextCursor: null,
        })
      }
      if (init?.method === 'POST') return Response.json({ ok: true })
      throw new Error(`fetch de teste não previsto: ${path}`)
    }),
    { preconnect: originalFetch.preconnect },
  )
}

beforeEach(installFetch)
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('nomes acessíveis dos compositores da comunidade', () => {
  test('o campo de resposta dos recados tem label persistente', async () => {
    render(<RecadoThreadClient threadId="thread-1" />)

    const reply = await screen.findByRole('textbox', { name: 'Resposta para o professor' })
    expect(reply.getAttribute('name')).toBe('reply')
  })

  test('o título da nova conversa tem label persistente', async () => {
    render(<KidsSpaceViewClient slug="clube" viewerId="profile-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Começar conversa' }))
    // ⚠️ indBy (assíncrono), como o irmão logo abaixo: o conteúdo do diálogo não
    // está no DOM no mesmo tique do clique. Com getBy síncrono o teste passava na
    // máquina rápida e reprovava no CI (2 de 3 runs em 18/08) — flake por corrida.
    const title = await screen.findByRole('textbox', { name: 'Título da conversa' })
    expect(title.getAttribute('name')).toBe('threadTitle')
  })

  test('o corpo da nova conversa expõe o editor rico como campo nomeado', async () => {
    render(<KidsSpaceViewClient slug="clube" viewerId="profile-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Começar conversa' }))
    expect(await screen.findByRole('textbox', { name: 'Mensagem da conversa' })).toBeTruthy()
  })
})
