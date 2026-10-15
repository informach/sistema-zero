import { afterEach, describe, expect, mock, test } from 'bun:test'
import {
  createPensaJourney,
  effectivePensaRoles,
  type PensaJourneyListItem,
  type PensaJourneyStage,
  type PensaJourneyTeamView,
  type PensaJourneyView,
  type PensaTeamPerson,
  type PensaTeamRoles,
} from '@sistemazero/core/pensa'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { PensaHostAdapter, PensaTaskView } from '../core/types'
import { JourneyApp } from './JourneyApp'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

/**
 * A EQUIPE no Pensa v2 (14/10/2026): o "Equipe · N" do cabeçalho do jogo e a janela (código,
 * pessoas, sair/tirar em dois passos, Funções), o "Entrar com um código" direto no v2, os chips
 * da lista, as missões que dizem de quem são (e o cartão "Esperando…"), as ações de quem programa
 * e da dona escondidas para as outras, e o compasso de 20 s que nunca apaga o campo.
 * O servidor de mentira imita as rotas do BFF (`/v2/projects/:id/team|roles|share|members`).
 */
const LENTO_NO_CI = 30_000

const EU: PensaTeamPerson = {
  profileId: 'eu',
  firstName: 'Helena',
  photoUrl: null,
  owner: true,
  joinedAt: null,
}
const BIA: PensaTeamPerson = {
  profileId: 'bia',
  firstName: 'Bia',
  photoUrl: null,
  owner: false,
  joinedAt: '2026-10-10T10:00:00.000Z',
}
const LEO: PensaTeamPerson = {
  profileId: 'leo',
  firstName: 'Leo',
  photoUrl: null,
  owner: false,
  joinedAt: '2026-10-11T10:00:00.000Z',
}
const ANA: PensaTeamPerson = {
  profileId: 'ana',
  firstName: 'Ana',
  photoUrl: null,
  owner: false,
  joinedAt: '2026-10-12T10:00:00.000Z',
}

type Fail = { status: number; message: string }
const failure = ({ status, message }: Fail) => Object.assign(new Error(message), { status })

function task(
  id: string,
  destination: 'studio' | 'pinta' | 'molda',
  status: 'planned' | 'in_progress' | 'completed',
  dependencies: string[] = [],
  extra: Partial<PensaTaskView> = {},
) {
  return {
    id,
    title: `Missão ${id}`,
    summary: `O que acontece em ${id}`,
    destination,
    dependencies,
    progress: { status },
    ...extra,
  }
}

function server(
  options: {
    viewer?: string
    people?: PensaTeamPerson[]
    roles?: Partial<PensaTeamRoles>
    codeLocked?: boolean
    shareCode?: string | null
    /** Servidor anterior à equipe: a view vem sem `role` e sem `team`. */
    noTeam?: boolean
    stage?: PensaJourneyStage
    tasks?: unknown[]
    checkpoint?: boolean
    list?: PensaJourneyListItem[]
    fail?: Record<string, Fail>
  } = {},
) {
  const viewer = options.viewer ?? 'eu'
  let people = options.people ?? [EU]
  let raw = { code: options.roles?.code ?? null, art: options.roles?.art ?? [] }
  let shareCode = options.shareCode === undefined ? 'AAAAAB' : options.shareCode
  let revision = 3
  let messages: PensaJourneyView['journey']['messages'] = []
  const owner = () => people.find((person) => person.owner) ?? EU
  const roles = () =>
    effectivePensaRoles({
      ownerProfileId: owner().profileId,
      memberProfileIds: people.filter((p) => !p.owner).map((p) => p.profileId),
      code: raw.code,
      art: raw.art,
    })
  const view = (): PensaJourneyView => {
    const journey = createPensaJourney('p1', 'c1', '2026-10-14T12:00:00Z')
    journey.stage = options.stage ?? 'idea'
    journey.revision = revision
    journey.messages = messages
    journey.missionIds = (options.tasks ?? []).map((t) => (t as { id: string }).id)
    const checkpoint = options.checkpoint
      ? {
          id: 'k1',
          creationId: 'jogo',
          saveRevision: 'r1',
          planRevision: 2,
          cycleId: 'c1',
          createdAt: '2026-10-14T11:00:00Z',
        }
      : null
    journey.checkpoint = checkpoint
    if (journey.stage === 'observing')
      journey.proposal = {
        id: 'prop',
        title: 'Jogo',
        summary: 'Um jogo',
        firstResult: 'Andar',
        essentials: [],
        suggestions: [],
        later: [],
        dimension: '2d',
        missions: [],
        test: { action: 'Aperte a seta', expected: 'o dragão anda' },
        references: [],
        capabilities: {
          profileId: viewer,
          rank: 'x',
          studio: true,
          pinta: true,
          molda: true,
          dimensions: ['2d'],
          blockIds: [],
          extensionIds: [],
          moldaTools: [],
          tutor: false,
          fingerprint: 'f',
        },
      }
    const base: PensaJourneyView = {
      project: { id: 'p1', name: 'O ninho nas nuvens', status: 'active' },
      journey,
      operation: null,
      cycles: [{ id: 'c1', number: 1 }],
      checkpoints: checkpoint ? [checkpoint] : [],
    }
    if (options.noTeam) return base
    return {
      ...base,
      role: owner().profileId === viewer ? 'owner' : 'member',
      team: {
        viewerProfileId: viewer,
        ownerProfileId: owner().profileId,
        memberCount: people.filter((p) => !p.owner).length,
        shareEnabled: shareCode !== null,
        roles: roles(),
      },
    }
  }
  const teamView = (): PensaJourneyTeamView => ({
    viewerProfileId: viewer,
    role: owner().profileId === viewer ? 'owner' : 'member',
    shareCode: owner().profileId === viewer ? shareCode : null,
    maxMembers: 5,
    roles: roles(),
    people,
    codeLocked: options.codeLocked ?? false,
  })
  const request = mock(async (path: string, init?: { method?: string; body?: unknown }) => {
    const method = init?.method ?? 'GET'
    const key = `${method} ${path}`
    const fail = options.fail?.[key]
    if (fail) throw failure(fail)
    if (key === 'GET /projects') return { projects: [] }
    if (path.startsWith('/v2/projects?')) return options.list ?? []
    if (key === 'GET /v2/projects/p1') return view()
    if (key === 'GET /cycles/c1/stages/z') return { tasks: options.tasks ?? [], nextTaskId: null }
    if (key === 'GET /v2/projects/p1/team') return teamView()
    if (key === 'PUT /v2/projects/p1/roles') {
      raw = init?.body as typeof raw
      revision += 1
      return view()
    }
    if (key === 'POST /v2/projects/p1/share') {
      shareCode = 'BBBBBB'
      return { code: 'BBBBBB', display: 'ZAP-BBBBBB' }
    }
    if (key === 'DELETE /v2/projects/p1/share') {
      shareCode = null
      return { ok: true }
    }
    const member = /^\/v2\/projects\/p1\/members\/(.+)$/.exec(path)
    if (method === 'DELETE' && member) {
      const who = member[1] === 'me' ? viewer : member[1]
      people = people.filter((p) => p.profileId !== who)
      raw = {
        code: raw.code === who ? null : raw.code,
        art: raw.art.filter((id) => id !== who),
      }
      return { ok: true }
    }
    if (key === 'POST /v2/projects/join') return { projectId: 'p1' }
    if (path === '/v2/projects/p1/start') {
      messages = [
        ...messages,
        { id: 'm', role: 'user', text: 'oi', at: '', revision: revision + 1, final: true },
      ]
      revision += 1
      return view()
    }
    throw new Error(`não simulado: ${key}`)
  })
  /** A colega mexeu no plano: a próxima leitura traz a mensagem nova. */
  const colleagueWrites = (text: string) => {
    revision += 1
    messages = [
      ...messages,
      { id: `c${revision}`, role: 'user', text, at: '', revision, final: true },
    ]
  }
  const adapter: PensaHostAdapter = {
    viewerId: viewer,
    mode: 'kids',
    capabilities: { studioOwned: true, pintaOwned: true, moldaOwned: true },
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
    onOpenTask: mock(),
  }
  const calls = (key: string) =>
    request.mock.calls.filter(([path, init]) => `${init?.method ?? 'GET'} ${path}` === key)
  return { adapter, request, calls, colleagueWrites }
}

function openGame(adapter: PensaHostAdapter, teamPollMs = 0) {
  return render(
    <JourneyApp
      adapter={adapter}
      initialProjectId="p1"
      onLegacy={mock()}
      teamPollMs={teamPollMs}
    />,
  )
}

async function openTeam() {
  const button = await screen.findByRole('button', { name: /^Equipe, \d+ na equipe$/ })
  fireEvent.click(button)
  const dialog = await screen.findByRole('dialog', { name: 'Equipe do jogo' })
  return { button, dialog, janela: within(dialog) }
}

describe('o "Equipe · N" e a janela da equipe', () => {
  test('a dona sozinha vê "Equipe · 0" (é por ele que ela convida)', async () => {
    const { adapter } = server()
    openGame(adapter)
    expect(await screen.findByRole('button', { name: 'Equipe, 0 na equipe' })).toBeTruthy()
  })

  test('sem `team` (servidor anterior à equipe) não há "Equipe" e a dona faz tudo', async () => {
    const { adapter } = server({
      noTeam: true,
      stage: 'building',
      tasks: [task('m1', 'studio', 'planned')],
      checkpoint: true,
    })
    openGame(adapter)
    await screen.findByText('Sua próxima missão · 1 de 1')
    expect(screen.queryByRole('button', { name: /^Equipe/ })).toBeNull()
    for (const name of [
      'Já quero experimentar',
      'Adaptar meu caminho…',
      'Encerrar por enquanto',
      'Guardar nos arquivados',
      'Voltar à versão guardada',
      'Apagar este plano…',
    ])
      expect(screen.getByRole('button', { name })).toBeTruthy()
    expect(screen.queryByText(/Quem testa e guarda as versões/)).toBeNull()
  })

  test(
    'a dona: o código, gerar outro e desligar, sem fechar a janela',
    async () => {
      const { adapter, calls } = server({ people: [EU, BIA], roles: { art: ['bia'] } })
      openGame(adapter)
      const { janela } = await openTeam()
      expect((await janela.findByRole('status', { name: 'Código do plano' })).textContent).toBe(
        'ZAP-AAAAAB',
      )
      fireEvent.click(janela.getByRole('button', { name: 'Gerar outro código' }))
      await waitFor(() => expect(janela.getByText('ZAP-BBBBBB')).toBeTruthy())
      fireEvent.click(janela.getByRole('button', { name: 'Desligar o código' }))
      await janela.findByRole('button', { name: 'Criar um código' })
      expect(calls('POST /v2/projects/p1/share').length).toBe(1)
      expect(calls('DELETE /v2/projects/p1/share').length).toBe(1)
      expect(screen.getByRole('dialog', { name: 'Equipe do jogo' })).toBeTruthy()
    },
    LENTO_NO_CI,
  )

  test(
    'Funções: a dona escolhe quem programa e quem faz as artes e guarda com PUT …/roles',
    async () => {
      const { adapter, calls } = server({ people: [EU, BIA, LEO], stage: 'building' })
      openGame(adapter)
      const { janela } = await openTeam()
      const programa = await janela.findByRole('group', { name: 'Quem programa (Estúdio)' })
      const artes = janela.getByRole('group', { name: 'Quem faz as artes (Pinta e Molda)' })
      // Sem ninguém nas artes, nenhuma caixa vem marcada (quem programa também desenha).
      expect(
        (within(programa).getByRole('radio', { name: 'Helena (você)' }) as HTMLInputElement)
          .checked,
      ).toBe(true)
      for (const box of within(artes).getAllByRole('checkbox'))
        expect((box as HTMLInputElement).checked).toBe(false)
      expect(janela.getByText('Ninguém marcado: quem programa também desenha.')).toBeTruthy()
      const guardar = janela.getByRole('button', { name: 'Guardar as funções' })
      expect(guardar.hasAttribute('disabled')).toBe(true)
      fireEvent.click(within(programa).getByRole('radio', { name: 'Leo' }))
      fireEvent.click(within(artes).getByRole('checkbox', { name: 'Bia' }))
      fireEvent.click(guardar)
      await janela.findByText('Funções guardadas!')
      expect(calls('PUT /v2/projects/p1/roles')[0]?.[1]?.body).toEqual({
        code: 'leo',
        art: ['bia'],
      })
      // A tela do jogo recebeu a view nova: agora quem testa é o Leo.
      fireEvent.keyDown(document, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(
        (await screen.findAllByText('Quem testa e guarda as versões é Leo.')).length,
      ).toBeGreaterThan(0)
    },
    LENTO_NO_CI,
  )

  test(
    'com o jogo começado, o rádio tranca com a frase e as artes seguem livres',
    async () => {
      const { adapter } = server({ people: [EU, BIA], codeLocked: true })
      openGame(adapter)
      const { janela } = await openTeam()
      const programa = await janela.findByRole('group', { name: 'Quem programa (Estúdio)' })
      for (const radio of within(programa).getAllByRole('radio'))
        expect((radio as HTMLInputElement).disabled).toBe(true)
      expect(
        janela.getByText(
          'O jogo já começou no Estúdio de quem programa. Essa função não muda mais neste plano.',
        ),
      ).toBeTruthy()
      const artes = janela.getByRole('group', { name: 'Quem faz as artes (Pinta e Molda)' })
      expect(
        (within(artes).getByRole('checkbox', { name: 'Bia' }) as HTMLInputElement).disabled,
      ).toBe(false)
    },
    LENTO_NO_CI,
  )

  test(
    'o 409 da trava fica na janela e relê a equipe',
    async () => {
      const message =
        'O jogo já começou no Estúdio de quem programa. Essa função não muda mais neste plano.'
      const { adapter, calls } = server({
        people: [EU, BIA],
        fail: { 'PUT /v2/projects/p1/roles': { status: 409, message } },
      })
      openGame(adapter)
      const { janela } = await openTeam()
      fireEvent.click(await janela.findByRole('radio', { name: 'Bia' }))
      fireEvent.click(janela.getByRole('button', { name: 'Guardar as funções' }))
      expect((await janela.findByRole('alert')).textContent).toBe(message)
      await waitFor(() => expect(calls('GET /v2/projects/p1/team').length).toBeGreaterThan(1))
      expect(screen.getByRole('dialog', { name: 'Equipe do jogo' })).toBeTruthy()
    },
    LENTO_NO_CI,
  )

  test(
    'quem entrou lê as funções, sem rádio nem caixa',
    async () => {
      const { adapter } = server({
        viewer: 'bia',
        people: [EU, BIA],
        roles: { code: 'eu', art: ['bia'] },
      })
      openGame(adapter)
      const { janela } = await openTeam()
      await janela.findByText('Só quem criou o plano escolhe as funções.')
      expect(janela.queryByRole('radio')).toBeNull()
      expect(janela.queryByRole('checkbox')).toBeNull()
      expect(janela.getByText('Quem programa (Estúdio)').nextElementSibling?.textContent).toBe(
        'Helena',
      )
      expect(
        janela.getByText('Quem faz as artes (Pinta e Molda)').nextElementSibling?.textContent,
      ).toBe('Você')
      expect(janela.getByText(/Este jogo é de Helena/)).toBeTruthy()
      // Nada de código nem de "Tirar" para quem entrou.
      expect(janela.queryByRole('button', { name: /^Tirar/ })).toBeNull()
      expect(janela.queryByText('Código do plano')).toBeNull()
    },
    LENTO_NO_CI,
  )

  test(
    'tirar quem programa avisa que o jogo fica no Estúdio dele, em dois passos',
    async () => {
      const { adapter, calls } = server({ people: [EU, BIA, LEO], roles: { code: 'leo' } })
      openGame(adapter)
      const { janela } = await openTeam()
      fireEvent.click(await janela.findByRole('button', { name: 'Tirar Leo da equipe' }))
      expect(
        janela.getByText('O jogo está no Estúdio de Leo. Se Leo sair, o jogo fica com Leo.'),
      ).toBeTruthy()
      await waitFor(() =>
        expect(document.activeElement).toBe(janela.getByRole('button', { name: 'Tirar mesmo' })),
      )
      expect(calls('DELETE /v2/projects/p1/members/leo').length).toBe(0)
      fireEvent.click(janela.getByRole('button', { name: 'Tirar mesmo' }))
      await waitFor(() => expect(janela.queryByText('Leo')).toBeNull())
      expect(calls('DELETE /v2/projects/p1/members/leo').length).toBe(1)
      // Tirar outra pessoa (que não programa) não traz o aviso.
      fireEvent.click(janela.getByRole('button', { name: 'Tirar Bia da equipe' }))
      expect(janela.queryByText(/O jogo está no Estúdio/)).toBeNull()
      fireEvent.click(janela.getByRole('button', { name: 'Deixar' }))
      await waitFor(() =>
        expect(document.activeElement).toBe(
          janela.getByRole('button', { name: 'Tirar Bia da equipe' }),
        ),
      )
      // O jogo é relido (o "Equipe · N" e as funções vêm do servidor).
      await waitFor(() => expect(calls('GET /v2/projects/p1').length).toBeGreaterThan(1))
    },
    LENTO_NO_CI,
  )

  test(
    'quem entrou sai da equipe em dois passos e volta para a lista com o foco no título',
    async () => {
      const { adapter, calls } = server({
        viewer: 'bia',
        people: [EU, BIA],
        roles: { art: ['bia'] },
      })
      openGame(adapter)
      const { janela } = await openTeam()
      fireEvent.click(await janela.findByRole('button', { name: 'Sair da equipe' }))
      await waitFor(() =>
        expect(document.activeElement).toBe(janela.getByRole('button', { name: 'Sair mesmo' })),
      )
      fireEvent.click(janela.getByRole('button', { name: 'Sair mesmo' }))
      const titulo = await screen.findByRole('heading', {
        level: 1,
        name: 'Que jogo você está imaginando?',
      })
      await waitFor(() => expect(document.activeElement).toBe(titulo))
      expect(calls('DELETE /v2/projects/p1/members/me').length).toBe(1)
      expect(screen.queryByRole('dialog')).toBeNull()
    },
    LENTO_NO_CI,
  )

  test(
    'quem programa e sai é avisada de que o jogo fica no Estúdio dela',
    async () => {
      const { adapter } = server({ viewer: 'leo', people: [EU, LEO], roles: { code: 'leo' } })
      openGame(adapter)
      const { janela } = await openTeam()
      fireEvent.click(await janela.findByRole('button', { name: 'Sair da equipe' }))
      expect(
        janela.getByText('O jogo está no seu Estúdio. Se você sair, o jogo fica com você.'),
      ).toBeTruthy()
    },
    LENTO_NO_CI,
  )

  test(
    'Esc fecha a janela e o foco volta ao "Equipe"',
    async () => {
      const { adapter } = server({ people: [EU, BIA] })
      openGame(adapter)
      const { button, janela } = await openTeam()
      await janela.findByRole('button', { name: 'Tirar Bia da equipe' })
      fireEvent.keyDown(document, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(document.activeElement).toBe(button)
    },
    LENTO_NO_CI,
  )
})

describe('entrar com um código', () => {
  function home(fail?: Fail) {
    const { adapter, request, calls } = server({
      viewer: 'bia',
      people: [EU, BIA],
      roles: { art: ['bia'] },
      fail: fail ? { 'POST /v2/projects/join': fail } : undefined,
    })
    const onLegacy = mock()
    render(<JourneyApp adapter={adapter} onLegacy={onLegacy} teamPollMs={0} />)
    return { request, calls, onLegacy }
  }

  test(
    'entra DIRETO no v2 e abre o jogo, com o foco no título',
    async () => {
      const { calls, onLegacy } = home()
      const botao = await screen.findByRole('button', { name: 'Entrar com um código' })
      fireEvent.click(botao)
      expect(botao.getAttribute('aria-expanded')).toBe('true')
      const campo = screen.getByLabelText('Código do plano de um colega')
      await waitFor(() => expect(document.activeElement).toBe(campo))
      fireEvent.change(campo, { target: { value: 'zap-aaaaab' } })
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      const titulo = await screen.findByRole('heading', { level: 1, name: 'O ninho nas nuvens' })
      await waitFor(() => expect(document.activeElement).toBe(titulo))
      expect(calls('POST /v2/projects/join')[0]?.[1]?.body).toEqual({ code: 'zap-aaaaab' })
      expect(onLegacy).not.toHaveBeenCalled()
    },
    LENTO_NO_CI,
  )

  test(
    'o erro do servidor fica ao lado do campo; Esc fecha e devolve o foco ao botão',
    async () => {
      home({ status: 404, message: 'Esse código não abriu nenhum plano.' })
      const botao = await screen.findByRole('button', { name: 'Entrar com um código' })
      fireEvent.click(botao)
      const campo = screen.getByLabelText('Código do plano de um colega')
      fireEvent.change(campo, { target: { value: 'ZAP-ZZZZZZ' } })
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      const alerta = await screen.findByRole('alert')
      expect(alerta.textContent).toBe('Esse código não abriu nenhum plano.')
      expect(campo.getAttribute('aria-describedby')).toBe(alerta.id)
      expect((campo as HTMLInputElement).value).toBe('ZAP-ZZZZZZ')
      // Esc no FORMULÁRIO, com o foco no botão "Entrar" (não só no campo).
      const entrar = screen.getByRole('button', { name: 'Entrar' })
      entrar.focus()
      fireEvent.keyDown(entrar, { key: 'Escape' })
      await waitFor(() =>
        expect(screen.queryByLabelText('Código do plano de um colega')).toBeNull(),
      )
      expect(document.activeElement).toBe(botao)
    },
    LENTO_NO_CI,
  )
})

describe('a lista "Meus jogos"', () => {
  test('"Em equipe · N" no meu jogo com gente, "De <dona>" no jogo em que entrei', async () => {
    const item = (id: string, name: string, extra: Partial<PensaJourneyListItem> = {}) => ({
      id,
      name,
      status: 'active' as const,
      cycleNumber: 1,
      stage: 'r' as const,
      lastInteractionAt: '2026-10-14T12:00:00Z',
      paused: false,
      ...extra,
    })
    const { adapter } = server({
      list: [
        item('p1', 'Meu com gente', {
          role: 'owner',
          team: { memberCount: 2, ownerFirstName: null },
        }),
        item('p2', 'Da Bia', { role: 'member', team: { memberCount: 1, ownerFirstName: 'Bia' } }),
        item('p3', 'Só meu'),
      ],
    })
    render(<JourneyApp adapter={adapter} onLegacy={mock()} teamPollMs={0} />)
    const cartao = async (name: string) =>
      (await screen.findByRole('heading', { level: 3, name })).closest('li') as HTMLElement
    expect(within(await cartao('Meu com gente')).getByText('Em equipe · 2')).toBeTruthy()
    expect(within(await cartao('Da Bia')).getByText('De Bia')).toBeTruthy()
    // O cartão tem os selos de versão e de etapa; o de equipe só aparece com gente.
    expect((await cartao('Só meu')).querySelector('.pensa-chip.is-team')).toBeNull()
  })
})

describe('as missões dizem de quem são', () => {
  test(
    'a minha missão é "Sua missão" e o caminho mostra quem faz cada uma',
    async () => {
      const { adapter } = server({
        people: [EU, BIA],
        roles: { art: ['bia'] },
        stage: 'building',
        tasks: [
          task('m1', 'pinta', 'completed', [], { completedByProfileId: 'bia' }),
          task('m2', 'studio', 'planned', ['m1']),
          task('m3', 'molda', 'planned'),
        ],
      })
      const onOpenTask = adapter.onOpenTask as ReturnType<typeof mock>
      openGame(adapter)
      await screen.findByText('Sua missão · 2 de 3')
      expect(screen.getByRole('heading', { level: 2, name: 'Missão m2' })).toBeTruthy()
      // Os nomes chegam do `GET …/team`.
      await waitFor(() => expect(screen.getByText('Pinta · Bia · feita')).toBeTruthy())
      expect(screen.getByText('Estúdio · você · agora')).toBeTruthy()
      expect(screen.getByText('Molda · Bia')).toBeTruthy()
      // A arte da Bia mora na conta dela: nada de "Rever" no meu Pinta.
      expect(screen.queryByRole('button', { name: 'Rever Missão m1' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Continuar no Estúdio' }))
      expect(onOpenTask).toHaveBeenCalledWith({ taskId: 'm2', destination: 'studio' })
    },
    LENTO_NO_CI,
  )

  test(
    'sem missão minha: "Esperando a arte de Bia", com o que fazer enquanto isso',
    async () => {
      const { adapter } = server({
        people: [EU, BIA],
        roles: { art: ['bia'] },
        stage: 'building',
        tasks: [task('m1', 'pinta', 'planned'), task('m2', 'studio', 'planned', ['m1'])],
      })
      openGame(adapter)
      const titulo = await screen.findByRole('heading', {
        level: 2,
        name: 'Esperando a arte de Bia',
      })
      const cartao = within(titulo.closest('section') as HTMLElement)
      expect(cartao.getByText('Missão de Bia · 1 de 2')).toBeTruthy()
      expect(cartao.getByText('Missão m1')).toBeTruthy()
      expect(screen.queryByRole('button', { name: /^Continuar no/ })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Ver o caminho' }))
      // "Meu caminho" está sempre à vista: o botão leva o foco ao título dele.
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { level: 2, name: 'Meu caminho' }),
      )
      fireEvent.click(screen.getByRole('button', { name: 'Guardar uma ideia' }))
      expect(screen.getByLabelText('Que ideia você quer guardar para depois?')).toBeTruthy()
    },
    LENTO_NO_CI,
  )

  test(
    '"a programação de Leo" quando quem programa está na frente',
    async () => {
      const { adapter } = server({
        viewer: 'bia',
        people: [EU, BIA, LEO],
        roles: { code: 'leo', art: ['bia'] },
        stage: 'building',
        tasks: [
          task('m1', 'studio', 'in_progress', [], { assigneeProfileId: 'leo' }),
          task('m2', 'pinta', 'planned', ['m1']),
        ],
      })
      openGame(adapter)
      expect(
        await screen.findByRole('heading', { level: 2, name: 'Esperando a programação de Leo' }),
      ).toBeTruthy()
    },
    LENTO_NO_CI,
  )

  test(
    '"as artes da equipe" com duas artistas e a missão ainda livre',
    async () => {
      const { adapter } = server({
        people: [EU, BIA, ANA],
        roles: { art: ['bia', 'ana'] },
        stage: 'building',
        tasks: [task('m1', 'pinta', 'planned'), task('m2', 'studio', 'planned', ['m1'])],
      })
      openGame(adapter)
      expect(
        await screen.findByRole('heading', { level: 2, name: 'Esperando as artes da equipe' }),
      ).toBeTruthy()
    },
    LENTO_NO_CI,
  )
})

describe('quem pode o quê', () => {
  test(
    'quem não programa não testa, não encerra, não adapta nem restaura: vê quem faz isso',
    async () => {
      const { adapter } = server({
        viewer: 'bia',
        people: [EU, BIA, LEO],
        roles: { code: 'leo', art: ['bia'] },
        stage: 'observing',
        tasks: [task('m1', 'studio', 'completed')],
        checkpoint: true,
      })
      openGame(adapter)
      await screen.findByRole('heading', { level: 2, name: 'Vamos experimentar seu jogo' })
      await waitFor(() =>
        expect(screen.getAllByText('Quem testa e guarda as versões é Leo.').length).toBe(2),
      )
      for (const name of [
        'Funcionou!',
        'Quero ajustar',
        'Abrir meu jogo',
        'Adaptar meu caminho…',
        'Encerrar por enquanto',
        'Voltar à versão guardada',
      ])
        expect(screen.queryByRole('button', { name })).toBeNull()
      expect(screen.queryByLabelText('O que aconteceu? (se quiser contar)')).toBeNull()
      // O que é de toda a equipe continua.
      expect(screen.getByRole('button', { name: 'Pausar por enquanto' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Contar outra ideia' })).toBeTruthy()
      // E quem entrou não arquiva nem apaga.
      expect(screen.queryByRole('button', { name: 'Guardar nos arquivados' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Apagar este plano…' })).toBeNull()
    },
    LENTO_NO_CI,
  )

  test(
    'quem entrou e programa testa e guarda, mas não arquiva nem apaga',
    async () => {
      const { adapter } = server({
        viewer: 'leo',
        people: [EU, LEO],
        roles: { code: 'leo' },
        stage: 'observing',
        tasks: [task('m1', 'studio', 'completed')],
        checkpoint: true,
      })
      openGame(adapter)
      expect(await screen.findByRole('button', { name: 'Funcionou!' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Voltar à versão guardada' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Adaptar meu caminho…' })).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Guardar nos arquivados' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Apagar este plano…' })).toBeNull()
      expect(screen.queryByText(/Quem testa e guarda as versões/)).toBeNull()
    },
    LENTO_NO_CI,
  )

  test(
    'a dona que não programa ainda arquiva e apaga, mas não testa',
    async () => {
      const { adapter } = server({
        people: [EU, LEO],
        roles: { code: 'leo' },
        stage: 'observing',
        tasks: [task('m1', 'studio', 'completed')],
      })
      openGame(adapter)
      await screen.findByRole('heading', { level: 2, name: 'Vamos experimentar seu jogo' })
      expect(screen.queryByRole('button', { name: 'Funcionou!' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Guardar nos arquivados' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Apagar este plano…' })).toBeTruthy()
    },
    LENTO_NO_CI,
  )
})

describe('o compasso do jogo em equipe', () => {
  const tiques = (ms: number, n = 3) =>
    act(() => new Promise((resolve) => setTimeout(resolve, ms * n + 20)))

  test(
    'relê o jogo e a etapa e nunca apaga o que a criança está escrevendo',
    async () => {
      const { adapter, calls, colleagueWrites } = server({ people: [EU, BIA], stage: 'idea' })
      openGame(adapter, 30)
      const campo = (await screen.findByLabelText(
        'Quer acrescentar ou mudar alguma coisa?',
      )) as HTMLTextAreaElement
      fireEvent.change(campo, { target: { value: 'Um dragão que voa' } })
      colleagueWrites('A Bia pensou numa nuvem de chuva')
      await tiques(30)
      expect(calls('GET /v2/projects/p1').length).toBeGreaterThan(2)
      expect(await screen.findByText('A Bia pensou numa nuvem de chuva')).toBeTruthy()
      expect(
        screen.getByText('A Bia pensou numa nuvem de chuva').parentElement?.querySelector('strong')
          ?.textContent,
      ).toBe('Equipe')
      expect(
        (screen.getByLabelText('Quer acrescentar ou mudar alguma coisa?') as HTMLTextAreaElement)
          .value,
      ).toBe('Um dragão que voa')
    },
    LENTO_NO_CI,
  )

  test(
    'sem ninguém na equipe não há compasso, nem com a aba escondida',
    async () => {
      const sozinha = server({ stage: 'idea' })
      const { unmount } = openGame(sozinha.adapter, 30)
      await screen.findByLabelText('Quer acrescentar ou mudar alguma coisa?')
      await tiques(30)
      expect(sozinha.calls('GET /v2/projects/p1').length).toBe(1)
      unmount()

      const escondida = server({ people: [EU, BIA], stage: 'idea' })
      const original = Object.getOwnPropertyDescriptor(document, 'hidden')
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      try {
        openGame(escondida.adapter, 30)
        await screen.findByLabelText('Quer acrescentar ou mudar alguma coisa?')
        await tiques(30)
        expect(escondida.calls('GET /v2/projects/p1').length).toBe(1)
      } finally {
        if (original) Object.defineProperty(document, 'hidden', original)
        else Reflect.deleteProperty(document, 'hidden')
      }
    },
    LENTO_NO_CI,
  )
})

describe('"Abrir meu jogo" na hora de testar (15/10/2026)', () => {
  // Testar antes de terminar: a última missão do Estúdio ainda depende da missão do Pinta.
  const missoes = [
    task('m1', 'studio', 'completed'),
    task('m2', 'pinta', 'in_progress', ['m1']),
    task('m3', 'studio', 'planned', ['m2']),
  ]

  test(
    'abre o JOGO do plano, sem abrir missão nenhuma',
    async () => {
      const { adapter } = server({ noTeam: true, stage: 'observing', tasks: missoes })
      const onOpenGame = mock()
      openGame({ ...adapter, onOpenGame })
      fireEvent.click(await screen.findByRole('button', { name: 'Abrir meu jogo' }))
      expect(onOpenGame).toHaveBeenCalledWith({ projectId: 'p1' })
      expect(adapter.onOpenTask).not.toHaveBeenCalled()
    },
    LENTO_NO_CI,
  )

  test(
    'sem o host abrir o jogo, cai na missão do Estúdio que já começou, nunca na que ainda espera',
    async () => {
      const { adapter } = server({ noTeam: true, stage: 'observing', tasks: missoes })
      openGame(adapter)
      fireEvent.click(await screen.findByRole('button', { name: 'Abrir meu jogo' }))
      expect(adapter.onOpenTask).toHaveBeenCalledWith({ taskId: 'm1', destination: 'studio' })
    },
    LENTO_NO_CI,
  )
})
