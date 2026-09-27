import { expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '@sistemazero/core/learning'
import { sanitizeProjectForHost } from '../../state/projectValidation'

test('every Studio project declared by the lessons opens with its initial blocks and Jogo 2D extension', () => {
  const root = resolve(import.meta.dir, '../../../../../docs/aulas-interativas/aulas')
  let checked = 0
  for (const file of readdirSync(root).filter((name) => name.endsWith('.manifesto.json'))) {
    const source: unknown = JSON.parse(readFileSync(resolve(root, file), 'utf8'))
    if (!isLearningManifest(source)) throw new Error(`Manifesto inválido: ${file}`)
    for (const block of source.blocks) {
      if (!('content' in block) || block.content.kind !== 'studio') continue
      const initial = block.content.initialProject
      if (!initial || typeof initial !== 'object' || !('blocksState' in initial))
        throw new Error(`Projeto sem blocos: ${file}`)
      const project = sanitizeProjectForHost(initial)
      expect(project, file).not.toBeNull()
      expect(
        project?.installedExtensions.some((extension) => extension.id === 'game-2d'),
        file,
      ).toBe(true)
      expect(project?.blocksState, file).toEqual(initial.blocksState)
      checked += 1
    }
  }
  expect(checked).toBeGreaterThan(20)
})
