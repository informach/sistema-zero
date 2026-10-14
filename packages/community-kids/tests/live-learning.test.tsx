import { afterEach, describe, expect, test } from 'bun:test'
import { type InteractiveBlock, publicInteractiveBlock } from '@sistemazero/core/learning'
import type { LiveRoomView } from '@sistemazero/core/live'
import { LiveLearningActivities } from '@sistemazero/member-shell/components/live/live-learning-activities'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const session = '5502b6a0-531a-4c29-8b1e-46d2b61f6506'
const blockId = 'd05682a7-175b-483b-983c-46d4a7676627'
const revision = '8bdc8732-53d6-4ae7-a083-33e4b9b59a07'
const first = 'e0b2919b-63c7-4283-9661-c399e9f80eac'
const second = '99e8f23f-efcc-4634-b586-11f1d0051774'
const content: InteractiveBlock = {
  kind: 'interactive',
  title: 'Minha descoberta',
  instructions: 'Escolha uma possibilidade.',
  hints: [],
  required: false,
  activity: { type: 'html', html: '<p>Experimente.</p>' },
  checkpoint: {
    prompt: 'Qual caminho?',
    choices: [
      { id: 'first', label: 'Primeiro caminho' },
      { id: 'second', label: 'Segundo caminho' },
    ],
    correctChoiceId: 'first',
    explanation: 'Vamos continuar explorando.',
  },
}
const steps = [
  {
    id: first,
    title: 'Primeira etapa',
    instructions: '',
    blocks: [{ id: blockId, revision, content }],
  },
  { id: second, title: 'Segunda etapa', instructions: 'Outra descoberta.', blocks: [] },
]
function room(teacher = false): LiveRoomView {
  return {
    session: { id: session },
    actorId: teacher ? 'teacher' : 'learner',
    role: teacher ? 'teacher' : 'learner',
    plan: {
      title: 'Oficina',
      instructions: '',
      starterProjectId: null,
      materials: [],
      steps: steps.map((step) => ({
        ...step,
        blocks: step.blocks.map((block) => ({
          ...block,
          content: publicInteractiveBlock(block.content),
        })),
      })),
    },
    occurrence: { suggestedStepId: second },
  } as unknown as LiveRoomView
}
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
  localStorage.clear()
})

describe('atividades reutilizadas em encontros ao vivo', () => {
  test('guarda e corrige por session sem fabricar acesso a uma aula gravada; indicação não troca a etapa', async () => {
    const paths: string[] = []
    globalThis.fetch = (async (input, init) => {
      const path = String(input)
      paths.push(path)
      if (init?.method !== 'POST') return Response.json({ sectionId: null, blocks: [] })
      const body = JSON.parse(String(init.body))
      const progress = {
        blockId,
        revision,
        answers: body.answers,
        hintsUsed: body.hintsUsed,
        positionSeconds: null,
        attemptsCount: 1,
        result: {
          passed: true,
          participated: true,
          verifiedBy: 'server',
          feedback: 'Resposta guardada na oficina.',
        },
        updatedAt: new Date().toISOString(),
      }
      return Response.json(
        path.endsWith('learning-attempts')
          ? {
              attempt: {
                id: body.id,
                blockId,
                revision,
                answers: body.answers,
                hintsUsed: body.hintsUsed,
                result: progress.result,
                createdAt: progress.updatedAt,
              },
              progress,
            }
          : progress,
      )
    }) as typeof fetch
    render(<LiveLearningActivities room={room()} onControl={async () => true} disabled={false} />)
    fireEvent.click(await screen.findByRole('radio', { name: 'Primeiro caminho' }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferir minha descoberta' }))
    await waitFor(() => expect(screen.getByText('Resposta guardada na oficina.')).toBeTruthy())
    expect(
      paths.some(
        (path) => path === `/api/live/sessions/${session}/blocks/${blockId}/learning-progress`,
      ),
    ).toBe(true)
    expect(
      paths.some(
        (path) => path === `/api/live/sessions/${session}/blocks/${blockId}/learning-attempts`,
      ),
    ).toBe(true)
    expect(paths.every((path) => path.startsWith('/api/live/'))).toBe(true)
    expect(screen.queryByText('Outra descoberta.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ir para esse passo' }))
    expect(screen.getByText('Outra descoberta.')).toBeTruthy()
  })
  test('ensaio docente usa o snapshot privado e não grava progresso de criança', async () => {
    const writes: string[] = []
    globalThis.fetch = (async (input, init) => {
      if (init?.method === 'POST') writes.push(String(input))
      return Response.json({ steps })
    }) as typeof fetch
    render(
      <LiveLearningActivities room={room(true)} onControl={async () => true} disabled={false} />,
    )
    fireEvent.click(await screen.findByRole('radio', { name: 'Primeiro caminho' }))
    fireEvent.click(screen.getByRole('button', { name: 'Conferir minha descoberta' }))
    await waitFor(() => expect(screen.getByText('Prévia: nada é guardado.')).toBeTruthy())
    expect(writes).toEqual([])
  })
})
