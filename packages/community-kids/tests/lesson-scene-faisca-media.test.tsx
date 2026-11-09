import { expect, test } from 'bun:test'
import { isInteractiveBlock } from '@sistemazero/core/learning'
import { InteractiveLessonBlock } from '@sistemazero/member-shell/components/learning-activity'
import {
  registerLessonMedia,
  requestLessonMediaFocus,
} from '@sistemazero/member-shell/lib/lesson-media-focus'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import manifest from '../../../docs/aulas-interativas/faisca/poder-a-ponte-apressada/ponte-aula-1.manifesto.json'

test('Ponte: vídeo pausa o relógio; gesto retoma; fala do Zappy não interrompe', async () => {
  const content = manifest.blocks.find((b) => b.key === 'experiencia')?.content
  if (!isInteractiveBlock(content)) throw Error('Manifesto inválido')
  const { container, getByRole } = render(
    <InteractiveLessonBlock
      block={{ id: 'ponte', blockRevision: 'r', kind: 'interactive', sortOrder: 0, content }}
      previewContent={content}
    />,
  )
  const video = Symbol('video-da-aula')
  const fala = Symbol('fala-do-zappy')
  const tirarVideo = registerLessonMedia(video, () => {})
  const tirarFala = registerLessonMedia(fala, () => {}, { tipo: 'fala' })
  const clock = () =>
    Number(container.querySelector('[data-relogio]')?.getAttribute('data-relogio'))
  try {
    fireEvent.click(container.querySelector('.sz-discovery-livre-troca')!)
    const right = container.querySelector('button[aria-label="Andar para a direita"]')!
    fireEvent.pointerDown(right, { pointerId: 1 })
    fireEvent.pointerUp(right, { pointerId: 1 })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1150))
    })
    expect(clock()).toBe(1)
    await act(async () => {
      await requestLessonMediaFocus(video)
    })
    const antes = clock()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1150))
    })
    expect(clock()).toBe(antes)
    await act(async () => {
      fireEvent.click(getByRole('button', { name: 'Continuar partida' }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1150))
    })
    expect(clock()).toBe(antes + 1)
    await act(async () => {
      await requestLessonMediaFocus(fala)
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1150))
    })
    expect(clock()).toBe(antes + 2)
  } finally {
    tirarVideo()
    tirarFala()
    cleanup()
  }
}, 10000)
