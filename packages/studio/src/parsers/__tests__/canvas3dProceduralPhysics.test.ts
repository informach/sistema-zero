import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import type { JSStatement, SZIR } from '../../ir/schema'
import { parseJS } from '../js'

const n = (value: number) => ({ type: 'num' as const, value })
const color = (value: string) => ({ type: 'color' as const, value })

const statements: JSStatement[] = [
  { type: 'importStar', name: 'THREE', module: 'three' },
  { type: 'newInstance', varName: 'cena', namespace: 'THREE', className: 'Scene', args: [] },
  {
    type: 'terrainSetup',
    terrain: 'terreno',
    scene: 'cena',
    heightFunction: 'alturaChao',
    size: n(160),
    segments: n(48),
    hills: n(4),
    smooth: n(18),
    color: color('#65a30d'),
  },
  {
    type: 'roadSetup',
    road: 'avenida',
    scene: 'cena',
    x1: n(-30),
    z1: n(0),
    x2: n(30),
    z2: n(0),
    width: n(7),
    color: color('#334155'),
  },
  {
    type: 'buildingSetup',
    building: 'escola',
    scene: 'cena',
    x: n(12),
    z: n(-10),
    width: n(12),
    height: n(9),
    depth: n(8),
    color: color('#f59e0b'),
    roofColor: color('#b91c1c'),
  },
  {
    type: 'primitiveSetup',
    mesh: 'jogador',
    scene: 'cena',
    shape: 'capsule',
    width: n(1),
    height: n(2),
    depth: n(1),
    color: color('#38bdf8'),
  },
  {
    type: 'physicsLiteSetup',
    world: 'fisica',
    heightFunction: 'alturaChao',
    gravity: n(-22),
    maxSubSteps: n(3),
  },
  {
    type: 'physicsLiteStaticBox',
    world: 'fisica',
    id: 'escola',
    x: n(12),
    y: n(4.5),
    z: n(-10),
    width: n(12),
    height: n(9),
    depth: n(8),
  },
  {
    type: 'physicsLiteBody',
    world: 'fisica',
    object: 'jogador',
    id: 'jogador',
    kind: 'character',
    width: n(1),
    height: n(2),
    depth: n(1),
    friction: n(0.82),
    bounce: n(0),
  },
  {
    type: 'physicsLiteTrigger',
    world: 'fisica',
    id: 'entrada',
    x: n(12),
    y: n(1),
    z: n(-5),
    width: n(4),
    height: n(2),
    depth: n(4),
  },
  { type: 'physicsLiteMove', world: 'fisica', id: 'jogador', x: n(0), z: n(-1), speed: n(6) },
  { type: 'physicsLiteJump', world: 'fisica', id: 'jogador', speed: n(7) },
  { type: 'physicsLiteStep', world: 'fisica', dt: n(1 / 60) },
]

function statementTypes(items: JSStatement[]): string[] {
  return items.map((statement) => statement.type)
}

describe('Canvas 3D — mundo procedural e física própria', () => {
  it('reconstrói todos os macros como blocos nativos, sem rawJS', () => {
    ensureBlocklyInitialized()
    const ir: SZIR = { html: [], css: [], js: statements, extensions: [] }
    const state = buildWorkspaceStateFromIR(ir)
    const stateJson = JSON.stringify(state)

    expect(stateJson).toContain('sz_t3d_terrain')
    expect(stateJson).toContain('sz_t3d_road')
    expect(stateJson).toContain('sz_t3d_building')
    expect(stateJson).toContain('sz_t3d_physics_setup')
    expect(stateJson).not.toContain('sz_adv_raw_js')

    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state, workspace)
      expect(statementTypes(buildIRFromWorkspace(workspace).js)).toEqual(statementTypes(statements))
    } finally {
      workspace.dispose()
    }
  })

  it('gera Three.js legível, injeta um único kernel e não usa extensão/Rapier', () => {
    const code = generateJS({ statements })

    expect(code.match(/function createSZPhysicsLite/g)).toHaveLength(1)
    expect(code).toContain('function alturaChao(x, z)')
    expect(code).toContain('new THREE.InstancedMesh')
    expect(code).toContain('fisica.addStaticBox("escola"')
    expect(code).toContain('fisica.moveCharacter("jogador"')
    expect(code).not.toContain('SZWorld3D')
    expect(code).not.toContain('Rapier')
    expect(code).not.toContain('WebAssembly')
    expect(JSON.stringify(parseJS(code))).not.toContain('"rawJS"')
  })
})
