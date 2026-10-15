import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import {
  createPensaJourney,
  type PensaBlueprintMission,
  type PensaJourneyView,
  type PensaOperation,
  type PensaProposal,
} from '@sistemazero/core/pensa'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PensaHostAdapter } from '../core/types'
import { JourneyApp } from './JourneyApp'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

/**
 * Desenhar a arte é uma OFERTA (15/10/2026, decisão dela): o começo usa figuras prontas do
 * Estúdio, e a missão do Pinta (ou do Molda, num jogo 3D) só entra se a criança aceitar. Aceitar
 * só PREENCHE o campo, como as respostas prontas; quem refaz o começo é o "Enviar para o Zappy".
 */
const LENTO = 60_000

const studio = (key: string): PensaBlueprintMission => ({
  key,
  destination: 'studio',
  title: 'O dragão voa',
  result: 'O dragão sobe com a seta.',
  dependencies: [],
  blockIds: [],
  extensionIds: [],
  mechanicIds: [],
  toolIds: [],
  asset: null,
})

function server(
  options: {
    dimension?: '2d' | '3d'
    pinta?: boolean
    molda?: boolean
    missions?: PensaBlueprintMission[]
    asked?: boolean
    /** A versão do jogo (a 2 nasce do "Fazer a próxima versão"). */
    version?: number
    credits?: AiCreditsView | null
    /** O pedido do Zappy esperando a escolha do começo (o normal depois de uma proposta). */
    waiting?: boolean
    /** Equipe: a criança só programa, e a arte é de outra pessoa. */
    teamArt?: string[]
  } = {},
) {
  const proposal: PensaProposal = {
    id: 'pr1',
    title: 'O voo do dragão',
    summary: 'Um dragão que voa.',
    firstResult: 'O dragão voa pela tela.',
    essentials: ['Um dragão que voa'],
    suggestions: [],
    later: [],
    dimension: options.dimension ?? '2d',
    missions: options.missions ?? [studio('m1')],
    test: { action: 'Aperte a seta.', expected: 'O dragão sobe.' },
    references: [],
    capabilities: {
      profileId: 'eu',
      rank: 'explorer',
      studio: true,
      pinta: options.pinta ?? true,
      molda: options.molda ?? false,
      dimensions: ['2d', '3d'],
      blockIds: [],
      extensionIds: [],
      moldaTools: [],
      tutor: false,
      fingerprint: 'a',
    },
  }
  const view = (): PensaJourneyView => {
    const journey = createPensaJourney('p1', 'c1', '2026-10-15T12:00:00Z')
    journey.revision = 2
    journey.intent = 'Quero um jogo de dragão'
    journey.stage = 'proposal'
    journey.proposal = proposal
    journey.messages = [
      { id: 'u1', role: 'user', text: 'Quero um jogo de dragão', at: '', revision: 1, final: true },
      ...(options.asked
        ? [
            {
              id: 'a1',
              role: 'assistant' as const,
              text: 'O que o seu dragão faz?',
              at: '',
              revision: 1,
              final: true,
              choices: {
                about: 'action' as const,
                options: [
                  { label: 'Voa', description: 'Desvia das pedras.' },
                  { label: 'Pega ovos', description: 'Cada ovo vale um ponto.' },
                ],
              },
            },
          ]
        : []),
    ]
    return {
      project: { id: 'p1', name: 'O voo do dragão', status: 'active' },
      journey,
      operation: options.waiting
        ? ({
            id: 'op',
            projectId: 'p1',
            cycleId: 'c1',
            kind: 'planning',
            step: 'choice',
            status: 'waiting',
            inputRevision: 2,
            attempts: 0,
            error: null,
            createdAt: '',
            updatedAt: '',
          } as PensaOperation)
        : null,
      cycles: [{ id: 'c1', number: options.version ?? 1 }],
      ...(options.teamArt
        ? {
            role: 'owner' as const,
            team: {
              viewerProfileId: 'eu',
              ownerProfileId: 'eu',
              memberCount: 1,
              shareEnabled: false,
              roles: { code: 'eu', art: options.teamArt },
            },
          }
        : {}),
    }
  }
  const sent: Array<{ message: string; kind: string }> = []
  const request = mock(async (path: string, input?: { method?: string; body?: unknown }) => {
    if (path === '/v2/credits') return { credits: options.credits ?? null }
    if (path === '/v2/projects/p1/team')
      return {
        viewerProfileId: 'eu',
        role: 'owner',
        shareCode: null,
        maxMembers: 5,
        roles: { code: 'eu', art: options.teamArt ?? [] },
        people: [
          { profileId: 'eu', firstName: 'Helena', photoUrl: null, owner: true, joinedAt: null },
          { profileId: 'bia', firstName: 'Bia', photoUrl: null, owner: false, joinedAt: null },
        ],
        codeLocked: false,
      }
    if (path.startsWith('/v2/projects?')) return []
    if (path === '/projects') return { projects: [] }
    if (path === '/v2/projects/p1') return view()
    if (path.endsWith('/work')) return { ok: true }
    if (path === '/v2/projects/p1/start') {
      sent.push(input?.body as { message: string; kind: string })
      return view()
    }
    throw new Error(path)
  })
  const adapter: PensaHostAdapter = {
    viewerId: 'eu',
    mode: 'kids',
    capabilities: { studioOwned: true, pintaOwned: true, moldaOwned: true },
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
    onOpenTask: mock(),
  }
  return { adapter, sent, request }
}

const openGame = (adapter: PensaHostAdapter) =>
  render(<JourneyApp adapter={adapter} initialProjectId="p1" onLegacy={mock()} teamPollMs={0} />)

const field = () =>
  waitFor(() => {
    const el = document.querySelector('textarea')
    if (!el) throw new Error('sem campo')
    return el
  })
const offerButton = (name: string) => screen.getByText(name).closest('button') as HTMLButtonElement
const exhausted: AiCreditsView = {
  dayLimit: 50,
  dayRemaining: 0,
  monthLimit: 500,
  monthRemaining: 300,
  monthRenewsOn: '2026-11-01',
}

describe('a oferta de desenhar a arte do jogo', () => {
  test(
    'só com o Estúdio no caminho, oferece o Pinta; tocar preenche o campo e o envio é de planejamento',
    async () => {
      const { adapter, sent } = server({ waiting: true })
      openGame(adapter)
      await screen.findByText('Quer desenhar o seu personagem?')
      expect(screen.getByText(/Este começo usa uma figura pronta do Estúdio/)).toBeTruthy()
      expect(offerButton('Quero desenhar no Pinta').getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(offerButton('Quero desenhar no Pinta'))
      const input = (await field()) as HTMLTextAreaElement
      expect(input.value).toBe('Quero desenhar o personagem do jogo no Pinta.')
      // Nada sai sozinho: o campo foi preenchido, o botão fica (com o foco) e o convite diz o
      // próximo toque.
      expect(sent).toHaveLength(0)
      expect(offerButton('Quero desenhar no Pinta').getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByText(/Agora toque em "Enviar para o Zappy"/)).toBeTruthy()
      // Com o pedido no campo, escolher o começo antigo fica desligado.
      const begin = screen.getByText('Vamos construir esse começo').closest('button')
      expect(begin?.hasAttribute('disabled')).toBe(true)
      fireEvent.click(screen.getByText('Enviar para o Zappy'))
      await waitFor(() => expect(sent).toHaveLength(1))
      expect(sent[0]).toMatchObject({
        kind: 'planning',
        message: 'Quero desenhar o personagem do jogo no Pinta.',
      })
    },
    LENTO,
  )

  test(
    'o pedido entra embaixo do que ela escreveu; tocar de novo tira, e apagar a linha também',
    async () => {
      const { adapter } = server({ waiting: true })
      openGame(adapter)
      fireEvent.click(await screen.findByText('Quero mudar uma coisa'))
      const input = (await field()) as HTMLTextAreaElement
      fireEvent.change(input, { target: { value: 'O dragão é verde' } })
      fireEvent.click(offerButton('Quero desenhar no Pinta'))
      expect(input.value).toBe('O dragão é verde\nQuero desenhar o personagem do jogo no Pinta.')
      fireEvent.click(offerButton('Quero desenhar no Pinta'))
      expect(input.value).toBe('O dragão é verde')
      expect(offerButton('Quero desenhar no Pinta').getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(offerButton('Quero desenhar no Pinta'))
      fireEvent.change(input, { target: { value: 'O dragão é verde' } })
      expect(offerButton('Quero desenhar no Pinta').getAttribute('aria-pressed')).toBe('false')
    },
    LENTO,
  )

  test(
    'num jogo 3D com o Molda, a oferta é de modelar',
    async () => {
      const { adapter } = server({ dimension: '3d', molda: true, waiting: true })
      openGame(adapter)
      await screen.findByText('Quer modelar o seu personagem?')
      fireEvent.click(offerButton('Quero modelar no Molda'))
      expect(((await field()) as HTMLTextAreaElement).value).toBe(
        'Quero modelar o personagem do jogo no Molda.',
      )
    },
    LENTO,
  )

  test(
    'em equipe, quem só programa pede o desenho a quem cuida das artes',
    async () => {
      const { adapter, sent } = server({ waiting: true, teamArt: ['bia'] })
      openGame(adapter)
      await screen.findByText('Quer o personagem desenhado no Pinta?')
      expect(screen.getByText(/quem cuida das artes desenha o personagem no Pinta/)).toBeTruthy()
      expect(screen.queryByText('Quer desenhar o seu personagem?')).toBeNull()
      fireEvent.click(offerButton('Pedir o desenho no Pinta'))
      fireEvent.click(screen.getByText('Enviar para o Zappy'))
      await waitFor(() => expect(sent).toHaveLength(1))
      expect(sent[0]?.message).toBe(
        'Quero que quem cuida das artes desenhe o personagem do jogo no Pinta.',
      )
    },
    LENTO,
  )

  test(
    'com os usos no fim, a oferta fica enquanto o Zappy retoma o mesmo pedido, e some sem ele',
    async () => {
      const retoma = server({ waiting: true, credits: exhausted })
      openGame(retoma.adapter)
      await screen.findByText('Quer desenhar o seu personagem?')
      cleanup()
      const semPedido = server({ credits: exhausted })
      openGame(semPedido.adapter)
      await screen.findByText('O dragão voa pela tela.')
      // O saldo chega depois do jogo: espera a leitura e um respiro para a tela refletir.
      await waitFor(() =>
        expect(semPedido.request.mock.calls.some(([path]) => path === '/v2/credits')).toBe(true),
      )
      await new Promise((resolve) => setTimeout(resolve, 30))
      expect(screen.queryByText('Quer desenhar o seu personagem?')).toBeNull()
    },
    LENTO,
  )

  test(
    'guardando uma ideia, a oferta sai da tela (o pedido viraria uma ideia guardada)',
    async () => {
      const { adapter } = server({ waiting: true })
      openGame(adapter)
      await screen.findByText('Quer desenhar o seu personagem?')
      fireEvent.click(screen.getByText('Contar outra ideia'))
      await screen.findByText('Guardar minha ideia')
      expect(screen.queryByText('Quer desenhar o seu personagem?')).toBeNull()
    },
    LENTO,
  )

  test(
    'sem a oficina, com arte no caminho, na versão 2 ou com o Zappy perguntando, não há oferta',
    async () => {
      const cases = [
        // Sem o Pinta (nem dela nem de alguém da equipe).
        server({ pinta: false }),
        // Jogo 3D sem o Molda: o Pinta não faz modelo.
        server({ dimension: '3d', molda: false }),
        // O caminho já tem a missão de desenhar.
        server({ missions: [{ ...studio('m1'), key: 'a1', destination: 'pinta' }, studio('m2')] }),
        // O caminho já usa uma arte dela (do inventário).
        server({
          missions: [
            {
              ...studio('m1'),
              asset: {
                id: 'x',
                kind: 'sprite',
                source: 'existing',
                creationId: 'c1',
                description: 'O dragão dela',
              },
            },
          ],
        }),
        // A próxima versão: o jogo já existe e pode ter a arte dela.
        server({ version: 2 }),
        // O Zappy está esperando a resposta de uma pergunta.
        server({ asked: true }),
      ]
      for (const { adapter } of cases) {
        openGame(adapter)
        await screen.findByText('O dragão voa pela tela.')
        expect(screen.queryByText(/Quer (desenhar|modelar) o seu personagem\?/)).toBeNull()
        cleanup()
      }
    },
    LENTO,
  )
})
