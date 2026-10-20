import { expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LearningManifest } from '../../../../packages/core/src/learning'
import { evaluateStudioSectionProject } from '../../../../packages/studio/src/blockly/projectCheckAuthoring'
import { PASTA_CURSOS, PASTA_CURSOS_ADULTO } from '../caminhos'
import { etapasDino } from '../corre-dino-etapas'
import { etapasNave } from '../nave-contra-asteroides-etapas'
import { fixtureBlock, setFixtureLiteral } from '../project-block-test-helpers'

function manifest(audience: 'kids' | 'adulto', course: string, file: string): LearningManifest {
  return JSON.parse(
    readFileSync(
      resolve(audience === 'kids' ? PASTA_CURSOS : PASTA_CURSOS_ADULTO, course, file),
      'utf8',
    ),
  )
}

for (const course of readdirSync(PASTA_CURSOS)) {
  for (const file of readdirSync(resolve(PASTA_CURSOS, course)).filter((name) =>
    name.endsWith('.manifesto.json'),
  )) {
    test(`adulto/${course}/${file}: mantém objetivos, critérios de conclusão e projetos do mesmo jogo`, () => {
      const kids = manifest('kids', course, file)
      const adult = manifest('adulto', course, file)
      expect(adult.courseSlug).toBe(`${kids.courseSlug}-adulto`)
      expect(
        adult.sections.map((section) => [section.key, section.workspaceKey, section.externalTool]),
      ).toEqual(
        kids.sections.map((section) => [section.key, section.workspaceKey, section.externalTool]),
      )
      const semantic = (source: LearningManifest) =>
        source.sections.map((section) => ({
          ...section.completion,
          projectChecks: section.completion?.projectChecks?.map(
            ({ label: _label, hint: _hint, ...check }) => check,
          ),
        }))
      expect(semantic(adult)).toEqual(semantic(kids))
      for (const block of kids.blocks) {
        if (block.content?.kind !== 'studio') continue
        const translated = adult.blocks.find((candidate) => candidate.key === block.key)?.content
        if (translated?.kind !== 'studio') throw new Error('Adult studio missing')
        expect(translated.initialProject).toEqual(block.content.initialProject)
      }
    })
  }
}

test('Nave adulta aceita posição própria no palco e recusa nave fora do mundo', () => {
  const adult = manifest(
    'adulto',
    'nave-contra-asteroides',
    'nave-contra-asteroides-primeira-nave.manifesto.json',
  )
  const checks = adult.sections.find((section) => section.key === 'motor-e-nave')!.completion!
    .projectChecks!
  const project = structuredClone(etapasNave()[1]!)
  const ship = fixtureBlock(project, 'sz_g2d_create_ship')
  setFixtureLiteral(ship, 'X', 300)
  setFixtureLiteral(ship, 'Y', 330)
  setFixtureLiteral(ship, 'W', 60)
  expect(evaluateStudioSectionProject(checks, project).every((row) => row.passed)).toBe(true)
  setFixtureLiteral(ship, 'X', 1_000_000)
  expect(evaluateStudioSectionProject(checks, project).every((row) => row.passed)).toBe(false)
})

test('Dino adulto aplica a faixa da colisão também na entrega, sem exigir o número da montagem', () => {
  const adult = manifest('adulto', 'corre-dino', 'corre-dino-aula-10.manifesto.json')
  const checks = adult.sections.find((section) => section.key === 'entrega')!.completion!
    .projectChecks!
  const project = structuredClone(etapasDino()[10]!)
  const hitbox = fixtureBlock(project, 'sz_g2d_set_hitbox_scale')
  setFixtureLiteral(hitbox, 'PERCENT', 75)
  expect(evaluateStudioSectionProject(checks, project).every((row) => row.passed)).toBe(true)
  setFixtureLiteral(hitbox, 'PERCENT', 86)
  expect(evaluateStudioSectionProject(checks, project).every((row) => row.passed)).toBe(false)
})
