import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type {
  PensaCycleView,
  PensaHostAdapter,
  PensaProjectDetailView,
  PensaProjectMembersView,
  PensaProjectRole,
  PensaStageView,
  PensaTeamPersonView,
} from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

/**
 * A EQUIPE do plano (26/09/2026): o "Equipe · N" do cabeçalho abre a janela; o dono cria, copia,
 * gira e desliga o código e tira gente em dois passos; o membro vê "Este plano é de X", não tem o
 * lápis de renomear e sai da equipe em dois passos; Esc fecha e o foco volta ao botão; erro do
 * servidor fica na janela; e, com equipe, o compasso avisa "alguém mexeu no plano".
 */
const cycle: PensaCycleView = {
  id: 'cycle-1',
  number: 1,
  goal: null,
  stage: 'z',
  zCompletedAt: null,
  eCompletedAt: null,
  rCompletedAt: null,
  oCompletedAt: null,
}

const EU: PensaTeamPersonView = {
  profileId: 'perfil-eu',
  firstName: 'Helena',
  photoUrl: null,
  joinedAt: null,
}
const BIA: PensaTeamPersonView = {
  profileId: 'perfil-bia',
  firstName: 'Bia',
  photoUrl: 'https://cdn.test/bia.webp',
  joinedAt: '2026-09-20T10:00:00.000Z',
}

const stageZ: PensaStageView = {
  stage: 'z',
  conversation: { messages: [], summary: null, messageCount: 0 },
  state: {},
  artifacts: [],
  tasks: [],
  nextTaskId: null,
}

function harness(options: {
  role: PensaProjectRole
  members?: PensaTeamPersonView[]
  shareCode?: string | null
  fail?: Partial<Record<'share' | 'remove' | 'leave' | 'members', string>>
}) {
  let members = [...(options.members ?? [])]
  let shareCode = options.shareCode ?? null
  let updatedAt = '2026-08-04T10:30:00.000Z'
  let codes = 0
  const calls: string[] = []
  const detail = (): PensaProjectDetailView => ({
    id: 'plan-1',
    name: 'Runo',
    status: 'active',
    createdAt: '2026-08-04T09:00:00.000Z',
    updatedAt,
    cycles: [cycle],
    currentCycle: cycle,
    artifactsIndex: [],
    role: options.role,
    team: { memberCount: members.length, shareEnabled: shareCode !== null },
  })
  const request = mock(async (path: string, init?: { method?: string; body?: unknown }) => {
    const method = init?.method ?? 'GET'
    calls.push(`${method} ${path}`)
    if (method === 'GET' && path === '/projects/plan-1') return { project: detail() }
    if (method === 'GET' && path === '/projects') return { projects: [] }
    if (method === 'GET' && path === '/cycles/cycle-1/stages/z') return stageZ
    if (method === 'GET' && path === '/projects/plan-1/members') {
      if (options.fail?.members) throw new Error(options.fail.members)
      const view: PensaProjectMembersView = {
        role: options.role,
        viewerProfileId: options.role === 'owner' ? EU.profileId : 'perfil-eu-membro',
        shareCode: options.role === 'owner' ? shareCode : null,
        maxMembers: 5,
        owner: options.role === 'owner' ? EU : BIA,
        members,
      }
      return view
    }
    if (path === '/projects/plan-1/share' && method === 'POST') {
      if (options.fail?.share) throw new Error(options.fail.share)
      codes += 1
      shareCode = `AAAAA${String.fromCharCode(65 + codes)}`
      return { code: shareCode, display: `ZAP-${shareCode}` }
    }
    if (path === '/projects/plan-1/share' && method === 'DELETE') {
      shareCode = null
      return { ok: true }
    }
    if (method === 'DELETE' && path === '/projects/plan-1/members/me') {
      if (options.fail?.leave) throw new Error(options.fail.leave)
      return { ok: true }
    }
    const member = /^\/projects\/plan-1\/members\/(.+)$/.exec(path)
    if (method === 'DELETE' && member) {
      if (options.fail?.remove) throw new Error(options.fail.remove)
      members = members.filter((person) => person.profileId !== member[1])
      return { ok: true }
    }
    throw new Error(`Unexpected request: ${method} ${path}`)
  })
  const adapter: PensaHostAdapter = {
    mode: 'kids',
    capabilities: { pintaOwned: true, studioOwned: true, moldaOwned: true },
    onOpenTask: () => undefined,
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: () => () => {},
    },
  }
  return {
    adapter,
    calls,
    touch: () => {
      updatedAt = '2026-08-04T11:00:00.000Z'
    },
  }
}

async function openPlan(adapter: PensaHostAdapter, teamPollMs?: number) {
  render(<PensaApp adapter={adapter} initialProjectId="plan-1" teamPollMs={teamPollMs} />)
  await waitFor(() => screen.getByRole('heading', { name: 'Runo', level: 1 }))
}

async function openTeam() {
  const button = screen.getByRole('button', { name: /^Equipe · \d+$/ })
  fireEvent.click(button)
  const dialog = await screen.findByRole('dialog', { name: 'Equipe do plano' })
  return { button, dialog }
}

describe('a equipe do plano', () => {
  test('o dono: "Equipe · 1" abre a janela com a lista, e o "Criar um código" gera o ZAP-', async () => {
    const { adapter } = harness({ role: 'owner', members: [BIA] })
    await openPlan(adapter)
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await waitFor(() => janela.getByText('1 de 5 lugares'))
    // O dono ("você", "dono do plano") e a Bia, com o rosto e o "Tirar".
    expect(janela.getByText('Helena')).toBeTruthy()
    expect(janela.getByText('você')).toBeTruthy()
    expect(janela.getByText('dono do plano')).toBeTruthy()
    expect(janela.getByText('Bia')).toBeTruthy()
    expect(janela.getByRole('button', { name: 'Tirar Bia da equipe' })).toBeTruthy()
    // Sem código ainda: o convite e o botão de criar.
    expect(janela.getByText(/Ninguém entra sem um código/)).toBeTruthy()
    fireEvent.click(janela.getByRole('button', { name: 'Criar um código' }))
    const code = await janela.findByRole('status', { name: 'Código do plano' })
    expect(code.textContent).toBe('ZAP-AAAAAB')
    expect(janela.getByRole('button', { name: 'Gerar outro código' })).toBeTruthy()
    expect(janela.getByRole('button', { name: 'Desligar o código' })).toBeTruthy()
    // Gerar outro: o código muda (o antigo deixa de valer no servidor).
    fireEvent.click(janela.getByRole('button', { name: 'Gerar outro código' }))
    await waitFor(() =>
      expect(janela.getByRole('status', { name: 'Código do plano' }).textContent).toBe(
        'ZAP-AAAAAC',
      ),
    )
    // Desligar: volta ao convite.
    fireEvent.click(janela.getByRole('button', { name: 'Desligar o código' }))
    await waitFor(() => janela.getByRole('button', { name: 'Criar um código' }))
    expect(janela.queryByRole('status', { name: 'Código do plano' })).toBeNull()
  })

  test('copiar: sem área de transferência o recado é honesto; com ela, "Código copiado!"', async () => {
    const { adapter } = harness({ role: 'owner', shareCode: 'AAAAAB' })
    await openPlan(adapter)
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByRole('status', { name: 'Código do plano' })
    const nav = navigator as Navigator & { clipboard?: { writeText(text: string): Promise<void> } }
    const original = Object.getOwnPropertyDescriptor(nav, 'clipboard')
    Object.defineProperty(nav, 'clipboard', { value: undefined, configurable: true })
    try {
      fireEvent.click(janela.getByRole('button', { name: 'Copiar' }))
      await waitFor(() => janela.getByText(/Não deu para copiar/))
      const written: string[] = []
      Object.defineProperty(nav, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            written.push(text)
          },
        },
        configurable: true,
      })
      fireEvent.click(janela.getByRole('button', { name: 'Copiar' }))
      await waitFor(() => janela.getByText('Código copiado!'))
      expect(written).toEqual(['ZAP-AAAAAB'])
    } finally {
      if (original) Object.defineProperty(nav, 'clipboard', original)
      else Reflect.deleteProperty(nav, 'clipboard')
    }
  })

  test('tirar alguém pede confirmação na linha; "Deixar" desiste e "Tirar mesmo" tira (o contador do cabeçalho acompanha)', async () => {
    const { adapter, calls } = harness({ role: 'owner', members: [BIA] })
    await openPlan(adapter)
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByText('1 de 5 lugares')
    fireEvent.click(janela.getByRole('button', { name: 'Tirar Bia da equipe' }))
    expect(janela.getByText('Tirar Bia da equipe?')).toBeTruthy()
    fireEvent.click(janela.getByRole('button', { name: 'Deixar' }))
    expect(janela.queryByText('Tirar Bia da equipe?')).toBeNull()
    expect(calls.some((call) => call.startsWith('DELETE'))).toBe(false)
    fireEvent.click(janela.getByRole('button', { name: 'Tirar Bia da equipe' }))
    fireEvent.click(janela.getByRole('button', { name: 'Tirar mesmo' }))
    await waitFor(() => janela.getByText('Ainda não entrou ninguém.'))
    expect(calls).toContain('DELETE /projects/plan-1/members/perfil-bia')
    expect(janela.queryByText('Bia')).toBeNull()
    expect(screen.getByRole('button', { name: 'Equipe · 0' })).toBeTruthy()
  })

  test('quem entrou pelo código: sem o lápis, "Este plano é de Bia", sem a parte do código, e "Sair da equipe" leva à home', async () => {
    const { adapter, calls } = harness({
      role: 'member',
      members: [{ ...EU, profileId: 'perfil-eu-membro', joinedAt: '2026-09-21T10:00:00.000Z' }],
    })
    await openPlan(adapter)
    expect(screen.queryByRole('button', { name: /^Renomear o plano/ })).toBeNull()
    const { dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByText(/Este plano é de Bia/)
    expect(janela.queryByText(/Ninguém entra sem um código/)).toBeNull()
    expect(janela.queryByRole('button', { name: 'Criar um código' })).toBeNull()
    expect(janela.queryByRole('button', { name: /^Tirar/ })).toBeNull()
    fireEvent.click(janela.getByRole('button', { name: 'Sair da equipe' }))
    expect(janela.getByText(/Você perde o acesso a este plano/)).toBeTruthy()
    fireEvent.click(janela.getByRole('button', { name: 'Ficar' }))
    expect(janela.queryByText(/Você perde o acesso/)).toBeNull()
    fireEvent.click(janela.getByRole('button', { name: 'Sair da equipe' }))
    fireEvent.click(janela.getByRole('button', { name: 'Sair mesmo' }))
    await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
    expect(calls).toContain('DELETE /projects/plan-1/members/me')
  })

  test('Esc fecha a janela e o foco volta ao "Equipe"; erro do servidor fica NA janela', async () => {
    const { adapter } = harness({
      role: 'owner',
      fail: { share: 'Só quem criou o plano pode fazer isso.' },
    })
    await openPlan(adapter)
    const { button, dialog } = await openTeam()
    const janela = within(dialog)
    await janela.findByRole('button', { name: 'Criar um código' })
    fireEvent.click(janela.getByRole('button', { name: 'Criar um código' }))
    const alerta = await janela.findByRole('alert')
    expect(alerta.textContent).toBe('Só quem criou o plano pode fazer isso.')
    expect(screen.getByRole('dialog', { name: 'Equipe do plano' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(button)
  })

  test('com equipe, o compasso avisa "alguém mexeu no plano" e o "Atualizar" recarrega', async () => {
    const { adapter, touch, calls } = harness({ role: 'owner', members: [BIA] })
    await openPlan(adapter, 20)
    expect(screen.queryByText('Alguém da equipe mexeu no plano.')).toBeNull()
    // Sem mudança, o compasso pergunta e fica quieto.
    await act(() => new Promise((resolve) => setTimeout(resolve, 60)))
    expect(screen.queryByText('Alguém da equipe mexeu no plano.')).toBeNull()
    touch()
    const aviso = await screen.findByText('Alguém da equipe mexeu no plano.')
    expect(aviso.closest('[role="status"]')).toBeTruthy()
    const antes = calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z').length
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(screen.queryByText('Alguém da equipe mexeu no plano.')).toBeNull())
    await waitFor(() =>
      expect(calls.filter((call) => call === 'GET /cycles/cycle-1/stages/z').length).toBe(
        antes + 1,
      ),
    )
  })

  test('sem equipe, o compasso nem liga', async () => {
    const { adapter, calls } = harness({ role: 'owner' })
    await openPlan(adapter, 20)
    const antes = calls.length
    await act(() => new Promise((resolve) => setTimeout(resolve, 80)))
    expect(calls.length).toBe(antes)
  })
})
