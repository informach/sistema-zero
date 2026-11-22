import {
  PINTA_REGION_CHUNK_BASE64_CHARS,
  PINTA_REGION_CHUNK_BYTES,
  PINTA_REGION_LIMITS,
  PINTA_REGION_SIDE,
} from '@sistemazero/core/creations'
import { PINTA_IMAGE_WORLD_LIMITS } from '@sistemazero/core/studio/pinta-image'
import { PINTA_REGION_SCENE_MAX_INDEX_BYTES } from '@sistemazero/core/studio/pinta-region-scene'
import { CELL_MAX_TILES } from '../../tiles/cell'
import { TILED_PACKAGE_LIMITS } from '../tiled/package'

export const godotRegions = (regional: boolean) => `
const REGION_SIDE := ${PINTA_REGION_SIDE}
const REGION_BYTES := ${PINTA_REGION_CHUNK_BYTES}

func _integer_in(value: Variant, low: int, high: int) -> bool:
    return (value is int or value is float) and is_finite(value) and floorf(value) == value and value >= low and value <= high

func _read_package() -> bool:
    var file := FileAccess.open("res://maps.json", FileAccess.READ)
    if file == null or file.get_length() > ${regional ? TILED_PACKAGE_LIMITS.fileBytes : TILED_PACKAGE_LIMITS.unpackedBytes}:
        return false
    var parsed: Variant = JSON.parse_string(file.get_as_text())
    if not parsed is Dictionary or parsed.size() > ${PINTA_IMAGE_WORLD_LIMITS.maps}:
        return false
    maps = parsed
    var jobs: Array = []
    for id in maps:
        var data: Variant = maps[id]
        if not data is Dictionary:
            return false
        if data.get("version",1) != 4:
            ${regional ? 'return false' : 'continue'}
        if not data.get("tilesets") is Array or not data.get("sets",[]) is Array or data.get("sets",[]).size() > 64:
            return false
        if data.get("id") != id:
            return false
        var map_chunks := 0
        var counts: Dictionary = {}
        for tileset in data.tilesets:
            counts[tileset.id] = int(tileset.count)
        for grid in [data] + data.get("sets",[]):
            if not grid is Dictionary or not grid.get("origin") is Dictionary or not grid.get("layers") is Array:
                return false
            if not _integer_in(grid.get("cols"),1,${PINTA_REGION_LIMITS.maxAxis}) or not _integer_in(grid.get("rows"),1,${PINTA_REGION_LIMITS.maxAxis}):
                return false
            if not _integer_in(grid.origin.get("col"),${PINTA_REGION_LIMITS.minCoordinate},${PINTA_REGION_LIMITS.maxCoordinateExclusive}) or not _integer_in(grid.origin.get("row"),${PINTA_REGION_LIMITS.minCoordinate},${PINTA_REGION_LIMITS.maxCoordinateExclusive}):
                return false
            var area := Rect2i(_grid_origin(grid),Vector2i(grid.cols,grid.rows))
            if area.end.x > ${PINTA_REGION_LIMITS.maxCoordinateExclusive} or area.end.y > ${PINTA_REGION_LIMITS.maxCoordinateExclusive}:
                return false
            if grid.layers.size() > ${PINTA_REGION_LIMITS.maxLayers}:
                return false
            var grid_chunks := 0
            for layer in grid.layers:
                if not layer is Dictionary:
                    return false
                if layer.kind != "tiles":
                    continue
                if not layer.get("cells") is Dictionary:
                    return false
                var wire: Dictionary = layer.cells
                if wire.get("kind") != "regions" or wire.get("version") != 1 or wire.get("side") != REGION_SIDE or wire.get("encoding") != "i16le-base64-v1" or not wire.get("chunks") is Array:
                    return false
                grid_chunks += wire.chunks.size()
                map_chunks += wire.chunks.size()
                if grid_chunks > ${PINTA_REGION_LIMITS.maxChunks} or map_chunks * REGION_BYTES > ${PINTA_REGION_SCENE_MAX_INDEX_BYTES}:
                    return false
                var seen: Dictionary = {}
                var count: int = counts.get(layer.tilesetId,0)
                if count == 0:
                    return false
                for chunk in wire.chunks:
                    if not chunk is Dictionary:
                        return false
                    if not _integer_in(chunk.get("col"),${Math.floor(PINTA_REGION_LIMITS.minCoordinate / PINTA_REGION_SIDE)},${Math.ceil(PINTA_REGION_LIMITS.maxCoordinateExclusive / PINTA_REGION_SIDE) - 1}) or not _integer_in(chunk.get("row"),${Math.floor(PINTA_REGION_LIMITS.minCoordinate / PINTA_REGION_SIDE)},${Math.ceil(PINTA_REGION_LIMITS.maxCoordinateExclusive / PINTA_REGION_SIDE) - 1}):
                        return false
                    var coord := Vector2i(chunk.col,chunk.row)
                    if seen.has(coord):
                        return false
                    if not area.intersects(Rect2i(coord * REGION_SIDE,Vector2i.ONE * REGION_SIDE)):
                        return false
                    if not chunk.data is String or chunk.data.length() != ${PINTA_REGION_CHUNK_BASE64_CHARS}:
                        return false
                    seen[coord] = true
                jobs.append({"layer":layer,"area":area,"count":count})
    # Every map and set has passed the limits before decoding the first chunk.
    for job in jobs:
        var indexed: Dictionary = {}
        for chunk in job.layer.cells.chunks:
            var coord := Vector2i(chunk.col,chunk.row)
            var bytes := Marshalls.base64_to_raw(chunk.data)
            if bytes.size() != REGION_BYTES or Marshalls.raw_to_base64(bytes) != chunk.data:
                return false
            var occupied := false
            for index in range(REGION_SIDE * REGION_SIDE):
                var cell := bytes.decode_s16(index * 2)
                if cell == -1:
                    continue
                var position := coord * REGION_SIDE + Vector2i(index % REGION_SIDE,index / REGION_SIDE)
                if cell < 0 or (cell & ${CELL_MAX_TILES - 1}) >= job.count or not job.area.has_point(position):
                    return false
                occupied = true
            if not occupied:
                return false
            indexed[coord] = bytes
        job.layer["regionIndex"] = indexed
    return true

func _grid_origin(grid: Dictionary) -> Vector2i:
    var origin: Dictionary = grid.get("origin",{})
    return Vector2i(origin.get("col",0),origin.get("row",0))

func _precise_physics() -> bool:
    return scene_data.get("physics","precise") == "precise" if scene_data.get("version",1) == 4 else scene_data.get("version",1) >= 3

func _visit_cells(layer: Dictionary, area: Rect2i, view: Rect2i, visit: Callable) -> bool:
    if view.size.x <= 0 or view.size.y <= 0:
        return false
    if not layer.has("regionIndex"):
        for row in range(view.position.y,view.end.y):
            for col in range(view.position.x,view.end.x):
                var cell: int = int(layer.cells[(row - area.position.y) * area.size.x + col - area.position.x])
                if cell >= 0 and visit.call(cell,col,row):
                    return true
        return false
    var first := Vector2i(floori(float(view.position.x) / REGION_SIDE),floori(float(view.position.y) / REGION_SIDE))
    var end := Vector2i(ceili(float(view.end.x) / REGION_SIDE),ceili(float(view.end.y) / REGION_SIDE))
    var span := end - first
    var coordinates: Array = []
    if span.x * span.y < layer.regionIndex.size():
        for row in range(first.y,end.y):
            for col in range(first.x,end.x):
                var coord := Vector2i(col,row)
                if layer.regionIndex.has(coord):
                    coordinates.append(coord)
    else:
        coordinates = layer.regionIndex.keys()
    for coord: Vector2i in coordinates:
        var start := coord * REGION_SIDE
        var intersection := view.intersection(Rect2i(start,Vector2i.ONE * REGION_SIDE))
        if not intersection.has_area():
            continue
        var bytes: PackedByteArray = layer.regionIndex[coord]
        for row in range(intersection.position.y,intersection.end.y):
            for col in range(intersection.position.x,intersection.end.x):
                var offset := (row - start.y) * REGION_SIDE + col - start.x
                var cell := bytes.decode_s16(offset * 2)
                if cell >= 0 and visit.call(cell,col,row):
                    return true
    return false
`
