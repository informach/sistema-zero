import { afterEach, describe, expect, test } from 'bun:test'
import { LessonVideoGate } from '@sistemazero/member-shell/components/lesson-video-gate'
import {
  registerLessonMedia,
  requestLessonMediaFocus,
} from '@sistemazero/member-shell/lib/lesson-media-focus'
import { KIDS_VIDEO_GATE_COPY } from '@sistemazero/member-shell/lib/video-gate-copy'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import voice from '../src/lib/zappy-video-gate-voice.json'

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
  load() {}
  removeAttribute() {
    this.src = ''
  }
}

afterEach(() => {
  cleanup()
  globalThis.Audio = originalAudio
  audios.length = 0
})

function Gate({ sectionId = 'parte-1', locked = true }: { sectionId?: string; locked?: boolean }) {
  return (
    <LessonVideoGate
      gate={{ locked, videoBlockId: 'video', watchedFraction: 0 }}
      sectionId={sectionId}
      kids
      audioUrl={voice.url}
      onWatch={() => {}}
    >
      <button type="button">Jogar</button>
    </LessonVideoGate>
  )
}

describe('voz na orientação para assistir ao vídeo', () => {
  test('a gravação corresponde ao texto visível e acompanha o app', async () => {
    expect(voice.text).toBe(`${KIDS_VIDEO_GATE_COPY.title}. ${KIDS_VIDEO_GATE_COPY.text}`)
    const file = Bun.file(new URL(`../public${voice.url}`, import.meta.url))
    expect(await file.exists()).toBe(true)
    expect(file.size).toBeGreaterThan(1000)
  })

  test('só fala ao tocar em Ouvir e participa do foco de mídia da aula', async () => {
    globalThis.Audio = TestAudio as unknown as typeof Audio
    let videoPaused = false
    const video = Symbol('video')
    const unregister = registerLessonMedia(video, () => {
      videoPaused = true
    })
    try {
      render(<Gate />)
      expect(audios).toHaveLength(0)
      fireEvent.click(screen.getByRole('button', { name: 'Ouvir a orientação' }))
      expect(audios[0]?.src).toBe(voice.url)
      expect(audios[0]?.paused).toBe(false)
      expect(videoPaused).toBe(true)
      expect(
        screen.getByRole('button', { name: 'Jogar', hidden: true }).closest('[inert]'),
      ).not.toBeNull()
      await act(async () => {
        await requestLessonMediaFocus(video)
      })
      expect(audios[0]?.paused).toBe(true)
      expect(screen.getByRole('button', { name: 'Ouvir a orientação' })).toBeDefined()
      fireEvent.click(screen.getByRole('button', { name: 'Ouvir a orientação' }))
      fireEvent.click(screen.getByRole('button', { name: 'Parar' }))
      expect(audios[0]?.paused).toBe(true)
    } finally {
      unregister()
    }
  })

  test('trocar de parte ou liberar a atividade interrompe a fala sem remontar o jogo', () => {
    globalThis.Audio = TestAudio as unknown as typeof Audio
    const view = render(<Gate />)
    const game = screen.getByRole('button', { name: 'Jogar', hidden: true })
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir a orientação' }))
    view.rerender(<Gate sectionId="parte-2" />)
    expect(audios[0]?.paused).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir a orientação' }))
    expect(audios[1]?.paused).toBe(false)
    view.rerender(<Gate sectionId="parte-2" locked={false} />)
    expect(audios[1]?.paused).toBe(true)
    expect(screen.queryByRole('button', { name: 'Parar' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Jogar' })).toBe(game)
    expect(game.closest('[inert]')).toBeNull()
  })

  test('falha de rede devolve Ouvir e permite tentar a gravação de novo', () => {
    globalThis.Audio = TestAudio as unknown as typeof Audio
    render(<Gate />)
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir a orientação' }))
    act(() => audios[0]?.onerror?.())
    expect(audios[0]?.paused).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir a orientação' }))
    expect(audios[0]?.src).toBe(voice.url)
    expect(audios[0]?.paused).toBe(false)
    act(() => audios[0]?.onended?.())
    expect(screen.getByRole('button', { name: 'Ouvir a orientação' })).toBeDefined()
  })
})
