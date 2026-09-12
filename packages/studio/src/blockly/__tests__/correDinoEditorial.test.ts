import { beforeAll, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { isLearningManifest } from '@sistemazero/core/learning'
import {
  type Block,
  courseProjects,
} from '../../../../../docs/aulas-interativas/qa/corre-dino-projetos-qa'
import { compileStatements } from '../../generators'
import { behaviorStatements } from '../../ir'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { evaluateStudioSectionProject } from '../projectCheckAuthoring'
import { ensureBlocklyInitialized } from '../setup'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

function allBlocks(value: unknown): Block[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(allBlocks)
  const object = value as Record<string, unknown>
  return [
    ...(typeof object.type === 'string' ? [object as unknown as Block] : []),
    ...Object.values(object).flatMap(allBlocks),
  ]
}
const mistakes: Array<{ lesson: number; name: string; edit: (blocks: Block[]) => void }> = [
  {
    lesson: 2,
    name: 'forest after Dino',
    edit: (blocks) => {
      const forest = blocks.find((block) => block.type === 'sz_g2d_forest')!
      const draw = blocks.find((block) => block.type === 'sz_g2d_draw_sprite')!
      const clear = blocks.find((block) => block.type === 'sz_g2d_clear')!
      delete forest.next
      clear.next = { block: draw }
      draw.next = { block: forest }
    },
  },
  {
    lesson: 4,
    name: 'old key event remains active',
    edit: (blocks) => {
      const event = blocks.find((block) => block.type === 'sz_g2d_on_jump')!
      event.next = { block: { type: 'sz_g2d_on_key', fields: { KEY: 'Space' } } }
    },
  },
  {
    lesson: 7,
    name: 'spawn moved outside its condition',
    edit: (blocks) => {
      const clock = blocks.find((block) => block.type === 'sz_g2d_every_seconds')!
      clock.inputs!.BODY = {
        block: blocks.find((block) => block.type === 'sz_g2d_spawn_obstacle')!,
      }
    },
  },
  {
    lesson: 11,
    name: 'literal zero in HUD instead of reading points',
    edit: (blocks) => {
      blocks.find((block) => block.type === 'sz_g2d_draw_score')!.inputs!.VALUE = {
        shadow: { type: 'sz_val_number', fields: { NUM: 0 } },
      }
    },
  },
  {
    lesson: 12,
    name: 'position and velocity connected to wrong sockets',
    edit: (blocks) => {
      const spawn = blocks.find((block) => block.type === 'sz_g2d_spawn_obstacle')!
      const x = spawn.inputs!.X!
      spawn.inputs!.X = spawn.inputs!.VX!
      spawn.inputs!.VX = x
    },
  },
  {
    lesson: 13,
    name: 'equality silently prevents acceleration',
    edit: (blocks) => {
      blocks.find((block) => block.type === 'sz_val_compare')!.fields!.OP = '==='
    },
  },
]
test.each(mistakes)('rejects a plausible learner mistake: $name', ({ lesson, edit }) => {
  const project = structuredClone(projects[lesson])
  edit(allBlocks(project))
  const slug = `aula-${String(lesson).padStart(2, '0')}`
  const manifest: unknown = JSON.parse(
    readFileSync(
      resolve(
        import.meta.dir,
        `../../../../../docs/aulas-interativas/corre-dino-v6/${slug}/manifesto.json`,
      ),
      'utf8',
    ),
  )
  if (!isLearningManifest(manifest)) throw new Error('Invalid authored lesson')
  const checks = manifest.sections.find((section) => section.intent === 'delivery')!.completion!
    .projectChecks!
  expect(evaluateStudioSectionProject(checks, project).some((check) => !check.passed)).toBe(true)
})
const projects = courseProjects()
test.each(
  Array.from({ length: 13 }, (_, index) => index + 1),
)('lesson %i survives the actual Blockly load/save and generates executable syntax', (lesson) => {
  const slug = `aula-${String(lesson).padStart(2, '0')}`
  const manifest: unknown = JSON.parse(
    readFileSync(
      resolve(
        import.meta.dir,
        `../../../../../docs/aulas-interativas/corre-dino-v6/${slug}/manifesto.json`,
      ),
      'utf8',
    ),
  )
  if (!isLearningManifest(manifest)) throw new Error('Invalid authored lesson')
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(
      (projects[lesson] as { blocksState: Record<string, unknown> }).blocksState,
      workspace,
    )
    const state = Blockly.serialization.workspaces.save(workspace)
    const checks = manifest.sections.find((section) => section.intent === 'delivery')!.completion!
      .projectChecks!
    expect(
      evaluateStudioSectionProject(checks, { blocksState: state }).filter((check) => !check.passed),
    ).toEqual([])
    const source = compileStatements(behaviorStatements(buildIRFromWorkspace(workspace)), 0)
    expect(source.length).toBeGreaterThan(50)
    expect(() => new Function('SZGame2D', source)).not.toThrow()
  } finally {
    workspace.dispose()
  }
})
