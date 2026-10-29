import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isLearningManifest } from '@sistemazero/core/learning'
import {
  caminhoAula,
  listarArquivosAulas,
} from '../../../../../docs/aulas-interativas-tecnico/qa/caminhos'
import { sanitizeProjectForHost } from '../../state/projectValidation'

/**
 * O Jogo 3D é a extensão da Ilha do Farol inteira e da aula 2 do Jardim Secreto e dos Poderes do
 * Faísca (todos fazem o jogo em 2D na aula 1 e o levam para o 3D na aula 2); o resto ensina o Jogo 2D.
 */
function extensaoEnsinada(courseSlug: string, lessonSlug: string): 'game-2d' | 'game-3d' {
  if (courseSlug === 'jornada-faisca-base-3d') return 'game-3d'
  if (
    (courseSlug === 'jornada-faisca-missao' || courseSlug.startsWith('jornada-faisca-poder-')) &&
    lessonSlug === 'aula-2'
  )
    return 'game-3d'
  return 'game-2d'
}

test('lesson Studio projects retain their initial blocks and the extension taught by the course', () => {
  let checked = 0
  const checked3d: string[] = []
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
      const extensionId = extensaoEnsinada(source.courseSlug, source.lessonSlug)
      expect(
        project?.installedExtensions.some((extension) => extension.id === extensionId),
        file,
      ).toBe(true)
      expect(project?.blocksState, file).toEqual(initial.blocksState)
      checked += 1
      if (extensionId === 'game-3d') checked3d.push(file)
    }
  }
  expect(checked).toBeGreaterThan(20)
  expect(checked3d.sort()).toEqual([
    'aula-2.manifesto.json',
    'cabana-aula-2.manifesto.json',
    'ilha-aula-1.manifesto.json',
    'ilha-aula-2.manifesto.json',
    'ilha-aula-3.manifesto.json',
    'moedas-aula-2.manifesto.json',
    'ponte-aula-2.manifesto.json',
  ])
})
