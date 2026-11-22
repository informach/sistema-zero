import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { buildScenePackage } from '../../src/export/scenePackage'
import { regionVilaPlatform } from '../../src/testing/regionVilaPlatform'
import { vilaEFloresta } from './fixture'
import { nativeImageOf } from './generate'

const dense = process.argv.includes('--dense')
const legacy = process.argv.includes('--legacy')
const files = await (() => {
  if (dense) {
    const { map, assets } = vilaEFloresta()
    return buildScenePackage(map, assets, 'godot', { imageOf: nativeImageOf })
  }
  const { map, assets } = regionVilaPlatform()
  return buildScenePackage(legacy ? { ...map, physics: undefined } : map, assets, 'godot', {
    imageOf: nativeImageOf,
  })
})()
const prefix = join(tmpdir(), 'pinta-godot-region-')
const folder = await mkdtemp(prefix)
if (!folder.startsWith(prefix) || dirname(folder) !== dirname(prefix))
  throw new Error('Pasta temporária fora do diretório de homologação.')
try {
  await Promise.all(
    Object.entries(files).map(([path, data]) => Bun.write(join(folder, path), data)),
  )
  await Bun.write(
    join(folder, 'proof.gd'),
    `extends SceneTree

var failures: Array[String] = []

func _initialize() -> void:
    call_deferred("_verify")

func check(value: bool, label: String) -> void:
    if not value:
        failures.append(label)

func _verify() -> void:
    var scene: Node2D = load("res://main.tscn").instantiate()
    root.add_child(scene)
    scene.set_physics_process(false)
    check(scene.scene_data.id == "vila-e-floresta","root")
    check(scene.scene_data.physics == "${legacy ? 'legacy' : 'precise'}","physics")
    check(scene.player.position == Vector2(8,-45),"spawn")
    var native: Array[Node] = scene.find_children("*","TileMapLayer",true,false)
    check(native.size() > 16,"native layers including instances")
    check(native.any(func(node: TileMapLayer) -> bool:
        return node.get_used_cells().has(Vector2i(-64,-64))
    ),"signed cells")
    check(scene.animated_cells.size() > 0,"tile animation")
    check(scene.propriedade_peca("vila-pecas",0,"atrito") == 0.8,"tile property")
    check(scene.objeto_por_id("morador-obj").properties.porta.value == "door","object property")
    if scene.scene_data.physics == "precise":
        check(scene.bloqueado(Rect2(2,-33,8,8)) and not scene.bloqueado(Rect2(2,-66,8,8)),"solid vs one-way")
    else:
        var layer: TileMapLayer = native.filter(func(node: TileMapLayer) -> bool:
            return node.get_used_cells().has(Vector2i(0,-4))
        )[0]
        check(layer.get_cell_tile_data(Vector2i(0,-4)).is_collision_polygon_one_way(0,0),"native one-way")
        check(not layer.get_cell_tile_data(Vector2i(0,-2)).is_collision_polygon_one_way(0,0),"native solid")
    scene.set_physics_process(true)
    for frame in range(65):
        await physics_frame
    check(scene.can_jump and absf(scene.player.position.y + 37.2) < 0.15,"standing below")
    await process_frame
    Input.action_press("ui_up")
    await physics_frame
    await physics_frame
    Input.action_release("ui_up")
    var apex: float = scene.player.position.y
    for frame in range(130):
        await physics_frame
        apex = minf(apex,scene.player.position.y)
    check(apex < -71 and absf(scene.player.position.y + 69.2) < 0.15,"passed below and landed")
    scene.set_physics_process(false)
    scene.player.position = Vector2(88,-40)
    scene._physics_process(0)
    check(scene.scene_data.id == "cabana","door by id")
    scene.player.position = Vector2(72,48)
    scene._physics_process(0)
    scene.player.position = Vector2(88,48)
    scene._physics_process(0)
    check(scene.scene_data.id == "vila-e-floresta","return door by name")
    print(JSON.stringify({"godot":Engine.get_version_info().string,"physics":"${legacy ? 'legacy' : 'precise'}","layers":native.size(),"apex":apex,"failures":failures}))
    quit(0 if failures.is_empty() else 1)
`,
  )
  async function godot(args: string[]) {
    const run = Bun.spawn(
      [process.env.PINTA_GODOT_BIN ?? 'godot', '--headless', '--path', folder, ...args],
      { cwd: folder, stdout: 'pipe', stderr: 'pipe' },
    )
    const [code, out, err] = await Promise.all([
      run.exited,
      new Response(run.stdout).text(),
      new Response(run.stderr).text(),
    ])
    assert.equal(code, 0, out + err)
    const diagnostics = (out + err)
      .split(/\r?\n/)
      .filter((line) => /(?:SCRIPT ERROR|Parse Error|ERROR:|res:\/\/pinta.gd:)/.test(line))
    assert.deepEqual(diagnostics, [])
    return out.trim()
  }
  await godot(['--editor', '--import'])
  const output = await godot(
    dense
      ? ['--quit-after', '3']
      : ['--fixed-fps', '60', '--quit-after', '240', '--script', 'res://proof.gd'],
  )
  assert.match(output, dense ? /Pinta: vila-e-floresta/ : /"failures":\[\]/)
  console.log(output)
} finally {
  await rm(folder, { recursive: true, force: true })
}
