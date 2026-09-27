import { describe, expect, test } from 'bun:test'
import {
  openScene,
  RANDOM_PRESETS,
  SPAWN_PRESETS,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { DinoSceneControls } from '../src/components/scene-dino-controls'
import { DinoNumbersControls } from '../src/components/scene-dino-numbers-controls'
import { RandomStage } from '../src/components/scene-dino-numbers-stages'
import { SpawnStage } from '../src/components/scene-dino-stages'

const cast = {
  hero: { name: 'nave', gender: 'f' as const },
  obstacle: { name: 'asteroide', gender: 'm' as const },
}

describe('os casos do Desafio no visual da plataforma', () => {
  test('random mostra a régua superior e deixa a velocidade sorteada fora da bancada', () => {
    const preset = RANDOM_PRESETS['pedra-acima']
    const start = { scene: 'random' as const, setup: { preset } }
    let state = openScene(start)
    state = stepScene(start, state, { type: 'sample', kind: 'position', unit: 0.3, guided: false })
    const stage = renderToStaticMarkup(<RandomStage state={state} cast={cast} preset={preset} />)
    expect(stage).toContain('A régua acima da tela')
    expect(stage).toContain('borda de cima')
    expect(stage).not.toContain('raias da corrida')
    const controls = renderToStaticMarkup(
      <DinoNumbersControls
        scene="random"
        state={state}
        cast={cast}
        preset={preset}
        goals={[]}
        onRunning={() => {}}
        dispatch={() => {}}
      />,
    )
    expect(controls).toContain('Sortear lugar na régua de cima')
    expect(controls).not.toContain('Sortear velocidade')
  })

  test('spawn usa o bloco A cada quadros, com a pedra caindo à mesma velocidade', () => {
    const preset = SPAWN_PRESETS['pedra-quadros']
    const activity = {
      type: 'experimentation' as const,
      scene: 'spawn' as const,
      setup: { preset },
      cast,
    }
    const start = { scene: 'spawn' as const, setup: { preset } }
    let state = openScene(start)
    state = stepScene(start, state, { type: 'connect', port: 'timer', enabled: true })
    const controls = renderToStaticMarkup(
      <DinoSceneControls activity={activity} state={state} dispatch={() => {}} more={false} />,
    )
    expect(controls).toContain('A cada quadros: 40')
    expect(controls).toContain('20 quadros')
    expect(controls).toContain('80 quadros')
    const stage = renderToStaticMarkup(<SpawnStage state={state} cast={cast} preset={preset} />)
    expect(stage).toContain('vy = 3')
    expect(stage).toContain('borda de cima')
  })
})
