import { beforeAll, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { registerExtensionBlocks } from '../../blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { compileStatements } from '../../generators/js'
import { behaviorStatements, normalizeSZIR, SZIRV2Schema } from '../../ir'
import { parseJS } from '../../parsers/js'
import { gameTwoDBlocks } from '../game-2d/blocks'
import { gameKitBlocks } from '../game-2d-advanced/blocks'
import { SCENE_METHODS } from './catalog'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
  registerExtensionBlocks(gameKitBlocks)
})

for (const target of ['g2d', 'gk'] as const) {
  const api = target === 'g2d' ? 'SZGame2D' : 'SZGameKit'
  const extensionId = target === 'g2d' ? 'game-2d' : 'game-2d-advanced'
  for (const entry of SCENE_METHODS) {
    test(`${target}.${entry.method}: code → IR → saved blocks → code is stable`, () => {
      const call = `${api}.${entry.method}(${entry.args.map((arg) => JSON.stringify(arg.value)).join(', ')})`
      const code = entry.value ? `let resultado = ${call};` : `${call};`
      const js = parseJS(code)
      expect(JSON.stringify(js)).toContain(`${target}:scene${entry.value ? 'Value' : 'Command'}`)
      expect(JSON.stringify(js)).not.toContain('rawJS')
      const ir = SZIRV2Schema.parse(
        normalizeSZIR({ html: [], css: [], js, extensions: [{ extensionId }] }),
      )
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), workspace)
        const saved = Blockly.serialization.workspaces.save(workspace)
        workspace.clear()
        Blockly.serialization.workspaces.load(saved, workspace)
        const output = compileStatements(behaviorStatements(buildIRFromWorkspace(workspace)), 0)
        expect(output).toBe(compileStatements(behaviorStatements(ir), 0))
        expect(compileStatements(parseJS(output), 0)).toBe(output)
      } finally {
        workspace.dispose()
      }
    })
  }
  test(`${target}: expressions accept nested variables and preserve invalid calls`, () => {
    const source = `let distancia = 4; ${api}.advanceTrack('pista', distancia * 2); if (${api}.trackTouching('pista', 'flag', distancia, 30)) { distancia = distancia + 1; }`
    const nodes = parseJS(source)
    expect(JSON.stringify(nodes)).not.toContain('rawJS')
    expect(compileStatements(parseJS(compileStatements(nodes, 0)), 0)).toBe(
      compileStatements(nodes, 0),
    )
    for (const source of [
      `${api}.createSceneLayer('x', 'y', 'invalid');`,
      `${api}.advanceTrack('pista', 1, 2);`,
      `let x = ${api}.trackValue('pista', 'invalid');`,
    ]) {
      expect(JSON.stringify(parseJS(source))).not.toContain(`${target}:scene`)
      expect(compileStatements(parseJS(source), 0)).toContain(api)
    }
  })
}
