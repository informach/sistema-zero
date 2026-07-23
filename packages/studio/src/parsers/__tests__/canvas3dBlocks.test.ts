import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import { behaviorStatements } from '../../ir/behavior'
import type { SZIR } from '../../ir/schema'
import { parseJS } from '../js'

/** Exercita a ida e volta dos blocos Canvas 3D pela Ponte sem perder semântica. */

function stripIds<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripIds) as unknown as T
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(val)
    }
    return out as T
  }
  return v
}

const SRC = [
  "import * as THREE from 'three';",
  'const scene = new THREE.Scene();',
  'const cam = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);',
  'scene.add(new THREE.Mesh(geo, mat));',
].join('\n')

describe('Canvas 3D — round-trip de blocos', () => {
  it('IR → blocos → IR devolve a MESMA IR (0 raw)', () => {
    ensureBlocklyInitialized()
    const ir = parseJS(SRC)
    // 0 raw
    const flat = JSON.stringify(ir)
    expect(flat).not.toContain('"rawJS"')
    // usa os blocos t3d (não os genéricos)
    const irObj: SZIR = { html: [], css: [], js: ir, extensions: [] }
    const state = buildWorkspaceStateFromIR(irObj)
    const stateJson = JSON.stringify(state)
    expect(stateJson).toContain('"sz_t3d_import"')
    expect(stateJson).toContain('"sz_t3d_new_var"')
    expect(stateJson).toContain('"sz_t3d_new"') // o Mesh como VALOR em scene.add(...)

    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      expect(stripIds(rebuilt)).toEqual(stripIds(ir))
    } finally {
      ws.dispose()
    }
  })

  it('não toma para Canvas 3D imports que pertencem a outros módulos', () => {
    ensureBlocklyInitialized()
    for (const source of [
      "import * as helpers from './helpers.js';",
      "import { somar } from './matematica.js';",
    ]) {
      const statements = parseJS(source)
      const state = buildWorkspaceStateFromIR({ html: [], css: [], js: statements, extensions: [] })
      const serialized = JSON.stringify(state)
      expect(serialized).not.toContain('sz_t3d_import')
      expect(serialized).toContain('sz_adv_raw_js')

      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(
          state as unknown as Record<string, unknown>,
          workspace,
        )
        expect(
          generateJS({ statements: behaviorStatements(buildIRFromWorkspace(workspace)) }).trim(),
        ).toBe(generateJS({ statements }).trim())
      } finally {
        workspace.dispose()
      }
    }
  })

  it('mantém construtores do núcleo em Canvas 3D com import nomeado', () => {
    ensureBlocklyInitialized()
    const statements = parseJS("import { Scene } from 'three';\nconst cena = new Scene();")
    const state = buildWorkspaceStateFromIR({ html: [], css: [], js: statements, extensions: [] })
    const serialized = JSON.stringify(state)

    expect(serialized).toContain('sz_t3d_import_named')
    expect(serialized).toContain('sz_t3d_new_var')
    expect(serialized).not.toContain('sz_js_new_var')

    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
      expect(stripIds(behaviorStatements(buildIRFromWorkspace(workspace)))).toEqual(
        stripIds(statements),
      )
    } finally {
      workspace.dispose()
    }
  })

  it('mantém estrada e prédio no chão plano depois da ida e volta pela Ponte', () => {
    ensureBlocklyInitialized()
    const ir: SZIR = {
      html: [],
      css: [],
      js: [
        { type: 'threeSceneSetup', scene: 'cena' },
        {
          type: 'roadSetup',
          road: 'estrada',
          scene: 'cena',
          x1: { type: 'num', value: -5 },
          z1: { type: 'num', value: 0 },
          x2: { type: 'num', value: 5 },
          z2: { type: 'num', value: 0 },
          width: { type: 'num', value: 2 },
          segments: { type: 'num', value: 8 },
          color: { type: 'color', value: '#334155' },
        },
        {
          type: 'buildingSetup',
          building: 'predio',
          scene: 'cena',
          x: { type: 'num', value: 0 },
          z: { type: 'num', value: 0 },
          width: { type: 'num', value: 8 },
          height: { type: 'num', value: 10 },
          depth: { type: 'num', value: 8 },
          color: { type: 'color', value: '#f59e0b' },
          roofColor: { type: 'color', value: '#b91c1c' },
        },
      ],
      extensions: [],
    }
    const state = buildWorkspaceStateFromIR(ir)
    const workspace = new Blockly.Workspace()

    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, workspace)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(workspace))
      expect(stripIds(rebuilt)).toEqual(stripIds(ir.js))
      expect(rebuilt[1]).not.toHaveProperty('heightFunction')
      expect(rebuilt[2]).not.toHaveProperty('heightFunction')
    } finally {
      workspace.dispose()
    }
  })
})
