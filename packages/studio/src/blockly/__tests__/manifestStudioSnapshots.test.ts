import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isLearningManifest } from '@sistemazero/core/learning'
import {
  caminhoAula,
  listarArquivosAulas,
} from '../../../../../docs/aulas-interativas-tecnico/qa/caminhos'
import { sanitizeProjectForHost } from '../../state/projectValidation'

test('every Studio project declared by the lessons opens with its initial blocks and Jogo 2D extension', () => {
  let checked = 0
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
