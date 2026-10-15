import { afterEach, expect, mock, test } from 'bun:test'
import { createPensaJourney, type PensaJourneyView } from '@sistemazero/core/pensa'
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { PensaMissionBlocked } from '../src/components/kids/pensa-mission-blocked'
import { usePensaTeamLibrary } from '../src/components/kids/use-pensa-team-library'
import { pensaStudioProjectId } from '../src/lib/pensa-studio-link'

const PLAN = '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b'
const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

function serve(options: { viewer: string; memberCount: number; items: number }) {
  const view: PensaJourneyView = {
    project: { id: PLAN, name: 'Jogo', status: 'active' },
    journey: createPensaJourney(PLAN, 'c1', ''),
    cycles: [],
    operation: null,
    team: {
      viewerProfileId: options.viewer,
      ownerProfileId: 'leo',
      memberCount: options.memberCount,
      shareEnabled: true,
      roles: { code: 'leo', art: ['bia'] },
    },
  }
  const calls: string[] = []
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/team-art'))
        return Response.json({
          items: Array.from({ length: options.items }, (_, index) => ({
            taskId: `t${index}`,
            title: 'Arte',
            tool: 'pinta',
            assetId: `a${index}`,
            assetName: null,
            assetKind: null,
            byProfileId: 'bia',
            completedAt: '',
            updatedAt: '',
            revision: 1,
          })),
        })
      return Response.json(view)
    }),
    { preconnect: originalFetch.preconnect },
  )
  return calls
}

test('jogo de um plano em equipe, com arte entregue, para quem programa: o adapter chega', async () => {
  serve({ viewer: 'leo', memberCount: 1, items: 2 })
  const { result } = renderHook(() =>
    usePensaTeamLibrary({ projectId: pensaStudioProjectId(PLAN), viewerId: 'leo' }),
  )
  // O editor abre na hora: no primeiro quadro ainda não há botão.
  expect(result.current).toBeUndefined()
  await waitFor(() => expect(result.current).toBeDefined())
  const list = await result.current?.list()
  expect(list?.map((item) => item.id)).toEqual(['t0', 't1'])
})

test('jogo livre: nem pergunta ao servidor', async () => {
  const calls = serve({ viewer: 'leo', memberCount: 1, items: 2 })
  const { result } = renderHook(() =>
    usePensaTeamLibrary({ projectId: 'meu-jogo-livre', viewerId: 'leo' }),
  )
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(result.current).toBeUndefined()
  expect(calls).toEqual([])
})

test('switching profiles immediately removes a previously granted team library', async () => {
  serve({ viewer: 'leo', memberCount: 1, items: 2 })
  const { result, rerender } = renderHook(
    ({ viewerId }) => usePensaTeamLibrary({ projectId: pensaStudioProjectId(PLAN), viewerId }),
    { initialProps: { viewerId: 'leo' } },
  )
  await waitFor(() => expect(result.current).toBeDefined())
  const requests = serve({ viewer: 'bia', memberCount: 1, items: 2 })
  rerender({ viewerId: 'bia' })
  expect(result.current).toBeUndefined()
  await waitFor(() => expect(requests.length).toBeGreaterThan(0))
  expect(result.current).toBeUndefined()
})

test('plano solo, quem só desenha, ou nenhuma arte entregue: sem botão', async () => {
  for (const scenario of [
    { viewer: 'leo', memberCount: 0, items: 2 },
    { viewer: 'bia', memberCount: 1, items: 2 },
    { viewer: 'leo', memberCount: 1, items: 0 },
  ]) {
    const calls = serve(scenario)
    const { result, unmount } = renderHook(() =>
      usePensaTeamLibrary({ projectId: pensaStudioProjectId(PLAN), viewerId: scenario.viewer }),
    )
    await waitFor(() => expect(calls.length).toBeGreaterThan(0))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(result.current).toBeUndefined()
    unmount()
  }
})

test('a missão bloqueada: a frase do servidor (ou a de reserva) e o "Voltar ao plano"', () => {
  const onBack = mock(() => {})
  const view = render(
    <PensaMissionBlocked reason="Essa missão é de quem programa o jogo." onBackToPlan={onBack} />,
  )
  expect(screen.getByRole('status').textContent).toBe('Essa missão é de quem programa o jogo.')
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao plano' }))
  expect(onBack).toHaveBeenCalledTimes(1)
  view.unmount()
  render(<PensaMissionBlocked reason={null} onBackToPlan={onBack} />)
  expect(screen.getByRole('status').textContent).toBe('Essa missão é de outra pessoa da equipe.')
})
