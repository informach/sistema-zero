import { afterEach, expect, mock, test } from 'bun:test'
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { PensaMissionBlocked } from '../src/components/kids/pensa-mission-blocked'
import { usePensaTeamLibrary } from '../src/components/kids/use-pensa-team-library'
import { pensaStudioProjectId } from '../src/lib/pensa-studio-link'
import {
  PENSA_TEST_ARTIST as ARTIST,
  PENSA_TEST_PROJECT as PLAN,
  PENSA_TEST_PROGRAMMER as PROGRAMMER,
  pensaTestArt,
  pensaTestTeam,
  pensaTestView,
} from './fixtures/pensa'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

function serve(options: { viewer: string; memberCount: number; items: number }) {
  const view = pensaTestView(pensaTestTeam(options.viewer, options.memberCount))
  const calls: string[] = []
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      if (new Headers(init?.headers).get('x-sz-viewer') !== options.viewer)
        return Response.json({ error: { code: 'VIEWER_MISMATCH' } }, { status: 409 })
      if (url.endsWith('/team-art'))
        return Response.json({
          items: Array.from({ length: options.items }, () => pensaTestArt()),
        })
      return Response.json(view)
    }),
    { preconnect: originalFetch.preconnect },
  )
  return calls
}

test('jogo de um plano em equipe, com arte entregue, para quem programa: o adapter chega', async () => {
  serve({ viewer: PROGRAMMER, memberCount: 1, items: 2 })
  const { result } = renderHook(() =>
    usePensaTeamLibrary({ projectId: pensaStudioProjectId(PLAN), viewerId: PROGRAMMER }),
  )
  // O editor abre na hora: no primeiro quadro ainda não há botão.
  expect(result.current).toBeUndefined()
  await waitFor(() => expect(result.current).toBeDefined())
  const list = await result.current?.list()
  expect(list?.map((item) => item.id)).toEqual(
    Array.from({ length: 2 }, () => `${pensaTestArt().missionId}:${pensaTestArt().slot.id}`),
  )
})

test('jogo livre: nem pergunta ao servidor', async () => {
  const calls = serve({ viewer: PROGRAMMER, memberCount: 1, items: 2 })
  const { result } = renderHook(() =>
    usePensaTeamLibrary({ projectId: 'meu-jogo-livre', viewerId: PROGRAMMER }),
  )
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(result.current).toBeUndefined()
  expect(calls).toEqual([])
})

test('switching profiles immediately removes a previously granted team library', async () => {
  serve({ viewer: PROGRAMMER, memberCount: 1, items: 2 })
  const { result, rerender } = renderHook(
    ({ viewerId }) => usePensaTeamLibrary({ projectId: pensaStudioProjectId(PLAN), viewerId }),
    { initialProps: { viewerId: PROGRAMMER } },
  )
  await waitFor(() => expect(result.current).toBeDefined())
  const requests = serve({ viewer: ARTIST, memberCount: 1, items: 2 })
  rerender({ viewerId: ARTIST })
  expect(result.current).toBeUndefined()
  await waitFor(() => expect(requests.length).toBeGreaterThan(0))
  expect(result.current).toBeUndefined()
})

test('plano solo, quem só desenha, ou nenhuma arte entregue: sem botão', async () => {
  for (const scenario of [
    { viewer: PROGRAMMER, memberCount: 0, items: 2 },
    { viewer: ARTIST, memberCount: 1, items: 2 },
    { viewer: PROGRAMMER, memberCount: 1, items: 0 },
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
