import { expect, test } from 'bun:test'
import { GAME_STATE_PRESETS, openScene, type SceneActivity } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExplorationStage } from '../src/components/exploration-stage'
import { DinoSceneControls } from '../src/components/scene-dino-controls'

test('o caso do Desafio mostra pedra, nave e relógio de 40 quadros', () => {
  const activity: SceneActivity = {
    type: 'experimentation',
    scene: 'game-state',
    cast: {
      hero: { name: 'nave', gender: 'f', figure: 'nave' },
      obstacle: { name: 'pedra', gender: 'f', figure: 'asteroide' },
    },
    cenario: 'nave',
    setup: { preset: GAME_STATE_PRESETS['pedra-40-quadros'] },
  }
  const state = openScene({ scene: activity.scene, setup: activity.setup })
  const stage = renderToStaticMarkup(<ExplorationStage activity={activity} state={state} />)
  const controls = renderToStaticMarkup(
    <DinoSceneControls activity={activity} state={state} dispatch={() => {}} more={false} />,
  )
  expect(stage).toContain('data-mundo="nave"')
  expect(stage).toContain('data-figure="nave"')
  expect(stage).toContain('pedras criadas')
  expect(stage).not.toContain('cactos criados')
  expect(controls).toContain('a cada 40 quadros')
  expect(controls).toContain('Criar pedra')
})
