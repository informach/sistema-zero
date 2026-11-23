import { CELL_MAX_TILES } from '../../tiles/cell'

/** Scene 3 uses authored outlines in world coordinates, independent of the
 * engine's scaled CollisionShape2D approximation. Layer views retain the document;
 * candidate tile cells are visited through the inverse affine body bounds.
 */
export const godotPhysicsFor = (regional: boolean) => `
func _outline_hits(object: Dictionary, query: PackedVector2Array) -> bool:
    var kind: String = object.get("shape","rect")
    if kind == "point":
        return Geometry2D.is_point_in_polygon(Vector2.ZERO,query)
    if kind == "ellipse":
        var radius := Vector2(object.width,object.height) / 2
        if radius.x <= 0 or radius.y <= 0:
            return false
        var circle := PackedVector2Array()
        for point in query:
            circle.append((point - radius) / radius)
        if Geometry2D.is_point_in_polygon(Vector2.ZERO,circle):
            return true
        for index in range(4):
            var a: Vector2 = circle[index]
            var b: Vector2 = circle[(index + 1) % 4]
            var edge := b - a
            var t := clampf(-a.dot(edge) / maxf(edge.length_squared(),1e-30),0,1)
            if (a + t * edge).length_squared() < 1:
                return true
        return false
    var points := PackedVector2Array()
    var open: bool = kind == "polyline"
    if open or kind == "polygon":
        for point in object.get("points",[]):
            points.append(Vector2(point.x,point.y))
    else:
        points = PackedVector2Array([Vector2.ZERO,Vector2(object.width,0),Vector2(object.width,object.height),Vector2(0,object.height)])
    if points.is_empty():
        return false
    if not open:
        var direction := Vector2.ZERO
        var area := false
        for point in points:
            if direction == Vector2.ZERO and point != points[0]:
                direction = point - points[0]
            if direction.cross(point - points[0]) != 0:
                area = true
        if not area:
            return false
    for point in points:
        if Geometry2D.is_point_in_polygon(point,query):
            return true
    if not open:
        for point in query:
            if Geometry2D.is_point_in_polygon(point,points):
                return true
    for index in range(points.size() - (1 if open else 0)):
        var a: Vector2 = points[index]
        var b: Vector2 = points[(index + 1) % points.size()]
        for side in range(4):
            if Geometry2D.segment_intersects_segment(a,b,query[side],query[(side + 1) % 4]) != null:
                return true
    return false

func _local_body(node: Node2D, rect: Rect2) -> PackedVector2Array:
    var points := PackedVector2Array()
    var margin: float = minf(minf(rect.size.x,rect.size.y),1) * 1e-9
    var body := rect.grow(-margin)
    for point in [body.position,Vector2(body.end.x,body.position.y),body.end,Vector2(body.position.x,body.end.y)]:
        points.append(node.to_local(point))
    return points

func bloqueado(rect: Rect2) -> bool:
    if not rect.position.is_finite() or not rect.size.is_finite() or rect.size.x <= 0 or rect.size.y <= 0:
        return false
${
  regional
    ? `    var area := Rect2(Vector2(_grid_origin(scene_data)) * scene_data.tileSize,Vector2(scene_data.cols,scene_data.rows) * scene_data.tileSize)
    if not area.encloses(rect):
`
    : `    if rect.position.x < 0 or rect.position.y < 0 or rect.end.x > scene_data.cols * scene_data.tileSize or rect.end.y > scene_data.rows * scene_data.tileSize:
`
}        return true
    for entry in map_objects:
        if entry.data.get("collision",false) and entry.node.is_visible_in_tree() and entry.node.global_transform.determinant() != 0:
            if _outline_hits(entry.data,_local_body(entry.node,rect)):
                return true
    return _visit_tiles(rect,false,func(_entry: Dictionary,col: int,row: int,query: PackedVector2Array) -> bool:
        var local_query := PackedVector2Array()
        var size: float = scene_data.tileSize
        for point in query:
            local_query.append(point - Vector2(col * size,row * size))
        return _outline_hits({"width":size,"height":size},local_query)
    )

func _visit_tiles(rect: Rect2, platforms: bool, visit: Callable) -> bool:
    var size: float = scene_data.tileSize
    for entry in solid_tile_layers:
        if not entry.node.is_visible_in_tree() or entry.node.global_transform.determinant() == 0:
            continue
        var query := _local_body(entry.node,rect)
        var bounds := Rect2(query[0],Vector2.ZERO)
        for point in query:
            bounds = bounds.expand(point)
${
  regional
    ? `        var start := Vector2i(floori((bounds.position.x - 1e-7) / size),floori((bounds.position.y - 1e-7) / size))
        var end := Vector2i(ceili((bounds.end.x + 1e-7) / size),ceili((bounds.end.y + 1e-7) / size))
        var area: Rect2i = entry.area
        var view := Rect2i(start,end - start).intersection(area)
        if _visit_cells(entry.layer,area,view,func(cell: int,col: int,row: int) -> bool:
            var index: int = cell & ${CELL_MAX_TILES - 1}
            var solid: bool = entry.layer.get("collision",false) or index in entry.tileset.solid
            if (platforms and (solid or not index in entry.tileset.platform)) or (not platforms and not solid):
                return false
            return visit.call(entry,col,row,query)
        ):
            return true
`
    : `        for row in range(maxi(0,floori((bounds.position.y - 1e-7) / size)),mini(entry.rows,ceili((bounds.end.y + 1e-7) / size))):
            for col in range(maxi(0,floori((bounds.position.x - 1e-7) / size)),mini(entry.cols,ceili((bounds.end.x + 1e-7) / size))):
                var cell: int = int(entry.layer.cells[row * entry.cols + col])
                if cell < 0:
                    continue
                var index: int = cell & ${CELL_MAX_TILES - 1}
                var solid: bool = entry.layer.get("collision",false) or index in entry.tileset.solid
                if (platforms and (solid or not index in entry.tileset.platform)) or (not platforms and not solid):
                    continue
                if visit.call(entry,col,row,query):
                    return true
`
}    return false

func _platform_surface(points: PackedVector2Array, body: Rect2, direction: float) -> Variant:
    var left := INF
    var right := -INF
    for point in points:
        left = minf(left,point.x)
        right = maxf(right,point.x)
    left = maxf(left,body.position.x)
    right = minf(right,body.end.x)
    if right - left <= 1e-9:
        return null
    var heights: Array[float] = []
    for index in range(points.size()):
        var a := points[index]
        var b := points[(index + 1) % points.size()]
        if a.x >= left and a.x <= right:
            heights.append(a.y)
        if a.x == b.x:
            continue
        for x in [left,right]:
            if x >= minf(a.x,b.x) and x <= maxf(a.x,b.x):
                heights.append(a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x))
    if heights.is_empty():
        return null
    return heights.min() if direction > 0 else heights.max()

func pouso(previous: Rect2, desired: Rect2, gravity: float = 1) -> Variant:
    if not is_finite(gravity) or gravity == 0 or not previous.position.is_finite() or not previous.size.is_finite() or not desired.position.is_finite() or not desired.size.is_finite():
        return null
    if minf(minf(previous.size.x,previous.size.y),minf(desired.size.x,desired.size.y)) <= 0:
        return null
    var direction := signf(gravity)
    # Vector2 uses float32 in the standard Godot build, as FRect does in Pygame.
    var epsilon := 1e-6
    for value in [previous.position.x,previous.position.y,previous.end.x,previous.end.y,desired.position.x,desired.position.y,desired.end.x,desired.end.y]:
        epsilon = maxf(epsilon,absf(value) * pow(2,-23))
    if (desired.position.y - previous.position.y) * direction < -epsilon:
        return null
    var choice: Dictionary = {"body":null,"was_supported":false}
    _visit_tiles(previous.merge(desired).grow(epsilon),true,func(entry: Dictionary,col: int,row: int,_query: PackedVector2Array) -> bool:
        var size: float = scene_data.tileSize
        var points := PackedVector2Array()
        for offset in [Vector2.ZERO,Vector2(size,0),Vector2(size,size),Vector2(0,size)]:
            points.append(entry.node.to_global(Vector2(col * size,row * size) + offset))
        var floor: Variant = _platform_surface(points,desired,direction)
        if floor == null:
            return false
        var old_floor: Variant = _platform_surface(points,previous,direction)
        if old_floor == null:
            old_floor = floor
        var feet: float = desired.end.y if direction > 0 else desired.position.y
        var old_feet: float = previous.end.y if direction > 0 else previous.position.y
        if (old_feet - old_floor) * direction > epsilon or (feet - floor) * direction < -epsilon:
            return false
        var candidate := desired
        candidate.position.y = floor - (desired.size.y if direction > 0 else 0)
        if choice.body == null or (candidate.position.y - choice.body.position.y) * direction < 0:
            choice.body = candidate
            choice.was_supported = absf(old_feet - old_floor) <= epsilon
        return false
    )
    if choice.body != null and bloqueado(choice.body):
        return previous if choice.was_supported and not bloqueado(previous) else null
    return choice.body

func mover_corpo(rect: Rect2, displacement: Vector2) -> Rect2:
    if not displacement.is_finite():
        return rect
    for axis in range(2):
        var limit: float = (scene_data.cols if axis == 0 else scene_data.rows) * scene_data.tileSize
        var delta := clampf(displacement[axis],-limit,limit)
        if delta == 0:
            continue
        var endpoint := rect
        endpoint.position[axis] += delta
        if bloqueado(rect):
            if not bloqueado(endpoint):
                rect = endpoint
            continue
        var low := 0.0
        var high := 1.0
        for iteration in range(39):
            var fraction: float = 1 if iteration == 0 else (low + high) / 2
            var sweep := rect
            sweep.position[axis] += minf(0,delta * fraction)
            sweep.size[axis] += absf(delta * fraction)
            if bloqueado(sweep):
                high = fraction
            else:
                low = fraction
                if fraction == 1:
                    break
        rect.position[axis] += delta * low
    return rect
`
