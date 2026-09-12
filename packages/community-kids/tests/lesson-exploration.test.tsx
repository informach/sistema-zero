import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import {
  EXPLORATION_DEFINITIONS,
  type ExplorationMission,
  type InteractiveBlock,
  initialExploration,
  type LearningBlockProgress,
  transitionExploration,
} from '@sistemazero/core/learning'
import { ExplorationStage } from '@sistemazero/member-shell/components/exploration-stage'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import { LearningExploration } from '@sistemazero/member-shell/components/learning-exploration'
import { LessonPlayerProvider } from '@sistemazero/member-shell/components/lesson-player-context'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

afterEach(cleanup)
function content(mission: ExplorationMission): InteractiveBlock {
  const d = EXPLORATION_DEFINITIONS[mission]
  return {
    kind: 'interactive',
    title: d.title,
    instructions: d.instruction,
    hints: [...d.hints],
    required: false,
    activity: { type: 'exploration', version: 2, mission },
  }
}
function block(mission: ExplorationMission) {
  return {
    id: 'discovery',
    blockRevision: 'revision',
    kind: 'interactive',
    sortOrder: 0,
    content: content(mission),
  }
}
describe('direct child exploration', () => {
  test('curated hints shown without authored hints are included in progress evidence', () => {
    let recordedHints = 0
    render(
      <LearningExploration
        activity={{ type: 'exploration', version: 2, mission: 'layers' }}
        answers={{}}
        hints={[]}
        onChange={(_, hintsUsed) => {
          recordedHints = hintsUsed
        }}
        onEvidence={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Quero uma pista' }))
    expect(recordedHints).toBe(1)
  })
  test('a cactus that leaves the speed scene is reported outside instead of stuck at the edge', () => {
    const activity = { type: 'exploration', version: 2, mission: 'random' } as const
    const spawned = transitionExploration(activity, initialExploration(activity), {
      type: 'sample',
      kind: 'position',
      unit: 0,
      guided: true,
    })
    const state = transitionExploration(activity, spawned, { type: 'advance', seconds: 4 })
    expect(state.cacti[0]?.x).toBe(-100)
    render(<ExplorationStage activity={activity} state={state} dispatch={() => {}} paused />)
    expect(screen.getByText('1 cacto fora da pista')).toBeTruthy()
    expect(screen.queryByLabelText('Cacto 1, velocidade -5')).toBeNull()
  })
  test('layer click destinations show immediate comparison and can undo without a playback button', async () => {
    render(<InteractiveLessonBlock block={block('layers')} previewContent={content('layers')} />)
    expect(screen.queryByRole('button', { name: 'Testar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Depois' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
    expect(screen.getByText('Olhe o que mudou')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2')
  })
  test('contact is recognized by position and area buttons; changing area never requires play', async () => {
    render(<InteractiveLessonBlock block={block('hitbox')} previewContent={content('hitbox')} />)
    fireEvent.click(screen.getByRole('button', { name: 'Perto' }))
    fireEvent.click(screen.getByRole('button', { name: 'No meio' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Área maior' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Área maior' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('3'))
    expect(screen.queryByRole('button', { name: 'Ver movimento' })).toBeNull()
  })
  test('connection has a two-tap alternative and the world keeps the same object', async () => {
    render(<InteractiveLessonBlock block={block('world')} previewContent={content('world')} />)
    fireEvent.click(screen.getByRole('button', { name: '＋ Criar Dino' }))
    fireEvent.click(screen.getByRole('button', { name: '◉ Desenhar' }))
    expect(screen.getByText('Agora toque em Tela do jogo para ligar.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '◎ Tela do jogo' }))
    await waitFor(() => expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('2'))
    expect(screen.getByText('Bastidores · 1 Dino guardado')).toBeTruthy()
  })
  test('a pending attempt does not disable manipulation or erase a newer local draft', async () => {
    const fetchMock = spyOn(globalThis, 'fetch')
    let finish: ((response: Response) => void) | undefined
    const submitted: LearningBlockProgress[] = []
    fetchMock.mockImplementation(
      Object.assign(
        async (input: RequestInfo | URL) => {
          const url = String(input)
          if (url.endsWith('/learning-attempts'))
            return new Promise<Response>((resolve) => {
              finish = resolve
            })
          return Response.json({
            blockId: 'discovery',
            revision: 'revision',
            answers: {},
            hintsUsed: 0,
            positionSeconds: null,
            attemptsCount: 0,
            result: null,
            updatedAt: new Date().toISOString(),
          })
        },
        { preconnect: globalThis.fetch.preconnect },
      ),
    )
    try {
      render(
        <LessonPlayerProvider
          value={{
            lessonId: 'lesson',
            courseSlug: 'course',
            viewerId: 'child-v5',
            viewerWatermark: null,
            initialPositionSeconds: null,
            onLearningProgress: (p) => submitted.push(p),
          }}
        >
          <InteractiveLessonBlock block={block('layers')} />
        </LessonPlayerProvider>,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Depois' }))
      await waitFor(() => expect(finish).toBeDefined())
      expect(screen.getByRole('button', { name: 'Antes' })).toHaveProperty('disabled', false)
      fireEvent.click(screen.getByRole('button', { name: 'Antes' }))
      const key = 'sz:learning:child-v5:lesson:discovery:revision'
      const changed = localStorage.getItem(key)
      await act(async () =>
        finish?.(
          Response.json({
            attempt: {
              result: {
                participated: true,
                passed: true,
                feedback: 'Descoberta confirmada.',
                verifiedBy: 'client',
              },
            },
            progress: {
              blockId: 'discovery',
              revision: 'revision',
              answers: {},
              hintsUsed: 0,
              positionSeconds: null,
              attemptsCount: 1,
              result: { passed: true },
              updatedAt: new Date().toISOString(),
            },
          }),
        ),
      )
      expect(localStorage.getItem(key)).toBe(changed)
      expect(submitted.some((p) => p.result?.passed)).toBe(true)
    } finally {
      cleanup()
      fetchMock.mockRestore()
      localStorage.clear()
    }
  })
})
