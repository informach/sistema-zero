import { afterEach, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'

let player: any
mock.module('../../../member-shell/src/components/vimeo-player', () => ({
  VimeoPlayer: (props: any) => {
    player = props
    return createElement(
      'button',
      {
        onClick: () => {
          props.onProgress(142.8, 0.5)
          props.onFlush(142.8)
        },
      },
      'Pausar',
    )
  },
}))
const { LiveVimeoReplay } = await import(
  '../../../member-shell/src/components/live/live-vimeo-replay'
)
const original = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = original
  player = null
})
test('Vimeo retoma a posição do MP4, salva na pausa e recupera ao reabrir', async () => {
  let saved = 91
  const writes: any[] = []
  globalThis.fetch = (async (input: any, init: any) => {
    if (init?.method === 'PUT') {
      const body = JSON.parse(init.body)
      writes.push(body)
      saved = body.positionSeconds
    }
    expect(String(input).startsWith('/api/live/sessions/session/replay-progress')).toBe(true)
    return Response.json({ positionSeconds: saved })
  }) as typeof fetch
  const props = {
    sessionId: 'session',
    version: 3,
    vimeoId: '123',
    watermark: null,
    onControls: () => {},
  }
  const view = render(createElement(LiveVimeoReplay, props))
  await waitFor(() => expect(player?.initialPositionSeconds).toBe(91))
  fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
  await waitFor(() => expect(writes).toContainEqual({ version: 3, positionSeconds: 142 }))
  player.onProgress(185, 0.6)
  view.unmount()
  await waitFor(() => expect(writes).toContainEqual({ version: 3, positionSeconds: 185 }))
  player = null
  render(createElement(LiveVimeoReplay, props))
  await waitFor(() => expect(player?.initialPositionSeconds).toBe(185))
})
test('falha ao ler progresso não sobrescreve a posição com zero', async () => {
  const methods: string[] = []
  globalThis.fetch = (async (_input: any, init: any) => {
    methods.push(init?.method ?? 'GET')
    return Response.json({}, { status: 503 })
  }) as typeof fetch
  const view = render(
    createElement(LiveVimeoReplay, {
      sessionId: 's',
      version: 1,
      vimeoId: '123',
      watermark: null,
      onControls: () => {},
    }),
  )
  await waitFor(() => expect(Boolean(screen.queryByRole('alert'))).toBe(true))
  expect(player).toBeFalsy()
  view.unmount()
  expect(methods).toEqual(['GET'])
})
