import { afterEach, describe, expect, mock, test } from 'bun:test'
import {
  createPensaJourney,
  type PensaJourneyCommand,
  type PensaJourneyListItem,
  type PensaJourneyStage,
  type PensaJourneyView,
  type PensaProposal,
} from '@sistemazero/core/pensa'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { PensaHostAdapter } from '../core/types'
import { JourneyApp } from './JourneyApp'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

/**
 * O que voltou do plano clássico e o que o full review de 15/10/2026 consertou: a lixeira no
 * cartão do jogo, rever uma etapa vencida pelo mapa Z·E·R·O, renomear o jogo, tirar uma ideia
 * guardada, a oficina não liberada, a volta do teste para as missões e o fim do cartão de
 * referências (que é coisa interna).
 */
const LENTO_NO_CI = 30_000

const proposal: PensaProposal = {
  id: 'prop',
  title: 'O ninho nas nuvens',
  summary: 'Um dragão leva um ovo até o ninho.',
  firstResult: 'Seu dragão voa e leva um ovo até o ninho',
  essentials: ['Um dragão que voa'],
  suggestions: ['Usar as setas para voar'],
  later: [],
  dimension: '2d',
  missions: [],
  test: { action: 'Voe até o ovo', expected: 'o ovo aparece no ninho' },
  references: [{ kind: 'lesson', id: 'l1', title: 'Corre Dino · Aula 2', href: '#aula' }],
  capabilities: {
    profileId: 'eu',
    rank: 'hacker',
    studio: true,
    pinta: true,
    molda: true,
    dimensions: ['2d'],
    blockIds: [],
    extensionIds: [],
    moldaTools: [],
    tutor: false,
    fingerprint: 'a',
  },
}

const task = (
  id: string,
  destination: 'studio' | 'pinta' | 'molda',
  status: 'planned' | 'completed',
  dependencies: string[] = [],
) => ({
  id,
  title: `Missão ${id}`,
  summary: `O que acontece em ${id}`,
  destination,
  dependencies,
  progress: { status },
})

const game = (id: string, name: string): PensaJourneyListItem => ({
  id,
  name,
  status: 'active',
  cycleNumber: 1,
  stage: 'r',
  lastInteractionAt: new Date().toISOString(),
  paused: false,
})

function server(
  options: {
    stage?: PensaJourneyStage
    tasks?: ReturnType<typeof task>[]
    list?: PensaJourneyListItem[]
    capabilities?: PensaHostAdapter['capabilities']
  } = {},
) {
  let revision = 2
  let name = 'O ninho nas nuvens'
  let list = options.list ?? []
  let backlog: PensaJourneyView['journey']['backlog'] = [
    { id: 'i1', text: 'Uma chuva que deixa o dragão lento', origin: 'child' },
  ]
  let stage: PensaJourneyStage = options.stage ?? 'building'
  const tasks = options.tasks ?? [task('m1', 'pinta', 'completed'), task('m2', 'studio', 'planned')]
  const view = (): PensaJourneyView => {
    const journey = createPensaJourney('p1', 'c1', '2026-10-14T12:00:00Z')
    journey.stage = stage
    journey.revision = revision
    journey.intent = 'Um dragão que leva ovos de volta para o ninho'
    journey.proposal = proposal
    journey.acceptedProposalId = proposal.id
    journey.missionIds = tasks.map((t) => t.id)
    journey.backlog = backlog
    journey.tests = [
      {
        id: 't1',
        result: 'needs_adjustment',
        source: 'child',
        note: 'O ovo passou direto',
        creationId: 'jogo',
        saveRevision: 'r1',
        at: '2026-10-14T13:00:00Z',
      },
    ]
    journey.testSessionStart = 1
    return {
      project: { id: 'p1', name, status: 'active' },
      journey,
      operation: null,
      cycles: [{ id: 'c1', number: 1 }],
    }
  }
  const calls: string[] = []
  const request = mock(async (path: string, input?: { method?: string; body?: unknown }) => {
    const method = input?.method ?? 'GET'
    calls.push(`${method} ${path}`)
    if (path.startsWith('/v2/projects?')) return list
    if (path === '/projects') return { projects: [] }
    if (path.startsWith('/cycles/')) return { tasks, nextTaskId: null }
    const removed = /^\/v2\/projects\/([^/]+)$/.exec(path)
    if (removed && method === 'DELETE') {
      list = list.filter((item) => item.id !== removed[1])
      return { deleted: true }
    }
    if (path === '/v2/projects/p1' && method === 'PATCH') {
      name = (input?.body as { name: string }).name
      return view()
    }
    if (path === '/v2/projects/p1') return view()
    if (path === '/v2/projects/p1/command') {
      const command = (input?.body as { command: PensaJourneyCommand }).command
      revision += 1
      if (command.type === 'remove_idea')
        backlog = backlog.filter((idea) => idea.id !== command.ideaId)
      if (command.type === 'repair') stage = 'building'
      return view()
    }
    throw new Error(path)
  })
  const adapter: PensaHostAdapter = {
    viewerId: 'eu',
    mode: 'kids',
    capabilities: options.capabilities ?? { studioOwned: true, pintaOwned: true, moldaOwned: true },
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
    onOpenTask: mock(),
  }
  return { adapter, calls }
}

const openGame = (adapter: PensaHostAdapter) =>
  render(<JourneyApp adapter={adapter} initialProjectId="p1" onLegacy={mock()} teamPollMs={0} />)

describe('a home dos jogos', () => {
  test(
    'cada cartão tem a lixeira; apagar pergunta antes, tira o cartão e devolve o foco ao título',
    async () => {
      const { adapter, calls } = server({
        list: [game('p1', 'O ninho nas nuvens'), game('p2', 'Gato na lua')],
      })
      render(<JourneyApp adapter={adapter} onLegacy={mock()} teamPollMs={0} />)
      // Consultas por papel ficam lentas nesta árvore no happy-dom: rótulo e texto bastam.
      const lixeira = await screen.findByLabelText('Apagar o plano Gato na lua')
      fireEvent.click(lixeira)
      const janela = document.querySelector('[role="dialog"]') as HTMLElement
      expect(within(janela).getByText('Apagar este plano?')).toBeTruthy()
      expect(within(janela).getByText(/"Gato na lua" vai sumir/)).toBeTruthy()
      fireEvent.click(within(janela).getByText('Apagar'))
      await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull())
      expect(calls).toContain('DELETE /v2/projects/p2')
      // (Consultas por papel ficam lentas nesta árvore no happy-dom: o texto dos h3 basta.)
      expect([...document.querySelectorAll('h3')].map((h) => h.textContent)).not.toContain(
        'Gato na lua',
      )
      await waitFor(() => expect(document.activeElement).toBe(document.querySelector('h1')))
    },
    LENTO_NO_CI,
  )

  test(
    'com jogos, o campo do jogo novo fica atrás do "+ Novo jogo" e o Cancelar o fecha',
    async () => {
      const { adapter } = server({ list: [game('p1', 'O ninho nas nuvens')] })
      render(<JourneyApp adapter={adapter} onLegacy={mock()} teamPollMs={0} />)
      const novo = await screen.findByRole('button', { name: 'Novo jogo' })
      expect(screen.queryByLabelText('Como é o seu jogo novo?')).toBeNull()
      fireEvent.click(novo)
      expect(novo.getAttribute('aria-expanded')).toBe('true')
      expect(screen.getByLabelText('Como é o seu jogo novo?')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByLabelText('Como é o seu jogo novo?')).toBeNull()
    },
    LENTO_NO_CI,
  )
})

describe('dentro do jogo', () => {
  test(
    'a etapa feita do mapa abre a revisão (só leitura) e "Voltar para agora" fecha',
    async () => {
      const { adapter } = server()
      openGame(adapter)
      const etapaE = await screen.findByRole('button', { name: /Enxergar o jogo/ })
      expect(etapaE.getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(etapaE)
      expect(etapaE.getAttribute('aria-pressed')).toBe('true')
      const titulo = await screen.findByRole('heading', { level: 2, name: proposal.firstResult })
      await waitFor(() => expect(document.activeElement).toBe(titulo))
      expect(screen.getByText(/Você está revendo a etapa Enxergar o jogo/)).toBeTruthy()
      // A missão do momento sai de cena enquanto a criança revê.
      expect(screen.queryByRole('button', { name: /^Continuar no/ })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: /Zerar a bagunça/ }))
      expect(
        await screen.findByRole('heading', { level: 2, name: 'A ideia que você contou' }),
      ).toBeTruthy()
      expect(screen.getByText('Um dragão que leva ovos de volta para o ninho')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: /^Voltar para agora$/ }))
      expect(await screen.findByRole('button', { name: /^Continuar no Estúdio/ })).toBeTruthy()
    },
    LENTO_NO_CI,
  )

  test(
    'o caminho fica à vista, a ideia guardada pode sair e não há cartão de referências',
    async () => {
      const { adapter, calls } = server()
      openGame(adapter)
      expect(await screen.findByText('Missões feitas: 1 de 2')).toBeTruthy()
      expect(screen.queryByText(/O que ajudou a montar/)).toBeNull()
      expect(screen.queryByText('Corre Dino · Aula 2')).toBeNull()
      fireEvent.click(
        screen.getByRole('button', { name: 'Tirar a ideia: Uma chuva que deixa o dragão lento' }),
      )
      await waitFor(() =>
        expect(screen.queryByText('Uma chuva que deixa o dragão lento')).toBeNull(),
      )
      expect(calls).toContain('POST /v2/projects/p1/command')
    },
    LENTO_NO_CI,
  )

  test(
    'renomear: o lápis troca o título por um campo e o Enter grava',
    async () => {
      const { adapter, calls } = server()
      openGame(adapter)
      fireEvent.click(
        await screen.findByRole('button', { name: 'Renomear o jogo O ninho nas nuvens' }),
      )
      const campo = screen.getByLabelText('Nome do jogo') as HTMLInputElement
      fireEvent.change(campo, { target: { value: 'Meu dragão' } })
      fireEvent.keyDown(campo, { key: 'Enter' })
      expect(await screen.findByRole('heading', { level: 1, name: 'Meu dragão' })).toBeTruthy()
      expect(calls).toContain('PATCH /v2/projects/p1')
    },
    LENTO_NO_CI,
  )

  test(
    'oficina não liberada: o botão fica desligado e diz por quê',
    async () => {
      const { adapter } = server({
        capabilities: { studioOwned: false, pintaOwned: true, moldaOwned: true },
      })
      openGame(adapter)
      const botao = await screen.findByRole('button', { name: /^Continuar no Estúdio/ })
      expect(botao.hasAttribute('disabled')).toBe(true)
      expect(screen.getByText(/O Estúdio ainda não está liberado para você/)).toBeTruthy()
    },
    LENTO_NO_CI,
  )

  test(
    'no teste com missão faltando há volta para as missões e o "Travei nesta parte"',
    async () => {
      const { adapter } = server({ stage: 'observing' })
      openGame(adapter)
      expect(await screen.findByRole('button', { name: 'Travei nesta parte' })).toBeTruthy()
      // Sem teste nesta rodada ainda, a volta diz para onde leva.
      fireEvent.click(screen.getByRole('button', { name: 'Voltar para as missões' }))
      expect(await screen.findByRole('button', { name: /^Continuar no Estúdio/ })).toBeTruthy()
    },
    LENTO_NO_CI,
  )
})
