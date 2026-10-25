import { beforeAll, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { compileStatements } from '#generators'
import { behaviorStatements, normalizeSZIR, SZIRV2Schema } from '#ir'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { stripIds } from '../../game-3d-advanced/exampleSourceUtils'
import { gameThreeDBlocks } from '../blocks'
import { gameThreeDUsesPlatformKit } from '../platformKitVariant'

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})
for (const kit of ['crossing', 'race', 'stack', 'platform']) {
  test(`${kit}: scene is owned by the engine and survives code/blocks/code`, () => {
    const code = `const jogo = SZGame3D.createFullscreenScene("#0b1020", "${kit}");`
    const js = parseJS(code)
    expect(js).toMatchObject([
      { type: 'g3d:createFullscreenScene', varName: 'jogo', bg: '#0b1020', kit },
    ])
    const ir = SZIRV2Schema.parse(
      normalizeSZIR({ html: [], css: [], js, extensions: [{ extensionId: 'game-3d' }] }),
    )
    expect(gameThreeDUsesPlatformKit(code)).toBe(kit === 'platform')
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), ws)
      expect(
        ws.getAllBlocks(false).some((block) => block.type === 'sz_g3d_create_fullscreen_kit'),
      ).toBe(true)
      expect(stripIds(behaviorStatements(buildIRFromWorkspace(ws)))).toEqual(stripIds(js))
      expect(compileStatements(behaviorStatements(buildIRFromWorkspace(ws)), 0)).toBe(code)
    } finally {
      ws.dispose()
    }
  })
}
