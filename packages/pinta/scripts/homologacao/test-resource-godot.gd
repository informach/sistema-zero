extends SceneTree

func _initialize() -> void:
    call_deferred("_run")

func _run() -> void:
    var packed = load("res://main.tscn")
    if not packed:
        quit(1)
        return
    var world = packed.instantiate()
    root.add_child(world)
    await process_frame
    world.set_physics_process(false)
    for child in world.player.get_children():
        if child is Camera2D:
            child.enabled = false
    var samples: Array = []
    var gpu := "--gpu" in OS.get_cmdline_user_args()
    for time_ms in [0,300,600,10000]:
        world.elapsed = float(time_ms)
        world._physics_process(0)
        var sprite: Sprite2D = world.animated_art[0].sprite
        var region := sprite.region_rect
        var pixel := sprite.texture.get_image().get_pixel(int(region.position.x + 8),int(region.position.y + 8))
        var rgba := [pixel.r8,pixel.g8,pixel.b8,pixel.a8]
        if gpu:
            await process_frame
            await RenderingServer.frame_post_draw
            var image := root.get_texture().get_image()
            pixel = image.get_pixel(24,24)
            rgba = [pixel.r8,pixel.g8,pixel.b8,pixel.a8]
            if time_ms == 10000:
                image.save_png("res://resource-gpu.png")
        samples.append(rgba)
    var expected := [[255,0,0,255],[0,255,0,255],[0,0,255,255],[0,0,255,255]]
    if samples != expected:
        push_error("Resource frame mismatch: " + JSON.stringify(samples))
        quit(1)
        return
    print(JSON.stringify({"godot_frames":samples,"gpu":gpu,"version":world.scene_data.version}))
    quit(0)
