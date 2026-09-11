import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { HubThreadView } from '../src/lib/types'

/**
 * Os filtros do Mural e o "Carregar mais" (full review de 11/09/2026). O cursor do hub
 * carrega a ORDEM do filtro, então trocar de filtro recomeça a lista. Duas corridas:
 *  - um "Carregar mais" em voo na ordem antiga resolvia DEPOIS da troca e emendava a página
 *    dele na lista nova (duas ordens misturadas);
 *  - até a primeira página da ordem nova chegar, o botão seguia na tela com o cursor antigo,
 *    que o hub recusa na ordem nova, e a criança lia a mensagem crua do erro.
 * O teste monta o Mural de verdade, com a rede falsa e respostas que só chegam quando ele
 * manda (`adiada`).
 *
 * `mock.module` é global ao run: o `next/navigation` espalha o módulo real (receita do
 * community-composers-a11y) e só troca o `useRouter`, que precisa do roteador do Next.
 */
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...navigation,
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {} }),
}))

const { toast } = await import('sonner')
const { KidsSpaceViewClient } = await import('../src/components/kids/kids-space-view-client')

const originalFetch = globalThis.fetch

const espaco = {
  id: 'sp-mural',
  slug: 'mural',
  name: 'Mural dos Criadores',
  description: 'A vitrine dos projetos.',
  iconUrl: null,
  audience: 'kids',
  locked: false,
}

const parede = {
  id: 'ch-parede',
  spaceId: 'sp-mural',
  slug: 'parede',
  name: 'Parede',
  topic: null,
  postingPolicy: 'staff_only',
  requiresApproval: false,
  hasUnread: false,
}

function jogo(id: string, title: string): HubThreadView {
  return {
    id,
    version: 1,
    channelId: parede.id,
    authorId: `autor-${id}`,
    authorProfileId: null,
    title,
    slug: id,
    body: 'Um jogo muito legal.',
    isPinned: false,
    isLocked: false,
    status: 'visible',
    pending: false,
    commentCount: 0,
    isShowcase: true,
    authorDisplayName: 'Bia',
    authorPublic: false,
    coverImageUrl: null,
    playId: null,
    challengeKey: null,
    reactions: [],
    attachments: [],
    lastActivityAt: '2026-09-10T12:00:00.000Z',
    createdAt: '2026-09-10T12:00:00.000Z',
    editedAt: null,
  }
}

/** Uma resposta que só chega quando o teste mandar. */
function adiada() {
  let soltar: (resposta: Response) => void = () => {}
  const promessa = new Promise<Response>((resolve) => {
    soltar = resolve
  })
  return { promessa, soltar }
}

/** A rede do Mural: as rotas que o teste não adia respondem na hora. */
function rede(rotas: Record<string, () => Promise<Response> | Response>) {
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (init?.method === 'POST') return Response.json({ ok: true })
      if (path === '/api/hub/spaces/mural') return Response.json(espaco)
      if (path === '/api/hub/spaces/mural/channels') return Response.json({ items: [parede] })
      const rota = rotas[path]
      if (rota) return rota()
      throw new Error(`fetch de teste não previsto: ${path}`)
    }),
    { preconnect: originalFetch.preconnect },
  )
}

const primeiraPagina = () =>
  Response.json({ items: [jogo('a1', 'Nave da Bia')], nextCursor: 'cur-atividade', hasMore: true })

afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})

describe('os filtros do Mural e o "Carregar mais"', () => {
  test('trocar o filtro com um "Carregar mais" em voo não mistura as duas listas', async () => {
    const paginaDoisAntiga = adiada()
    const jogadas = adiada()
    rede({
      '/api/hub/channels/ch-parede/threads': primeiraPagina,
      '/api/hub/channels/ch-parede/threads?cursor=cur-atividade': () => paginaDoisAntiga.promessa,
      '/api/hub/channels/ch-parede/threads?sort=plays': () => jogadas.promessa,
    })
    render(<KidsSpaceViewClient slug="mural" viewerId="perfil-1" mode="wall" />)
    await screen.findByText('Nave da Bia')

    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais projetos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mais jogados' }))
    // Até a primeira página da ordem nova chegar, não há "Carregar mais": o cursor que existe
    // é da ordem antiga, e o hub o recusa na nova.
    expect(screen.queryByRole('button', { name: /Carregar mais|Carregando/ })).toBeNull()

    await act(async () => {
      jogadas.soltar(
        Response.json({
          items: [jogo('p1', 'Pong do Caio')],
          nextCursor: 'cur-jogadas',
          hasMore: true,
        }),
      )
    })
    await screen.findByText('Pong do Caio')

    // A página 2 da ordem ANTIGA chega depois: perde a vez e é descartada.
    await act(async () => {
      paginaDoisAntiga.soltar(
        Response.json({
          items: [jogo('a2', 'Labirinto da Duda')],
          nextCursor: null,
          hasMore: false,
        }),
      )
    })
    expect(screen.queryByText('Labirinto da Duda')).toBeNull()
    expect(screen.getByText('Pong do Caio')).toBeTruthy()
    // E o "Carregar mais" que volta é o da ordem nova, pronto (não preso em "Carregando…").
    expect(screen.getByRole('button', { name: 'Carregar mais projetos' })).toBeTruthy()
  })

  test('sem troca de filtro, a página 2 entra no fim da lista (anti-vácuo)', async () => {
    rede({
      '/api/hub/channels/ch-parede/threads': primeiraPagina,
      '/api/hub/channels/ch-parede/threads?cursor=cur-atividade': () =>
        Response.json({
          items: [jogo('a2', 'Labirinto da Duda')],
          nextCursor: null,
          hasMore: false,
        }),
    })
    render(<KidsSpaceViewClient slug="mural" viewerId="perfil-1" mode="wall" />)
    await screen.findByText('Nave da Bia')
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais projetos' }))
    await screen.findByText('Labirinto da Duda')
    expect(screen.getByText('Nave da Bia')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Carregar mais/ })).toBeNull()
  })

  test('um "Carregar mais" que falha fala com a criança, não com o hub', async () => {
    const erro = spyOn(toast, 'error')
    try {
      rede({
        '/api/hub/channels/ch-parede/threads': primeiraPagina,
        '/api/hub/channels/ch-parede/threads?cursor=cur-atividade': () =>
          Response.json(
            { error: { code: 'INVALID_CURSOR', message: 'Invalid cursor for this sort' } },
            { status: 400 },
          ),
      })
      render(<KidsSpaceViewClient slug="mural" viewerId="perfil-1" mode="wall" />)
      await screen.findByText('Nave da Bia')
      fireEvent.click(screen.getByRole('button', { name: 'Carregar mais projetos' }))
      await waitFor(() => {
        expect(erro).toHaveBeenCalledWith('Não consegui trazer mais agora. Tente de novo!')
      })
      expect(erro).not.toHaveBeenCalledWith('Invalid cursor for this sort')
    } finally {
      erro.mockRestore()
    }
  })
})
