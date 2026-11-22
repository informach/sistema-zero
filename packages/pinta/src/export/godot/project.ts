import { godotPhysicsFor } from './physics'
import { godotRegions } from './regions'

export const godotProject = `config_version=5
[application]
config/name="Meu mapa do Pinta"
run/main_scene="res://main.tscn"
[display]
window/size/viewport_width=640
window/size/viewport_height=480
[rendering]
renderer/rendering_method="gl_compatibility"
textures/default_filters/use_nearest_mipmap_filter=false
textures/canvas_textures/default_texture_filter=0
`
export const godotScene = `[gd_scene load_steps=2 format=3]
[ext_resource type="Script" path="res://pinta.gd" id="1"]
[node name="MeuMapa" type="Node2D"]
script = ExtResource("1")
`
const buildGodotScript = (regional: boolean) => `extends Node2D
var scene_data: Dictionary
var maps: Dictionary
var world: Node2D
var player: CharacterBody2D
var animated_cells: Array = []
var animated_art: Array = []
var elapsed: float = 0.0
var map_objects: Array = []
var solid_tile_layers: Array = []
${regional ? `var platform_motion: bool = false
var can_jump: bool = false
var door_entered: bool = false
` : ''}
${godotPhysicsFor(regional)}
${regional ? `${godotRegions()}
` : ''}
func _effective(layers: Array, layer: Dictionary) -> Dictionary:
    var result: Dictionary = {"px":layer.get("parallaxX",1.0),"py":layer.get("parallaxY",1.0)}
    var parent_id: String = layer.get("parentId", "")
    for depth in range(32):
        if parent_id.is_empty():
            break
        var found := false
        for candidate in layers:
            if candidate.id == parent_id:
                result.px *= candidate.get("parallaxX",1.0)
                result.py *= candidate.get("parallaxY",1.0)
                parent_id = candidate.get("parentId", "")
                found = true
                break
        if not found:
            break
    return result

func _ready() -> void:
${regional ? `    if not _read_package():
        push_error("Pinta: pacote de mapas inválido.")
        get_tree().quit(1)
        return
` : `    maps = JSON.parse_string(FileAccess.get_file_as_string("res://maps.json"))
`}    # JSON usa float; Array.has distingue float de int. Normalize os índices na fronteira.
    for data in maps.values():
        for tileset in data.tilesets:
            tileset.solid = PackedInt32Array(tileset.solid)
            tileset.platform = PackedInt32Array(tileset.platform)
${regional ? `    var start: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://start.json"))
    if not start is String or not maps.has(start):
        push_error("Pinta: mapa inicial ausente.")
        get_tree().quit(1)
        return
    _load_map(start)
` : `    _load_map(JSON.parse_string(FileAccess.get_file_as_string("res://start.json")))
`}
func _texture(path: String) -> Texture2D:
    return load("res://" + path)

func propriedade(object: Variant, key: String) -> Variant:
    if not object is Dictionary:
        return null
    var value: Variant = object.get("properties",{}).get(key)
    return value.get("value") if value is Dictionary else value

func objeto_por_id(reference: String) -> Variant:
    for entry in map_objects:
        if entry.data.id == reference:
            return entry.data
    return null

func recurso_imagem(reference: String) -> Variant:
    for resource in scene_data.get("art",[]) + scene_data.tilesets:
        if resource.id == reference:
            return resource.image
    return null

func propriedade_camada(reference: String, key: String) -> Variant:
    for layer in scene_data.layers:
        if layer.id == reference:
            return propriedade(layer,key)
    return null

func propriedade_peca(reference: String, tile: float, key: String) -> Variant:
    if not is_finite(tile) or floorf(tile) != tile or tile < 0:
        return null
    for tileset in scene_data.tilesets:
        if tileset.id == reference and tile < tileset.count:
            return propriedade({"properties":tileset.get("tileProperties",{}).get(str(int(tile)),{})},key)
    return null

func _art_tile(animation: Dictionary, time_ms: float) -> int:
    var total: float = 0
    for frame in animation.frames:
        total += frame.duration
    var at: float = fmod(maxf(0,time_ms),total) if animation.get("loop",true) else minf(maxf(0,time_ms),total)
    for frame in animation.frames:
        at -= frame.duration
        if at < 0:
            return int(frame.tile)
    return int(animation.frames[-1].tile)

func _load_map(key: String) -> void:
    if world:
${regional ? `        world.hide()
        remove_child(world)
` : ''}        world.queue_free()
    animated_cells.clear()
    animated_art.clear()
    elapsed = 0.0
    map_objects.clear()
    solid_tile_layers.clear()
${regional ? `    platform_motion = false
    can_jump = false
` : ''}    scene_data = maps[key]
    world = Node2D.new()
    add_child(world)
${regional ? `    var area := Rect2i(_grid_origin(scene_data),Vector2i(scene_data.cols,scene_data.rows))
    _layers(scene_data.layers,world,area,{})
` : `    _layers(scene_data.layers, world, int(scene_data.cols), int(scene_data.rows), {})
`}    player = CharacterBody2D.new()
    player.name = "Jogador"
${regional ? `    if scene_data.get("version",1) == 4 and not platform_motion:
        player.motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
` : ''}    var shape := CollisionShape2D.new()
    var rectangle := RectangleShape2D.new()
    rectangle.size = Vector2(scene_data.tileSize * 0.65, scene_data.tileSize * 0.65)
    shape.shape = rectangle
    player.add_child(shape)
    var picture := Polygon2D.new()
    var half: Vector2 = rectangle.size / 2
    picture.polygon = PackedVector2Array([-half, Vector2(half.x,-half.y),half,Vector2(-half.x,half.y)])
    picture.color = Color("4ade80")
    player.add_child(picture)
    player.z_index = 10
    var camera := Camera2D.new()
    camera.position_smoothing_enabled = false
    player.add_child(camera)
    world.add_child(player)
${regional ? `    player.position = (Vector2(area.position) + Vector2(0.5,0.5)) * scene_data.tileSize
` : `    player.position = Vector2(scene_data.tileSize / 2,scene_data.tileSize / 2)
`}    for object in map_objects:
        if object.data.get("role", "") == "start":
            player.global_position = object.node.global_position
            break
    print("Pinta: ", key, " / ", scene_data.layers.size(), " camadas")

${regional ? `func _layers(layers: Array, parent: Node2D, area: Rect2i, inherited: Dictionary, prefix: String = "", local_ids: Dictionary = {}) -> void:
` : `func _layers(layers: Array, parent: Node2D, cols: int, rows: int, inherited: Dictionary, prefix: String = "", local_ids: Dictionary = {}) -> void:
`}    var groups: Dictionary = inherited.duplicate()
    for layer in layers:
        var owner_node: Node2D = groups.get(layer.get("parentId", ""), parent)
        var distance := _effective(layers,layer)
        var node: Node2D = Parallax2D.new() if layer.kind != "group" and (distance.px != 1 or distance.py != 1) else Node2D.new()
        node.name = layer.name
        node.position = Vector2(layer.get("offsetX",0),layer.get("offsetY",0))
        node.modulate.a = layer.get("opacity",1.0)
        node.visible = layer.get("visible",true)
        node.set_meta("properties",layer.get("properties",{}))
        owner_node.add_child(node)
        if node is Parallax2D:
            node.scroll_scale = Vector2(distance.px,distance.py)
            node.scroll_offset = Vector2(layer.get("offsetX",0),layer.get("offsetY",0))
        if layer.kind == "group":
            groups[layer.id] = node
        elif layer.kind == "tiles":
            var ts: Dictionary = {}
            for candidate in scene_data.tilesets:
                if candidate.id == layer.tilesetId:
                    ts = candidate
            if ts.is_empty():
                continue
${regional ? `            if _precise_physics():
                solid_tile_layers.append({"node":node,"layer":layer,"area":area,"tileset":ts})
` : `            if scene_data.get("version",1) >= 3:
                solid_tile_layers.append({"node":node,"layer":layer,"cols":cols,"rows":rows,"tileset":ts})
`}            var tile_set := TileSet.new()
            var size: int = int(scene_data.tileSize)
            tile_set.tile_size = Vector2i(size,size)
            tile_set.add_physics_layer()
            var source := TileSetAtlasSource.new()
            source.texture = _texture(ts.image)
            source.texture_region_size = Vector2i(size,size)
            tile_set.add_source(source,0)
            for index in range(int(ts.count)):
                var at := Vector2i(index % int(ts.columns),index / int(ts.columns))
                source.create_tile(at)
${regional ? `                if not _precise_physics() and (layer.get("collision",false) or index in ts.solid or index in ts.platform):
` : `                if scene_data.get("version",1) < 3 and (layer.get("collision",false) or index in ts.solid or index in ts.platform):
`}                    var td: TileData = source.get_tile_data(at,0)
                    td.add_collision_polygon(0)
                    var h: float = size / 2.0
                    td.set_collision_polygon_points(0,0,PackedVector2Array([Vector2(-h,-h),Vector2(h,-h),Vector2(h,h),Vector2(-h,h)]))
${regional ? `                    if index in ts.platform and (scene_data.get("version",1) != 4 or not layer.get("collision",false) and not index in ts.solid):
` : `                    if index in ts.platform:
`}                        td.set_collision_polygon_one_way(0,0,true)
            var tile_layer := TileMapLayer.new()
            tile_layer.tile_set = tile_set
            tile_layer.z_index = 20 if layer.get("front",false) else 0
            tile_layer.modulate.a = 0.0 if layer.get("collision",false) else 1.0
            node.add_child(tile_layer)
${regional ? `            if scene_data.get("version",1) == 4:
                tile_layer.collision_enabled = not _precise_physics() and node.is_visible_in_tree()
            _visit_cells(layer,area,area,func(cell: int,col: int,row: int) -> bool:
` : `            for at in range(cols * rows):
                var cell: int = int(layer.cells[at])
                if cell < 0:
                    continue
`}                var tile: int = cell & 4095
${regional ? `                var position := Vector2i(col,row)
` : `                var position := Vector2i(at % cols,at / cols)
`}                tile_layer.set_cell(position,0,Vector2i(tile % int(ts.columns),tile / int(ts.columns)),cell & 28672)
                if ts.get("animations",{}).has(str(tile)):
                    animated_cells.append({"layer":tile_layer,"position":position,"frames":ts.animations[str(tile)],"columns":int(ts.columns),"flags":cell & 28672})
${regional ? `                if scene_data.get("version",1) == 4 and node.is_visible_in_tree() and not layer.get("collision",false) and tile in ts.platform and not tile in ts.solid:
                    platform_motion = true
                return false
            )
` : ''}        elif layer.kind == "objects":
            for original in layer.objects:
                var object: Dictionary = original.duplicate(true)
                if not prefix.is_empty():
                    object.id = prefix + str(original.id)
                    for key in object.get("properties",{}):
                        var value: Variant = object.properties[key]
                        if value is Dictionary and value.get("type","") == "object" and local_ids.has(str(value.value)):
                            value.value = prefix + str(value.value)
                var item := Node2D.new()
                item.name = object.name if object.name else object.id
                item.position = Vector2(object.x,object.y)
                item.rotation_degrees = object.get("rotation",0)
                item.set_meta("pinta",object)
                node.add_child(item)
                map_objects.append({"node":item,"data":object})
                if object.get("shape", "") == "polyline":
                    var path := Path2D.new()
                    path.curve = Curve2D.new()
                    for point in object.get("points",[]):
                        path.curve.add_point(Vector2(point.x,point.y))
                    item.add_child(path)
                elif object.width > 0 and object.height > 0 and not object.has("setId"):
${regional ? `                    var sensor := Area2D.new()
                    item.add_child(sensor)
` : `                    var area := Area2D.new()
                    item.add_child(area)
`}                    if object.get("shape", "") == "polygon":
                        var polygon := CollisionPolygon2D.new()
                        var points := PackedVector2Array()
                        for point in object.get("points",[]):
                            points.append(Vector2(point.x,point.y))
                        polygon.polygon = points
${regional ? `                        sensor.add_child(polygon)
` : `                        area.add_child(polygon)
`}                    else:
                        var collision := CollisionShape2D.new()
                        collision.position = Vector2(object.width,object.height) / 2
                        if object.get("shape", "") == "ellipse":
                            var ellipse := CircleShape2D.new()
                            ellipse.radius = object.width / 2
                            collision.shape = ellipse
                            collision.scale.y = object.height / object.width
                        else:
                            var rectangle := RectangleShape2D.new()
                            rectangle.size = Vector2(object.width,object.height)
                            collision.shape = rectangle
${regional ? `                        sensor.add_child(collision)
` : `                        area.add_child(collision)
`}                if object.has("setId"):
                    for definition in scene_data.get("sets",[]):
                        if definition.id == object.setId:
                            var instance := Node2D.new()
                            var sx: float = object.width / (definition.cols * scene_data.tileSize)
                            var sy: float = object.height / (definition.rows * scene_data.tileSize)
                            instance.position = Vector2(object.width if object.get("flipX",false) else 0,object.height if object.get("flipY",false) else 0)
                            instance.scale = Vector2(-sx if object.get("flipX",false) else sx,-sy if object.get("flipY",false) else sy)
${regional ? `                            var child_area := Rect2i(_grid_origin(definition),Vector2i(definition.cols,definition.rows))
                            instance.position -= Vector2(child_area.position) * scene_data.tileSize * instance.scale
` : ''}                            item.add_child(instance)
                            var child_ids: Dictionary = {}
                            for child_layer in definition.layers:
                                for child in child_layer.get("objects",[]):
                                    child_ids[str(child.id)] = true
${regional ? `                            _layers(definition.layers,instance,child_area,{},str(object.id) + "/",child_ids)
` : `                            _layers(definition.layers,instance,int(definition.cols),int(definition.rows),{},str(object.id) + "/",child_ids)
`}                elif object.has("art"):
                    var picture := Sprite2D.new()
                    picture.centered = false
                    var art: Dictionary = {}
                    for candidate in scene_data.get("art",[]):
                        if candidate.id == object.art.assetId:
                            art = candidate
                    for candidate in scene_data.tilesets:
                        if candidate.id == object.art.assetId:
                            art = candidate
                    if not art.is_empty():
                        picture.texture = _texture(art.image)
                        if art.has("sprite"):
                            var sprite: Dictionary = art.sprite
                            var selected: Dictionary = sprite.animations[0]
                            var tile: int = int(selected.frames[0].tile)
                            for animation in sprite.animations:
                                if animation.id == object.art.get("animationId", ""):
                                    selected = animation
                                    tile = _art_tile(selected,0)
                                    animated_art.append({"sprite":picture,"frames":selected.frames,"loop":selected.loop,"columns":int(sprite.columns),"width":int(sprite.frameWidth),"height":int(sprite.frameHeight)})
                            picture.region_enabled = true
                            picture.region_rect = Rect2((tile % int(sprite.columns))*sprite.frameWidth,(tile / int(sprite.columns))*sprite.frameHeight,sprite.frameWidth,sprite.frameHeight)
                        elif art.has("columns"):
                            picture.region_enabled = true
                            var tile: int = int(object.art.get("tile",0))
                            var size: int = int(scene_data.tileSize)
                            picture.region_rect = Rect2((tile % int(art.columns))*size,(tile / int(art.columns))*size,size,size)
                            if art.get("animations",{}).has(str(tile)):
                                animated_art.append({"sprite":picture,"frames":art.animations[str(tile)],"columns":int(art.columns),"width":size,"height":size})
                        picture.scale = Vector2(object.width / picture.get_rect().size.x,object.height / picture.get_rect().size.y)
                        picture.flip_h = object.get("flipX",false)
                        picture.flip_v = object.get("flipY",false)
                        item.add_child(picture)

func _physics_process(delta: float) -> void:
    elapsed += delta * 1000
    if is_instance_valid(player):
${regional ? `        var movement := Input.get_vector("ui_left","ui_right","ui_up","ui_down")
        if platform_motion:
            player.velocity.x = Input.get_axis("ui_left","ui_right") * 120
            if Input.is_action_just_pressed("ui_up") and can_jump:
                player.velocity.y = -250
            player.velocity.y = minf(500,player.velocity.y + 500 * delta)
        else:
            player.velocity = movement * 120
` : `        player.velocity = Input.get_vector("ui_left","ui_right","ui_up","ui_down") * 120
`}        var previous := player.global_position
${regional ? `        if _precise_physics():
` : `        player.move_and_slide()
        if scene_data.get("version",1) >= 3:
`}            var body_size: Vector2 = Vector2.ONE * scene_data.tileSize * 0.65
${regional ? `            var body := Rect2(previous - body_size / 2,body_size)
            var displacement := player.velocity * delta
            if scene_data.get("version",1) < 4:
                player.move_and_slide()
                displacement = player.global_position - previous
            var result := mover_corpo(body,displacement)
            if platform_motion:
                var landing: Variant = pouso(body,result) if player.velocity.y >= 0 else null
                var hit_floor := player.velocity.y > 0 and result.position.y - body.position.y < player.velocity.y * delta - 1e-5
                can_jump = landing != null or hit_floor
                if landing != null:
                    result = landing
                if landing != null or absf(result.position.y - body.position.y - player.velocity.y * delta) > 1e-5:
                    player.velocity.y = 0
` : `            var result := mover_corpo(Rect2(previous - body_size / 2,body_size),player.global_position - previous)
`}            player.global_position = result.position + body_size / 2
${regional ? `        else:
            player.move_and_slide()
            if scene_data.get("version",1) == 4:
                var half: Vector2 = Vector2.ONE * scene_data.tileSize * 0.325
                var top: Vector2 = Vector2(_grid_origin(scene_data)) * scene_data.tileSize
                var bottom: Vector2 = top + Vector2(scene_data.cols,scene_data.rows) * scene_data.tileSize
                player.global_position = player.global_position.clamp(top + half,bottom - half)
            if platform_motion:
                can_jump = player.is_on_floor()
        var on_door := false
` : ''}        for entry in map_objects:
            var object: Dictionary = entry.data
            if not entry.node.is_visible_in_tree() or object.get("role", "") != "door":
                continue
            var point: Vector2 = entry.node.to_local(player.global_position)
            var hit := Rect2(0,0,object.width,object.height).has_point(point)
            if object.get("shape", "") == "ellipse":
                var radius := Vector2(object.width,object.height) / 2
                hit = ((point - radius) / radius).length_squared() <= 1
            elif object.get("shape", "") == "polygon":
                var polygon := PackedVector2Array()
                for vertex in object.get("points",[]):
                    polygon.append(Vector2(vertex.x,vertex.y))
                hit = Geometry2D.is_point_in_polygon(point,polygon)
            if hit:
${regional ? `                on_door = true
                if scene_data.get("version",1) == 4 and door_entered:
                    continue
` : ''}                var destination: Variant = object.properties.get("destino",object.properties.get("destination", ""))
                if destination is Dictionary:
                    destination = destination.value
${regional ? `                var key := _door_key(destination)
                if not key.is_empty():
                    door_entered = true
                    _load_map(key)
                    return
        if not on_door:
            door_entered = false
` : `                for key in maps:
                    if key == destination or maps[key].id == destination:
                        _load_map(key)
                        return
`}    for animation in animated_cells:
        var total: float = 0
        for frame in animation.frames:
            total += frame.duration
        var time: float = fmod(elapsed,total)
        for frame in animation.frames:
            time -= frame.duration
            if time < 0:
                var tile: int = int(frame.tile)
                animation.layer.set_cell(animation.position,0,Vector2i(tile % animation.columns,tile / animation.columns),animation.flags)
                break
    for animation in animated_art:
        var tile: int = _art_tile(animation,elapsed)
        animation.sprite.region_rect = Rect2((tile % animation.columns)*animation.width,(tile / animation.columns)*animation.height,animation.width,animation.height)
${regional ? `
func _door_key(destination: Variant) -> String:
    if not destination is String or destination.is_empty():
        return ""
    if maps.has(destination):
        return destination
    var named := ""
    for key in maps:
        if maps[key].id == destination:
            return key
        if scene_data.get("version",1) == 4 and maps[key].name == destination:
            if not named.is_empty():
                return ""
            named = key
    return named
` : ''}`

export const godotScript = buildGodotScript(false)
export const godotRegionalScript = buildGodotScript(true)
