import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import type { SZIR } from '../../ir/schema'
import { parseJS } from '../js'

/**
 * Fase 2 do Canvas 3D — loaders/texturas/animação via `three/addons`. Duas peças
 * novas de motor: `import { GLTFLoader } from 'three/addons/…'` (importNamed) e
 * `loader.load(url, (modelo) => { … })` (loaderLoad, carregamento async). O resto
 * (`new GLTFLoader()`, `new THREE.TextureLoader().load()`, `new THREE.AnimationMixer()`,
 * `mixer.clipAction(...).play()`) já round-trippava pelo motor da Fase 1.
 */

function roundtripBlocks(code: string): { rebuiltCode: string; stateJson: string } {
  ensureBlocklyInitialized()
  const irObj: SZIR = { html: [], css: [], js: parseJS(code), extensions: [] }
  const state = buildWorkspaceStateFromIR(irObj)
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    return {
      rebuiltCode: generateJS({ statements: buildIRFromWorkspace(ws).js }),
      stateJson: JSON.stringify(state),
    }
  } finally {
    ws.dispose()
  }
}

describe('Canvas 3D Fase 2 — importNamed', () => {
  it("import { GLTFLoader } from 'three/addons/…' → importNamed (0 raw, regen igual)", () => {
    const src = "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';"
    const ir = parseJS(src)
    expect(JSON.stringify(ir)).not.toContain('"rawJS"')
    expect(ir.some((s) => s.type === 'importNamed')).toBe(true)
    const code = generateJS({ statements: ir })
    expect(code.trim()).toBe(src)
    expect(generateJS({ statements: parseJS(code) })).toBe(code) // fixpoint
    expect(roundtripBlocks(code).stateJson).toContain('"sz_t3d_import_named"')
  })

  it('vários nomes: import { GLTFLoader, DRACOLoader } from … (vírgula)', () => {
    const src = "import { GLTFLoader, DRACOLoader } from 'three/addons/loaders/GLTFLoader.js';"
    const { rebuiltCode } = roundtripBlocks(generateJS({ statements: parseJS(src) }))
    expect(rebuiltCode).toContain('import { GLTFLoader, DRACOLoader } from')
  })

  it('import com ALIAS (X as Y) segue rawJS (fora do escopo)', () => {
    const ir = parseJS("import { GLTFLoader as GL } from 'three/addons/loaders/GLTFLoader.js';")
    expect(JSON.stringify(ir)).toContain('"rawJS"')
  })
})

describe('Canvas 3D Fase 2 — loaderLoad (carregamento async)', () => {
  it('loader.load(url, (gltf) => {…}) → loaderLoad (0 raw, regen igual, bloco)', () => {
    const src = [
      'const scene = new THREE.Scene();',
      "loader.load('m.glb', (gltf) => {",
      '  scene.add(gltf.scene);',
      '});',
    ].join('\n')
    // com o import p/ ligar o gate (scene.add vira "adicionar" amigável)
    const full = `import * as THREE from 'three';\n${src}`
    const ir = parseJS(full)
    expect(JSON.stringify(ir)).not.toContain('"rawJS"')
    expect(ir.some((s) => s.type === 'loaderLoad')).toBe(true)
    const code = generateJS({ statements: ir })
    expect(generateJS({ statements: parseJS(code) })).toBe(code) // fixpoint
    const { rebuiltCode, stateJson } = roundtripBlocks(code)
    expect(stateJson).toContain('"sz_t3d_load_model"')
    expect(rebuiltCode).toBe(code) // round-trip de blocos byte-idêntico
    expect(rebuiltCode).toContain('loader.load("m.glb", (gltf) => {')
  })

  it('load com onProgress/onError (4 args) segue rawJS (fora do escopo)', () => {
    const ir = parseJS("loader.load('m.glb', (g) => {}, (p) => {}, (e) => {});")
    expect(JSON.stringify(ir)).toContain('"rawJS"')
  })
})

describe('Canvas 3D — traverse (percorrer cada parte)', () => {
  it('modelo.traverse((parte) => {…}) com var → traverseEach (0 raw, regen igual, bloco)', () => {
    const src = ['modelo.traverse((parte) => {', '  parte.castShadow = true;', '});'].join('\n')
    const ir = parseJS(src)
    expect(JSON.stringify(ir)).not.toContain('"rawJS"')
    expect(ir.some((s) => s.type === 'traverseEach')).toBe(true)
    const code = generateJS({ statements: ir })
    expect(generateJS({ statements: parseJS(code) })).toBe(code) // fixpoint
    const { rebuiltCode, stateJson } = roundtripBlocks(code)
    expect(stateJson).toContain('"sz_t3d_traverse"')
    expect(rebuiltCode).toBe(code) // round-trip de blocos byte-idêntico
    expect(rebuiltCode).toContain('modelo.traverse((parte) => {')
  })

  it('gltf.scene.traverse((peca) => {…}) com PROPRIEDADE no objeto → traverseEach', () => {
    const src = ['gltf.scene.traverse((peca) => {', '  peca.receiveShadow = true;', '});'].join(
      '\n',
    )
    const ir = parseJS(src)
    expect(JSON.stringify(ir)).not.toContain('"rawJS"')
    expect(ir.some((s) => s.type === 'traverseEach')).toBe(true)
    const code = generateJS({ statements: ir })
    const { rebuiltCode } = roundtripBlocks(code)
    expect(rebuiltCode).toBe(code)
    expect(rebuiltCode).toContain('gltf.scene.traverse((peca) => {')
  })
})

describe('Canvas 3D Fase 2 — cena completa de carregamento (0 raw)', () => {
  it('import + GLTFLoader + TextureLoader + AnimationMixer + load round-trippam', () => {
    const scene = [
      "import * as THREE from 'three';",
      "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';",
      'const scene = new THREE.Scene();',
      'const loader = new GLTFLoader();',
      'const mixer = new THREE.AnimationMixer(scene);',
      "const tex = new THREE.TextureLoader().load('chao.png');",
      "loader.load('soldado.glb', (gltf) => {",
      '  scene.add(gltf.scene);',
      '  mixer.clipAction(gltf.animations[0]).play();',
      '});',
    ].join('\n')
    const code = generateJS({ statements: parseJS(scene) })
    expect(JSON.stringify(parseJS(code))).not.toContain('"rawJS"')
    const { rebuiltCode } = roundtripBlocks(code)
    expect(rebuiltCode).toBe(code) // fidelidade total: blocos → mesmo código
    // os dois imports no topo, hoisted
    expect(code.indexOf('import * as THREE')).toBeLessThan(code.indexOf('const scene'))
    expect(code.indexOf('import { GLTFLoader }')).toBeLessThan(code.indexOf('const scene'))
  })
})
