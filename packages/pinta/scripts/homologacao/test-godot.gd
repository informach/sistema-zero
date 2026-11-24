extends SceneTree
# Execute com --headless --path <pacote godot> --script <este arquivo absoluto>.
var failed := false

func require(condition: bool, message: String) -> void:
    if not condition:
        failed = true
        push_error(message)

func _initialize() -> void:
    call_deferred("run")

func run() -> void:
    var game: Variant = load("res://main.tscn").instantiate()
    root.add_child(game)
    await process_frame
    game.set_physics_process(false)
    require(game.scene_data.layers.size() == 18, "Vila perdeu camadas")
    require(game.animated_cells.size() > 0, "Água sem animação")
    require(game.map_objects.size() >= 6, "Objetos ausentes")
    var data: Dictionary = game.maps["vila-e-floresta"]
    var definition: Dictionary = data.sets[0]
    definition.layers.append({"id":"qa-objects","kind":"objects","name":"QA","visible":true,"objects":[{
        "id":"qa-marker","name":"QA marker","type":"marker","shape":"rect",
        "x":2,"y":3,"width":4,"height":4,"rotation":45,
        "properties":{"self":{"type":"object","value":"qa-marker"},"outside":{"type":"object","value":"door"}}
    }]})
    for layer in data.layers:
        if layer.kind == "objects":
            layer.objects.append({"id":"qa-parent","name":"QA instance","type":"","setId":definition.id,
                "x":300,"y":200,"width":definition.cols * data.tileSize * 2,
                "height":definition.rows * data.tileSize * 3,"rotation":30,"flipX":true,"properties":{}})
            layer.objects.append({"id":"qa-water","name":"QA animated art","type":"","x":400,"y":300,
                "width":16,"height":16,"art":{"assetId":data.tilesets[1].id,"tile":0},"properties":{}})
            break
    game._load_map("vila-e-floresta")
    await process_frame
    var ids: Dictionary = {}
    var child: Dictionary = {}
    for entry in game.map_objects:
        require(not ids.has(entry.data.id), "IDs duplicados entre instâncias")
        ids[entry.data.id] = true
        if entry.data.id == "qa-parent/qa-marker":
            child = entry
    require(not child.is_empty(), "Filho do conjunto ausente")
    if not child.is_empty():
        require(child.data.properties["self"].value == "qa-parent/qa-marker", "Referência local não religada")
        require(child.data.properties.outside.value == "door", "Referência externa alterada")
        var local := Vector2(definition.cols * data.tileSize * 2 - 4, 9)
        var expected := Vector2(300,200) + local.rotated(deg_to_rad(30))
        require(child.node.global_position.distance_to(expected) < 0.001, "Origem afim incorreta")
    require(game.animated_art.size() == 1, "Arte de tile não entrou na animação")
    if game.animated_art.size() == 1:
        var first: Rect2 = game.animated_art[0].sprite.region_rect
        game.elapsed = 0
        game._physics_process((game.animated_art[0].frames[0].duration + 1) / 1000.0)
        require(game.animated_art[0].sprite.region_rect != first, "Arte de tile não mudou de quadro")
    game._load_map("cabana")
    require(game.scene_data.name == "cabana", "Transição para cabana falhou")
    game._load_map("vila-e-floresta")
    game.set_physics_process(true)
    var start_y: float = game.player.global_position.y
    Input.action_press("ui_down")
    for frame in range(10):
        await physics_frame
    Input.action_release("ui_down")
    require(game.player.global_position.y > start_y + 5, "Personagem não andou")
    game.player.global_position = Vector2(64,68)
    for layer in game.world.find_children("*", "TileMapLayer", true, false):
        if layer.get_parent().name == "Paredes da vila":
            print("Godot QA: máscara do chão=", layer.tile_set.get_physics_layer_collision_layer(0), "; física=", layer.collision_enabled)
            var ts: Dictionary = game.scene_data.tilesets[0]
            var atlas: TileSetAtlasSource = layer.tile_set.get_source(0)
            var tile_data: TileData = atlas.get_tile_data(Vector2i(18 % int(ts.columns), 18 / int(ts.columns)), 0)
            print("Godot QA: sólidos=", ts.solid, "; contém18=", 18 in ts.solid, "; polígonos=", tile_data.get_collision_polygons_count(0), "; célula=", layer.get_cell_atlas_coords(Vector2i(5,4)), "; máscara personagem=", game.player.collision_mask)
    Input.action_press("ui_right")
    for frame in range(20):
        await physics_frame
    Input.action_release("ui_right")
    print("Godot QA: posição contra parede=", game.player.global_position)
    require(game.player.global_position.x > 64 and game.player.global_position.x <= 75, "Colisão da casa falhou")
    game.player.global_position = Vector2(104,104)
    for frame in range(2):
        await physics_frame
    require(game.scene_data.name == "cabana", "Porta não levou à cabana")
    game.player.global_position = Vector2(84,36)
    for frame in range(2):
        await physics_frame
    require(game.scene_data.name == "vila-e-floresta", "Porta não voltou à vila")
    if "--gpu" in OS.get_cmdline_user_args():
        game.set_physics_process(false)
        for child_node in game.player.get_children():
            if child_node is Camera2D:
                child_node.enabled = false
        game.player.global_position = Vector2(32,32)
        var water: Array = []
        var second_frame: float = game.animated_cells[0].frames[0].duration + 1
        for time_ms in [0,second_frame]:
            game.elapsed = time_ms
            game._physics_process(0)
            await process_frame
            await RenderingServer.frame_post_draw
            var frame_image := root.get_texture().get_image()
            var hero := frame_image.get_pixel(33,33)
            require([hero.r8,hero.g8,hero.b8] == [74,222,128], "GPU não desenhou o personagem no início")
            water.append(frame_image.get_region(Rect2i(448,224,16,16)).get_data())
        require(water[0] != water[1], "GPU não animou a água")
        game.player.global_position = Vector2(88,40)
        await process_frame
        await RenderingServer.frame_post_draw
        var final_image := root.get_texture().get_image()
        var covered := final_image.get_pixel(88,40)
        require([covered.r8,covered.g8,covered.b8] != [74,222,128], "GPU não desenhou o primeiro plano sobre o personagem")
        final_image.save_png("res://vila-gpu.png")
        if not failed:
            print("Godot GPU: pixels do personagem, água animada e primeiro plano conferidos")
    print("Godot QA: 18 camadas, objetos, IDs únicos, referências, origem afim, animação, movimento, colisão e portas; falhas=", failed)
    quit(1 if failed else 0)
