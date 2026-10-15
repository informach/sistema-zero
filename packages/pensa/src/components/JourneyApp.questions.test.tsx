import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import {
  createPensaJourney,
  type PensaJourneyListItem,
  type PensaJourneyView,
  type PensaOperation,
} from '@sistemazero/core/pensa'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PensaHostAdapter } from '../core/types'
import { JourneyApp } from './JourneyApp'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

/**
 * O que veio do sandbox (15/10/2026): a pergunta do Zappy com respostas para tocar (que só
 * PREENCHEM o campo), as ideias para começar na home, o selo de usos do Zappy e as etapas reais
 * da espera. Consultas por rótulo e texto: por papel ficam lentas nesta árvore no happy-dom.
 */
const LENTO = 60_000

const question = {
  about: 'action' as const,
  options: [
    { label: 'Voa desviando das pedras', description: 'O jogo é não bater em nada.' },
    { label: 'Pega ovos pelo caminho', description: 'Cada ovo vale um ponto.' },
  ],
}

function server(
  options: {
    asked?: boolean
    operation?: Partial<PensaOperation> | null
    credits?: AiCreditsView | null
    list?: PensaJourneyListItem[]
  } = {},
) {
  const view = (): PensaJourneyView => {
    const journey = createPensaJourney('p1', 'c1', '2026-10-15T12:00:00Z')
    journey.revision = 2
    journey.intent = 'Quero um jogo de dragão'
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
              choices: question,
            },
          ]
        : []),
    ]
    return {
      project: { id: 'p1', name: 'O voo do dragão', status: 'active' },
      journey,
      operation: options.operation
        ? ({
            id: 'op',
            projectId: 'p1',
            cycleId: 'c1',
            kind: 'planning',
            step: 'propose',
            status: 'running',
            inputRevision: 2,
            attempts: 1,
            error: null,
            createdAt: '',
            updatedAt: '',
            ...options.operation,
          } as PensaOperation)
        : null,
      cycles: [{ id: 'c1', number: 1 }],
    }
  }
  const sent: unknown[] = []
  const request = mock(async (path: string, input?: { method?: string; body?: unknown }) => {
    if (path === '/v2/credits') return { credits: options.credits ?? null }
    if (path.startsWith('/v2/projects?')) return options.list ?? []
    if (path === '/projects') return { projects: [] }
    if (path === '/v2/projects' && input?.method === 'POST') return view()
    if (path === '/v2/projects/p1') return view()
    if (path.endsWith('/work')) return { ok: true }
    if (path === '/v2/projects/p1/start') {
      sent.push(input?.body)
      options.asked = true
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
  return { adapter, sent }
}

const openGame = (adapter: PensaHostAdapter) =>
  render(<JourneyApp adapter={adapter} initialProjectId="p1" onLegacy={mock()} teamPollMs={0} />)

describe('a pergunta do Zappy com respostas para tocar', () => {
  test(
    'o campo diz a pergunta e o assunto; tocar preenche, troca e nada sai sozinho',
    async () => {
      const { adapter, sent } = server({ asked: true })
      openGame(adapter)
      const field = (await screen.findByLabelText(
        /O que o seu dragão faz\?/,
      )) as HTMLTextAreaElement
      expect(screen.getAllByText(/Sobre: o que você faz no jogo/).length).toBeGreaterThan(0)
      expect(field.placeholder).toBe('Ou conte do seu jeito.')
      const voa = screen.getByText('Voa desviando das pedras').closest('button') as HTMLElement
      const ovos = screen.getByText('Pega ovos pelo caminho').closest('button') as HTMLElement
      fireEvent.click(voa)
      expect(field.value).toBe('Voa desviando das pedras')
      expect(voa.getAttribute('aria-pressed')).toBe('true')
      // Outra resposta TROCA a primeira (não soma).
      fireEvent.click(ovos)
      expect(field.value).toBe('Pega ovos pelo caminho')
      expect(voa.getAttribute('aria-pressed')).toBe('false')
      expect(sent).toEqual([])
      // "Tanto faz" também só preenche; quem decide é o Zappy.
      fireEvent.click(screen.getByText('Tanto faz, escolhe você').closest('button') as HTMLElement)
      expect(field.value).toBe('Tanto faz, escolhe você.')
      // "Contar do meu jeito" limpa a resposta pronta e leva ao campo.
      fireEvent.click(screen.getByText('Contar do meu jeito').closest('button') as HTMLElement)
      expect(field.value).toBe('')
      await waitFor(() => expect(document.activeElement).toBe(field))
      // O que a criança escreveu do jeito dela fica; a resposta entra embaixo.
      fireEvent.change(field, { target: { value: 'Ele cospe fogo' } })
      fireEvent.click(ovos)
      expect(field.value).toBe('Ele cospe fogo\nPega ovos pelo caminho')
      fireEvent.click(screen.getByText('Enviar para o Zappy'))
      await waitFor(() => expect(sent).toHaveLength(1))
      expect((sent[0] as { message: string }).message).toBe(
        'Ele cospe fogo\nPega ovos pelo caminho',
      )
    },
    LENTO,
  )

  test(
    'sem pergunta esperando, o campo é o de sempre e não há respostas prontas',
    async () => {
      const { adapter } = server()
      openGame(adapter)
      expect(await screen.findByLabelText('Quer acrescentar ou mudar alguma coisa?')).toBeTruthy()
      expect(screen.queryByText('Tanto faz, escolhe você')).toBeNull()
    },
    LENTO,
  )
})

describe('a espera e os usos do Zappy', () => {
  test(
    'a espera mostra a etapa de verdade: entendendo a ideia, depois conferindo os blocos',
    async () => {
      const { adapter } = server({ operation: { step: 'review' } })
      openGame(adapter)
      expect(await screen.findByText('Organizando sua ideia')).toBeTruthy()
      const steps = [...document.querySelectorAll('.pensa-journey-steps li')].map((li) =>
        li.textContent?.trim(),
      )
      expect(steps).toEqual([
        'Entendendo a sua ideia (feito)',
        'Conferindo com os seus blocos e montando o começo (agora)',
      ])
    },
    LENTO,
  )

  test(
    'o selo de usos aparece; acabou, o campo avisa e não deixa enviar',
    async () => {
      const exhausted: AiCreditsView = {
        dayLimit: 50,
        dayRemaining: 0,
        monthLimit: 500,
        monthRemaining: 300,
        monthRenewsOn: '2026-11-01',
      }
      const { adapter } = server({ credits: exhausted })
      openGame(adapter)
      const field = (await screen.findByLabelText(
        'Quer acrescentar ou mudar alguma coisa?',
      )) as HTMLTextAreaElement
      fireEvent.change(field, { target: { value: 'Quero chuva' } })
      await waitFor(() => expect(document.querySelector('.pensa-credits-notice')).toBeTruthy())
      expect(document.querySelector('.pensa-credits.is-exhausted')).toBeTruthy()
      const send = screen.getByText('Enviar para o Zappy').closest('button') as HTMLButtonElement
      expect(send.disabled).toBe(true)
    },
    LENTO,
  )
})

describe('a home sem ideia', () => {
  test(
    'as ideias para começar preenchem o campo com a ideia inteira e somem com texto',
    async () => {
      const { adapter, sent } = server()
      render(<JourneyApp adapter={adapter} onLegacy={mock()} teamPollMs={0} />)
      const chip = await screen.findByText('Dragão e o ninho')
      const field = screen.getByLabelText(
        'Como é o jogo que está na sua cabeça?',
      ) as HTMLTextAreaElement
      fireEvent.click(chip)
      expect(field.value).toContain('Um dragão que voa pegando ovos')
      expect(sent).toEqual([])
      await waitFor(() => expect(screen.queryByText('Dragão e o ninho')).toBeNull())
      fireEvent.change(field, { target: { value: '' } })
      expect(await screen.findByText('Dragão e o ninho')).toBeTruthy()
    },
    LENTO,
  )
})

test(
  'a primeira ideia enviada da home não volta para o campo do jogo novo',
  async () => {
    const { adapter, sent } = server()
    render(<JourneyApp adapter={adapter} onLegacy={mock()} teamPollMs={0} />)
    const field = (await screen.findByLabelText(
      'Como é o jogo que está na sua cabeça?',
    )) as HTMLTextAreaElement
    fireEvent.change(field, { target: { value: 'Quero um jogo de dragão' } })
    fireEvent.click(screen.getByText('Encontrar um começo'))
    await waitFor(() => expect(sent).toHaveLength(1))
    // O jogo abriu com a pergunta do Zappy, e o campo está vazio esperando a resposta.
    const answer = (await screen.findByLabelText(/O que o seu dragão faz\?/)) as HTMLTextAreaElement
    // O rascunho do jogo novo era recarregado depois de abrir: espera ele ter tido a chance.
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(answer.value).toBe('')
    expect(sessionStorage.getItem('sz:pensa-v2:draft:eu:p1')).toBeNull()
  },
  LENTO,
)
