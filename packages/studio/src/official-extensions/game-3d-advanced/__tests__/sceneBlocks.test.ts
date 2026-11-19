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
import { gameKit3DBlocks } from '../blocks'
import { GAME_KIT_THREE_D_PALETTE } from '../palette'

const n = (value: number) => ({ type: 'num', value })
const projeto = () => ({
  html: [],
  css: [],
  extensions: [{ extensionId: 'game-3d-advanced' }],
  js: [
    { type: 'g3k:setup', w: n(960), h: n(600), world: n(80), sky: '#112233', ground: '#334455' },
    { type: 'g3k:loadScene', asset: 'cenario-id-estavel' },
    { type: 'g3k:defineMold', name: 'aventureiro', health: n(100), speed: n(3), body: [] },
    { type: 'g3k:spawnNamed', varName: 'heroi', mold: 'aventureiro', x: n(0), y: n(0), z: n(0) },
    { type: 'g3k:sceneStart', charVar: 'heroi' },
  ],
})

test('Avançado usa seletor de cenário por ID e o seletor de objetos existente', () => {
  const carga = gameKit3DBlocks.find((b) => b.type === 'sz_g3k_load_scene'),
    chegada = gameKit3DBlocks.find((b) => b.type === 'sz_g3k_scene_start')
  expect(carga).toBeDefined()
  expect(chegada).toBeDefined()
  expect(JSON.stringify(carga)).toContain('"kind":"scene3d"')
  expect(JSON.stringify(chegada)).toContain('"kind":"entity3d"')
  expect(JSON.stringify(GAME_KIT_THREE_D_PALETTE)).toContain('sz_g3k_load_scene')
  expect(JSON.stringify(GAME_KIT_THREE_D_PALETTE)).toContain('sz_g3k_scene_start')
  expect(resolveBlockLevel('sz_g3k_load_scene')).toBe('avancado-3d')
  expect(resolveBlockLevel('sz_g3k_scene_start')).toBe('avancado-3d')
})

test('a receita completa do Avançado reabre por código gerenciado e Blockly sem perder os dois comandos', () => {
  const ir = SZIRSchema.parse(projeto()),
    codigo = generateJS({
      behavior: splitLegacyBehavior(behaviorStatements(ir)),
      lifecycle: 'game-3d-advanced',
    }),
    reaberto = parseProjectFilesFromParts({ html: ir.html, cssSource: '', jsSource: codigo })
  expect(codigo).toContain('SZGameKit3D.loadScene("cenario-id-estavel");')
  expect(codigo).toContain('SZGameKit3D.sceneStart(heroi);')
  expect(codigo).toContain('SZGameKit3D.runProject(')
  expect(reaberto.diagnostics).toEqual([])
  expect(JSON.stringify(reaberto.ir)).not.toContain('"rawJS"')
  expect(generateJS({ behavior: reaberto.ir.behavior, lifecycle: 'game-3d-advanced' })).toBe(codigo)
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load({ ...buildWorkspaceStateFromIR(reaberto.ir) }, ws)
    expect(ws.getBlocksByType('sz_g3k_load_scene')[0]?.getFieldValue('ASSET')).toBe(
      'cenario-id-estavel',
    )
    const reconstruido = buildIRFromWorkspace(ws)
    expect(
      generateJS({
        behavior: splitLegacyBehavior(behaviorStatements(reconstruido)),
        lifecycle: 'game-3d-advanced',
      }),
    ).toBe(codigo)
  } finally {
    ws.dispose()
  }
})

test('Avançado só carrega o cenário em Ao iniciar e conserva chamadas autorais com aridade diferente', () => {
  const carga = JSStatementSchema.parse({ type: 'g3k:loadScene', asset: 'id' })
  expect(isLifecycleRootAllowed(carga, 'loops')).toBe(false)
  const ir = projeto()
  expect(
    SZIRSchema.safeParse({
      ...ir,
      js: [
        ...ir.js,
        { type: 'g3k:onUpdate', dtName: 'dt', body: [{ type: 'g3k:loadScene', asset: 'id' }] },
      ],
    }).success,
  ).toBe(false)
  for (const fonte of [
    'SZGameKit3D.loadScene("id", "extra");',
    'SZGameKit3D.sceneStart(heroi, outro);',
  ])
    expect(generateJS({ statements: parseJS(fonte) })).toBe(`${fonte}\n`)
})
