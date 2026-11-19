extends SceneTree

func _initialize() -> void:
    call_deferred("check_physics")

func check_physics() -> void:
    var scene: Node2D = load("res://main.tscn").instantiate()
    root.add_child(scene)
    scene.set_physics_process(false)
    await process_frame
    var fixture: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://physics-probes.json"))
    var count := 0
    for probe in fixture.probes:
        var box: Dictionary = probe.box
        var actual: bool = scene.bloqueado(Rect2(box.x,box.y,box.width,box.height))
        if actual != probe.blocked:
            printerr("Pinta physics mismatch: ",probe.name," / ",actual)
            quit(1)
            return
        count += 1
    var result: Rect2 = scene.mover_corpo(Rect2(10,28,10,10),Vector2(100,0))
    if absf(result.position.x - 30) > 0.00001:
        printerr("Pinta thin wall mismatch: ",result)
        quit(1)
        return
    print(JSON.stringify({"godot":Engine.get_version_info().string,"probes":count,"thinWall":true}))
    quit(0)
