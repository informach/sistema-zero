import { afterEach, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { liveFixture } from '../../../members/tests/fakes/live-fixture'

// Network/media capture is outside the classroom opening flow exercised here.
mock.module('../../../member-shell/src/components/live/live-media-panel', () => ({
  LiveMediaPanel: () => null,
  Stream: () => null,
  useLiveMedia: () => ({
    local: { microphone: false, camera: false, screen: false },
    remote: [],
    connecting: false,
    toggle: async () => {},
    stop: () => {},
  }),
}))
const { LiveClassroom } = await import('../../../member-shell/src/components/live/live-classroom')
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})

test('teacher opens reception, enters and starts a scheduled room through the UI', async () => {
  const f = await liveFixture()
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).split('?')[0]!
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    try {
      if (path.endsWith('/control'))
        return Response.json(
          await f.live.control(f.teacher, f.session.id, body.expectedVersion, body.command),
        )
      if (path.endsWith('/join'))
        return Response.json(await f.live.join(f.teacher, f.session.id, body))
      if (path.endsWith('/heartbeat'))
        return Response.json(await f.live.heartbeat(f.teacher, f.session.id, body.deviceId))
      return Response.json(await f.live.room(f.teacher, f.session.id))
    } catch (error) {
      return Response.json(
        { error: { code: 'LIVE_CONFLICT', message: (error as Error).message } },
        { status: 409 },
      )
    }
  }) as typeof fetch
  render(createElement(LiveClassroom, { sessionId: f.session.id, teacher: true }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir recepção' })).toBeTruthy())
  expect(screen.queryByRole('button', { name: 'Entrar para conduzir' })).toBeNull()
  await expect(
    f.live.join(f.child, f.session.id, { deviceId: f.deviceId, takeover: false }),
  ).rejects.toThrow()
  fireEvent.click(screen.getByRole('button', { name: 'Abrir recepção' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Entrar para conduzir' })).toBeTruthy(),
  )
  expect((await f.live.room(f.teacher, f.session.id)).occurrence!.state).toBe('lobby')
  fireEvent.click(screen.getByRole('button', { name: 'Entrar para conduzir' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Começar encontro' })).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: 'Começar encontro' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Encerrar encontro' })).toBeTruthy(),
  )
  expect((await f.live.room(f.teacher, f.session.id)).occurrence!.state).toBe('live')
})
