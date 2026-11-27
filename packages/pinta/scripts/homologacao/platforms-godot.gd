extends SceneTree

func _initialize() -> void:
    call_deferred("check_platforms")

func check_platforms() -> void:
    var runtime: Script = load("res://pinta.gd")
    if not runtime or not runtime.can_instantiate():
        printerr("O adaptador não compilou no Godot real")
        quit(1)
        return
    var scene: Node2D = load("res://main.tscn").instantiate()
    root.add_child(scene)
    scene.set_physics_process(false)
    await process_frame
    var before := Rect2(40,10,4,4)
    var desired := Rect2(40,100,4,4)
    var support: Variant = scene.pouso(before,desired)
    if support == null or absf(support.position.y - 36.25) > 0.0001:
        printerr("Piso pequeno perdido: ",support)
        quit(1)
        return
    var checks := 1
    var cases: Array = [
        [Rect2(40,100,4,4),Rect2(40,10,4,4),1,null],
        [Rect2(40,40,4,4),Rect2(40,100,4,4),1,null],
        [before,desired,0,null],
        [Rect2(40,100,4,4),Rect2(40,10,4,4),-1,42.25],
        [Rect2(36,10,4,4),Rect2(36,100,4,4),1,null],
        [Rect2(44,10,4,4),Rect2(44,100,4,4),1,null],
        [before,desired,NAN,null],
    ]
    for item in cases:
        var actual: Variant = scene.pouso(item[0],item[1],item[2])
        if (item[3] == null and actual != null) or (item[3] != null and (actual == null or absf(actual.position.y - item[3]) > 0.0001)):
            printerr("Pouso diferente: ",item," / ",actual)
            quit(1)
            return
        checks += 1
    for frame in range(50):
        var next: Rect2 = support
        next.position.y += 0.01
        support = scene.pouso(support,next)
        if support == null or absf(support.end.y - 40.25) > 0.0001:
            printerr("Apoio instável: ",support)
            quit(1)
            return
        checks += 1
    var fixture: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://platform-probes.json"))
    for item in fixture.cases:
        scene._load_map(item.scene.id)
        await process_frame
        var a: Dictionary = item.previous
        var b: Dictionary = item.desired
        var actual: Variant = scene.pouso(Rect2(a.x,a.y,a.width,a.height),Rect2(b.x,b.y,b.width,b.height),item.gravity)
        var expected: Variant = item.result
        if (actual == null) != (expected == null):
            printerr("Forma perdida: ",item.name," / ",actual," / ",expected)
            quit(1)
            return
        if expected != null and (absf(actual.position.x - expected.x) > 0.0001 or absf(actual.position.y - expected.y) > 0.0001 or absf(actual.size.x - expected.width) > 0.0001 or absf(actual.size.y - expected.height) > 0.0001):
            printerr("Contorno diferente: ",item.name," / ",actual," / ",expected)
            quit(1)
            return
    print(JSON.stringify({"godot":Engine.get_version_info().string,"checks":checks,"smallPlatform":true,"geometryCases":fixture.cases.size()}))
    quit(0)
