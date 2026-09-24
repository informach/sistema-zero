import { describe, expect, test } from 'bun:test'
import { openScene, stepScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { LessonSceneControls } from '../src/components/scene-lesson-controls'
import { TouchResponseStage } from '../src/components/scene-touch-response'

describe('palco O toque faz o jogo responder', () => {
  test('o esconderijo é tocável; ligar o controle sozinho não revela o personagem', () => {
    const start = { scene: 'touch-response' } as const
    const initial = openScene(start)
    const stage = renderToStaticMarkup(<TouchResponseStage state={initial} dispatch={() => {}} />)
    expect(stage).toContain('Tocar no arbusto')
    expect(stage).toContain('O personagem está escondido')
    const connected = stepScene(start, initial, { type: 'connect', port: 'touch', enabled: true })
    expect(renderToStaticMarkup(<TouchResponseStage state={connected} />)).toContain(
      'O personagem está escondido',
    )
    const controls = renderToStaticMarkup(
      <LessonSceneControls
        scene="touch-response"
        state={connected}
        dispatch={() => {}}
        goals={[]}
        onRunning={() => {}}
      />,
    )
    expect(controls).toContain('Desligar a reação ao toque')
  })

  test('depois do toque, o personagem aparece e pode-se voltar ao começo', () => {
    const start = { scene: 'touch-response' } as const
    const state = stepScene(
      start,
      stepScene(start, openScene(start), {
        type: 'connect',
        port: 'touch',
        enabled: true,
      }),
      { type: 'start', input: 'tap' },
    )
    expect(
      renderToStaticMarkup(<TouchResponseStage state={state} dispatch={() => {}} />),
    ).toContain('O personagem apareceu')
    expect(
      renderToStaticMarkup(
        <LessonSceneControls
          scene="touch-response"
          state={state}
          dispatch={() => {}}
          goals={[]}
          onRunning={() => {}}
        />,
      ),
    ).toContain('Voltar ao começo')
  })
})
