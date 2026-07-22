import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import { behaviorStatements } from '../../ir/behavior'
import { type JSStatement, type SZIR, SZIRSchema } from '../../ir/schema'
import { parseJS } from '../js'

const n = (value: number) => ({ type: 'num' as const, value })
const color = (value: string) => ({ type: 'color' as const, value })

const setup: JSStatement[] = [
  { type: 'threeSceneSetup', scene: 'cena' },
  { type: 'threeRendererSetup', renderer: 'renderizador', canvas: 'jogo' },
  {
    type: 'threeCameraSetup',
    camera: 'camera',
    canvas: 'jogo',
    fov: n(60),
    near: n(0.1),
    far: n(1000),
  },
  {
    type: 'threeLightSetup',
    light: 'luz',
    scene: 'cena',
    kind: 'ambient',
    color: color('#ffffff'),
    intensity: n(1),
  },
]

describe('Canvas 3D — inicialização manual sobre uma tela Canvas', () => {
  it('preserva os quatro blocos entre IR, Blockly, código e parser', () => {
    ensureBlocklyInitialized()
    const ir: SZIR = {
      html: [{ type: 'canvas', id: 'jogo', width: 800, height: 600 }],
      css: [],
      js: setup,
      extensions: [],
    }
    expect(SZIRSchema.safeParse(ir).success).toBe(true)
    const state = buildWorkspaceStateFromIR(ir)
    const serialized = JSON.stringify(state)
    expect(serialized).toContain('sz_t3d_scene_create')
    expect(serialized).toContain('sz_t3d_renderer_create')
    expect(serialized).toContain('sz_t3d_camera_create')
    expect(serialized).toContain('sz_t3d_light_create')
    expect(serialized).not.toContain('sz_adv_raw_js')

    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state, workspace)
      const rebuilt = JSON.parse(
        JSON.stringify(behaviorStatements(buildIRFromWorkspace(workspace)), (key, value) =>
          key === '__id' ? undefined : value,
        ),
      )
      expect(rebuilt).toEqual(setup)
    } finally {
      workspace.dispose()
    }

    const code = generateJS({ statements: setup })
    expect(code).toContain('document.getElementById("jogo")')
    expect(code).toContain('new THREE.WebGLRenderer')
    expect(code).toContain('new THREE.PerspectiveCamera')
    expect(code).toContain('new THREE.AmbientLight')
    expect(code).toContain('cena.add(luz)')
    expect(parseJS(code).map((statement) => statement.type)).toEqual([
      'importStar',
      'threeSceneSetup',
      'threeRendererSetup',
      'threeCameraSetup',
      'threeLightSetup',
    ])
  })
})
