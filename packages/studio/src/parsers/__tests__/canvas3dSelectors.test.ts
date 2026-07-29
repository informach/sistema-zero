import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ADDON_MODULES } from '../../blockly/fields/FieldAddonPicker'
import { ADDON_CLASSES, CLASS_NAMESPACE } from '../../blockly/fields/FieldClassPicker'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import { behaviorStatements } from '../../ir/behavior'
import type { JSStatement, SZIR } from '../../ir/schema'
import { parseJS } from '../js'

/**
 * Seletores do Canvas 3D (digitar o mínimo): o `new` guarda a CLASSE como REFERÊNCIA
 * COMPLETA num campo só (`THREE.Scene` = namespace THREE; `GLTFLoader` = addon bare).
 * O buildIR quebra no 1º ponto; o workspaceState reconhece a classe de addon (sob um
 * projeto three) e devolve o bloco Canvas 3D. Round-trip byte-idêntico nos dois casos.
 */
function roundtrip(code: string): { rebuilt: string; state: string } {
  ensureBlocklyInitialized()
  const irObj: SZIR = { html: [], css: [], js: parseJS(code), extensions: [] }
  const state = buildWorkspaceStateFromIR(irObj)
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    return {
      rebuilt: generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) }),
      state: JSON.stringify(state),
    }
  } finally {
    ws.dispose()
  }
}

describe('Canvas 3D — seletores de classe/addon (mapas)', () => {
  it('todo addon do FieldAddonPicker aponta para three/addons/…', () => {
    for (const [name, mod] of Object.entries(ADDON_MODULES)) {
      expect(mod.startsWith('three/addons/')).toBe(true)
      expect(mod.endsWith('.js')).toBe(true)
      expect(name).toMatch(/^[A-Z]\w+$/)
    }
    expect(ADDON_MODULES.GLTFLoader).toBe('three/addons/loaders/GLTFLoader.js')
    expect(ADDON_MODULES.OrbitControls).toBe('three/addons/controls/OrbitControls.js')
  })

  it('classes core têm ns THREE; classes de addon têm ns vazio (e batem no ADDON_CLASSES)', () => {
    expect(CLASS_NAMESPACE.Scene).toBe('THREE')
    expect(CLASS_NAMESPACE.PerspectiveCamera).toBe('THREE')
    expect(CLASS_NAMESPACE.GLTFLoader).toBe('')
    expect(CLASS_NAMESPACE.OrbitControls).toBe('')
    expect(ADDON_CLASSES.has('GLTFLoader')).toBe(true)
    expect(ADDON_CLASSES.has('Scene')).toBe(false)
  })
})

describe('Canvas 3D — new namespaced × bare (round-trip)', () => {
  it('new THREE.Scene() → sz_t3d_new_var CLASS="THREE.Scene" (regenera igual)', () => {
    const code = generateJS({
      statements: parseJS("import * as THREE from 'three';\nconst cena = new THREE.Scene();"),
    })
    const { rebuilt, state } = roundtrip(code)
    expect(rebuilt).toBe(code)
    expect(state).toContain('"sz_t3d_new_var"')
    expect(state).toContain('"THREE.Scene"')
  })

  it('new GLTFLoader() (bare, sob three) → sz_t3d_new_var CLASS="GLTFLoader" (regenera igual)', () => {
    const src = [
      "import * as THREE from 'three';",
      "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';",
      'const loader = new GLTFLoader();',
    ].join('\n')
    const code = generateJS({ statements: parseJS(src) })
    const { rebuilt, state } = roundtrip(code)
    expect(rebuilt).toBe(code)
    // reconhecido como bloco Canvas 3D (bare, CLASS sem "THREE.")
    expect(state).toContain('"GLTFLoader"')
    // a linha do loader é sz_t3d_new_var (não o genérico sz_js_new_var)
    expect(code).toContain('const loader = new GLTFLoader();')
  })

  it('new PointerLockControls(...) (addon exposto ao preview) → sz_t3d_new_var, regenera igual', () => {
    const src = [
      "import * as THREE from 'three';",
      "import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';",
      'const camera = new THREE.PerspectiveCamera();',
      'const renderer = new THREE.WebGLRenderer();',
      'const controls = new PointerLockControls(camera, renderer);',
    ].join('\n')
    const code = generateJS({ statements: parseJS(src) })
    const { rebuilt, state } = roundtrip(code)
    expect(rebuilt).toBe(code)
    // reconhecido como bloco Canvas 3D bare (o sandbox tem allow-pointer-lock, então é oferecido)
    expect(state).toContain('"PointerLockControls"')
    expect(code).toContain('const controls = new PointerLockControls(camera, renderer);')
  })

  it('new Coisa() SEM three continua bloco genérico (não vira Canvas 3D)', () => {
    const code = generateJS({
      statements: parseJS('class Coisa {}\nconst c = new Coisa();'),
    })
    const { state } = roundtrip(code)
    expect(state).not.toContain('sz_t3d_')
    expect(state).toContain('"sz_js_new_var"')
  })

  it('preserva construtor de outro namespace como bloco genérico', () => {
    const source = "import * as PIXI from 'pixi.js';\nconst app = new PIXI.Application();"
    const code = generateJS({ statements: parseJS(source) })
    const { rebuilt, state } = roundtrip(code)

    expect(rebuilt).toBe(code)
    expect(state).toContain('"sz_js_new_var"')
    expect(state).toContain('"PIXI.Application"')
    expect(state).not.toContain('"sz_t3d_new_var"')
  })

  it('preserva expressão new de outro namespace como valor genérico', () => {
    const source = "import * as API from './api.js';\nconsole.log(new API.Client());"
    const code = generateJS({ statements: parseJS(source) })
    const { rebuilt, state } = roundtrip(code)

    expect(rebuilt).toBe(code)
    expect(state).toContain('"sz_val_new"')
    expect(state).toContain('"API.Client"')
    expect(state).not.toContain('"sz_t3d_new"')
  })
})

/** IR → blocos → IR → código: exercita só o caminho block↔IR (não passa pelo parser). */
function fromIR(js: JSStatement[]): { code: string; state: string } {
  ensureBlocklyInitialized()
  const irObj: SZIR = { html: [], css: [], js, extensions: [] }
  const state = buildWorkspaceStateFromIR(irObj)
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    return {
      code: generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) }),
      state: JSON.stringify(state),
    }
  } finally {
    ws.dispose()
  }
}

describe('Canvas 3D — renderer_config (modernização forward-only)', () => {
  it('todas as opções ligadas → grafia ATUAL do three.js (nunca a legada)', () => {
    const code = generateJS({
      statements: [
        {
          type: 'rendererConfig',
          renderer: 'renderer',
          pixels: 'device',
          shadows: 'soft',
          colorSpace: 'srgb',
          toneMapping: 'aces',
        },
      ],
    })
    expect(code).toContain('renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));')
    expect(code).toContain('renderer.shadowMap.enabled = true;')
    expect(code).toContain('renderer.shadowMap.type = THREE.PCFSoftShadowMap;')
    expect(code).toContain('renderer.outputColorSpace = THREE.SRGBColorSpace;')
    expect(code).toContain('renderer.toneMapping = THREE.ACESFilmicToneMapping;')
    // a grafia DESATUALIZADA nunca é oferecida
    expect(code).not.toContain('outputEncoding')
    expect(code).not.toContain('sRGBEncoding')
  })

  it("'duras' → BasicShadowMap; 'off' pula a linha", () => {
    const code = generateJS({
      statements: [
        {
          type: 'rendererConfig',
          renderer: 'r',
          pixels: 'off',
          shadows: 'hard',
          colorSpace: 'off',
          toneMapping: 'off',
        },
      ],
    })
    expect(code).toContain('r.shadowMap.type = THREE.BasicShadowMap;')
    expect(code).not.toContain('setPixelRatio')
    expect(code).not.toContain('outputColorSpace')
    expect(code).not.toContain('r.toneMapping =')
  })

  it('block→IR→block preserva os dropdowns (bloco sz_t3d_renderer_config)', () => {
    const { code, state } = fromIR([
      {
        type: 'rendererConfig',
        renderer: 'renderer',
        pixels: 'device',
        shadows: 'soft',
        colorSpace: 'srgb',
        toneMapping: 'aces',
      },
    ])
    expect(state).toContain('"sz_t3d_renderer_config"')
    expect(code).toContain('renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));')
    expect(code).toContain('renderer.outputColorSpace = THREE.SRGBColorSpace;')
  })
})
