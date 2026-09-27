import { afterEach, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  PensaChatHandlers,
  PensaHostAdapter,
  PensaProjectDetailView,
  PensaStageView,
} from '../core/types'
import { PensaApp } from './PensaApp'

afterEach(cleanup)

test('a conversa continua na tela enquanto o Pensa busca a resposta concluída', async () => {
  const cycle = {
    id: 'cycle-1',
    number: 1,
    goal: null,
    stage: 'z' as const,
    zCompletedAt: null,
    eCompletedAt: null,
    rCompletedAt: null,
    oCompletedAt: null,
  }
  const detail: PensaProjectDetailView = {
    id: 'plan-1',
    name: 'Meu jogo',
    status: 'active',
    createdAt: '2026-09-26T10:00:00.000Z',
    updatedAt: '2026-09-26T10:00:00.000Z',
    cycles: [cycle],
    currentCycle: cycle,
    artifactsIndex: [],
  }
  const stage: PensaStageView = {
    stage: 'z',
    conversation: { messages: [], summary: null, messageCount: 0 },
    state: {},
    artifacts: [],
    tasks: [],
    nextTaskId: null,
  }
  const updatedStage: PensaStageView = {
    ...stage,
    conversation: {
      messages: [
        { role: 'user', content: 'Um jogo de estrelas', at: '2026-09-26T10:01:00.000Z' },
        { role: 'assistant', content: 'Vamos criar esse jogo!', at: '2026-09-26T10:01:01.000Z' },
      ],
      summary: null,
      messageCount: 2,
    },
  }
  let stageRequests = 0
  let releaseStage: ((value: PensaStageView) => void) | undefined
  let chat: PensaChatHandlers | undefined
  const request = mock(async (path: string) => {
    if (path === '/projects/plan-1') return { project: detail }
    if (path === '/cycles/cycle-1/stages/z') {
      stageRequests += 1
      if (stageRequests === 1) return stage
      return new Promise<PensaStageView>((resolve) => {
        releaseStage = resolve
      })
    }
    throw new Error(`Unexpected request: ${path}`)
  })
  const adapter: PensaHostAdapter = {
    mode: 'kids',
    capabilities: { pintaOwned: true, studioOwned: true },
    onOpenTask: () => {},
    transport: {
      request: request as PensaHostAdapter['transport']['request'],
      streamChat: (_input, handlers) => {
        chat = handlers
        return () => {}
      },
    },
  }

  render(<PensaApp adapter={adapter} initialProjectId="plan-1" />)
  const input = (await screen.findByLabelText('Mensagem para o Zappy')) as HTMLTextAreaElement
  input.focus()
  fireEvent.change(input, { target: { value: 'Um jogo de estrelas' } })
  fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
  expect(chat).toBeDefined()

  act(() => chat?.onDelta('Vamos criar esse jogo!'))
  expect(screen.getByText('Vamos criar esse jogo!')).toBeTruthy()
  act(() => chat?.onDone())
  await waitFor(() => expect(stageRequests).toBe(2))

  expect(screen.queryByText('Preparando seu mapa de criação…')).toBeNull()
  expect(screen.getByLabelText('Mensagem para o Zappy')).toBe(input)
  expect(document.activeElement).toBe(input)
  expect(screen.getByText('Vamos criar esse jogo!')).toBeTruthy()

  await act(async () => releaseStage?.(updatedStage))
  await waitFor(() => expect(screen.getByText('Um jogo de estrelas')).toBeTruthy())
  expect(screen.getAllByText('Vamos criar esse jogo!')).toHaveLength(1)
  expect(screen.getByLabelText('Mensagem para o Zappy')).toBe(input)
})
