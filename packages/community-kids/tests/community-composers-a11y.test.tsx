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

/**
 * ⚠️⚠️ AQUECER o editor rico ANTES dos casos, para o carregamento tardio sair
 * de dentro da janela de espera. O teto é só a rede de segurança.
 *
 * O `RichEditor` do member-shell é `next/dynamic({ ssr:false })`, então o campo
 * "Mensagem da conversa" só existe depois que o grafo do TipTap (StarterKit +
 * tiptap-markdown) TERMINA de carregar — um import que, no meio do teste, num
 * runner com 22 pacotes disputando CPU, já estourou 1 s (23/08) e depois 5 s
 * (23/08, o outro caso). Quando dá certo o caso leva 54 ms: o custo não é do
 * componente, é do carregamento tardio acontecer DENTRO da janela de espera.
 *
 * ⚠️ A leitura anterior — "mount frio, quem roda primeiro paga" — estava
 * ERRADA: no run verde os três casos levaram 17/54/194 ms, e a falha não é
 * lentidão, é o campo NUNCA aparecer dentro do teto. Com o módulo já no
 * registro, o `dynamic` resolve num microtask e a espera deixa de existir.
 *
 * Carregar aqui (e não mockar) preserva o que o teste PROVA: que o editor REAL
 * expõe o nome acessível que o compositor passa. Bônus: import que FALHE passa a
 * estourar no topo do arquivo, com a mensagem real, em vez de virar um timeout
 * mudo lá embaixo.
 *
 * ⚠️ HONESTIDADE sobre a prova: esta máquina resolve o import em <120 ms com ou
 * sem o aquecimento, então o anti-vácuo local NÃO distingue os dois — a
 * lentidão é do runner do CI, e é lá que o conserto se prova. Se voltar a
 * reprovar, a próxima parada é trocar o editor real por um duplo com o mesmo
 * `aria-label` (perde-se provar o editor REAL, ganha-se determinismo).
 */
await import('@sistemazero/member-shell/components/rich-editor.impl')

/** Rede de segurança para o resto (dois fetches + o diálogo), não orçamento. */
const ESPERA = { timeout: 5_000 } as const

describe('nomes acessíveis dos compositores da comunidade', () => {
  test('o campo de resposta dos recados tem label persistente', async () => {
    render(<RecadoThreadClient threadId="thread-1" />)

    const reply = await screen.findByRole('textbox', { name: 'Resposta para o professor' })
    expect(reply.getAttribute('name')).toBe('reply')
  })

  test('o título da nova conversa tem label persistente', async () => {
    render(<KidsSpaceViewClient slug="clube" viewerId="profile-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Começar conversa' }, ESPERA))
    // ⚠️ indBy (assíncrono), como o irmão logo abaixo: o conteúdo do diálogo não
    // está no DOM no mesmo tique do clique. Com getBy síncrono o teste passava na
    // máquina rápida e reprovava no CI (2 de 3 runs em 18/08) — flake por corrida.
    const title = await screen.findByRole('textbox', { name: 'Título da conversa' }, ESPERA)
    expect(title.getAttribute('name')).toBe('threadTitle')
  })

  test('o corpo da nova conversa expõe o editor rico como campo nomeado', async () => {
    render(<KidsSpaceViewClient slug="clube" viewerId="profile-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Começar conversa' }, ESPERA))
    expect(
      await screen.findByRole('textbox', { name: 'Mensagem da conversa' }, ESPERA),
    ).toBeTruthy()
  })
})
