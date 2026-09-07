import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PensaHostAdapter, PensaProjectDetailView, PensaStageView } from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

/**
 * "+ Novo plano" (07/09/2026): o campo "Nome do novo jogo" deixou de ser uma faixa sempre
 * visível e virou uma linha SOB DEMANDA abaixo do cabeçalho compacto: nasce fechado quando já
 * há planos (aberto no primeiro uso), o botão abre e foca, Esc/Cancelar fecham e devolvem o foco,
 * criar navega ao plano, e um erro mantém o campo aberto com o nome para tentar de novo.
 */
const cycle = {
  id: 'cycle-1',
  number: 1,
  goal: null,
  stage: 'done' as const,
  zCompletedAt: '2026-08-04T10:00:00.000Z',
  eCompletedAt: '2026-08-04T10:10:00.000Z',
  rCompletedAt: '2026-08-04T10:20:00.000Z',
  oCompletedAt: '2026-08-04T10:30:00.000Z',
}

function detailOf(id: string, name: string): PensaProjectDetailView {
  return {
    id,
    name,
    status: 'active',
    createdAt: '2026-08-04T09:00:00.000Z',
    updatedAt: '2026-08-04T10:30:00.000Z',
    cycles: [cycle],
    currentCycle: cycle,
    artifactsIndex: [],
  }
}

const emptyStage: PensaStageView = {
  stage: 'done',
  conversation: { messages: [], summary: null, messageCount: 0 },
  state: {},
  artifacts: [],
  tasks: [],
  nextTaskId: null,
}

function adapterWith(
  projects: Array<{ id: string; name: string }>,
  onCreate: (body: unknown) => Promise<unknown> = async () => {
    throw new Error('não era para criar')
  },
): { adapter: PensaHostAdapter; request: ReturnType<typeof mock> } {
  const request = mock(async (path: string, init?: { method?: string; body?: unknown }) => {
    if (path === '/projects' && init?.method === 'POST') return onCreate(init.body)
    if (path === '/projects')
      return {
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          status: 'active',
          cycleNumber: 1,
          stage: 'done',
          createdAt: '2026-08-04T09:00:00.000Z',
          updatedAt: '2026-08-04T10:30:00.000Z',
        })),
      }
    const detalhe = path.match(/^\/projects\/(.+)$/)
    if (detalhe) return { project: detailOf(detalhe[1] ?? '', 'Lua') }
    if (path.startsWith('/cycles/')) return emptyStage
    throw new Error(`Unexpected request: ${path}`)
  })
  return {
    request,
    adapter: {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: true },
      onOpenTask: () => undefined,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    },
  }
}

const umPlano = [{ id: 'plan-1', name: 'Bosque das Estrelas' }]

describe('PensaApp × "+ Novo plano"', () => {
  test('com planos o campo nasce fechado; o botão abre, foca, e Esc fecha devolvendo o foco', async () => {
    render(<PensaApp adapter={adapterWith(umPlano).adapter} />)
    await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
    expect(screen.queryByRole('textbox', { name: 'Nome do novo jogo' })).toBeNull()
    const novo = screen.getByRole('button', { name: '+ Novo plano' })
    expect(novo.getAttribute('aria-expanded')).toBe('false')
    expect(novo.className).toBe('sz-tool-btn-3d')
    fireEvent.click(novo)
    const campo = screen.getByRole('textbox', { name: 'Nome do novo jogo' })
    expect(novo.getAttribute('aria-expanded')).toBe('true')
    await waitFor(() => expect(document.activeElement).toBe(campo))
    // Menos de 2 letras não cria.
    const criar = screen.getByRole('button', { name: 'Criar meu plano' })
    expect((criar as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(campo, { target: { value: 'L' } })
    expect((criar as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(campo, { target: { value: 'Lua' } })
    expect((criar as HTMLButtonElement).disabled).toBe(false)
    // Esc fecha e devolve o foco ao botão que abriu.
    fireEvent.keyDown(campo, { key: 'Escape' })
    expect(screen.queryByRole('textbox', { name: 'Nome do novo jogo' })).toBeNull()
    expect(document.activeElement).toBe(novo)
    // "Cancelar" também fecha.
    fireEvent.click(novo)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('textbox', { name: 'Nome do novo jogo' })).toBeNull()
    // Rodapé no lugar do antigo cabeçalho "Meus planos" (que segue só para o leitor).
    expect(screen.getByText('Mostrando 1 plano')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Meus planos' }).className).toContain(
      'pensa-sr-only',
    )
  })

  test('criar manda o nome ao servidor e abre o plano', async () => {
    const onCreate = mock(async (body: unknown) => ({
      project: detailOf('plan-2', (body as { name: string }).name),
    }))
    const { adapter, request } = adapterWith(umPlano, onCreate)
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Novo plano' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome do novo jogo' }), {
      target: { value: '  Lua  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar meu plano' }))
    await waitFor(() => screen.getByRole('heading', { name: 'Lua' }))
    expect(onCreate).toHaveBeenCalledWith({ name: 'Lua' })
    expect(request).toHaveBeenCalledWith('/projects', { method: 'POST', body: { name: 'Lua' } })
  })

  test('erro ao criar mantém o campo aberto com o nome para tentar de novo', async () => {
    const { adapter } = adapterWith(umPlano, async () => {
      throw new Error('Sem conexão agora')
    })
    render(<PensaApp adapter={adapter} />)
    await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Novo plano' }))
    const campo = screen.getByRole('textbox', { name: 'Nome do novo jogo' })
    fireEvent.change(campo, { target: { value: 'Lua' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar meu plano' }))
    await waitFor(() => screen.getByText(/Sem conexão agora/))
    expect(screen.getByRole('textbox', { name: 'Nome do novo jogo' })).toBe(campo)
    expect((campo as HTMLInputElement).value).toBe('Lua')
  })

  test('no primeiro uso (nenhum plano) o campo já nasce aberto e não há rodapé', async () => {
    render(<PensaApp adapter={adapterWith([]).adapter} />)
    await waitFor(() => screen.getByRole('heading', { name: 'Meus projetos' }))
    expect(screen.getByRole('textbox', { name: 'Nome do novo jogo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ Novo plano' }).getAttribute('aria-expanded')).toBe(
      'true',
    )
    expect(screen.queryByText(/^Mostrando /)).toBeNull()
    expect(screen.getByText('Seu primeiro mundo começa aqui')).toBeTruthy()
  })
})
