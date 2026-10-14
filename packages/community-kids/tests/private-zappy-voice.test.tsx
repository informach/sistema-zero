import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { PrivateZappyVoice } from '@sistemazero/member-shell/components/private-zappy-voice'
import {
  registerLessonMedia,
  requestLessonMediaFocus,
} from '@sistemazero/member-shell/lib/lesson-media-focus'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const originalFetch = globalThis.fetch
const originalAudio = globalThis.Audio
const audios: TestAudio[] = []
class TestAudio {
  src = ''
  paused = true
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor() {
    audios.push(this)
  }
  play() {
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
  removeAttribute() {
    this.src = ''
  }
}
const reference = { origin: 'pensa_guide' as const, taskId: 'task', revision: 1, stepId: 'first' }
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
  globalThis.Audio = originalAudio
  audios.length = 0
})

test('voz é opcional, interrompe outro áudio e para ao trocar o perfil', async () => {
  globalThis.Audio = TestAudio as unknown as typeof Audio
  const request = mock(async () =>
    Response.json({ url: 'https://private.invalid/short-lived.mp3' }),
  )
  globalThis.fetch = Object.assign(request, { preconnect: originalFetch.preconnect })
  const paused = mock(),
    other = Symbol('lesson'),
    unregister = registerLessonMedia(other, paused)
  await requestLessonMediaFocus(other)
  const rendered = render(<PrivateZappyVoice viewerId="a" reference={reference} />)
  expect(request).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Ouvir na voz do Zappy' }))
  await waitFor(() => expect(audios[0]?.paused).toBe(false))
  expect(paused).toHaveBeenCalled()
  rendered.rerender(<PrivateZappyVoice viewerId="b" reference={reference} />)
  expect(audios[0]?.paused).toBe(true)
  expect(request).toHaveBeenCalledTimes(1)
  unregister()
})

test('cancelamento ignora resposta atrasada sem tocar áudio', async () => {
  globalThis.Audio = TestAudio as unknown as typeof Audio
  let deliver!: (response: Response) => void
  globalThis.fetch = Object.assign(
    mock(
      () =>
        new Promise<Response>((resolve) => {
          deliver = resolve
        }),
    ),
    { preconnect: originalFetch.preconnect },
  )
  render(<PrivateZappyVoice viewerId="a" reference={reference} />)
  fireEvent.click(screen.getByRole('button', { name: 'Ouvir na voz do Zappy' }))
  await waitFor(() => expect(deliver).toBeDefined())
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar a preparação da voz' }))
  await act(async () => {
    deliver(Response.json({ url: 'https://private.invalid/late.mp3' }))
    await Promise.resolve()
  })
  expect(audios[0]?.paused).toBe(true)
  expect(audios[0]?.src).toBe('')
})

test('cancelar enquanto play está pendente não volta a mostrar voz em reprodução', async () => {
  globalThis.Audio = TestAudio as unknown as typeof Audio
  globalThis.fetch = Object.assign(
    mock(async () => Response.json({ url: 'https://private.invalid/voice.mp3' })),
    { preconnect: originalFetch.preconnect },
  )
  let played!: () => void
  const play = spyOn(TestAudio.prototype, 'play').mockImplementation(function (this: TestAudio) {
    this.paused = false
    return new Promise<void>((resolve) => {
      played = resolve
    })
  })
  try {
    render(<PrivateZappyVoice viewerId="a" reference={reference} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir na voz do Zappy' }))
    await waitFor(() => expect(played).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar a preparação da voz' }))
    await act(async () => {
      played()
      await Promise.resolve()
    })
    expect(audios[0]?.paused).toBe(true)
    expect(Boolean(screen.queryByRole('button', { name: 'Ouvir na voz do Zappy' }))).toBe(true)
  } finally {
    play.mockRestore()
  }
})
