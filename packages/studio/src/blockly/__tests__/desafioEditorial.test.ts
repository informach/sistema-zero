import { beforeAll, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { isLearningManifest } from '@sistemazero/core/learning'
import {
  type Block,
  courseProjects,
} from '../../../../../docs/aulas-interativas/qa/desafio-projetos-qa'
import {
  type ExampleHarness,
  exampleHarness,
} from '../../official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { asteroidsExample } from '../../official-extensions/game-2d/examples/arcade'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { evaluateStudioSectionProject } from '../projectCheckAuthoring'
import { ensureBlocklyInitialized } from '../setup'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})
const projects = courseProjects()
function manifest(day: number) {
  const value: unknown = JSON.parse(
    readFileSync(
      resolve(
        import.meta.dir,
        `../../../../../docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-${day}/manifesto.json`,
      ),
      'utf8',
    ),
  )
  if (!isLearningManifest(value)) throw new Error('Invalid authored manifest')
  return value
}
function gameFor(day: number) {
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(projects[day]!.blocksState, workspace)
    const saved = { blocksState: Blockly.serialization.workspaces.save(workspace) }
    for (const section of manifest(day).sections)
      if (section.completion?.projectChecks)
        expect(
          evaluateStudioSectionProject(section.completion.projectChecks, saved).filter(
            (c) => !c.passed,
          ),
        ).toEqual([])
    return exampleHarness({ ...asteroidsExample, ir: buildIRFromWorkspace(workspace) }, () => 0.1)
  } finally {
    workspace.dispose()
  }
}
const advance = (g: ExampleHarness, n: number) => {
  for (let i = 0; i < n; i++) g.nextFrame()
}
const press = (g: ExampleHarness, key: string) => {
  g.fireKey(key, 'keyup')
  g.fireKey(key)
  g.fireKey(key, 'keyup')
}
const clear = (g: ExampleHarness) => {
  for (const group of g.groups) g.api.clearGroup(group)
}
function hitShip(g: ExampleHarness) {
  const ship = g.sprites.at(-1)!
  const stone = g.api.spawn(g.groups.at(-1)!, { x: ship.x, y: ship.y, w: 40, h: 40, vx: 0, vy: 0 })!
  g.nextFrame()
  expect(g.groups.at(-1)!.items.includes(stone)).toBe(false)
}
function scorePoint(g: ExampleHarness) {
  clear(g)
  press(g, 'Space')
  const bullet = g.groups.at(-2)!.items[0]!
  bullet.x = 100
  bullet.y = 110
  const stone = g.api.spawn(g.groups.at(-1)!, { x: 100, y: 100, w: 40, h: 40, vx: 0, vy: 0 })!
  g.nextFrame()
  expect(g.groups.at(-2)!.items.includes(bullet)).toBe(false)
  expect(g.groups.at(-1)!.items.includes(stone)).toBe(false)
}
test.each([
  1, 2, 3, 4, 5,
])('day %i: authored project survives Blockly and runs its expected behavior', (day) => {
  const g = gameFor(day)
  if (day === 5) {
    advance(g, 120)
    press(g, 'Space')
    expect(g.groups[0]!.items).toHaveLength(0)
    expect(g.groups.at(-1)!.items).toHaveLength(0)
    expect(g.api.sceneIs('inicio')).toBe(true)
    press(g, 'Enter')
    expect(g.api.sceneIs('jogando')).toBe(true)
  }
  const ship = g.sprites.at(-1)!,
    before = ship.x
  g.fireKey('ArrowRight')
  advance(g, 2)
  g.fireKey('ArrowRight', 'keyup')
  expect(ship.x).toBeGreaterThan(before)
  g.fireKey('ArrowLeft')
  advance(g, 150)
  g.fireKey('ArrowLeft', 'keyup')
  expect(ship.x).toBe(0)
  if (day >= 2) {
    clear(g)
    press(g, 'Space')
    const bullet = g.groups[0]!.items[0]!
    expect(bullet.x + bullet.w / 2).toBe(ship.x + ship.w / 2)
    const y = bullet.y
    g.nextFrame()
    expect(bullet.y).toBeLessThan(y)
    advance(g, 80)
    expect(g.groups[0]!.items.includes(bullet)).toBe(false)
  }
  if (day >= 3) {
    clear(g)
    const incoming = g.api.spawn(g.groups.at(-1)!, { x: 80, y: -80, w: 40, h: 40, vx: 0, vy: 3 })!
    g.nextFrame()
    expect(g.groups.at(-1)!.items.includes(incoming)).toBe(true)
    incoming.y = 600
    g.nextFrame()
    expect(g.groups.at(-1)!.items.includes(incoming)).toBe(false)
    scorePoint(g)
    if (day >= 4) expect(g.scores['Pontos:']).toBe(1)
  }
  if (day >= 4) {
    clear(g)
    hitShip(g)
    expect(ship.hp).toBe(2)
    hitShip(g)
    expect(ship.hp).toBe(2)
    advance(g, 46)
    clear(g)
    hitShip(g)
    expect(ship.hp).toBe(1)
  }
  expect(g.errors).toEqual([])
  expect(g.warnings).toEqual([])
})
test('day 5: loss, clean restart, a second Enter and real scoring to 26', () => {
  const g = gameFor(5)
  press(g, 'Enter')
  for (let i = 0; i < 3; i++) {
    clear(g)
    hitShip(g)
    if (i < 2) advance(g, 46)
  }
  expect(g.api.sceneIs('fim')).toBe(true)
  press(g, 'Space')
  expect(g.groups[0]!.items).toHaveLength(0)
  press(g, 'Enter')
  g.nextFrame()
  expect(g.api.sceneIs('inicio')).toBe(true)
  expect(g.sprites.at(-1)!.hp).toBe(3)
  expect(g.groups.slice(-2).every((group) => group.items.length === 0)).toBe(true)
  press(g, 'Enter')
  g.nextFrame()
  expect(g.scores['Pontos:']).toBe(0)
  for (let i = 1; i <= 26; i++) {
    scorePoint(g)
    expect(g.scores['Pontos:']).toBe(i)
  }
  expect(g.api.sceneIs('vitoria')).toBe(true)
  press(g, 'Enter')
  g.nextFrame()
  expect(g.api.sceneIs('inicio')).toBe(true)
  expect(g.errors).toEqual([])
})
test('day 5: the later loss condition wins when the last life and target coincide', () => {
  const g = gameFor(5)
  press(g, 'Enter')
  for (let i = 0; i < 25; i++) scorePoint(g)
  g.sprites[0]!.hp = 0
  scorePoint(g)
  expect(g.scores['Pontos:']).toBe(26)
  expect(g.api.sceneIs('fim')).toBe(true)
})
function all(value: unknown): Block[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(all)
  const object = value as Record<string, unknown>
  return [
    ...(typeof object.type === 'string' ? [object as unknown as Block] : []),
    ...Object.values(object).flatMap(all),
  ]
}
const mistakes = [
  {
    day: 5,
    name: 'victory checked after defeat reverses the simultaneous outcome',
    edit: (nodes: Block[]) => {
      const victory = nodes.find(
        (b) => b.type === 'sz_js_if_else' && b.inputs?.COND?.block?.type === 'sz_val_compare',
      )!
      const defeat = victory.next!.block
      const prior = nodes.find((b) => b.next?.block === victory)!
      prior.next = { block: defeat }
      delete victory.next
      defeat.next = { block: victory }
    },
  },
  {
    day: 2,
    name: 'fixed shot x',
    edit: (nodes: Block[]) => {
      nodes.find((b) => b.type === 'sz_g2d_spawn_bullet')!.inputs!.X = {
        shadow: { type: 'sz_val_number', fields: { NUM: 400 } },
      }
    },
  },
  {
    day: 3,
    name: 'positive starting y confused with velocity',
    edit: (nodes: Block[]) => {
      nodes.find((b) => b.type === 'sz_g2d_spawn_asteroid')!.inputs!.VY = {
        shadow: { type: 'sz_val_number', fields: { NUM: -30 } },
      }
    },
  },
  {
    day: 4,
    name: 'literal score instead of reading points',
    edit: (nodes: Block[]) => {
      nodes.find((b) => b.type === 'sz_g2d_draw_score')!.inputs!.VALUE = {
        shadow: { type: 'sz_val_number', fields: { NUM: 0 } },
      }
    },
  },
  {
    day: 4,
    name: 'wrong victim of damage',
    edit: (nodes: Block[]) => {
      nodes.find((b) => b.type === 'sz_g2d_damage_sprite')!.fields!.SPRITE = 'inimigo'
    },
  },
  {
    day: 5,
    name: 'unguarded shot event',
    edit: (nodes: Block[]) => {
      const e = nodes.find((b) => b.type === 'sz_g2d_on_key' && b.fields?.KEY === 'Space')!
      e.inputs!.BODY = e.inputs!.BODY!.block!.inputs!.THEN!
    },
  },
  {
    day: 5,
    name: 'unguarded asteroid clock',
    edit: (nodes: Block[]) => {
      const e = nodes.find((b) => b.type === 'sz_g2d_every_frames')!
      e.inputs!.BODY = e.inputs!.BODY!.block!.inputs!.THEN!
    },
  },
  {
    day: 5,
    name: 'restart merely changes scene without clearing memory',
    edit: (nodes: Block[]) => {
      for (const node of nodes.filter((b) => b.type === 'sz_g2d_restart')) {
        node.type = 'sz_g2d_set_scene'
        node.fields = { SCENE: 'inicio' }
      }
    },
  },
]
test.each(mistakes)('rejects learner error: $name', ({ day, edit }) => {
  const project = structuredClone(projects[day])
  edit(all(project))
  expect(
    evaluateStudioSectionProject(
      manifest(day).sections.find((s) => s.intent === 'delivery')!.completion!.projectChecks!,
      project,
    ).some((c) => !c.passed),
  ).toBe(true)
})
