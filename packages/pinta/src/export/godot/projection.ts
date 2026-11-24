import { createPintaProjectionGeometry, PINTA_HEX_CELL_FLAGS } from '@sistemazero/core/creations'
import type { PintaProjectedSceneMap } from '@sistemazero/core/studio/pinta-projected-scene'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, CELL_MAX_TILES } from '../../tiles/cell'

/** The package carries a compact affine basis from Core. Godot uses it both
 * for drawing and collision, including the half-offset for negative indices.
 */
export function godotProjectionLayout(
  map: Pick<PintaProjectedSceneMap, 'projection' | 'origin' | 'cols' | 'rows'>,
) {
  const geometry = createPintaProjectionGeometry(map.projection)
  const origin = geometry.center(0, 0)
  const vector = (x: number, y: number) => [x, y] as const
  const c2 = geometry.center(2, 0),
    r2 = geometry.center(0, 2),
    c1 = geometry.center(1, 0),
    r1 = geometry.center(0, 1)
  const col = vector((c2.x - origin.x) / 2, (c2.y - origin.y) / 2)
  const row = vector((r2.x - origin.x) / 2, (r2.y - origin.y) / 2)
  const extent = geometry.worldBounds({ ...map.origin, cols: map.cols, rows: map.rows })
  return {
    projection: map.projection,
    area: { ...map.origin, cols: map.cols, rows: map.rows },
    origin: vector(origin.x, origin.y),
    col,
    row,
    oddCol: vector(c1.x - origin.x - col[0], c1.y - origin.y - col[1]),
    oddRow: vector(r1.x - origin.x - row[0], r1.y - origin.y - row[1]),
    size: vector(geometry.cellWidth, geometry.cellHeight),
    extent: [extent.x, extent.y, extent.width, extent.height] as const,
    points: geometry.polygon(0, 0).map((point) => vector(point.x - origin.x, point.y - origin.y)),
  }
}

export const godotProjection = `
var projection_layouts: Dictionary = {}

class ProjectedTiles extends Node2D:
    var paint: Callable
    var continuous: bool
    var previous_transform: Transform2D
    var previous_size: Vector2
    func _process(_delta: float) -> void:
        var current := get_global_transform_with_canvas()
        var size := get_viewport_rect().size
        if continuous or current != previous_transform or size != previous_size:
            previous_transform = current
            previous_size = size
            queue_redraw()
    func _draw() -> void:
        if paint.is_valid():
            paint.call(self)

func _pair(value: Array) -> Vector2:
    return Vector2(value[0],value[1])

func _layout_center(layout: Dictionary, col: int, row: int) -> Vector2:
    var center := _pair(layout.origin) + _pair(layout.col) * col + _pair(layout.row) * row
    if col & 1:
        center += _pair(layout.oddCol)
    if row & 1:
        center += _pair(layout.oddRow)
    return center

func _layout_bounds(layout: Dictionary, area: Rect2i) -> Rect2:
    if layout.is_empty():
        return Rect2(Vector2(area.position) * scene_data.tileSize,Vector2(area.size) * scene_data.tileSize)
    var extent: Array = layout.extent
    return Rect2(extent[0],extent[1],extent[2],extent[3])

func _tile_footprint(layout: Dictionary, col: int, row: int) -> PackedVector2Array:
    var origin := _layout_center(layout,col,row)
    var points := PackedVector2Array()
    for offset in layout.points:
        points.append(origin + _pair(offset))
    return points

func _local_view(node: Node2D) -> Rect2:
    var inverse := node.get_global_transform_with_canvas().affine_inverse()
    var viewport := node.get_viewport_rect()
    var box := Rect2(inverse * viewport.position,Vector2.ZERO)
    for point in [viewport.end,Vector2(viewport.position.x,viewport.end.y),Vector2(viewport.end.x,viewport.position.y)]:
        box = box.expand(inverse * point)
    return box

func _layout_view(layout: Dictionary, area: Rect2i, viewport: Rect2) -> Rect2i:
    var inverse := Transform2D(_pair(layout.col),_pair(layout.row),_pair(layout.origin)).affine_inverse()
    # Offset parity never changes the affine basis. Expand the view by the
    # footprint and by the maximum parity displacement before inverting it.
    var pad := _pair(layout.size) / 2 + _pair(layout.oddCol).abs() + _pair(layout.oddRow).abs()
    var left := viewport.position - pad
    var right := viewport.end + pad
    var bounds := Rect2(inverse * left,Vector2.ZERO)
    for point in [right,Vector2(left.x,right.y),Vector2(right.x,left.y)]:
        bounds = bounds.expand(inverse * point)
    var first := Vector2i(bounds.position.floor())
    var end := Vector2i(bounds.end.ceil()) + Vector2i.ONE
    return Rect2i(first,end - first).intersection(area)

func _draw_projected(node: ProjectedTiles, cells: Dictionary, sheet: Dictionary, texture: Texture2D, area: Rect2i, layout: Dictionary) -> void:
    if node.get_global_transform_with_canvas().determinant() == 0:
        return
    var size: int = int(scene_data.tileSize)
    var image_size := Vector2.ONE * size
    var footprint := _pair(layout.size)
    var visible := _layout_view(layout,area,_local_view(node).grow(size * sqrt(2)))
    var batch: Array = []
    _visit_cells(cells,area,visible,func(cell: int,col: int,row: int) -> bool:
        batch.append({"cell":cell,"position":_layout_center(layout,col,row)})
        return false
    )
    batch.sort_custom(func(a: Dictionary,b: Dictionary) -> bool:
        return a.position.y < b.position.y or (a.position.y == b.position.y and a.position.x < b.position.x)
    )
    var hex: bool = layout.projection.kind == "hexagonal"
    for entry in batch:
        var cell: int = entry.cell
        var tile: int = cell & ${CELL_MAX_TILES - 1}
        var key := str(tile)
        if sheet.get("animations",{}).has(key):
            tile = _art_tile({"frames":sheet.animations[key]},elapsed)
        var center: Vector2 = entry.position + Vector2(size - footprint.x,footprint.y - size) / 2
        if hex:
            var turn := (60 if cell & ${PINTA_HEX_CELL_FLAGS.rotate60} else 0) + (120 if cell & ${PINTA_HEX_CELL_FLAGS.rotate120} else 0)
            node.draw_set_transform(center,deg_to_rad(turn),Vector2(-1 if cell & ${PINTA_HEX_CELL_FLAGS.flipX} else 1,-1 if cell & ${PINTA_HEX_CELL_FLAGS.flipY} else 1))
        else:
            var x := -1.0 if cell & ${CELL_FLIP_H} else 1.0
            var y := -1.0 if cell & ${CELL_FLIP_V} else 1.0
            if cell & ${CELL_FLIP_D}:
                node.draw_set_transform_matrix(Transform2D(Vector2(0,y),Vector2(x,0),center))
            else:
                node.draw_set_transform(center,0.0,Vector2(x,y))
        var at := Vector2(tile % int(sheet.columns),tile / int(sheet.columns)) * size
        node.draw_texture_rect_region(texture,Rect2(-image_size / 2,image_size),Rect2(at,image_size))
`
