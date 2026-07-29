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

/**
 * Fixtures de PROVA da Rodada 1 do Canvas 3D — os dois clusters de idioma que
 * faltavam além do 04-05 (grade), sempre em three.js MODERNO (0.180.0):
 *
 *   (b) LOW-POLY (crossy-road / traffic-run): `OrthographicCamera`,
 *       `MeshLambertMaterial`, `HemisphereLight`, `BoxGeometry`, e a grafia
 *       ATUAL do renderizador (`shadowMap.type = THREE.PCFSoftShadowMap`,
 *       `outputColorSpace = THREE.SRGBColorSpace`) — o que o bloco
 *       "modernizar o renderizador" gera.
 *   (c) PERSONAGEM (04-03 / character): addons `GLTFLoader`+`OrbitControls`
 *       (import por seletor → `new` BARE reconhecido como Canvas 3D),
 *       `AnimationMixer`+`Clock`, `loader.load(...)` async e o bloco NOVO
 *       `objeto.traverse((parte) => { … })` para ligar sombra em todas as partes.
 *
 * Cada um prova o contrato "o código real por trás de cada bloco": 0 rawJS,
 * fixpoint TEXTUAL (gerar→parsear→gerar) e fixpoint de BLOCOS (IR→workspace→IR).
 * Nenhuma grafia legada (`outputEncoding`/`sRGBEncoding`/`Geometry` cru) aparece.
 */

const LOW_POLY = `
import * as THREE from 'three';
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(800, 600);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(9756400);
const camera = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 100);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);
const sun = new THREE.DirectionalLight(16777215, 1.5);
sun.position.set(10, 20, 10);
sun.castShadow = true;
scene.add(sun);
const hemi = new THREE.HemisphereLight(16777215, 4491519, 1);
scene.add(hemi);
const groundGeo = new THREE.BoxGeometry(40, 1, 40);
const groundMat = new THREE.MeshLambertMaterial({ color: 8695637 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.receiveShadow = true;
scene.add(ground);
const carGeo = new THREE.BoxGeometry(2, 1, 1);
for (let i = 0; i < 6; i++) {
  const carMat = new THREE.MeshLambertMaterial({ color: 16733525 });
  const car = new THREE.Mesh(carGeo, carMat);
  car.position.set(i * 3 - 8, 1, 0);
  car.castShadow = true;
  scene.add(car);
}
function frame() {
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
`.trim()

const CHARACTER = `
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(960, 600);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 1000);
camera.position.set(0, 3, 6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const sun = new THREE.DirectionalLight(16777215, 3);
sun.position.set(5, 10, 7);
sun.castShadow = true;
scene.add(sun);
const ambient = new THREE.AmbientLight(16777215, 0.6);
scene.add(ambient);
const clock = new THREE.Clock();
const loader = new GLTFLoader();
const mixer = new THREE.AnimationMixer(scene);
loader.load("soldado.glb", (gltf) => {
  gltf.scene.traverse((parte) => {
    parte.castShadow = true;
  });
  scene.add(gltf.scene);
  mixer.clipAction(gltf.animations[0]).play();
});
function frame() {
  const dt = clock.getDelta();
  mixer.update(dt);
  controls.update();
  renderer.render(scene, camera);
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

/** Contrato completo: 0 raw + fixpoint textual + fixpoint de blocos (sem raw_js). */
function assertBuildable(source: string): { code: string; state: string } {
  const ir = parseJS(source)
  expect(collectTypes(ir).has('rawJS')).toBe(false)
  const code = generateJS({ statements: ir })
  expect(generateJS({ statements: parseJS(code) })).toBe(code) // fixpoint textual
  ensureBlocklyInitialized()
  const irObj: SZIR = { html: [], css: [], js: ir, extensions: [] }
  const state = buildWorkspaceStateFromIR(irObj)
  expect(JSON.stringify(state)).not.toContain('sz_adv_raw_js')
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    const rebuilt = generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) })
    expect(rebuilt).toBe(code) // fixpoint de blocos
  } finally {
    ws.dispose()
  }
  // A grafia DESATUALIZADA nunca aparece.
  expect(code).not.toContain('outputEncoding')
  expect(code).not.toContain('sRGBEncoding')
  return { code, state: JSON.stringify(state) }
}

describe('Canvas 3D — fixture (b) low-poly (Lambert + OrthographicCamera)', () => {
  it('buildável 100% no núcleo (0 raw, fixpoint textual e de blocos)', () => {
    const { code } = assertBuildable(LOW_POLY)
    expect(code).toContain('new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 100)')
    expect(code).toContain('new THREE.MeshLambertMaterial({ color: 8695637 })')
    expect(code).toContain('new THREE.HemisphereLight(16777215, 4491519, 1)')
    // grafia ATUAL do renderizador (o que "modernizar o renderizador" gera)
    expect(code).toContain('renderer.shadowMap.type = THREE.PCFSoftShadowMap;')
    expect(code).toContain('renderer.outputColorSpace = THREE.SRGBColorSpace;')
  })

  it('a Ortho e o Lambert viram blocos Canvas 3D (new namespaced pelo seletor)', () => {
    const { state } = assertBuildable(LOW_POLY)
    expect(state).toContain('"THREE.OrthographicCamera"')
    expect(state).toContain('"THREE.MeshLambertMaterial"')
  })
})

describe('Canvas 3D — fixture (c) personagem (GLTF + OrbitControls + Mixer + traverse)', () => {
  it('buildável 100% no núcleo (0 raw, fixpoint textual e de blocos)', () => {
    const ir = parseJS(CHARACTER)
    const types = collectTypes(ir)
    // os dois addons entram como import nomeado; o traverse e o load como nós dedicados
    expect(types.has('importNamed')).toBe(true)
    expect(types.has('loaderLoad')).toBe(true)
    expect(types.has('traverseEach')).toBe(true)
    const { code } = assertBuildable(CHARACTER)
    expect(code).toContain("import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';")
    expect(code).toContain(
      "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
    )
    expect(code).toContain('renderer.toneMapping = THREE.ACESFilmicToneMapping;')
    expect(code).toContain('gltf.scene.traverse((parte) => {')
  })

  it('GLTFLoader/OrbitControls BARE viram blocos Canvas 3D (sob o gate three)', () => {
    const { state } = assertBuildable(CHARACTER)
    expect(state).toContain('"sz_t3d_new_var"')
    expect(state).toContain('"sz_t3d_traverse"')
    // bare: CLASS sem "THREE." nos addons
    expect(state).toContain('"GLTFLoader"')
    expect(state).toContain('"OrbitControls"')
  })
})
