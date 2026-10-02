import { beforeAll, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { registerExtensionBlocks } from '../blockly/blocks'
import { buildIRFromWorkspace } from '../blockly/buildIR'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import { compileStatements } from '../generators/js'
import { behaviorStatements, normalizeSZIR, SZIRV2Schema } from '../ir'
import { stripIds } from '../official-extensions/game-2d/__gen_dinoCorredor'
import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { snowDescentExample } from '../official-extensions/game-2d/examples/snowDescent'
import { gameKitBlocks } from '../official-extensions/game-2d-advanced/blocks'
import { snowDescentAdvancedExample } from '../official-extensions/game-2d-advanced/examples/snowDescent'
import { parseJS } from '../parsers/js'
import { SNOW_COURSE } from './snowDescentAssets'
import { snowDescentCanvasExample } from './snowDescentCanvasExample'
import { type SnowVariant, snowDescentSource } from './snowDescentSource'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
  registerExtensionBlocks(gameKitBlocks)
})
for (const example of [snowDescentCanvasExample, snowDescentExample, snowDescentAdvancedExample]) {
  test(`${example.name}: saves, reopens in blocks and preserves the entire game`, () => {
    expect(SZIRV2Schema.safeParse(example.ir).success).toBe(true)
    expect(JSON.stringify(example.ir)).not.toContain('rawJS')
    const original = compileStatements(behaviorStatements(example.ir), 0)
    expect(compileStatements(parseJS(original), 0)).toBe(original)
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(example.ir), workspace)
      const state = Blockly.serialization.workspaces.save(workspace)
      workspace.clear()
      Blockly.serialization.workspaces.load(state, workspace)
      const rebuilt = buildIRFromWorkspace(workspace)
      expect(JSON.stringify(rebuilt)).not.toContain('rawJS')
      expect(compileStatements(stripIds(behaviorStatements(rebuilt)), 0)).toBe(original)
    } finally {
      workspace.dispose()
    }
  })
}
// The generated IR is what ships; `check:snow-descent` is not part of the unit gate, so
// a source edited without regenerating would go out with yesterday's game.
const EXTENSION_OF = { canvas: null, g2d: 'game-2d', gk: 'game-2d-advanced' } as const
/** The same path as the generator: parse, normalize the lifecycle, then compile. */
function compiledFromSource(variant: SnowVariant, source = snowDescentSource(variant)): string {
  const extensionId = EXTENSION_OF[variant]
  const ir = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: extensionId ? [{ extensionId }] : [],
  })
  return compileStatements(stripIds(behaviorStatements(ir)), 0)
}
for (const [variant, example] of [
  ['canvas', snowDescentCanvasExample],
  ['g2d', snowDescentExample],
  ['gk', snowDescentAdvancedExample],
] as const) {
  test(`${example.name}: the generated IR is in step with its source`, () => {
    expect(compiledFromSource(variant)).toBe(compileStatements(behaviorStatements(example.ir), 0))
  })
}
test('the drift check bites: a source changed by one number no longer matches', () => {
  const changed = snowDescentSource('g2d').replace('progresso >= 6600', 'progresso >= 6601')
  expect(changed).not.toBe(snowDescentSource('g2d'))
  expect(compiledFromSource('g2d', changed)).not.toBe(
    compileStatements(behaviorStatements(snowDescentExample.ir), 0),
  )
})
test('three versions have identical art and course, with native blocks for each mode', () => {
  expect(snowDescentCanvasExample.assets).toEqual(snowDescentExample.assets)
  expect(snowDescentExample.assets).toEqual(snowDescentAdvancedExample.assets)
  expect(SNOW_COURSE.filter((o) => o.kind === 'star')).toHaveLength(12)
  expect(SNOW_COURSE.filter((o) => o.kind === 'flag')).toHaveLength(12)
  expect(snowDescentCanvasExample.ir.extensions ?? []).toEqual([])
  const canvas = JSON.stringify(snowDescentCanvasExample.ir)
  expect(canvas).toContain('canvasDrawImage')
  expect(canvas).toContain('inputPointer')
  expect(canvas).not.toMatch(/g2d:|gk:|SZGame2D|SZGameKit/)
  expect(JSON.stringify(snowDescentExample.ir)).toContain('g2d:sceneCommand')
  expect(JSON.stringify(snowDescentAdvancedExample.ir)).toContain('gk:sceneCommand')
})
