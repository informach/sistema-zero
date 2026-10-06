import { expect, test } from 'bun:test'
import {
  LIGHTHOUSE_WALK,
  openScene,
  type SceneAction,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { SceneCenarioProvider } from '../src/components/scene-cenario-context'
import { LighthouseWalkStage } from '../src/components/scene-lighthouse-walk'

const start = { scene: 'lighthouse-walk', cenario: 'nave' } as const
const play = (actions: SceneAction[]) =>
  actions.reduce((state, action) => stepScene(start, state, action), openScene(start))
const frames: SceneAction[] = Array.from({ length: 100 }, () => ({
  type: 'advance',
  seconds: 1 / 30,
}))

test('a experiência reutilizada desenha a nave no espaço e acompanha seu x real', () => {
  const state = play([{ type: 'hold-arrow', held: true }, ...frames.slice(0, 2)])
  const html = renderToStaticMarkup(
    <SceneCenarioProvider cenario="nave">
      <LighthouseWalkStage state={state} />
    </SceneCenarioProvider>,
  )
  // ⚠️ A nave é o sprite do PROJETO, não uma figura do elenco: sem `data-figure` (a varredura do
  // `scene-figures.test.tsx` cobra `SCENE_ROLES['lighthouse-walk']` vazio).
  expect(html).not.toContain('data-figure')
  expect(html).toContain('data-personagem="dentro"')
  expect(html).toContain(`data-x="${state.walk.x}"`)
  expect(html).toContain('A nave está inteira dentro da tela')
  expect(state.walk.trail).toEqual([208, 211, 214])
  expect(html).toContain('data-rastro="3"')
  expect(html).not.toContain('data-fundo="farol"')
})

test('a borda da nave representa saída sem limite e parada inteira com limite', () => {
  const render = (limited: boolean) => {
    const state = play([
      { type: 'keep-on-screen', enabled: limited },
      { type: 'hold-arrow', held: true },
      ...frames,
    ])
    return {
      state,
      html: renderToStaticMarkup(
        <SceneCenarioProvider cenario="nave">
          <LighthouseWalkStage state={state} />
        </SceneCenarioProvider>,
      ),
    }
  }
  expect(render(false).html).toContain('data-personagem="fora"')
  const limited = render(true)
  expect(limited.state.walk.x + LIGHTHOUSE_WALK.hero).toBe(LIGHTHOUSE_WALK.screen)
  expect(limited.html).toContain('data-personagem="dentro"')
})
