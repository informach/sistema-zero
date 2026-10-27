import { describe, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { HTMLConnectionChecker } from '../../../blockly/htmlConnectionChecker'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { compileStatements } from '../../../generators/js'
import { normalizeSZIR, SZIRV2Schema } from '../../../ir'
import { parseJS } from '../../../parsers/js'
import { gameThreeDBlocks } from '../blocks'
import { call, loadRuntime, meta } from './platformHarness'

ensureBlocklyInitialized()
registerExtensionBlocks(gameThreeDBlocks)
const source = `
const cena=SZGame3D.createFullscreenScene("#94d5f5");
const personagem=SZGame3D.createModelFile(cena,"aventureiro",1.66);
const chave=SZGame3D.createModelFile(cena,"chave",1);
SZGame3D.frameScene(cena,24,7,14);
SZGame3D.walkArea(personagem,-11,1,-5,5);
SZGame3D.walkAnimations(personagem,"parado","andando");
SZGame3D.onTouch(personagem,chave,()=>{SZGame3D.setVisible(chave,"hide");});
SZGame3D.animate(cena,()=>{SZGame3D.topDown(personagem,4);});`
describe('percurso básico do Jogo 3D', () => {
  test('JavaScript, blocos reais, IR e geração conservam comandos e encontros', () => {
    const ir = normalizeSZIR({
      html: [],
      css: [],
      js: parseJS(source),
      extensions: [{ extensionId: 'game-3d' }],
    })
    const initial = SZIRV2Schema.safeParse(ir)
    expect(initial.success, JSON.stringify(initial.success ? {} : initial.error.issues)).toBe(true)
    const workspace = new Blockly.Workspace()
    workspace.connectionChecker = new HTMLConnectionChecker()
    try {
      Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir) as never, workspace)
      const restored = buildIRFromWorkspace(workspace)
      const parsed = SZIRV2Schema.safeParse(restored)
      expect(parsed.success, JSON.stringify(parsed.success ? {} : parsed.error.issues)).toBe(true)
      if (!parsed.success) return
      const js = compileStatements(
        [
          ...parsed.data.behavior.start,
          ...parsed.data.behavior.events,
          ...parsed.data.behavior.loops,
        ],
        0,
      )
      for (const name of ['frameScene', 'walkArea', 'walkAnimations', 'onTouch', 'topDown'])
        expect(js).toContain(`SZGame3D.${name}(`)
      expect(workspace.getAllBlocks(false).some((b) => b.type.startsWith('sz_adv_'))).toBe(false)
    } finally {
      workspace.dispose()
    }
  })
  test('movimento tem a mesma distância em 60 e 120 Hz e para ao soltar', () => {
    function travel(fps: number) {
      const { api, fire } = loadRuntime(),
        world = call(api, 'createScene', 'tela'),
        player = call(api, 'createBox', world, { size: 1 })
      world._dt = 1 / fps
      fire('keydown', { code: 'ArrowRight', preventDefault() {} })
      for (let i = 0; i < fps; i++) call(api, 'topDown', player, 4)
      const distance = player.position.x
      fire('keyup', { code: 'ArrowRight' })
      call(api, 'topDown', player, 4)
      expect(player.position.x).toBe(distance)
      expect(meta(player).vx).toBe(0)
      return distance
    }
    expect(travel(60)).toBeCloseTo(4, 8)
    expect(travel(120)).toBeCloseTo(4, 8)
  })
  test('áreas ligadas permitem atravessar; um intervalo sem chão não pode ser saltado', () => {
    const { api, fire } = loadRuntime(),
      world = call(api, 'createScene', 'tela'),
      player = call(api, 'createBox', world, { size: 1 })
    call(api, 'walkArea', player, 0, 1, -1, 1)
    call(api, 'walkArea', player, 1, 2, -1, 1)
    call(api, 'walkArea', player, 3, 5, -1, 1)
    fire('keydown', { code: 'ArrowRight', preventDefault() {} })
    for (let i = 0; i < 25; i++) call(api, 'topDown', player, 4)
    expect(player.position.x).toBeGreaterThan(1)
    world._dt = 0.1
    call(api, 'topDown', player, 100)
    expect(player.position.x).toBeLessThanOrEqual(2)
    expect(player.position.x).toBeGreaterThan(1.9)
  })
  test('encontro direto dispara uma vez por contato e ignora elementos escondidos', () => {
    const { api } = loadRuntime({ realGeometry: true }),
      world = call(api, 'createScene', 'tela')
    const player = call(api, 'createBox', world, { size: 1 }),
      key = call(api, 'createBox', world, { size: 1 })
    let contacts = 0
    call(api, 'onTouch', player, key, () => contacts++)
    call(api, 'animate', world, () => {})
    const step = (time: number) => world.renderer._loop(time)
    step(0)
    step(16)
    step(32)
    expect(contacts).toBe(1)
    call(api, 'setPosition', key, 5, 0, 0)
    step(48)
    call(api, 'setPosition', key, 0, 0, 0)
    step(64)
    expect(contacts).toBe(2)
    call(api, 'setVisible', key, 'hide')
    step(80)
    step(96)
    expect(contacts).toBe(2)
  })
  test('enquadramento se afasta em painel estreito e mantém o plano distante além da cena', () => {
    const { api } = loadRuntime(),
      world = call(api, 'createScene', 'tela')
    const cam = world.camera
    cam.fov = 60
    cam.aspect = 1
    cam.isPerspectiveCamera = true
    cam.updateProjectionMatrix = () => {}
    world._perspectiveCamera = cam
    call(api, 'frameScene', world, 24, 7, 14)
    world._resizeCamera(cam, 1600, 900)
    const wide = cam.position.z
    world._resizeCamera(cam, 400, 900)
    expect(cam.position.z).toBeGreaterThan(wide)
    call(api, 'frameScene', world, 500, 100, 500)
    world._resizeCamera(cam, 100, 1200)
    expect(cam.far).toBeGreaterThan(Math.hypot(cam.position.y - 50, cam.position.z))
  })
})
