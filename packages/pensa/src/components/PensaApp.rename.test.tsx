import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  PensaCycleView,
  PensaHostAdapter,
  PensaProjectDetailView,
  PensaStageView,
} from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

/**
 * Renomear o plano (26/09/2026): o lápis ao lado do título troca o h1 pelo campo "Nome do plano";
 * Enter ou sair do campo grava (PATCH, otimista), Esc desiste, nome curto ou igual não chama o
 * servidor, e um erro devolve o nome de antes com o aviso. O lápis é IRMÃO do h1: dentro dele o
 * nome acessível do título viraria "Runo Renomear o plano Runo".
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

function detailNamed(name: string): PensaProjectDetailView {
  return {
    id: 'plan-1',
    name,
    status: 'active',
    createdAt: '2026-08-04T09:00:00.000Z',
    updatedAt: '2026-08-04T10:30:00.000Z',
    cycles: [cycle],
    currentCycle: cycle,
    artifactsIndex: [],
  }
}

const stageZ: PensaStageView = {
  stage: 'z',
  conversation: { messages: [], summary: null, messageCount: 0 },
  state: {},
  artifacts: [],
  tasks: [],
  nextTaskId: null,
}

function adapterWith(
  patch: (body: { name: string }) => Promise<{ project: PensaProjectDetailView }>,
): { adapter: PensaHostAdapter; patches: Array<{ name: string }> } {
  const patches: Array<{ name: string }> = []
  const request = mock(async (path: string, init?: { method?: string; body?: unknown }) => {
    if (path === '/projects/plan-1' && init?.method === 'PATCH') {
      const body = init.body as { name: string }
      patches.push(body)
      return patch(body)
    }
    if (path === '/projects/plan-1') return { project: detailNamed('Runo') }
    if (path === '/cycles/cycle-1/stages/z') return stageZ
    throw new Error(`Unexpected request: ${path}`)
  })
  return {
    patches,
    adapter: {
      mode: 'kids',
      capabilities: { pintaOwned: true, studioOwned: true, moldaOwned: true },
      onOpenTask: () => undefined,
      transport: {
        request: request as PensaHostAdapter['transport']['request'],
        streamChat: () => () => {},
      },
    },
  }
}

async function openPlan(adapter: PensaHostAdapter) {
  render(<PensaApp adapter={adapter} initialProjectId="plan-1" />)
  await waitFor(() => screen.getByRole('heading', { name: 'Runo', level: 1 }))
}

const pencil = () => screen.getByRole('button', { name: 'Renomear o plano Runo' })
const field = () => screen.getByRole('textbox', { name: 'Nome do plano' }) as HTMLInputElement

describe('renomear o plano', () => {
  test('o lápis é irmão do título; clicar abre o campo com o nome, focado', async () => {
    const { adapter } = adapterWith(async (body) => ({ project: detailNamed(body.name) }))
    await openPlan(adapter)
    const heading = screen.getByRole('heading', { name: 'Runo', level: 1 })
    expect(heading.textContent).toBe('Runo')
    expect(pencil().parentElement).toBe(heading.parentElement)
    fireEvent.click(pencil())
    expect(field().value).toBe('Runo')
    expect(document.activeElement).toBe(field())
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  test('Enter grava por PATCH; o título troca ANTES da resposta (otimista) e o foco volta ao lápis', async () => {
    const deferred: { resolve?: (value: { project: PensaProjectDetailView }) => void } = {}
    const { adapter, patches } = adapterWith(
      () =>
        new Promise((r) => {
          deferred.resolve = r
        }),
    )
    await openPlan(adapter)
    fireEvent.click(pencil())
    fireEvent.change(field(), { target: { value: 'Runo 2' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    await waitFor(() => screen.getByRole('heading', { name: 'Runo 2', level: 1 }))
    expect(patches).toEqual([{ name: 'Runo 2' }])
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Renomear o plano Runo 2' }),
    )
    deferred.resolve?.({ project: detailNamed('Runo 2') })
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Runo 2', level: 1 })).toBeTruthy(),
    )
    expect(screen.getByRole('button', { name: 'Renomear o plano Runo 2' })).toBeTruthy()
  })

  test('Esc desiste sem chamar o servidor; nome curto ou igual também não chama', async () => {
    const { adapter, patches } = adapterWith(async (body) => ({ project: detailNamed(body.name) }))
    await openPlan(adapter)
    fireEvent.click(pencil())
    fireEvent.change(field(), { target: { value: 'Outro nome' } })
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(screen.getByRole('heading', { name: 'Runo', level: 1 })).toBeTruthy()
    fireEvent.click(pencil())
    fireEvent.change(field(), { target: { value: 'R' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(screen.getByRole('heading', { name: 'Runo', level: 1 })).toBeTruthy()
    fireEvent.click(pencil())
    fireEvent.change(field(), { target: { value: '  Runo ' } })
    fireEvent.blur(field())
    expect(screen.getByRole('heading', { name: 'Runo', level: 1 })).toBeTruthy()
    expect(patches).toEqual([])
  })

  test('erro do servidor devolve o nome de antes e mostra o aviso', async () => {
    const { adapter } = adapterWith(async () => {
      throw new Error('Deu ruim')
    })
    await openPlan(adapter)
    fireEvent.click(pencil())
    fireEvent.change(field(), { target: { value: 'Runo 2' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    await waitFor(() => screen.getByRole('heading', { name: 'Runo', level: 1 }))
    expect(screen.getByRole('alert').textContent).toContain('Deu ruim')
  })
})
