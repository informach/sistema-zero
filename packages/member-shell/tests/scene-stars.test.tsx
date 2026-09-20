import { expect, test } from 'bun:test'
import {
  openScene,
  type SceneActivity,
  type SceneCast,
  sceneCenario,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExplorationStage } from '../src/components/exploration-stage'

test('a nave e o fundo estrelado são figuras diferentes na cena de camadas', () => {
  const cast: SceneCast = {
    hero: { name: 'nave', gender: 'f', figure: 'nave' },
    scenery: { name: 'fundo de estrelas', gender: 'm', figure: 'estrelas' },
  }
  const activity: SceneActivity = { type: 'experimentation', scene: 'layers', cast }
  const html = renderToStaticMarkup(
    <ExplorationStage activity={activity} state={openScene({ scene: 'layers' })} />,
  )
  expect(sceneCenario(cast, 'layers')).toBe('nave')
  expect(html).toContain('data-figure="nave"')
  expect(html).toContain('data-figure="estrelas"')
  expect(html).not.toContain('data-figure="tiro"')
  expect(html).toContain('data-fundo="nave"')
})

test('o cenário escolhido pela aula chega ao palco mesmo com outro elenco', () => {
  const activity: SceneActivity = {
    type: 'experimentation',
    scene: 'layers',
    cenario: 'nave',
    cast: { hero: { name: 'Dino', gender: 'm', figure: 'dino' } },
  }
  const html = renderToStaticMarkup(
    <ExplorationStage activity={activity} state={openScene({ scene: 'layers' })} />,
  )
  expect(html).toContain('data-mundo="nave"')
  expect(html).toContain('data-fundo="nave"')
})
