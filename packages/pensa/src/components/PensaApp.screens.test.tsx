import { describe, expect, mock, test } from 'bun:test'
import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import type { PensaProjectListItem, PensaProjectView } from '@sistemazero/core/pensa'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PensaApiError, type PensaHostAdapter } from '../core/types'
import { PensaApp } from './PensaApp'
import { PensaMessageText } from './PensaMessageText'
import { PROJECT_ID, projectFixture } from './pensa.fixture'

type Call = { path: string; method: string; body?: unknown }

function setup({
  view = projectFixture(),
  list = [],
  credits = null,
  mode = 'kids',
  respond,
}: {
  view?: PensaProjectView
  list?: PensaProjectListItem[]
  credits?: AiCreditsView | null
  mode?: 'kids' | 'adult'
  respond?: (call: Call) => unknown
} = {}) {
  const calls: Call[] = []
  const adapter: PensaHostAdapter = {
    viewerId: 'fixture',
    mode,
    mascotImages: mode === 'kids' ? { happy: '/zappy/happy.webp' } : undefined,
    onOpenGame: mock(),
    onOpenMission: mock(),
    transport: {
      async request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
        const call = { path, method: init?.method ?? 'GET', body: init?.body }
        calls.push(call)
        const custom = respond?.(call)
        if (custom !== undefined) return (await custom) as T
        if (path === '/credits') return { credits } as T
        if (path.startsWith('/projects?status=active')) return list as T
        if (path.startsWith('/projects?')) return [] as T
        return view as T
      },
    },
  }
  return { adapter, calls }
}

function listItem(view: PensaProjectView, patch: Partial<PensaProjectListItem> = {}) {
  return {
    project: view.project,
    summary: 'Encontre os seis pares de animais.',
    completedMissions: 1,
    totalMissions: 3,
    needsReview: 0,
    lifecycle: 'building',
    memberCount: 0,
    ...patch,
  } satisfies PensaProjectListItem
}

const CREDITS: AiCreditsView = {
  dayLimit: 50,
  dayRemaining: 13,
  monthLimit: 500,
  monthRemaining: 300,
  monthRenewsOn: '2026-11-01',
}

describe('Meus jogos e nova ideia', () => {
  test('lista com abas contadas, ideias do dia e o cartão abre pelo botão', async () => {
    const view = projectFixture()
    const { adapter, calls } = setup({ list: [listItem(view)], credits: CREDITS })
    render(<PensaApp adapter={adapter} />)
    expect(await screen.findByRole('tab', { name: 'Em andamento · 1' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Guardados · 0' })).toBeTruthy()
    expect(screen.getByRole('img', { name: /13 ideias hoje/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar Memória dos animais' }))
    await screen.findByRole('heading', { name: 'Memória dos animais', level: 1 })
    expect(calls.some((call) => call.path === `/projects/${PROJECT_ID}`)).toBe(true)
  })
  test('entrar no jogo de um amigo mostra a frase do servidor ao lado do campo', async () => {
    const { adapter } = setup({
      list: [listItem(projectFixture())],
      respond: (call) =>
        call.path === '/projects/join'
          ? Promise.reject(new Error('Esse código não abre nenhum jogo.'))
          : undefined,
    })
    render(<PensaApp adapter={adapter} />)
    fireEvent.change(await screen.findByLabelText('Código do jogo'), {
      target: { value: 'ZAP-NADA' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Esse código não abre nenhum jogo.')
  })
  test('as sementes só preenchem a caixa, no Kids; o adulto não tem sementes nem Zappy', async () => {
    const kids = setup()
    const { unmount } = render(<PensaApp adapter={kids.adapter} />)
    fireEvent.click(await screen.findByRole('button', { name: /Memória com cartas/ }))
    expect((screen.getByLabelText('Sua ideia') as HTMLTextAreaElement).value).toContain(
      'jogo de memória',
    )
    expect(kids.calls.some((call) => call.method === 'POST')).toBe(false)
    unmount()
    const adult = setup({ mode: 'adult', credits: CREDITS })
    render(<PensaApp adapter={adult.adapter} />)
    await screen.findByLabelText('Sua ideia')
    expect(screen.queryByText('Para começar sem ideia pronta')).toBeNull()
    expect(document.querySelector('img')).toBeNull()
    expect(await screen.findByText('13 créditos hoje')).toBeTruthy()
  })
})

describe('Antes do aceite', () => {
  test('montando o plano mostra o passo do servidor e deixa parar', async () => {
    const view = projectFixture()
    view.revision = null
    view.operation = {
      id: '10000000-0000-4000-8000-000000000088',
      projectId: PROJECT_ID,
      draftId: null,
      kind: 'planning',
      step: 'missions',
      status: 'running',
      calls: 1,
      error: null,
      createdAt: view.project.createdAt,
      updatedAt: view.project.updatedAt,
    }
    const { adapter, calls } = setup({ view })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    expect(
      await screen.findByRole('heading', { name: 'Estou montando o plano do seu jogo' }),
    ).toBeTruthy()
    expect(screen.getByText(', agora').parentElement?.textContent).toContain('A ordem das missões')
    fireEvent.click(screen.getByRole('button', { name: 'Parar' }))
    await waitFor(() => expect(calls.some((call) => call.path.endsWith('/cancel'))).toBe(true))
  })
  test('a pergunta do Zappy manda a opção escolhida', async () => {
    const view = projectFixture()
    const plan = view.revision!
    view.revision = null
    view.draft = {
      id: '10000000-0000-4000-8000-0000000000d1',
      projectId: PROJECT_ID,
      revision: 1,
      baseRevisionId: null,
      status: 'needs_choice',
      definition: plan.definition,
      plan: null,
      technical: null,
      pendingChoices: [
        {
          id: 'erro',
          kind: 'rule',
          question: 'Quando erra o par, o que acontece?',
          options: [
            { id: 'fecha', label: 'As cartas fecham', description: 'Depois de um segundo.' },
            { id: 'vida', label: 'Perde uma vida', description: 'São três vidas.' },
          ],
        },
      ],
      impact: null,
      affectedProgressVersions: {},
      capabilitiesFingerprint: null,
      acceptedRevisionId: null,
      updatedAt: view.project.updatedAt,
    }
    const { adapter, calls } = setup({ view })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    await screen.findByRole('heading', { name: 'Quando erra o par, o que acontece?' })
    fireEvent.click(screen.getByRole('button', { name: /Perde uma vida/ }))
    await waitFor(() =>
      expect(calls.find((call) => call.path.endsWith('/messages'))?.body).toMatchObject({
        choice: { choiceId: 'erro', optionId: 'vida' },
      }),
    )
  })
  test('o plano para conferir só começa com "Este é o meu jogo"; "Agora não" volta à lista', async () => {
    const view = projectFixture()
    const accepted = view.revision!
    view.revision = null
    view.draft = {
      id: '10000000-0000-4000-8000-0000000000d1',
      projectId: PROJECT_ID,
      revision: 2,
      baseRevisionId: null,
      status: 'ready',
      definition: accepted.definition,
      plan: accepted.plan,
      technical: accepted.technical,
      pendingChoices: [],
      impact: null,
      affectedProgressVersions: {},
      capabilitiesFingerprint: 'x',
      acceptedRevisionId: null,
      updatedAt: view.project.updatedAt,
    }
    const { adapter, calls } = setup({ view, list: [listItem(view)] })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    await screen.findByRole('heading', { name: 'Este é o plano do Memória dos animais' })
    expect(screen.queryByRole('button', { name: 'Continuar no Estúdio' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Este é o meu jogo' }))
    await waitFor(() =>
      expect(calls.find((call) => call.path.endsWith('/draft/accept'))?.body).toMatchObject({
        draftRevision: 2,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(await screen.findByRole('heading', { name: 'Meus jogos' })).toBeTruthy()
  })
})

describe('Projeto em andamento', () => {
  test('a mudança preparada mostra o impacto e só vale com "Quero esta mudança"', async () => {
    const view = projectFixture()
    const revision = view.revision!
    view.draft = {
      id: '10000000-0000-4000-8000-0000000000d2',
      projectId: PROJECT_ID,
      revision: 3,
      baseRevisionId: revision.id,
      status: 'ready',
      definition: { ...revision.definition, summary: 'Encontre os seis pares de dinossauros.' },
      plan: revision.plan,
      technical: revision.technical,
      pendingChoices: [],
      impact: {
        addedMissionIds: [],
        removedMissionIds: [],
        changedMissionIds: [revision.plan.missions[1]!.id],
        editorialMissionIds: [],
        reorderedMissionIds: [],
        reviewMissionIds: [],
        affectedRequirementIds: [],
      },
      affectedProgressVersions: {},
      capabilitiesFingerprint: 'x',
      acceptedRevisionId: null,
      updatedAt: view.project.updatedAt,
    }
    const { adapter, calls } = setup({ view })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver o que muda' }))[0]!)
    await screen.findByText('Mudança preparada pelo Zappy')
    expect(screen.getByText('missão muda o resultado')).toBeTruthy()
    expect(screen.getByText('Encontre os seis pares de dinossauros.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Deixar como está' }))
    await waitFor(() =>
      expect(calls.some((call) => call.path.endsWith('/draft') && call.method === 'DELETE')).toBe(
        true,
      ),
    )
  })
  test('o menu de três pontos pausa, abre as versões e pergunta antes de apagar', async () => {
    const view = projectFixture()
    const { adapter, calls } = setup({
      view,
      respond: (call) => (call.path.endsWith('/checkpoints') ? [] : undefined),
    })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    const dots = await screen.findByRole('button', { name: 'Cuidar do jogo' })
    fireEvent.click(dots)
    const menu = screen.getByRole('menu', { name: 'Cuidar do jogo' })
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Pausar por enquantoAs missões esperam você voltar.',
      'Mover para GuardadosSai de Em andamento. Dá para trazer de volta.',
      'Versões guardadasGuarde o jogo de agora ou volte a uma versão.',
      'Apagar este planoAs criações nas oficinas continuam guardadas.',
    ])
    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(dots)
    fireEvent.click(dots)
    fireEvent.click(screen.getByRole('menuitem', { name: /Pausar por enquanto/ }))
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'PATCH')?.body).toMatchObject({ paused: true }),
    )
    fireEvent.click(dots)
    fireEvent.click(screen.getByRole('menuitem', { name: /Apagar este plano/ }))
    const confirm = await screen.findByRole('dialog', {
      name: 'Apagar o plano do Memória dos animais',
    })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancelar' }))
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
  })
  test('o jogo pronto comemora e as ideias para depois preenchem a conversa', async () => {
    const view = projectFixture()
    view.nextAction = { type: 'completed' }
    view.progress = view.progress.map((item) => ({ ...item, status: 'completed' }))
    view.revision!.definition.futureIdeas = [
      { id: '10000000-0000-4000-8000-0000000000e1', text: 'Cartas com sons', origin: 'child' },
    ]
    const { adapter } = setup({ view })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    expect(await screen.findByRole('heading', { name: 'O seu jogo está pronto' })).toBeTruthy()
    expect(screen.getByText('3 de 3 missões conferidas')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Colocar no jogo: Cartas com sons' }))
    await waitFor(() =>
      expect((screen.getByLabelText('Mensagem para o Zappy') as HTMLTextAreaElement).value).toBe(
        'Quero colocar no jogo: Cartas com sons',
      ),
    )
  })
  test('esperando a equipe diz quem está com a parte e a frase do servidor', async () => {
    const view = projectFixture()
    const mission = view.revision!.plan.missions[0]!
    view.team.people.push({
      profileId: '10000000-0000-4000-8000-0000000000a1',
      firstName: 'Bia',
      photoUrl: null,
      owner: false,
      joinedAt: null,
    })
    view.progress[0] = {
      ...view.progress[0]!,
      status: 'in_progress',
      assigneeProfileId: '10000000-0000-4000-8000-0000000000a1',
    }
    view.nextAction = { type: 'waiting', missionId: mission.id, reason: 'Chega a sua vez logo.' }
    const { adapter } = setup({ view })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    expect(
      await screen.findByRole('heading', { name: 'Bia está programando esta parte' }),
    ).toBeTruthy()
    expect(screen.getByText('Chega a sua vez logo.')).toBeTruthy()
  })
  test('sem ideias, a conversa descansa: some o Enviar e o mapa continua', async () => {
    const { adapter } = setup({ credits: { ...CREDITS, dayRemaining: 0 } })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    expect(await screen.findByRole('heading', { name: 'As ideias de hoje acabaram' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enviar' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'O mapa das missões' })).toBeTruthy()
  })
})

describe('No celular', () => {
  test('o projeto vira abas Plano, Conversa e Carta do jogo, e a ajuda abre a conversa', async () => {
    const original = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { ...original.call(this), width: 390 } as DOMRect
    }
    try {
      const { adapter } = setup()
      render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
      const plano = await screen.findByRole('tab', { name: 'Plano' })
      expect(plano.getAttribute('aria-selected')).toBe('true')
      expect(screen.queryByLabelText('Mensagem para o Zappy')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Preciso de ajuda' }))
      expect(await screen.findByLabelText('Sua dúvida')).toBeTruthy()
      expect(screen.getByRole('tab', { name: 'Conversa' }).getAttribute('aria-selected')).toBe(
        'true',
      )
      fireEvent.click(screen.getByRole('tab', { name: 'Carta do jogo' }))
      expect(await screen.findByText('A carta do jogo')).toBeTruthy()
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original
    }
  })
})

describe('Estados', () => {
  test('a lista que não abriu mostra o recado e tenta de novo', async () => {
    let fail = true
    const { adapter } = setup({
      respond: (call) =>
        call.path.startsWith('/projects?') && fail
          ? Promise.reject(new Error('Sem rede'))
          : undefined,
    })
    render(<PensaApp adapter={adapter} />)
    expect(await screen.findByRole('heading', { name: 'O Pensa não abriu agora' })).toBeTruthy()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByLabelText('Sua ideia')).toBeTruthy()
  })
  test('a recusa da sessão de suporte liga a faixa de leitura e desliga as ações', async () => {
    const { adapter } = setup({
      respond: (call) =>
        call.method !== 'GET'
          ? Promise.reject(
              new PensaApiError('A sessão de suporte é só leitura.', 403, 'IMPERSONATION_READONLY'),
            )
          : undefined,
    })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    fireEvent.change(await screen.findByLabelText('Mensagem para o Zappy'), {
      target: { value: 'Oi' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText(/Nada muda enquanto você olha/)).toBeTruthy()
    expect(screen.queryByLabelText('Mensagem para o Zappy')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Continuar no Estúdio' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(screen.queryByRole('alert')).toBeNull()
  })
  test('o host que já sabe da visão de suporte começa em leitura', async () => {
    const { adapter } = setup()
    render(<PensaApp adapter={{ ...adapter, readOnly: true }} initialProjectId={PROJECT_ID} />)
    expect(
      await screen.findByText('Você está vendo o Pensa de Ana. Nada muda enquanto você olha.'),
    ).toBeTruthy()
  })
  test('jogo pausado avisa e quem é dona continua de onde parou', async () => {
    const view = projectFixture()
    view.project.paused = true
    const { adapter, calls } = setup({ view })
    render(<PensaApp adapter={adapter} initialProjectId={PROJECT_ID} />)
    expect(
      await screen.findByText('Este jogo está pausado. As missões esperam você voltar.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar de onde parei' }))
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'PATCH')?.body).toMatchObject({ paused: false }),
    )
  })
})

test('links de ajuda do Como fazer viram links de verdade', () => {
  render(<PensaMessageText text="Veja o [Como fazer](/como-fazer/sprites) desta parte." />)
  expect(screen.getByRole('link', { name: 'Como fazer' }).getAttribute('href')).toBe(
    '/como-fazer/sprites',
  )
})
