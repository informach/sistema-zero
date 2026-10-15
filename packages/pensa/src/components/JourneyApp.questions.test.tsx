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

const proposal = {
  id: 'pr1',
  title: 'O voo do dragão',
  summary: 'Um dragão que voa.',
  firstResult: 'O dragão voa pela tela.',
  essentials: ['Um dragão que voa'],
  suggestions: [],
  later: [],
  dimension: '2d' as const,
  missions: [],
  test: { action: 'Aperte a seta.', expected: 'O dragão sobe.' },
  references: [],
  capabilities: {} as never,
}

function server(
  options: {
    asked?: boolean
    operation?: Partial<PensaOperation> | null
    credits?: AiCreditsView | null
    list?: PensaJourneyListItem[]
    /** A proposta já existe (a pergunta veio do "Quero mudar uma coisa"). */
    proposalStage?: boolean
    /** O `/command` recusa assim (o conflito padrão do members). */
    commandError?: { status: number; message: string }
  } = {},
) {
  const view = (): PensaJourneyView => {
    const journey = createPensaJourney('p1', 'c1', '2026-10-15T12:00:00Z')
    journey.revision = 2
    journey.intent = 'Quero um jogo de dragão'
    if (options.proposalStage) {
      journey.stage = 'proposal'
      journey.proposal = proposal
    }
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
  const commands: unknown[] = []
  let creditReads = 0
  const request = mock(async (path: string, input?: { method?: string; body?: unknown }) => {
    if (path === '/v2/credits') {
      creditReads += 1
      return { credits: options.credits ?? null }
    }
    if (path === '/v2/projects/p1/command') {
      commands.push(input?.body)
      if (options.commandError)
        throw Object.assign(new Error(options.commandError.message), options.commandError)
      return view()
    }
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
  return { adapter, sent, commands, creditReads: () => creditReads }
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
      // Tocar não leva o foco ao campo (no tablet, o teclado cobriria as respostas).
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(document.activeElement).not.toBe(field)
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
      expect(ovos.getAttribute('aria-pressed')).toBe('true')
      // Outra resposta TROCA a de baixo e o texto dela fica (antes elas se somavam).
      fireEvent.click(voa)
      fireEvent.click(voa)
      expect(field.value).toBe('Ele cospe fogo\nVoa desviando das pedras')
      expect(voa.getAttribute('aria-pressed')).toBe('true')
      expect(ovos.getAttribute('aria-pressed')).toBe('false')
      // "Contar do meu jeito" tira só a resposta pronta.
      fireEvent.click(screen.getByText('Contar do meu jeito').closest('button') as HTMLElement)
      expect(field.value).toBe('Ele cospe fogo')
      fireEvent.click(ovos)
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
      const steps = [...document.querySelectorAll('.pensa-journey-progress li')].map((li) =>
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

describe('a pergunta esperando, os usos e a proposta (full review de 15/10/2026)', () => {
  const exhausted: AiCreditsView = {
    dayLimit: 50,
    dayRemaining: 0,
    monthLimit: 500,
    monthRemaining: 300,
    monthRenewsOn: '2026-11-01',
  }

  test(
    'com os usos no fim, a resposta à pergunta ainda sai: ela não gasta uso novo',
    async () => {
      // O servidor retoma o MESMO pedido (a reserva que já conta no saldo): bloquear deixava a
      // criança sem responder com o servidor pronto para aceitar.
      const { adapter, sent } = server({
        asked: true,
        credits: exhausted,
        operation: { status: 'waiting', step: 'propose' },
      })
      openGame(adapter)
      const field = (await screen.findByLabelText(
        /O que o seu dragão faz\?/,
      )) as HTMLTextAreaElement
      await new Promise((resolve) => setTimeout(resolve, 300))
      fireEvent.click(screen.getByText('Voa desviando das pedras').closest('button') as HTMLElement)
      expect(field.value).toBe('Voa desviando das pedras')
      expect(await screen.findByText('Responder ao Zappy não gasta uma ideia nova.')).toBeTruthy()
      expect(document.querySelector('.pensa-credits-notice')).toBeNull()
      const send = screen.getByText('Enviar para o Zappy').closest('button') as HTMLButtonElement
      expect(send.disabled).toBe(false)
      fireEvent.click(send)
      await waitFor(() => expect(sent).toHaveLength(1))
    },
    LENTO,
  )

  test(
    'sem pergunta esperando e sem usos, o Ctrl+Enter também não envia',
    async () => {
      const { adapter, sent } = server({ credits: exhausted })
      openGame(adapter)
      const field = (await screen.findByLabelText(
        'Quer acrescentar ou mudar alguma coisa?',
      )) as HTMLTextAreaElement
      fireEvent.change(field, { target: { value: 'Quero chuva' } })
      await waitFor(() => expect(document.querySelector('.pensa-credits-notice')).toBeTruthy())
      fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(sent).toEqual([])
    },
    LENTO,
  )

  test(
    'a pergunta feita na proposta volta ao reabrir o jogo, e o aceite espera a resposta',
    async () => {
      // "Quero mudar uma coisa" virou pergunta e a criança saiu: na volta o campo abre com as
      // respostas, e "Vamos construir esse começo" fica desligado (o servidor recusaria).
      const { adapter, sent, commands } = server({
        asked: true,
        proposalStage: true,
        operation: { status: 'waiting', step: 'propose' },
      })
      openGame(adapter)
      const field = (await screen.findByLabelText(
        /O que o seu dragão faz\?/,
      )) as HTMLTextAreaElement
      expect(screen.getByText('Voa desviando das pedras')).toBeTruthy()
      const accept = screen
        .getByText('Vamos construir esse começo')
        .closest('button') as HTMLButtonElement
      expect(accept.disabled).toBe(true)
      expect(
        screen.getByText('Responda a pergunta do Zappy antes de escolher esse começo.'),
      ).toBeTruthy()
      fireEvent.click(accept)
      expect(commands).toEqual([])
      // O rascunho do campo é relido logo depois de abrir: espera ele ter tido a chance.
      await new Promise((resolve) => setTimeout(resolve, 300))
      fireEvent.click(screen.getByText('Pega ovos pelo caminho').closest('button') as HTMLElement)
      expect(field.value).toBe('Pega ovos pelo caminho')
      fireEvent.click(screen.getByText('Enviar para o Zappy'))
      await waitFor(() => expect(sent).toHaveLength(1))
    },
    LENTO,
  )

  test(
    'o conflito padrão do servidor vira a frase do jogo, nunca "Recarregue o guia"',
    async () => {
      const { adapter, commands } = server({
        proposalStage: true,
        operation: { status: 'waiting', step: 'choice' },
        commandError: {
          status: 409,
          message: 'A tarefa mudou em outro aparelho. Recarregue o guia e tente novamente.',
        },
      })
      openGame(adapter)
      fireEvent.click(await screen.findByText('Vamos construir esse começo'))
      await waitFor(() => expect(commands).toHaveLength(1))
      expect(
        await screen.findByText(
          'O jogo mudou em outra tela. Já mostrei como ele está agora: confira e tente de novo.',
        ),
      ).toBeTruthy()
      expect(screen.queryByText(/Recarregue o guia/)).toBeNull()
    },
    LENTO,
  )

  test(
    'o selo de usos relê o saldo depois de cada envio',
    async () => {
      // Antes ele só relia quando o Zappy terminava de pensar: um envio recusado ou respondido na
      // hora deixava o número velho (e um "acabou" preso até recarregar a página).
      const { adapter, sent, creditReads } = server({
        credits: { ...exhausted, dayRemaining: 3 },
      })
      openGame(adapter)
      const field = (await screen.findByLabelText(
        'Quer acrescentar ou mudar alguma coisa?',
      )) as HTMLTextAreaElement
      await waitFor(() => expect(creditReads()).toBeGreaterThan(0))
      const before = creditReads()
      fireEvent.change(field, { target: { value: 'Quero chuva' } })
      fireEvent.click(screen.getByText('Enviar para o Zappy'))
      await waitFor(() => expect(sent).toHaveLength(1))
      await waitFor(() => expect(creditReads()).toBeGreaterThan(before))
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
