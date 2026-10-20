import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isLearningManifest,
  readManifestStudioProjectExamples,
  type SectionJavaScriptProjectCheck,
} from '../../../packages/core/src/learning'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import type { SZIRV2 } from '../../../packages/studio/src/ir/schema'

const pilots = [
  ['cade-todo-mundo', 'cade-todo-mundo-aula-1'],
  ['cade-todo-mundo', 'cade-todo-mundo-aula-2'],
  ['desafio-primeiro-jogo', 'desafio-dia-1'],
  ['desafio-primeiro-jogo', 'desafio-dia-2'],
  ['desafio-primeiro-jogo', 'desafio-dia-3'],
] as const

function readPilot(course: string, lesson: string) {
  const raw: unknown = JSON.parse(
    readFileSync(
      resolve(import.meta.dir, '../../aulas-interativas/kids', course, `${lesson}.manifesto.json`),
      'utf8',
    ),
  )
  if (!isLearningManifest(raw)) throw new Error(`Invalid pilot: ${lesson}`)
  const workspace = raw.blocks.find((block) => block.key === 'projeto')?.content
  if (workspace?.kind !== 'studio') throw new Error(`Missing Studio: ${lesson}`)
  const read = readManifestStudioProjectExamples(workspace.projectExamples)
  if (read.kind !== 'valid') throw new Error(`Missing/invalid private examples: ${lesson}`)
  return { manifest: raw, workspace, registry: read.value }
}

for (const [course, lesson] of pilots) {
  test(`${lesson}: every structural part has its own valid transient solution and useful checkpoint`, () => {
    const { manifest, workspace, registry } = readPilot(course, lesson)
    expect(new TextEncoder().encode(JSON.stringify(registry)).length).toBeLessThanOrEqual(
      2 * 1024 * 1024,
    )
    for (const section of manifest.sections) {
      const checks = (section.completion?.projectChecks ?? []).filter(
        (check): check is SectionJavaScriptProjectCheck => check.programmingLanguage !== 'python',
      )
      if (!checks.length) continue
      const binding = registry.sections[section.key]
      expect(binding, `${lesson}/${section.key}`).toBeDefined()
      const solution = registry.examples[binding!.solutionExampleId!]
      const checkpoint = registry.examples[binding!.entryExampleId!]
      expect(solution).toBeDefined()
      expect(checkpoint).toBeDefined()
      expect(
        evaluateStudioSectionProject(checks, solution, workspace.initialProject).every(
          (row) => row.passed,
        ),
        `${lesson}/${section.key}: solution`,
      ).toBe(true)
      // Personalization preserves a working game; do not invent a required cosmetic difference.
      if (section.key !== 'personalizar')
        expect(
          evaluateStudioSectionProject(checks, checkpoint, workspace.initialProject).some(
            (row) => !row.passed,
          ),
          `${lesson}/${section.key}: new intention`,
        ).toBe(true)
    }
  })
}

test('Cadê keeps revealing as a legitimate prerequisite while counting remains a new intention', () => {
  const { manifest, workspace, registry } = readPilot(...pilots[1])
  const checks = manifest.sections.find((section) => section.key === 'contar-achados')!.completion!
    .projectChecks!
  const binding = registry.sections['contar-achados']!
  const before = evaluateStudioSectionProject(
    checks,
    registry.examples[binding.entryExampleId!],
    workspace.initialProject,
  )
  expect(before.find((row) => row.checkId === 'revelar-ao-toque')?.passed).toBe(true)
  expect(before.find((row) => row.checkId === 'somar-achado')?.passed).toBe(false)
})

test('Farol structural evidence accepts different colors and positive movement magnitudes', () => {
  const { manifest, workspace, registry } = readPilot(...pilots[2])
  const checks = manifest.sections.find((section) => section.key === 'borda')!.completion!
    .projectChecks!
  const source = registry.examples[registry.sections.borda!.solutionExampleId!]!
  for (const speed of [0.5, 2, 8, 25]) {
    const ir = structuredClone(source.ir) as SZIRV2
    for (const statement of ir.behavior.start)
      if (statement.type === 'g2d:setupStage') statement.bg = '#ff00aa'
    for (const loop of ir.behavior.loops)
      if (loop.type === 'g2d:updateEachFrame')
        for (const statement of loop.body)
          if (statement.type === 'g2d:topDown') statement.speed = speed
    const alternative = {
      ...source,
      ir,
      blocksState: buildWorkspaceStateFromIR(ir),
      files: generateProjectFiles({ ir, projectName: source.name }),
    }
    expect(
      evaluateStudioSectionProject(checks, alternative, workspace.initialProject).every(
        (row) => row.passed,
      ),
    ).toBe(true)
  }
})
