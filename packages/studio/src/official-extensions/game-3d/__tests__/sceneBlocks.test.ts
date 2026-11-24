import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { resolveBlockLevel } from '../../../blockly/blockLevels'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { generateJS } from '../../../generators/js'
import { behaviorStatements, splitLegacyBehavior } from '../../../ir/behavior'
import { isLifecycleRootAllowed } from '../../../ir/lifecycle'
import { JSStatementSchema, SZIRSchema } from '../../../ir/schema'
import { parseJS } from '../../../parsers/js'
import { parseProjectFilesFromParts } from '../../../parsers/project'
import { gameThreeDBlocks } from '../blocks'

const montar = (worldVar = 'cena', objVar = 'personagem') => ({
  html: [],
  css: [],
  extensions: [],
  js: [
    { type: 'g3d:createFullscreenScene', varName: 'cena', bg: '#112233' },
    { type: 'g3d:loadScene', worldVar, asset: 'cena-id-estavel' },
    { type: 'g3d:createBox', varName: 'personagem', worldVar: 'cena', size: 1, color: '#224488' },
    { type: 'g3d:sceneStart', objVar },
  ],
})

test('a carga e a chegada usam os seletores existentes no nível iniciante 3D', () => {
  const carga = gameThreeDBlocks.find((b) => b.type === 'sz_g3d_load_scene'),
    inicio = gameThreeDBlocks.find((b) => b.type === 'sz_g3d_scene_start')
  expect(carga).toBeDefined()
  expect(inicio).toBeDefined()
  expect(JSON.stringify(carga)).toContain('"kind":"scene3d"')
  expect(JSON.stringify(carga)).toContain('"kind":"g3d-world"')
  expect(JSON.stringify(inicio)).toContain('"kind":"g3d-object"')
  expect(resolveBlockLevel('sz_g3d_load_scene')).toBe('iniciante-3d')
  expect(resolveBlockLevel('sz_g3d_scene_start')).toBe('iniciante-3d')
})

test('os comandos preservam ID, referências e receita na ida e volta código/Blockly', () => {
  const ir = SZIRSchema.parse(montar()),
    codigo = generateJS({ statements: behaviorStatements(ir) })
  expect(codigo).toContain('SZGame3D.loadScene(cena, "cena-id-estavel");')
  expect(codigo).toContain('SZGame3D.sceneStart(personagem);')
  const deVolta = parseJS(codigo)
  expect(JSON.stringify(deVolta)).not.toContain('"rawJS"')
  expect(generateJS({ statements: deVolta })).toBe(codigo)
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load({ ...buildWorkspaceStateFromIR(ir) }, ws)
    expect(ws.getBlocksByType('sz_g3d_load_scene')[0]?.getFieldValue('ASSET')).toBe(
      'cena-id-estavel',
    )
    expect(generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) })).toBe(codigo)
  } finally {
    ws.dispose()
  }
})

test('o carregamento não roda por quadro e a chegada exige um objeto do jogo', () => {
  const carregar = JSStatementSchema.parse({ type: 'g3d:loadScene', worldVar: 'cena', asset: 'id' })
  expect(isLifecycleRootAllowed(carregar, 'loops')).toBe(false)
  expect(SZIRSchema.safeParse(montar('personagem')).success).toBe(false)
  expect(SZIRSchema.safeParse(montar('cena', 'cena')).success).toBe(false)
})

test('a partida gerenciada conserva carga e chegada ao reabrir pelo parser do editor', () => {
  const ir = SZIRSchema.parse(montar()),
    codigo = generateJS({
      behavior: splitLegacyBehavior(behaviorStatements(ir)),
      lifecycle: 'game-3d',
    }),
    reaberto = parseProjectFilesFromParts({ html: ir.html, cssSource: '', jsSource: codigo })
  expect(codigo).toContain('SZGame3D.runProject(')
  expect(reaberto.diagnostics).toEqual([])
  expect(generateJS({ behavior: reaberto.ir.behavior, lifecycle: 'game-3d' })).toBe(codigo)
})
