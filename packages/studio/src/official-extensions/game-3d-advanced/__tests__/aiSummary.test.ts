import { expect, test } from 'bun:test'
import { formatExtensionPromptContext } from '../../../extensions/aiContext'
import { loadExtensionDocs } from '../../../extensions/documentation'
import { worldThreeDExtension } from '../../world-3d'
import { world3DDocs } from '../../world-3d/docs'
import { gameKit3DPromptContext } from '../ai'
import { gameKit3DDocs } from '../docs'
import { gameKit3DExtension } from '../index'

test('o contexto operacional mantém a receita e carrega o manual completo pelo provider existente', async () => {
  const contexto = formatExtensionPromptContext([gameKit3DExtension])
  for (const regra of [
    'runProject',
    'loadScene',
    'sceneStart',
    'geração',
    'makeTrigger',
    'onAnimEnd',
  ])
    expect(contexto).toContain(regra)
  expect(contexto.length).toBeLessThan(6_000)
  expect(gameKit3DExtension.ai?.promptContext).toBeUndefined()
  expect(await gameKit3DExtension.ai?.loadPromptContext?.()).toBe(gameKit3DPromptContext)
  expect(await loadExtensionDocs(gameKit3DExtension)).toBe(gameKit3DDocs)
  expect(gameKit3DDocs.length).toBeGreaterThan(15_000)
  expect(await loadExtensionDocs(worldThreeDExtension)).toBe(world3DDocs)
})
