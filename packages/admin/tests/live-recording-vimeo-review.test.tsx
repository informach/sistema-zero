import { afterEach, describe, expect, jest, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LiveOccurrence, LiveRoomView } from '@sistemazero/core/live'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LiveRecordingReview, pickRecordingVimeo, recordingItems, vimeoPollDelay, vimeoStepView } =
  await import('@sistemazero/member-shell/components/live/live-recording-review')

const EMBED = 'https://player.vimeo.com/video/987654?h=abc'

function room(occurrenceId: string, recording: Partial<LiveOccurrence['recording']>): LiveRoomView {
  return {
    session: {
      id: 's1',
      cohortId: 'c1',
      order: 0,
      title: 'Encontro 1',
      startsAt: '2026-10-14T18:00:00Z',
      endsAt: '2026-10-14T19:30:00Z',
      accessEndsAt: '2026-11-13T18:00:00Z',
      occurrenceId,
    },
    cohort: {
      id: 'c1',
      programId: '',
      courseId: 'curso',
      title: 'Turma',
      timeZone: 'America/Sao_Paulo',
      capacity: 8,
      accessDays: 30,
      teacherIds: ['t1'],
      status: 'open',
      createdAt: '2026-10-01T00:00:00Z',
    },
    access: {
      startsAt: '2026-10-14T18:00:00Z',
      endsAt: '2026-11-13T18:00:00Z',
      status: 'available',
      canOpen: true,
      canJoinMedia: true,
      canWatchRecording: true,
    },
    occurrence: {
      id: occurrenceId,
      sessionId: 's1',
      startsAt: '2026-10-14T18:00:00Z',
      endsAt: '2026-10-14T19:30:00Z',
      hardEndsAt: '2026-10-14T19:30:00Z',
      state: 'ended',
      version: 9,
      speakingMode: 'turns',
      chatEnabled: true,
      teachers: { t1: 'Ana' },
      participants: [],
      messages: [],
      recording: {
        state: 'ready',
        published: false,
        version: 3,
        storageKey: null,
        ...recording,
      },
    },
    recordings: [],
    role: 'teacher',
    actorId: 't1',
    supervision: 'present',
    serverTime: '2026-10-14T20:00:00Z',
    mediaReady: true,
  }
}

let cleanup: (() => void) | null = null
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup?.()
  cleanup = null
  globalThis.fetch = originalFetch
  jest.useRealTimers()
})

async function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  cleanup = () => {
    act(() => root.unmount())
    container.remove()
  }
  return { container, root }
}
const settle = async () => {
  for (let i = 0; i < 6; i++) await act(async () => new Promise((r) => setTimeout(r, 0)))
}
const button = (scope: ParentNode, label: string) => {
  const found = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (node) => node.textContent?.trim() === label,
  )
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}

function server(vimeo: (method: string) => Response) {
  const calls: { method: string; path: string }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    const method = init?.method ?? 'GET'
    calls.push({ method, path })
    if (path.includes('/recording/publish')) return Response.json({})
    if (path.includes('/recording/vimeo')) return vimeo(method)
    // O replay da prévia não importa aqui.
    return Response.json({ error: { code: 'NOT_FOUND', message: 'sem replay' } }, { status: 404 })
  }) as typeof fetch
  return calls
}

describe('gravação publicada → Vimeo', () => {
  test('cada estado diz o próximo passo', () => {
    expect(vimeoStepView(null, false)).toMatchObject({
      key: 'not-sent',
      action: 'Enviar ao Vimeo',
    })
    expect(vimeoStepView(null, true).key).toBe('sending')
    expect(
      vimeoStepView({ videoId: '1', embedUrl: EMBED, status: 'processing' }, false),
    ).toMatchObject({
      key: 'processing',
      action: null,
    })
    expect(vimeoStepView({ videoId: '1', embedUrl: EMBED, status: 'ready' }, false).key).toBe(
      'ready',
    )
    expect(vimeoStepView({ videoId: '1', embedUrl: EMBED, status: 'failed' }, false)).toMatchObject(
      {
        key: 'failed',
        action: 'Enviar ao Vimeo de novo',
      },
    )
    expect(vimeoPollDelay(0)).toBe(5_000)
    expect(vimeoPollDelay(30)).toBe(15_000)
    const items = recordingItems(
      room('o0', { published: true, vimeo: { videoId: '1', embedUrl: EMBED, status: 'ready' } }),
    )
    expect(items[0]?.recording.vimeo?.status).toBe('ready')
  })

  test('o envio desta página vale até o servidor ecoar, nunca um vídeo que falhou e foi refeito', () => {
    const failed = { videoId: '1', embedUrl: EMBED, status: 'failed' as const }
    const retried = { videoId: '2', embedUrl: EMBED, status: 'processing' as const }
    const ready = { videoId: '1', embedUrl: EMBED, status: 'ready' as const }
    expect(pickRecordingVimeo(null, retried)).toEqual(retried)
    expect(pickRecordingVimeo(failed, retried)).toEqual(retried)
    expect(pickRecordingVimeo(failed, null)).toEqual(failed)
    expect(pickRecordingVimeo(ready, { ...ready, status: 'processing' })).toEqual(ready)
    expect(pickRecordingVimeo(undefined, undefined)).toBeNull()
  })

  test('publicar a gravação revisada já manda ao Vimeo, sem um segundo vídeo depois', async () => {
    const calls = server(() =>
      Response.json({ videoId: '987654', embedUrl: EMBED, status: 'processing' }),
    )
    let updates = 0
    const { container, root } = await mount(
      <LiveRecordingReview room={room('o1', {})} onUpdated={() => updates++} />,
    )
    await settle()
    const box = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    await act(async () => box.click())
    await act(async () => button(container, 'Publicar gravação para a turma').click())
    await settle()
    expect(calls.filter((call) => call.method === 'POST').map((call) => call.path)).toEqual([
      '/api/admin/live/sessions/s1/recording/publish',
      '/api/admin/live/occurrences/o1/recording/vimeo',
    ])
    expect(updates).toBe(1)
    // A sala recarrega publicada, mas o servidor ainda não ecoou o vídeo: a tela lembra do envio
    // e não oferece mandar de novo.
    await act(async () =>
      root.render(
        <LiveRecordingReview
          room={room('o1', { published: true, version: 4 })}
          onUpdated={() => {}}
        />,
      ),
    )
    expect(container.querySelector('[data-vimeo-step]')?.getAttribute('data-vimeo-step')).toBe(
      'processing',
    )
    expect(container.textContent).not.toContain('Enviar ao Vimeo')
  })

  test('o Vimeo fora do ar não desfaz a publicação: recado e "Enviar ao Vimeo"', async () => {
    let fail = true
    const calls = server(() =>
      fail
        ? Response.json(
            {
              error: {
                code: 'MEDIA_NOT_CONFIGURED',
                message: 'Envio ao Vimeo indisponível agora.',
              },
            },
            { status: 503 },
          )
        : Response.json({ videoId: '987654', embedUrl: EMBED, status: 'processing' }),
    )
    const { container, root } = await mount(
      <LiveRecordingReview room={room('o2', {})} onUpdated={() => {}} />,
    )
    await settle()
    await act(async () =>
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
    )
    await act(async () => button(container, 'Publicar gravação para a turma').click())
    await settle()
    await act(async () =>
      root.render(
        <LiveRecordingReview
          room={room('o2', { published: true, version: 4 })}
          onUpdated={() => {}}
        />,
      ),
    )
    expect(container.querySelector('[data-vimeo-step] [role="alert"]')?.textContent).toBe(
      'Envio ao Vimeo indisponível agora.',
    )
    fail = false
    await act(async () => button(container, 'Enviar ao Vimeo').click())
    await settle()
    expect(calls.filter((call) => call.path.endsWith('/recording/vimeo'))).toHaveLength(2)
    expect(container.querySelector('[data-vimeo-step]')?.getAttribute('data-vimeo-step')).toBe(
      'processing',
    )
  })

  test('acompanha o processamento e avisa a sala quando fica pronto', async () => {
    jest.useFakeTimers()
    const calls = server(() =>
      Response.json({ videoId: '987654', embedUrl: EMBED, status: 'ready' }),
    )
    let updates = 0
    const { container } = await mount(
      <LiveRecordingReview
        room={room('o3', {
          published: true,
          vimeo: { videoId: '987654', embedUrl: EMBED, status: 'processing' },
        })}
        onUpdated={() => updates++}
      />,
    )
    expect(container.querySelector('[data-vimeo-step]')?.getAttribute('data-vimeo-step')).toBe(
      'processing',
    )
    expect(calls.some((call) => call.path.includes('?videoId='))).toBe(false)
    for (let i = 0; i < 8; i++)
      await act(async () => {
        jest.advanceTimersByTime(vimeoPollDelay(0))
        await Promise.resolve()
      })
    expect(calls).toContainEqual({
      method: 'GET',
      path: '/api/admin/live/occurrences/o3/recording/vimeo?videoId=987654',
    })
    expect(container.querySelector('[data-vimeo-step]')?.getAttribute('data-vimeo-step')).toBe(
      'ready',
    )
    expect(updates).toBe(1)
  })
})
