import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type {
  PensaCycleView,
  PensaHostAdapter,
  PensaProjectDetailView,
  PensaProjectListView,
  PensaStageView,
} from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

/**
 * A equipe na HOME (26/09/2026): os chips "Em equipe · N" (meu plano com gente) e "De <dono>"
 * (plano em que entrei, sem a lixeira: apagar é do dono), e o "Entrar com um código" ao lado do
 * "+ Novo plano": abre o formulário na faixa creme (fechando o de criar), o código vai ao
 * servidor como a criança digitou, sucesso abre o plano, o recado do servidor fica ao lado do
 * campo, Esc fecha e devolve o foco ao botão.
 */
const DAY = 24 * 60 * 60 * 1000

function plan(
  id: string,
  name: string,
  extra: Partial<PensaProjectListView> = {},
): PensaProjectListView {
  return {
    id,
    name,
    status: 'active',
    cycleNumber: 1,
    stage: 'z',
    createdAt: new Date(Date.now() - 5 * DAY).toISOString(),
    updatedAt: new Date(Date.now() - DAY - 60_000).toISOString(),
    ...extra,
  }
}

const cycle: PensaCycleView = {
  id: 'cycle-lua',
  number: 1,
  goal: null,
  stage: 'z',
  zCompletedAt: null,
  eCompletedAt: null,
  rCompletedAt: null,
  oCompletedAt: null,
}
const LUA: PensaProjectDetailView = {
  id: 'lua',
  name: 'Guardiões da Lua',
  status: 'active',
  createdAt: '2026-08-04T09:00:00.000Z',
  updatedAt: '2026-08-04T10:30:00.000Z',
  cycles: [cycle],
  currentCycle: cycle,
  artifactsIndex: [],
  role: 'member',
  team: { memberCount: 1, shareEnabled: true },
}
const stageZ: PensaStageView = {
  stage: 'z',
  conversation: { messages: [], summary: null, messageCount: 0 },
  state: {},
  artifacts: [],
  tasks: [],
  nextTaskId: null,
}

function adapterWith(projects: PensaProjectListView[], joinError?: string) {
  const joins: unknown[] = []
  const request = mock(async (path: string, init?: { method?: string; body?: unknown }) => {
    const method = init?.method ?? 'GET'
    if (method === 'GET' && path === '/projects') return { projects }
    if (method === 'POST' && path === '/projects/join') {
      joins.push(init?.body)
      if (joinError) throw new Error(joinError)
      return { project: LUA }
    }
    if (method === 'GET' && path === '/projects/lua') return { project: LUA }
    if (method === 'GET' && path === '/cycles/cycle-lua/stages/z') return stageZ
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
  return { adapter, joins }
}

async function home(projects: PensaProjectListView[], joinError?: string) {
  const result = adapterWith(projects, joinError)
  render(<PensaApp adapter={result.adapter} />)
  await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
  return result
}

const cardOf = (name: string) =>
  within(
    screen
      .getByRole('button', { name: `Continuar o plano ${name}` })
      .closest('article') as HTMLElement,
  )

describe('a equipe na home', () => {
  test('meu plano com gente dentro leva "Em equipe · N"; o plano em que entrei leva "De <dono>" e não tem lixeira', async () => {
    await home([
      plan('runo', 'Runo', { role: 'owner', team: { memberCount: 2, ownerFirstName: null } }),
      plan('lua', 'Guardiões da Lua', {
        role: 'member',
        team: { memberCount: 1, ownerFirstName: 'Bia' },
      }),
      plan('solo', 'Solo'),
    ])
    expect(cardOf('Runo').getByText('Em equipe · 2').className).toContain('is-team')
    expect(cardOf('Runo').getByRole('button', { name: 'Apagar o plano Runo' })).toBeTruthy()
    expect(cardOf('Guardiões da Lua').getByText('De Bia').className).toContain('is-team')
    expect(
      cardOf('Guardiões da Lua').queryByRole('button', { name: 'Apagar o plano Guardiões da Lua' }),
    ).toBeNull()
    // Sem `role` (members antigo) o cartão é o de sempre: sem chip de equipe, com lixeira.
    expect(cardOf('Solo').queryByText(/Em equipe|^De /)).toBeNull()
    expect(cardOf('Solo').getByRole('button', { name: 'Apagar o plano Solo' })).toBeTruthy()
  })

  test('sem dono conhecido, o chip diz "De Colega"', async () => {
    await home([
      plan('lua', 'Lua', { role: 'member', team: { memberCount: 1, ownerFirstName: null } }),
    ])
    expect(cardOf('Lua').getByText('De Colega')).toBeTruthy()
  })

  test('"Entrar com um código" abre o formulário (fechando o de criar), manda o código e abre o plano', async () => {
    const { joins } = await home([plan('runo', 'Runo')])
    fireEvent.click(screen.getByRole('button', { name: '+ Novo plano' }))
    expect(screen.getByRole('textbox', { name: 'Nome do novo jogo' })).toBeTruthy()
    const botao = screen.getByRole('button', { name: 'Entrar com um código' })
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(botao)
    expect(botao.getAttribute('aria-expanded')).toBe('true')
    expect(screen.queryByRole('textbox', { name: 'Nome do novo jogo' })).toBeNull()
    const campo = screen.getByRole('textbox', { name: 'Código do plano de um colega' })
    await waitFor(() => expect(document.activeElement).toBe(campo))
    // Curto demais: o "Entrar" fica desligado.
    fireEvent.change(campo, { target: { value: 'ab' } })
    expect((screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    fireEvent.change(campo, { target: { value: ' zap-aaaaab ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => screen.getByRole('heading', { name: 'Guardiões da Lua', level: 1 }))
    // Como a criança digitou (trim): quem normaliza é o servidor.
    expect(joins).toEqual([{ code: 'zap-aaaaab' }])
    expect(screen.getByRole('button', { name: 'Equipe · 1' })).toBeTruthy()
  })

  test('código inválido: o recado do servidor fica ao lado do campo, e o campo continua', async () => {
    const { joins } = await home(
      [plan('runo', 'Runo')],
      'Esse código não abriu nenhum plano. Confira com quem te chamou.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Entrar com um código' }))
    const campo = screen.getByRole('textbox', { name: 'Código do plano de um colega' })
    fireEvent.change(campo, { target: { value: 'ZAP-000000' } })
    fireEvent.submit(campo.closest('form') as HTMLFormElement)
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Confira com quem te chamou')
    expect(joins).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Código do plano de um colega' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Meus projetos' })).toBeTruthy()
  })

  test('Esc e "Cancelar" fecham o formulário e devolvem o foco ao botão', async () => {
    await home([plan('runo', 'Runo')])
    const botao = screen.getByRole('button', { name: 'Entrar com um código' })
    fireEvent.click(botao)
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Código do plano de um colega' }), {
      key: 'Escape',
    })
    expect(screen.queryByRole('textbox', { name: 'Código do plano de um colega' })).toBeNull()
    expect(document.activeElement).toBe(botao)
    fireEvent.click(botao)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('textbox', { name: 'Código do plano de um colega' })).toBeNull()
    expect(document.activeElement).toBe(botao)
    // E abrir o criar fecha o de entrar.
    fireEvent.click(botao)
    fireEvent.click(screen.getByRole('button', { name: '+ Novo plano' }))
    expect(screen.queryByRole('textbox', { name: 'Código do plano de um colega' })).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Nome do novo jogo' })).toBeTruthy()
  })
})
