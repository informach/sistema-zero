import { expect, test } from 'bun:test'
import { CLEANUP_PRESETS, openScene } from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { CleanupStage } from '../src/components/scene-dino-stages'

test('a mesma limpeza desenha saída e elenco dos dois jogos', () => {
  const space = renderToStaticMarkup(
    <CleanupStage
      state={openScene({ scene: 'cleanup', setup: { preset: CLEANUP_PRESETS['tiro-cima'] } })}
      cast={{ obstacle: { name: 'tiro', gender: 'm', figure: 'tiro' } }}
      cenario="nave"
      preset={CLEANUP_PRESETS['tiro-cima']}
    />,
  )
  expect(space).toContain('↑ saída')
  expect(space).toContain('3 tiros na tela')
  expect(space).toContain('borda de cima')
  expect(space).not.toContain('cactos')

  const dino = renderToStaticMarkup(
    <CleanupStage
      state={openScene({ scene: 'cleanup', setup: { preset: CLEANUP_PRESETS['cacto-esquerda'] } })}
      cast={{ obstacle: { name: 'cacto', gender: 'm', figure: 'cacto' } }}
      cenario="corre-dino"
      preset={CLEANUP_PRESETS['cacto-esquerda']}
    />,
  )
  expect(dino).toContain('← saída')
  expect(dino).toContain('chegando')
  expect(dino).toContain('3 cactos na tela')
})
