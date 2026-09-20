import assert from 'node:assert/strict'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '../../../packages/core/src/learning'
import {
  lessonBlockTypes,
  lessonStudioEdition,
  STUDIO_COURSE_EDITION,
} from './jogo-2d-edicao-atual'

const check = process.argv.includes('--check')
function emit(path: string, value: unknown) {
  const source = `${JSON.stringify(value, null, 2)}\n`
  if (check)
    assert.deepEqual(
      JSON.parse(readFileSync(path, 'utf8')),
      value,
      `${path}: execute gerar-blocos-cursos.ts`,
    )
  else writeFileSync(path, source)
}
for (const course of ['corre-dino', 'desafio-primeiro-jogo', 'o-jogo-do-meu-jeito']) {
  const root = resolve(import.meta.dir, `../${course}-v6`)
  const lessons = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^(aula-|dia-|introducao)/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => (a === 'introducao' ? -1 : b === 'introducao' ? 1 : a.localeCompare(b)))
  const all = new Set<string>()
  const previous = new Set<string>()
  const matrix = lessons.map((lesson) => {
    const manifest: unknown = JSON.parse(
      readFileSync(resolve(root, lesson, 'manifesto.json'), 'utf8'),
    )
    if (!isLearningManifest(manifest)) throw new Error(`${course}/${lesson}: manifesto inválido`)
    const blocks = lessonBlockTypes(manifest)
    const introduced = blocks.filter((type) => !previous.has(type))
    for (const type of blocks) {
      all.add(type)
      previous.add(type)
    }
    if (course === 'corre-dino')
      emit(resolve(root, lesson, 'configuracao-estudio.json'), {
        kind: 'studio',
        purpose: 'submission',
        chain: 'corre-dino',
        level: 'iniciante-2d',
        allowedModes: ['blocks'],
        allowLevelReveal: false,
        allowBlocks: blocks,
      })
    const { blocks: catalog, ...edition } = lessonStudioEdition(manifest)
    return { lesson, title: manifest.title, blocks, introduced, ...edition, catalog }
  })
  emit(resolve(root, `blocos-${course}.json`), { blocks: [...all].sort() })
  emit(resolve(root, 'blocos-por-aula.json'), {
    edition: STUDIO_COURSE_EDITION,
    course,
    scope:
      'Uso completo durante a aula, incluindo programa herdado e peças transitórias; não representa apenas concessões novas.',
    prerequisite: course === 'o-jogo-do-meu-jeito' ? 'desafio-primeiro-jogo/dia-5' : null,
    lessons: matrix,
  })
  console.log(`${course}: ${lessons.length} aulas, ${all.size} tipos atuais`)
}
