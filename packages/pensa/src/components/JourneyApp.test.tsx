import { afterEach, expect, mock, test } from 'bun:test'
import { createPensaJourney, type PensaJourneyView } from '@sistemazero/core/pensa'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PensaHostAdapter } from '../core/types'
import { JourneyApp } from './JourneyApp'
import { PensaApp } from './PensaApp'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

const current = (): PensaJourneyView => ({
  project: { id: 'p1', name: 'Meu novo jogo', status: 'active' },
  journey: createPensaJourney('p1', 'c1', '2026-10-14T12:00:00Z'),
  cycles: [{ id: 'c1', number: 1 }],
  operation: null,
})
function setup(start: (body: unknown) => Promise<PensaJourneyView>) {
  const request = mock(async (path: string, input?: { method?: string; body?: unknown }) => {
    if (path.startsWith('/v2/projects?')) return []
    if (path === '/projects') return { projects: [] }
    if (path === '/v2/projects') return current()
    if (path.endsWith('/start')) return start(input?.body)
    throw new Error(path)
  })
  const adapter: PensaHostAdapter = {
    viewerId: 'child-a',
    mode: 'kids',
    capabilities: { studioOwned: true, pintaOwned: true },
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
    onOpenTask: mock(),
  }
  render(<PensaApp adapter={adapter} />)
  return request
}
test('a primeira visita não cria plano vazio e recebe uma narrativa livre', async () => {
  const request = setup(async (body) => {
    expect((body as { message: string }).message).toBe('Um gato que passeia na lua')
    return {
      ...current(),
      journey: {
        ...current().journey,
        messages: [
          {
            id: 'm',
            role: 'assistant',
            text: 'Quer explorar com seu gato?',
            at: '',
            revision: 1,
            final: true,
          },
        ],
      },
    }
  })
  const input = await screen.findByLabelText('Como é o jogo que está na sua cabeça?')
  expect(
    request.mock.calls.some(([path, init]) => path === '/v2/projects' && init?.method === 'POST'),
  ).toBe(false)
  fireEvent.change(input, { target: { value: 'Um gato que passeia na lua' } })
  fireEvent.click(screen.getByRole('button', { name: 'Encontrar um começo' }))
  await screen.findByText('Quer explorar com seu gato?')
  expect(screen.queryByText('Nome do novo jogo')).toBeNull()
})
test('falha de envio preserva o texto e repete o mesmo envio lógico', async () => {
  const seen: string[] = []
  const request = setup(async (body) => {
    seen.push((body as { id: string }).id)
    throw new Error('A conexão caiu')
  })
  const input = await screen.findByLabelText('Como é o jogo que está na sua cabeça?')
  fireEvent.change(input, { target: { value: 'Quero cuidar de dragões' } })
  fireEvent.click(screen.getByRole('button', { name: 'Encontrar um começo' }))
  await screen.findByText('A conexão caiu')
  expect((input as HTMLTextAreaElement).value).toBe('Quero cuidar de dragões')
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Encontrar um começo' }).hasAttribute('disabled'),
    ).toBe(false),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Encontrar um começo' }))
  await waitFor(() => expect(seen.length).toBe(2))
  expect(seen[0]).toBe(seen[1])
  const ids = request.mock.calls
    .filter(([path]) => path === '/v2/projects')
    .map(([, init]) => (init?.body as { id: string }).id)
  expect(new Set(ids).size).toBe(1)
})
test('uma narrativa longa permanece inteira e pede divisão antes de enviar', async () => {
  setup(async () => current())
  const input = await screen.findByLabelText('Como é o jogo que está na sua cabeça?')
  fireEvent.change(input, { target: { value: 'a'.repeat(4001) } })
  expect((input as HTMLTextAreaElement).value.length).toBe(4001)
  expect(screen.getByRole('button', { name: 'Encontrar um começo' }).hasAttribute('disabled')).toBe(
    true,
  )
  expect(screen.getByRole('alert').textContent).toContain('continua inteiro')
})

function savedView(stage: 'idea' | 'proposal' = 'proposal') {
  const view = current()
  view.journey.stage = stage
  view.journey.proposal = {
    id: 'card',
    title: 'Gato',
    summary: 'Seu gato explora a lua.',
    firstResult: 'Mover o gato',
    essentials: ['Um gato na lua'],
    suggestions: [],
    later: [],
    dimension: '2d',
    missions: [],
    test: { action: 'Andar', expected: 'O gato anda' },
    references: [],
    capabilities: {
      profileId: 'child-a',
      rank: 'hacker',
      studio: true,
      pinta: true,
      molda: false,
      dimensions: ['2d'],
      blockIds: [],
      extensionIds: [],
      moldaTools: [],
      tutor: false,
      fingerprint: 'a',
    },
  }
  const request = mock(async (path: string, _input?: { body?: unknown; method?: string }) => {
    if (path === '/v2/projects/p1') return view
    if (path.endsWith('/start') || path.endsWith('/command')) return view
    if (path === '/projects') return { projects: [] }
    if (path.startsWith('/v2/projects?')) return []
    throw new Error(path)
  })
  const adapter: PensaHostAdapter = {
    viewerId: 'child-a',
    mode: 'kids',
    capabilities: { studioOwned: true, pintaOwned: true },
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
    onOpenTask: mock(),
  }
  render(<PensaApp adapter={adapter} initialProjectId="p1" />)
  return { request, view }
}
test('corrigir o cartão revisa o planejamento em vez de mandar uma pergunta de ajuda', async () => {
  const { request } = savedView()
  fireEvent.click(await screen.findByRole('button', { name: 'Quero mudar uma coisa' }))
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Quero que ele resgate um filhote' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar para o Zappy' }))
  await waitFor(() =>
    expect(
      request.mock.calls.some(
        ([path, input]) =>
          path.endsWith('/start') && (input?.body as { kind: string }).kind === 'planning',
      ),
    ).toBe(true),
  )
})
test('guardar ideia futura não gera um plano nem gasta chamada de IA', async () => {
  const { request } = savedView()
  fireEvent.click(await screen.findByRole('button', { name: 'Contar outra ideia' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Depois quero outro planeta' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar minha ideia' }))
  await waitFor(() =>
    expect(
      request.mock.calls.some(
        ([path, input]) =>
          path.endsWith('/command') &&
          (input?.body as { command: { type: string } }).command.type === 'keep_idea',
      ),
    ).toBe(true),
  )
  expect(request.mock.calls.some(([path]) => path.endsWith('/start'))).toBe(false)
})
test('apagar explica o alcance e só envia DELETE após a confirmação contextual', async () => {
  const { request } = savedView()
  fireEvent.click(await screen.findByRole('button', { name: 'Apagar este plano…' }))
  expect(screen.getByText(/Seu jogo no Estúdio e suas artes continuam/)).toBeTruthy()
  expect(request.mock.calls.some(([, input]) => input?.method === 'DELETE')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Manter meu plano' }))
  expect(screen.queryByRole('button', { name: 'Sim, apagar este plano' })).toBeNull()
})

test('uma resposta atrasada não reabre o jogo depois de voltar à lista', async () => {
  let deliver!: (value: PensaJourneyView) => void
  const view = current()
  const request = mock(async (path: string) => {
    if (path === '/v2/projects/p1') return view
    if (path.endsWith('/command'))
      return new Promise<PensaJourneyView>((resolve) => {
        deliver = resolve
      })
    if (path.startsWith('/v2/projects?')) return []
    if (path === '/projects') return { projects: [] }
    throw new Error(path)
  })
  const adapter: PensaHostAdapter = {
    viewerId: 'child-a',
    mode: 'kids',
    capabilities: { studioOwned: true, pintaOwned: true },
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
    onOpenTask: mock(),
  }
  render(<PensaApp adapter={adapter} initialProjectId="p1" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Pausar por enquanto' }))
  await waitFor(() => expect(deliver).toBeDefined())
  fireEvent.click(screen.getByRole('button', { name: 'Voltar aos meus jogos' }))
  await screen.findByLabelText('Como é o jogo que está na sua cabeça?')
  deliver({ ...view, journey: { ...view.journey, revision: 1, paused: true } })
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Atualizar' })).toBeNull())
  await new Promise((resolve) => setTimeout(resolve, 10))
  expect(Boolean(screen.queryByText('Seu caminho está guardado'))).toBe(false)
})

test('trocar de perfil remove a conversa anterior e não copia seu rascunho', async () => {
  const view = current()
  view.journey.messages = [
    {
      id: 'private',
      role: 'user',
      text: 'Minha ideia particular',
      at: '',
      final: true,
      revision: 1,
    },
  ]
  const request = mock(async (path: string) => {
    if (path === '/v2/projects/p1') return view
    if (path.startsWith('/v2/projects?')) return []
    if (path === '/projects') return { projects: [] }
    throw new Error(path)
  })
  const adapter: PensaHostAdapter = {
    viewerId: 'child-a',
    mode: 'kids',
    capabilities: { studioOwned: true, pintaOwned: true },
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
    onOpenTask: mock(),
  }
  const rendered = render(<PensaApp adapter={adapter} initialProjectId="p1" />)
  await screen.findByText('Minha ideia particular')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Rascunho particular' } })
  rendered.rerender(<PensaApp adapter={{ ...adapter, viewerId: 'child-b' }} />)
  await screen.findByLabelText('Como é o jogo que está na sua cabeça?')
  expect(Boolean(screen.queryByText('Minha ideia particular'))).toBe(false)
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('')
  expect(sessionStorage.getItem('sz:pensa-v2:draft:child-a:p1')).toBe('Rascunho particular')
})

test('arquivar em uma visita anterior não fecha o outro jogo que a criança abriu', async () => {
  let deliver!: () => void
  const first = current()
  const second = {
    ...current(),
    project: { ...current().project, id: 'p2', name: 'Outro jogo' },
    journey: { ...current().journey, projectId: 'p2' },
  }
  const request = mock(async (path: string, input?: { method?: string }) => {
    if (input?.method === 'PATCH')
      return new Promise<void>((resolve) => {
        deliver = resolve
      })
    if (path === '/v2/projects/p1') return first
    if (path === '/v2/projects/p2') return second
    if (path.startsWith('/v2/projects?'))
      return [{ id: 'p2', name: 'Outro jogo', stage: 'z', paused: false, status: 'active' }]
    if (path === '/projects') return { projects: [] }
    throw new Error(path)
  })
  const adapter: PensaHostAdapter = {
    viewerId: 'child-a',
    mode: 'kids',
    capabilities: { studioOwned: true, pintaOwned: true },
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
    onOpenTask: mock(),
  }
  render(<PensaApp adapter={adapter} initialProjectId="p1" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar nos arquivados' }))
  await waitFor(() => expect(deliver).toBeDefined())
  fireEvent.click(screen.getByRole('button', { name: 'Voltar aos meus jogos' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Continuar este jogo' }))
  await screen.findByRole('heading', { name: 'Outro jogo' })
  deliver()
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Pausar por enquanto' }).hasAttribute('disabled'),
    ).toBe(false),
  )
  expect(Boolean(screen.queryByRole('heading', { name: 'Outro jogo' }))).toBe(true)
})

// ── Direção de arte e atalhos (14/10/2026) ──────────────────────────────────────────────────

function openView(view: PensaJourneyView, tasks: unknown[] = []) {
  const request = mock(async (path: string) => {
    if (path === '/v2/projects/p1') return view
    if (path.startsWith('/cycles/')) return { tasks, nextTaskId: null }
    if (path.startsWith('/v2/projects?')) return []
    if (path === '/projects') return { projects: [] }
    throw new Error(path)
  })
  const onOpenTask = mock()
  const adapter: PensaHostAdapter = {
    viewerId: 'child-a',
    mode: 'kids',
    capabilities: { studioOwned: true, pintaOwned: true },
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
    onOpenTask,
  }
  render(<PensaApp adapter={adapter} initialProjectId="p1" />)
  return { request, onOpenTask }
}

function mission(id: string, destination: 'studio' | 'pinta', status: string, deps: string[] = []) {
  return {
    id,
    title: `Missão ${id}`,
    summary: `O que acontece em ${id}`,
    destination,
    dependencies: deps,
    progress: { status },
  }
}

test('o mapa ZERO marca as etapas vencidas e a atual com o nome da ação', async () => {
  const view = current()
  view.journey.stage = 'proposal'
  openView(view)
  const map = await screen.findByRole('list', { name: 'Seu caminho no método ZERO' })
  const items = map.querySelectorAll('li')
  expect(items[0]?.className).toBe('is-done')
  expect(items[1]?.getAttribute('aria-current')).toBe('step')
  expect(items[1]?.textContent).toContain('Veja o começo do jogo')
  expect(items[2]?.className).toBe('is-next')
})

test('a missão mostra a oficina, a posição no caminho e abre no destino certo', async () => {
  const view = current()
  view.journey.stage = 'building'
  view.journey.missionIds = ['m1', 'm2']
  const { onOpenTask } = openView(view, [
    mission('m1', 'pinta', 'completed'),
    mission('m2', 'studio', 'planned', ['m1']),
  ])
  await screen.findByText('Sua próxima missão · 2 de 2')
  fireEvent.click(screen.getByRole('button', { name: 'Continuar no Estúdio' }))
  expect(onOpenTask).toHaveBeenCalledWith({ taskId: 'm2', destination: 'studio' })
})

test('travar oferece atalhos que só PREENCHEM o campo, sem enviar nada', async () => {
  const view = current()
  view.journey.stage = 'building'
  view.journey.missionIds = ['m1']
  const { request } = openView(view, [mission('m1', 'studio', 'planned')])
  fireEvent.click(await screen.findByRole('button', { name: 'Travei nesta parte' }))
  fireEvent.click(screen.getByRole('button', { name: 'Não achei o bloco certo' }))
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Não achei o bloco certo')
  expect(request.mock.calls.some(([path]) => path.endsWith('/start'))).toBe(false)
  expect(screen.queryByRole('button', { name: 'Não sei por onde começar' })).toBeNull()
})

test('uma versão nova oferece as ideias guardadas como ponto de partida', async () => {
  const view = current()
  view.journey.backlog = [{ id: 'b1', text: 'Uma fase de neve', origin: 'child' }]
  openView(view)
  await screen.findByLabelText('Quer acrescentar ou mudar alguma coisa?')
  await new Promise((resolve) => setTimeout(resolve, 0))
  fireEvent.click(screen.getByRole('button', { name: 'Uma fase de neve' }))
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Uma fase de neve')
})

test('abrir a confirmação de apagar leva o foco ao botão de manter o plano', async () => {
  openView(current())
  fireEvent.click(await screen.findByRole('button', { name: 'Apagar este plano…' }))
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Manter meu plano' })),
  )
})

test('sem plano antigo, a home ainda leva ao código de um plano em equipe', async () => {
  const onLegacy = mock()
  const request = mock(async (path: string) => {
    if (path.startsWith('/v2/projects?')) return []
    if (path === '/projects') return { projects: [] }
    throw new Error(path)
  })
  render(
    <JourneyApp
      adapter={{
        viewerId: 'child-a',
        mode: 'kids',
        capabilities: { studioOwned: true, pintaOwned: true },
        transport: {
          request: request as PensaHostAdapter['transport']['request'],
          streamChat: () => () => {},
        },
        onOpenTask: mock(),
      }}
      onLegacy={onLegacy}
    />,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Entrar com um código' }))
  expect(onLegacy).toHaveBeenCalledTimes(1)
})
