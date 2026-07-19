import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import { behaviorStatements } from '../../ir/behavior'
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
    heightFunction: 'alturaChao',
    segments: n(24),
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
    heightFunction: 'alturaChao',
  },
  {
    type: 'citySetup',
    city: 'cidade',
    scene: 'cena',
    heightFunction: 'alturaChao',
    blocksX: n(4),
    blocksZ: n(3),
    spacing: n(14),
    roadWidth: n(5),
    minHeight: n(5),
    maxHeight: n(18),
    seed: n(42),
    color: color('#94a3b8'),
    roofColor: color('#334155'),
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
    type: 'physicsLiteStaticSphere',
    world: 'fisica',
    id: 'rocha',
    x: n(2),
    y: n(1),
    z: n(3),
    radius: n(1),
  },
  { type: 'physicsLiteStaticObject', world: 'fisica', id: 'escolaVisual', object: 'escola' },
  { type: 'physicsLiteStaticCity', world: 'fisica', city: 'cidade', prefix: 'centro' },
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
  { type: 'physicsLiteVelocity', world: 'fisica', id: 'jogador', x: n(1), y: n(0), z: n(0) },
  { type: 'physicsLiteImpulse', world: 'fisica', id: 'jogador', x: n(0), y: n(4), z: n(0) },
  { type: 'physicsLiteTeleport', world: 'fisica', id: 'jogador', x: n(0), y: n(2), z: n(0) },
  {
    type: 'physicsLiteCollisionEvent',
    world: 'fisica',
    bodyParam: 'corpoId',
    colliderParam: 'obstaculoId',
    body: [{ type: 'consoleLog', value: { type: 'var', name: 'obstaculoId' } }],
  },
  {
    type: 'physicsLiteTriggerEvent',
    world: 'fisica',
    bodyParam: 'corpoId',
    triggerParam: 'areaId',
    enteringParam: 'entrou',
    body: [{ type: 'consoleLog', value: { type: 'var', name: 'entrou' } }],
  },
  {
    type: 'physicsLiteRaycast',
    world: 'fisica',
    result: 'acerto',
    ox: n(0),
    oy: n(2),
    oz: n(0),
    dx: n(0),
    dy: n(-1),
    dz: n(0),
    maxDistance: n(100),
  },
  { type: 'physicsLiteBodyState', world: 'fisica', result: 'estadoCorpo', id: 'jogador' },
  { type: 'physicsLiteStats', world: 'fisica', result: 'estadoFisica' },
  { type: 'physicsLiteRemove', world: 'fisica', id: 'rocha' },
  { type: 'rendererResponsive', renderer: 'renderer', camera: 'camera', cleanup: 'pararResize' },
  {
    type: 'environmentLoad',
    scene: 'cena',
    url: 'ceu.hdr',
    texture: 'ceuHDR',
    background: true,
  },
  {
    type: 'lerpPosition',
    object: 'camera',
    target: { type: 'var', name: 'alvo' },
    alpha: n(0.1),
    dt: n(1 / 60),
  },
  { type: 'disposeObject', object: 'cidade' },
  { type: 'physicsLiteClear', world: 'fisica' },
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
    expect(stateJson).toContain('sz_t3d_city')
    expect(stateJson).toContain('sz_t3d_physics_setup')
    expect(stateJson).toContain('sz_t3d_physics_raycast')
    expect(stateJson).toContain('sz_t3d_renderer_responsive')
    expect(stateJson).toContain('sz_t3d_load_environment')
    expect(stateJson).not.toContain('sz_adv_raw_js')

    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state, workspace)
      const rebuilt = buildIRFromWorkspace(workspace)
      expect(statementTypes(rebuilt.behavior.events)).toEqual([
        'physicsLiteCollisionEvent',
        'physicsLiteTriggerEvent',
      ])
      expect(statementTypes(behaviorStatements(rebuilt))).toEqual([
        ...statementTypes(
          statements.filter(
            (statement) =>
              statement.type !== 'physicsLiteCollisionEvent' &&
              statement.type !== 'physicsLiteTriggerEvent',
          ),
        ),
        'physicsLiteCollisionEvent',
        'physicsLiteTriggerEvent',
      ])
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
    expect(code).toContain('fisica.addStaticCity("centro", cidade)')
    expect(code).toContain('fisica.moveCharacter("jogador"')
    expect(code).toContain('new RGBELoader()')
    expect(code).toContain('new ResizeObserver')
    expect(code).toContain('Math.min(40')
    expect(code).toContain('Math.hypot')
    expect(code).toContain('Math.atan2')
    expect(code).not.toContain('SZWorld3D')
    expect(code).not.toContain('Rapier')
    expect(code).not.toContain('WebAssembly')
    expect(JSON.stringify(parseJS(code))).not.toContain('"rawJS"')
  })
})
