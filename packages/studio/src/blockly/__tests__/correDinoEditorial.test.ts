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
import { exampleHarness } from '../../official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { dinoCorredorExample } from '../../official-extensions/game-2d/examples'
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
    lesson: 9,
    name: 'collision checked once in events instead of during play',
    edit: (blocks) => {
      const collision = blocks.find((block) => block.type === 'sz_g2d_on_sprite_group_overlap')!
      const prior = blocks.find((block) => block.next?.block === collision)!
      prior.next = collision.next
      const events = blocks.find((block) => block.type === 'sz_frame_events')!
      collision.next = { block: events.inputs!.CHILDREN!.block! }
      events.inputs!.CHILDREN = { block: collision }
    },
  },
  {
    lesson: 5,
    name: 'cacti painted before the background hides them',
    edit: (blocks) => {
      const loop = blocks.find((block) => block.type === 'sz_g2d_update_each_frame')!
      const update = blocks.find((block) => block.type === 'sz_g2d_update_group')!
      const draw = blocks.find((block) => block.type === 'sz_g2d_draw_group')!
      const dino = blocks.find((block) => block.type === 'sz_g2d_draw_sprite')!
      delete dino.next
      draw.next = { block: loop.inputs!.BODY!.block! }
      loop.inputs!.BODY = { block: update }
    },
  },
  {
    lesson: 7,
    name: 'the forest hides the whole playing branch',
    edit: (blocks) => {
      const clear = blocks.find((block) => block.type === 'sz_g2d_clear')!
      const forest = blocks.find((block) => block.type === 'sz_g2d_forest')!
      const game = forest.next!.block
      delete forest.next
      clear.next = { block: game }
      game.next = { block: forest }
    },
  },
  {
    lesson: 11,
    name: 'HUD escapes the playing branch and appears on the menu',
    edit: (blocks) => {
      const score = blocks.find((block) => block.type === 'sz_g2d_draw_score')!
      for (const block of blocks) if (block.next?.block === score) delete block.next
      const loop = blocks.find((block) => block.type === 'sz_g2d_update_each_frame')!
      const first = loop.inputs!.BODY!.block!
      score.next = { block: first }
      loop.inputs!.BODY = { block: score }
    },
  },
  {
    lesson: 12,
    name: 'one spawn randomizes x and another randomizes velocity',
    edit: (blocks) => {
      const spawn = blocks.find((block) => block.type === 'sz_g2d_spawn_obstacle')!
      const extra = structuredClone(spawn)
      spawn.inputs!.VX = { shadow: { type: 'sz_val_number', fields: { NUM: -5 } } }
      extra.inputs!.X = { shadow: { type: 'sz_val_number', fields: { NUM: 560 } } }
      spawn.next = { block: extra }
    },
  },
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
)('lesson %i loads in Blockly and executes its available game loop, screens and restart', (lesson) => {
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
    const game = exampleHarness(
      { ...dinoCorredorExample, ir: buildIRFromWorkspace(workspace) },
      () => 0.99,
    )
    for (let frame = 0; frame < 90; frame++) game.nextFrame()
    if (lesson >= 7) {
      expect(game.api.sceneIs('inicio')).toBe(true)
      expect(game.groups[0]?.items).toHaveLength(0)
      expect(game.scores['Pontos:']).toBeUndefined()
    }
    if (lesson >= 8) {
      game.fireKey('Enter')
      expect(game.api.sceneIs('jogando')).toBe(true)
      for (let frame = 0; frame < 100; frame++) game.nextFrame()
      expect(game.groups[0]?.items.length).toBeGreaterThan(0)
      if (lesson >= 11) expect(Number(game.scores['Pontos:'])).toBeGreaterThan(0)
    }
    if (lesson >= 9) {
      const dino = game.sprites[0]!
      const cactus = game.groups[0]!.items[0]!
      cactus.x = dino.x
      cactus.y = dino.y
      game.nextFrame()
      expect(game.api.sceneIs('fim')).toBe(true)
      game.fireKey('Enter', 'keyup')
      game.fireKey('Enter')
      game.nextFrame()
      expect(game.api.sceneIs('inicio')).toBe(true)
      expect(game.groups.at(-1)?.items).toHaveLength(0)
    }
    if (lesson === 13) {
      // Isolate the difficulty clock after a real loss/restart, avoiding another
      // collision while recording the velocity assigned to newly born obstacles.
      game.firePointer('pointerdown', 200, 120)
      game.firePointer('pointerup', 200, 120)
      expect(game.api.sceneIs('jogando')).toBe(true)
      const velocities = new Set<number>()
      for (let frame = 0; frame < 1800; frame++) {
        game.nextFrame()
        const group = game.groups.at(-1)!
        for (const cactus of group.items) velocities.add(cactus.vx!)
        game.api.clearGroup(group)
      }
      expect([...velocities].sort((a, b) => b - a)).toEqual([-6, -7, -8, -9, -10])
      expect(Number(game.scores['Pontos:'])).toBeGreaterThanOrEqual(30)
    }
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  } finally {
    workspace.dispose()
  }
})
