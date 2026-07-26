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
 * Blocos FACILITADORES do Canvas 3D (`sz_t3d_set_position`, `sz_t3d_rotate_axis`,
 * `sz_t3d_render`…). São rótulo amigável sobre a IR genérica (memberCall/memberSet):
 * o buildIR compila para o mesmo código do bloco manual, e o workspaceState
 * RECONHECE as formas canônicas de volta (só em projeto three). Este teste prova o
 * round-trip completo: código real → IR → blocos AMIGÁVEIS → IR → mesmo código.
 */

/** Cena que exercita TODOS os 14 facilitadores, em three.js atual e idiomático. */
const SCENE = [
  "import * as THREE from 'three';",
  'const renderer = new THREE.WebGLRenderer();',
  'renderer.setSize(800, 600);',
  'renderer.shadowMap.enabled = true;',
  'document.body.appendChild(renderer.domElement);',
  'const scene = new THREE.Scene();',
  "scene.background = new THREE.Color('#101830');",
  'const camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);',
  'camera.position.set(0, 1, 5);',
  'camera.lookAt(0, 0, 0);',
  'const geo = new THREE.BoxGeometry(1, 1, 1);',
  'const mat = new THREE.MeshStandardMaterial();',
  "mat.color.set('#ff8844');",
  'const cube = new THREE.Mesh(geo, mat);',
  'cube.rotation.set(0.1, 0.2, 0.3);',
  'cube.scale.set(2, 2, 2);',
  'cube.castShadow = true;',
  'cube.receiveShadow = false;',
  'cube.visible = true;',
  'mat.wireframe = false;',
  'scene.add(cube);',
  'const light = new THREE.DirectionalLight();',
  'light.intensity = 2;',
  'scene.add(light);',
  'scene.add(new THREE.GridHelper(10, 10));',
  'scene.add(new THREE.AxesHelper(5));',
  'const total = scene.children.length;',
  'function animate() {',
  '  cube.rotation.y += 0.01;',
  '  renderer.render(scene, camera);',
  '  requestAnimationFrame(animate);',
  '}',
  'requestAnimationFrame(animate);',
].join('\n')

const ALL_FACILITATORS = [
  'sz_t3d_renderer_size',
  'sz_t3d_enable_shadows',
  'sz_t3d_mount_renderer',
  'sz_t3d_set_background',
  'sz_t3d_set_position',
  'sz_t3d_look_at',
  'sz_t3d_set_color',
  'sz_t3d_set_rotation',
  'sz_t3d_set_scale',
  'sz_t3d_set_shadow',
  'sz_t3d_set_visible',
  'sz_t3d_add_to',
  'sz_t3d_set_intensity',
  'sz_t3d_rotate_axis',
  'sz_t3d_render',
  'sz_t3d_set_wireframe',
  'sz_t3d_debug_grid',
  'sz_t3d_debug_axes',
  'sz_t3d_object_count',
]

describe('Canvas 3D — facilitadores (round-trip completo)', () => {
  it('a cena inteira: 0 raw, usa todos os blocos amigáveis e regenera o MESMO código', () => {
    ensureBlocklyInitialized()
    const code = generateJS({ statements: parseJS(SCENE) }) // forma canônica
    // fixpoint textual do parser/gerador (independe do SCENE já ser canônico)
    expect(generateJS({ statements: parseJS(code) })).toBe(code)

    const ir = parseJS(code)
    expect(JSON.stringify(ir)).not.toContain('"rawJS"')

    const irObj: SZIR = { html: [], css: [], js: ir, extensions: [] }
    const state = buildWorkspaceStateFromIR(irObj)
    const stateJson = JSON.stringify(state)
    for (const type of ALL_FACILITATORS) {
      expect(stateJson).toContain(`"${type}"`)
    }
    // não caiu em bloco genérico p/ estas formas (a Ponte mostra o amigável)
    expect(stateJson).not.toContain('"sz_js_method_on"')

    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      // fidelidade = o CÓDIGO gerado dos blocos amigáveis é idêntico ao real
      expect(generateJS({ statements: rebuilt })).toBe(code)
    } finally {
      ws.dispose()
    }
  })

  it('valores nos sockets round-trippam (posição 0/1/5, giro 0.01, cor #ff8844)', () => {
    ensureBlocklyInitialized()
    const code = generateJS({ statements: parseJS(SCENE) })
    const state = buildWorkspaceStateFromIR({
      html: [],
      css: [],
      js: parseJS(code),
      extensions: [],
    })
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const out = generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) })
      // Formas CANÔNICAS do gerador (o += vira a forma completa; cor com aspas duplas).
      expect(out).toContain('camera.position.set(0, 1, 5);')
      expect(out).toContain('cube.rotation.y = cube.rotation.y + 0.01;')
      expect(out).toContain('mat.color.set("#ff8844");')
      expect(out).toContain('renderer.render(scene, camera);')
      expect(out).toContain('scene.background = new THREE.Color("#101830");')
    } finally {
      ws.dispose()
    }
  })

  it('document.body.appendChild(renderer.domElement) → mountRenderer (0 raw, regen igual)', () => {
    ensureBlocklyInitialized()
    const src = 'document.body.appendChild(renderer.domElement);'
    const ir = parseJS(src)
    expect(JSON.stringify(ir)).not.toContain('"rawJS"')
    expect(ir.some((s) => s.type === 'mountRenderer')).toBe(true)
    const code = generateJS({ statements: ir })
    expect(code.trim()).toBe(src)
    // fixpoint textual + round-trip de blocos
    expect(generateJS({ statements: parseJS(code) })).toBe(code)
    const state = buildWorkspaceStateFromIR({ html: [], css: [], js: ir, extensions: [] })
    expect(JSON.stringify(state)).toContain('"sz_t3d_mount_renderer"')
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) })).toBe(code)
    } finally {
      ws.dispose()
    }
  })

  it('folio: névoa + câmera que segue + floresta instanciada preservam a semântica', () => {
    ensureBlocklyInitialized()
    // O lerp legado sem delta continua genérico para não ganhar uma semântica
    // dependente de tempo apenas por ter atravessado a Ponte.
    const src = [
      "import * as THREE from 'three';",
      'const scene = new THREE.Scene();',
      "scene.fog = new THREE.Fog('#aabbcc', 10, 100);",
      'const camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);',
      'const alvo = new THREE.Vector3(5, 2, 5);',
      'camera.position.lerp(alvo, 0.08);',
      'const geo = new THREE.ConeGeometry(1, 2, 6);',
      'const mat = new THREE.MeshStandardMaterial();',
      'const arvores = new THREE.InstancedMesh(geo, mat, 60);',
      'const molde = new THREE.Object3D();',
      'molde.position.set(3, 0, 4);',
      'molde.updateMatrix();',
      'arvores.setMatrixAt(0, molde.matrix);',
      'arvores.instanceMatrix.needsUpdate = true;',
    ].join('\n')
    const code = generateJS({ statements: parseJS(src) })
    expect(generateJS({ statements: parseJS(code) })).toBe(code) // fixpoint textual

    const ir = parseJS(code)
    expect(JSON.stringify(ir)).not.toContain('"rawJS"')

    const state = buildWorkspaceStateFromIR({ html: [], css: [], js: ir, extensions: [] })
    const json = JSON.stringify(state)
    for (const type of ['sz_t3d_set_fog', 'sz_t3d_set_matrix_at', 'sz_t3d_instances_dirty']) {
      expect(json).toContain(`"${type}"`)
    }
    expect(json).toContain('"sz_js_method_on"')
    expect(json).not.toContain('"sz_t3d_lerp_position"')

    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) })).toBe(code)
    } finally {
      ws.dispose()
    }
  })

  it('GATE: projeto SEM three NÃO vira bloco 3D (.add, .visible, .load e .traverse)', () => {
    ensureBlocklyInitialized()
    // Mesmas FORMAS que os facilitadores reconhecem, mas sem importar three.
    const src = [
      'const time = new Set();',
      'time.add(jogador);',
      'const caixa = document.getElementById("c");',
      'caixa.visible = false;',
      'const dados = new DadosLoader();',
      'dados.load("dados.json", (resultado) => {',
      '  console.log(resultado);',
      '});',
      'arvore.traverse((item) => {',
      '  console.log(item);',
      '});',
    ].join('\n')
    const state = buildWorkspaceStateFromIR({
      html: [],
      css: [],
      js: parseJS(src),
      extensions: [],
    })
    const json = JSON.stringify(state)
    expect(json).not.toContain('sz_t3d_')
    // continuam nos blocos genéricos
    expect(json).toContain('"sz_js_method_on"') // time.add(jogador)
    expect(json).toContain('"sz_js_member_set"') // caixa.visible = false
    expect(json).not.toContain('"sz_t3d_load_model"')
    expect(json).not.toContain('"sz_t3d_traverse"')
  })

  it('não toma métodos de objetos comuns só porque o mesmo projeto usa Three.js', () => {
    const src = [
      "import * as THREE from 'three';",
      'const cena = new THREE.Scene();',
      'const itens = new Set();',
      "itens.add('moeda');",
      'const estado = { visible: false };',
      'estado.visible = true;',
    ].join('\n')

    const json = JSON.stringify(
      buildWorkspaceStateFromIR({ html: [], css: [], js: parseJS(src), extensions: [] }),
    )

    expect(json).toContain('"sz_js_method_on"')
    expect(json).toContain('"sz_js_member_set"')
    expect(json).not.toContain('"sz_t3d_add_to"')
    expect(json).not.toContain('"sz_t3d_set_visible"')
  })

  it('reconhece facilitadores aninhados e respeita shadowing léxico', () => {
    const ir: SZIR = {
      html: [],
      css: [],
      extensions: [],
      js: [
        {
          type: 'event',
          target: 'document',
          event: 'click',
          body: [
            { type: 'threeSceneSetup', scene: 'cena' },
            {
              type: 'newInstance',
              varName: 'grupo',
              namespace: 'THREE',
              className: 'Group',
              args: [],
            },
            {
              type: 'memberCall',
              object: { type: 'var', name: 'cena' },
              method: 'add',
              args: [{ type: 'var', name: 'grupo' }],
            },
          ],
        },
        { type: 'threeSceneSetup', scene: 'alvo' },
        {
          type: 'event',
          target: 'document',
          event: 'click',
          body: [
            { type: 'var', name: 'alvo', value: { type: 'num', value: 1 } },
            {
              type: 'memberSet',
              object: { type: 'var', name: 'alvo' },
              name: 'visible',
              value: { type: 'bool', value: true },
            },
          ],
        },
      ],
    }

    const json = JSON.stringify(buildWorkspaceStateFromIR(ir))
    expect(json).toContain('"sz_t3d_add_to"')
    expect(json).toContain('"sz_js_member_set"')
    expect(json).not.toContain('"sz_t3d_set_visible"')
  })
})
