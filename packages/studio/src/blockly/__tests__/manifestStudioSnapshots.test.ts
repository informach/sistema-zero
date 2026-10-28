import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isLearningManifest } from '@sistemazero/core/learning'
import {
  caminhoAula,
  listarArquivosAulas,
} from '../../../../../docs/aulas-interativas-tecnico/qa/caminhos'
import { sanitizeProjectForHost } from '../../state/projectValidation'

test('lesson Studio projects retain their initial blocks and the extension taught by the course', () => {
  let checked = 0
  let checked3d = 0
  for (const file of listarArquivosAulas().filter((name) => name.endsWith('.manifesto.json'))) {
    const source: unknown = JSON.parse(readFileSync(caminhoAula(file), 'utf8'))
    if (!isLearningManifest(source)) throw new Error(`Manifesto inválido: ${file}`)
    for (const block of source.blocks) {
      if (!('content' in block) || block.content.kind !== 'studio') continue
      const initial = block.content.initialProject
      if (!initial || typeof initial !== 'object' || !('blocksState' in initial))
        throw new Error(`Projeto sem blocos: ${file}`)
      const project = sanitizeProjectForHost(initial)
      expect(project, file).not.toBeNull()
      const extensionId = source.courseSlug === 'jornada-faisca-base-3d' ? 'game-3d' : 'game-2d'
      expect(
        project?.installedExtensions.some((extension) => extension.id === extensionId),
        file,
      ).toBe(true)
      expect(project?.blocksState, file).toEqual(initial.blocksState)
      checked += 1
      if (extensionId === 'game-3d') checked3d += 1
    }
  }
  expect(checked).toBeGreaterThan(20)
  expect(checked3d).toBe(3)
})
