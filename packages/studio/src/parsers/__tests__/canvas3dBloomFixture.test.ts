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

/**
 * Rodada 2 do Canvas 3D — macro-blocos de EFEITO, começando pelo Brilho (bloom).
 * A criança arrasta UM bloco "ligar Brilho ✨" que arma toda a esteira de
 * pós-processamento do three.js (EffectComposer + RenderPass + UnrealBloomPass +
 * OutputPass) na grafia ATUAL (0.180) e TRAZ os imports de `three/addons/
 * postprocessing/…` sozinho; e troca o "desenhar a cena" por "desenhar com efeitos"
 * (`composer.render()`).
 *
 * Duas provas:
 *   (1) a CENA por código (a esteira escrita à mão) round-trippa 0-raw + fixpoint —
 *       o idioma do composer é 100% buildável no núcleo;
 *   (2) o MACRO (`bloomSetup`) expande a grafia certa, injeta os 4 imports (deduped)
 *       e sobrevive block→IR→block.
 */

const BLOOM_SCENE = `
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(800, 600);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1.6, 0.1, 1000);
camera.position.set(0, 0, 5);
const geo = new THREE.SphereGeometry(1, 32, 32);
const mat = new THREE.MeshStandardMaterial({ color: 16755200 });
const orb = new THREE.Mesh(geo, mat);
scene.add(orb);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85));
composer.addPass(new OutputPass());
function frame() {
  orb.rotation.y = orb.rotation.y + 0.01;
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
`.trim()

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

/** IR → blocos → IR → código (para provar o round-trip de blocos). */
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

describe('Canvas 3D — cena com Brilho (bloom) por código round-trip 0-raw', () => {
  it('a esteira de pós-processamento é 100% buildável (0 raw, fixpoint textual e de blocos)', () => {
    const ir = parseJS(BLOOM_SCENE)
    expect(collectTypes(ir).has('rawJS')).toBe(false)
    const code = generateJS({ statements: ir })
    expect(generateJS({ statements: parseJS(code) })).toBe(code) // fixpoint textual
    const { code: rebuilt, state } = fromIR(ir)
    expect(rebuilt).toBe(code) // fixpoint de blocos
    expect(state).not.toContain('sz_adv_raw_js')
    // `composer.render()` vira o bloco amigável "desenhar com efeitos"
    expect(state).toContain('"sz_t3d_render_effects"')
    // grafia ATUAL, nunca a legada
    expect(code).toContain(
      'new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)',
    )
    expect(code).toContain('new OutputPass()')
  })
})

describe('Canvas 3D — macro Brilho (bloco sz_t3d_bloom_setup)', () => {
  const bloom: JSStatement = {
    type: 'bloomSetup',
    composer: 'composer',
    renderer: 'renderer',
    scene: 'scene',
    camera: 'camera',
    strength: { type: 'num', value: 1.5 },
    radius: { type: 'num', value: 0.4 },
    threshold: { type: 'num', value: 0.85 },
  }

  it('expande a esteira e INJETA os 4 imports de postprocessing sozinho', () => {
    const code = generateJS({
      statements: [{ type: 'importStar', name: 'THREE', module: 'three' }, bloom],
    })
    // imports auto-injetados no topo
    expect(code).toContain(
      "import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';",
    )
    expect(code).toContain(
      "import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';",
    )
    expect(code).toContain(
      "import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';",
    )
    expect(code).toContain(
      "import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';",
    )
    // a esteira, grafia atual
    expect(code).toContain('const composer = new EffectComposer(renderer);')
    expect(code).toContain('composer.addPass(new RenderPass(scene, camera));')
    expect(code).toContain(
      'composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85));',
    )
    expect(code).toContain('composer.addPass(new OutputPass());')
  })

  it('NÃO duplica um import que a criança já tinha (dedup por módulo)', () => {
    const code = generateJS({
      statements: [
        { type: 'importStar', name: 'THREE', module: 'three' },
        {
          type: 'importNamed',
          names: ['EffectComposer'],
          module: 'three/addons/postprocessing/EffectComposer.js',
        },
        bloom,
      ],
    })
    const count = code.split('postprocessing/EffectComposer.js').length - 1
    expect(count).toBe(1)
  })

  it('block→IR→block preserva o macro (sz_t3d_bloom_setup) e regenera igual', () => {
    const direct = generateJS({
      statements: [{ type: 'importStar', name: 'THREE', module: 'three' }, bloom],
    })
    const { code, state } = fromIR([{ type: 'importStar', name: 'THREE', module: 'three' }, bloom])
    expect(state).toContain('"sz_t3d_bloom_setup"')
    expect(code).toBe(direct) // o bloco regenera exatamente a mesma esteira + imports
  })
})
