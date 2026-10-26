import { describe, expect, test } from 'bun:test'
import { publicInteractiveBlock } from '@sistemazero/core/learning'
import { renderToStaticMarkup } from 'react-dom/server'
import { DialogueBlockView } from '../src/components/dialogue-block'
import { LessonBlocks } from '../src/components/lesson-blocks'
import { LessonPlayerProvider } from '../src/components/lesson-player-context'
import { LessonSectionProvider } from '../src/components/lesson-section-context'
import { SceneActivityView } from '../src/components/scene-activity'
import type { LessonBlockView } from '../src/lib/types'

describe('personagem do diálogo da aula', () => {
  test('usa a pose definida e mantém o texto legível com um único personagem', () => {
    const block = {
      id: 'dialogue',
      kind: 'dialogue',
      sortOrder: 0,
      content: { kind: 'dialogue', text: 'Vamos explorar!', pose: 'thinking' },
    } as LessonBlockView
    const html = renderToStaticMarkup(
      <LessonPlayerProvider
        value={{
          lessonId: 'lesson',
          courseSlug: 'course',
          viewerId: null,
          viewerWatermark: null,
          initialPositionSeconds: null,
          dialogueMascot: (pose) => <span data-mascot={pose} aria-hidden="true" />,
        }}
      >
        <LessonBlocks blocks={[block]} />
      </LessonPlayerProvider>,
    )
    expect(html).toContain('Vamos explorar!')
    expect(html.match(/data-mascot=/g)).toHaveLength(1)
    expect(html).toContain('data-mascot="thinking"')
  })

  test('uma instrução narrada mantém o botão e a legenda com ou sem personagem', () => {
    for (const mascot of [undefined, <span key="zappy" data-mascot aria-hidden="true" />]) {
      const html = renderToStaticMarkup(
        <DialogueBlockView
          content={{ kind: 'dialogue', text: 'Observe a experiência.' }}
          mascot={mascot}
          speech={{
            texts: ['Observe a experiência.'],
            audioUrl: '/fala.mp3',
            fallbackToBrowser: true,
          }}
        />,
      )
      expect(html).toContain('Observe a experiência.')
      expect(html).toContain('Ouvir')
      expect(html).toContain('src="/fala.mp3"')
      expect(html.match(/data-mascot/g)?.length ?? 0).toBe(mascot ? 1 : 0)
    }
  })

  test('na experiência, não repete o personagem quando a parte já tem um diálogo', () => {
    const activity = {
      type: 'experimentation',
      scene: 'axis-z',
      instructionAudioUrl: '/instrucao.mp3',
    } as const
    const content = publicInteractiveBlock({
      kind: 'interactive',
      required: true,
      semPerguntaFinal: true,
      title: 'Descoberta',
      instructions: 'Encontre os personagens.',
      hints: [],
      activity,
    })
    for (const temDialogo of [false, true]) {
      const html = renderToStaticMarkup(
        <LessonPlayerProvider
          value={{
            lessonId: 'lesson',
            courseSlug: 'course',
            viewerId: null,
            viewerWatermark: null,
            initialPositionSeconds: null,
            dialogueMascot: () => <span data-mascot aria-hidden="true" />,
          }}
        >
          <LessonSectionProvider value={{ titulo: 'Parte', temDialogo }}>
            <SceneActivityView
              block={{ id: 'experiencia', kind: 'interactive', sortOrder: 0, content }}
              content={content}
              activity={activity}
            />
          </LessonSectionProvider>
        </LessonPlayerProvider>,
      )
      expect(html).toContain('Encontre os personagens.')
      expect(html).toContain('Ouvir')
      expect(html).toContain('src="/instrucao.mp3"')
      expect(html.match(/data-mascot/g)?.length ?? 0).toBe(temDialogo ? 0 : 1)
    }
  })
})
