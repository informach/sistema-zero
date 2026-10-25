"""Modelos 3D (rmodels.c do raylib 6.0): malhas geradas, .glb/.gltf, materiais, desenho,
caixas, raio contra malha e animação de esqueleto.

A malha mora aqui (os números) e no navegador (na placa de vídeo): ``upload`` manda os dados uma
vez e o ``vaoId`` é o nome dela lá. Desenhar grava um registro com a malha, o material e a matriz;
a animação calcula aqui as matrizes dos ossos e o navegador as aplica nos vértices, com a mesma
conta que o raylib faz no processador (soma dos ossos ponderada pelos pesos).
"""
import math
import os
import struct as _bin
from array import array

from . import _constants as K
from . import _gltf
from . import _raymath as rm
from . import _rt as rt
from . import _shapes as ps
from ._shaders import default_shader
from ._args import color, integer, number, struct, vec3
from ._assets import _png_size
from ._collide3d import ray_triangle
from ._structs import (BoneInfo, BoundingBox, Color, Material, MaterialMap, Matrix, Mesh, Model,
                       ModelAnimation, Ray, RayCollision, Shader, Texture, Transform, Vector3,
                       Vector4)

MAX_MATERIAL_MAPS = 12
MAX_SHADER_LOCATIONS = 32
DEFAULT_SHADER_ID = 3
MAX_BONES = 256

# Partes de uma malha no pacote que vai para o navegador (protocol.ts, renderer3d.ts).
HAS_TEXCOORDS = 1
HAS_NORMALS = 2
HAS_COLORS = 4
HAS_INDICES = 8
HAS_BONES = 16


def _identity():
    return rm._make(_gltf.IDENTITY)


def load_material_default():
    material = Material()
    material.shader = default_shader()
    maps = [MaterialMap() for _ in range(MAX_MATERIAL_MAPS)]
    maps[K.MATERIAL_MAP_ALBEDO].texture = Texture(rt.DEFAULT_TEXTURE_ID, 1, 1, 1, 7)
    maps[K.MATERIAL_MAP_ALBEDO].color = Color(255, 255, 255, 255)
    maps[K.MATERIAL_MAP_METALNESS].color = Color(255, 255, 255, 255)
    material.maps = maps
    material.params = [0.0, 0.0, 0.0, 0.0]
    return material


def is_material_valid(material, /):
    m = struct(material, Material, 'is_material_valid', 'material')
    return bool(m.maps) and m.shader.id > 0


def unload_material(material, /):
    struct(material, Material, 'unload_material', 'material')


def set_material_texture(material, mapType, texture, /):
    f = 'set_material_texture'
    m = struct(material, Material, f, 'material')
    index = integer(mapType, f, 'mapType')
    if not 0 <= index < MAX_MATERIAL_MAPS:
        raise IndexError(f'{f}: mapType vai de 0 a {MAX_MATERIAL_MAPS - 1} (MATERIAL_MAP_ALBEDO é 0).')
    m.maps[index].texture = struct(texture, Texture, f, 'texture')


def set_model_mesh_material(model, meshId, materialId, /):
    f = 'set_model_mesh_material'
    m = struct(model, Model, f, 'model')
    mesh_id, material_id = integer(meshId, f, 'meshId'), integer(materialId, f, 'materialId')
    if mesh_id >= m.meshCount:
        print('WARNING: MESH: Id greater than mesh count')
    elif material_id >= m.materialCount:
        print('WARNING: MATERIAL: Id greater than material count')
    else:
        m.meshMaterial[mesh_id] = material_id


# Malhas --------------------------------------------------------------------------------------

def make_mesh(vertices, texcoords=None, normals=None, colors=None, indices=None, bone_ids=None,
              bone_weights=None, texcoords2=None):
    mesh = Mesh()
    count = len(vertices) // 3
    mesh.vertexCount = count
    mesh.triangleCount = len(indices) // 3 if indices else count // 3
    mesh.vertices = array('f', vertices)
    if texcoords is not None:
        mesh.texcoords = array('f', texcoords)
    if texcoords2 is not None:
        mesh.texcoords2 = array('f', texcoords2)
    if normals is not None:
        mesh.normals = array('f', normals)
    if colors is not None:
        mesh.colors = bytearray(colors)
    if indices is not None:
        mesh.indices = array('H', indices)
    if bone_ids is not None and bone_weights is not None:
        mesh.boneIndices = bytearray(bone_ids)
        mesh.boneWeights = array('f', bone_weights)
    return mesh


def upload(mesh, function='upload_mesh'):
    if mesh.vaoId > 0:
        print(f'WARNING: VAO: [ID {mesh.vaoId}] Trying to re-load an already loaded mesh')
        return
    count = mesh.vertexCount
    if mesh.vertices is None or count <= 0:
        return
    vertices = mesh.vertices
    if len(vertices) < count * 3:
        raise ValueError(f'{function}: a malha diz ter {count} vértices, mas vertices tem só '
                         f'{len(vertices) // 3}.')
    parts = [array('f', vertices[:count * 3]).tobytes()]
    flags = 0
    if mesh.texcoords is not None:
        flags |= HAS_TEXCOORDS
        parts.append(array('f', mesh.texcoords[:count * 2]).tobytes())
    if mesh.normals is not None:
        flags |= HAS_NORMALS
        parts.append(array('f', mesh.normals[:count * 3]).tobytes())
    if mesh.colors is not None:
        flags |= HAS_COLORS
        parts.append(bytes(mesh.colors[:count * 4]))
    index_count = 0
    if mesh.indices is not None:
        flags |= HAS_INDICES
        index_count = mesh.triangleCount * 3
        indices = array('H', mesh.indices[:index_count])
        if indices and max(indices) >= count:
            raise ValueError(f'{function}: a malha tem um índice que passa do número de vértices.')
        parts.append(indices.tobytes())
    if mesh.boneIndices is not None and mesh.boneWeights is not None:
        flags |= HAS_BONES
        parts.append(bytes(mesh.boneIndices[:count * 4]))
        parts.append(array('f', mesh.boneWeights[:count * 4]).tobytes())
    blob = b''.join(parts)
    mesh_id = rt.new_id()
    mesh.vaoId = mesh_id
    mesh.vboId = [mesh_id] * 9
    rt.pending_models.append(['mesh', mesh_id, count, index_count, flags, len(blob), blob])


def upload_mesh(mesh, dynamic, /):
    upload(struct(mesh, Mesh, 'upload_mesh', 'mesh'))


def unload_mesh(mesh, /):
    m = struct(mesh, Mesh, 'unload_mesh', 'mesh')
    if m.vaoId:
        rt.pending_free.append(m.vaoId)
        m.vaoId = 0


def _generated(vertices, texcoords, normals, indices=None):
    mesh = make_mesh(vertices, texcoords, normals, indices=indices)
    upload(mesh)
    return mesh


def gen_mesh_poly(sides, radius, /):
    f = 'gen_mesh_poly'
    n, r = integer(sides, f, 'sides'), number(radius, f, 'radius')
    if n < 3:
        return Mesh()
    vertices = []
    d, step = 0.0, 360.0 / n
    for _ in range(n):
        a, b = math.radians(d), math.radians(d + step)
        vertices.extend((0.0, 0.0, 0.0, math.sin(a) * r, 0.0, math.cos(a) * r,
                         math.sin(b) * r, 0.0, math.cos(b) * r))
        d += step
    count = n * 3
    return _generated(vertices, [0.0] * (count * 2), [0.0, 1.0, 0.0] * count)


def gen_mesh_plane(width, length, resX, resZ, /):
    f = 'gen_mesh_plane'
    w, l = number(width, f, 'width'), number(length, f, 'length')
    rx, rz = integer(resX, f, 'resX') + 1, integer(resZ, f, 'resZ') + 1
    if rx < 2 or rz < 2:
        return Mesh()
    vertices, texcoords = [], []
    for z in range(rz):
        zp = (z / (rz - 1) - 0.5) * l
        for x in range(rx):
            vertices.extend(((x / (rx - 1) - 0.5) * w, 0.0, zp))
    for v in range(rz):
        for u in range(rx):
            texcoords.extend((u / (rx - 1), v / (rz - 1)))
    indices = []
    for face in range((rx - 1) * (rz - 1)):
        i = face + face // (rx - 1)
        indices.extend((i + rx, i + 1, i, i + rx, i + rx + 1, i + 1))
    return _generated(vertices, texcoords, [0.0, 1.0, 0.0] * (rx * rz), indices)


_CUBE_TEX = (0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1,
             0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1)
_CUBE_NORMALS = ((0, 0, 1), (0, 0, -1), (0, 1, 0), (0, -1, 0), (1, 0, 0), (-1, 0, 0))


def gen_mesh_cube(width, height, length, /):
    f = 'gen_mesh_cube'
    x, y, z = number(width, f, 'width') / 2, number(height, f, 'height') / 2, number(length, f, 'length') / 2
    vertices = [-x, -y, z, x, -y, z, x, y, z, -x, y, z,
                -x, -y, -z, -x, y, -z, x, y, -z, x, -y, -z,
                -x, y, -z, -x, y, z, x, y, z, x, y, -z,
                -x, -y, -z, x, -y, -z, x, -y, z, -x, -y, z,
                x, -y, -z, x, y, -z, x, y, z, x, -y, z,
                -x, -y, -z, -x, -y, z, -x, y, z, -x, y, -z]
    normals = []
    for normal in _CUBE_NORMALS:
        normals.extend(normal * 4)
    indices = []
    for k in range(6):
        indices.extend((4 * k, 4 * k + 1, 4 * k + 2, 4 * k, 4 * k + 2, 4 * k + 3))
    return _generated(vertices, [float(v) for v in _CUBE_TEX], [float(v) for v in normals], indices)


def _from_shape(shape):
    vertices, texcoords, normals = ps.unwelded(shape)
    return _generated(vertices, texcoords, normals)


def gen_mesh_sphere(radius, rings, slices, /):
    f = 'gen_mesh_sphere'
    r, ri, sl = number(radius, f, 'radius'), integer(rings, f, 'rings'), integer(slices, f, 'slices')
    if ri < 3 or sl < 3:
        return Mesh()
    ps.set_epsilon_degenerate_sphere(0.0)
    shape = ps.parametric_sphere(sl, ri)
    ps.scale(shape, r, r, r)
    return _from_shape(shape)


def gen_mesh_hemi_sphere(radius, rings, slices, /):
    f = 'gen_mesh_hemi_sphere'
    r, ri, sl = number(radius, f, 'radius'), integer(rings, f, 'rings'), integer(slices, f, 'slices')
    if ri < 3 or sl < 3:
        return Mesh()
    r = max(r, 0.0)
    shape = ps.hemisphere(sl, ri)
    ps.scale(shape, r, r, r)
    return _from_shape(shape)


def gen_mesh_cylinder(radius, height, slices, /):
    f = 'gen_mesh_cylinder'
    r, h, sl = number(radius, f, 'radius'), number(height, f, 'height'), integer(slices, f, 'slices')
    if sl < 3:
        return Mesh()
    body = ps.cylinder(sl, 8)
    ps.scale(body, r, r, h)
    ps.rotate(body, -math.pi / 2, (1, 0, 0))
    top = ps.disk(r, sl, (0, 0, 0), (0, 0, 1))
    top.tcoords = [0.0] * (2 * top.npoints)
    ps.rotate(top, -math.pi / 2, (1, 0, 0))
    ps.rotate(top, math.radians(90), (0, 1, 0))
    ps.translate(top, 0, h, 0)
    bottom = ps.disk(r, sl, (0, 0, 0), (0, 0, -1))
    bottom.tcoords = [0.95] * (2 * bottom.npoints)
    ps.rotate(bottom, math.pi / 2, (1, 0, 0))
    ps.rotate(bottom, math.radians(-90), (0, 1, 0))
    ps.merge(body, top)
    ps.merge(body, bottom)
    return _from_shape(body)


def gen_mesh_cone(radius, height, slices, /):
    f = 'gen_mesh_cone'
    r, h, sl = number(radius, f, 'radius'), number(height, f, 'height'), integer(slices, f, 'slices')
    if sl < 3:
        return Mesh()
    body = ps.cone(sl, 8)
    ps.scale(body, r, r, h)
    ps.rotate(body, -math.pi / 2, (1, 0, 0))
    ps.rotate(body, math.pi / 2, (0, 1, 0))
    bottom = ps.disk(r, sl, (0, 0, 0), (0, 0, -1))
    bottom.tcoords = [0.95] * (2 * bottom.npoints)
    ps.rotate(bottom, math.pi / 2, (1, 0, 0))
    ps.merge(body, bottom)
    return _from_shape(body)


def gen_mesh_torus(radius, size, radSeg, sides, /):
    f = 'gen_mesh_torus'
    r, s = number(radius, f, 'radius'), number(size, f, 'size')
    seg, n = integer(radSeg, f, 'radSeg'), integer(sides, f, 'sides')
    if n < 3 or seg < 3:
        return Mesh()
    r = min(max(r, 0.1), 1.0)
    shape = ps.torus(seg, n, r)
    ps.scale(shape, s / 2, s / 2, s / 2)
    return _from_shape(shape)


def gen_mesh_knot(radius, size, radSeg, sides, /):
    f = 'gen_mesh_knot'
    r, s = number(radius, f, 'radius'), number(size, f, 'size')
    seg, n = integer(radSeg, f, 'radSeg'), integer(sides, f, 'sides')
    if n < 3 or seg < 3:
        return Mesh()
    r = min(max(r, 0.5), 3.0)
    shape = ps.trefoil(seg, n, r)
    ps.scale(shape, s, s, s)
    return _from_shape(shape)


def get_mesh_bounding_box(mesh, /):
    m = struct(mesh, Mesh, 'get_mesh_bounding_box', 'mesh')
    return BoundingBox(*(Vector3(*corner) for corner in _mesh_bounds(m)))


def _mesh_bounds(m):
    v = m.vertices
    if v is None or m.vertexCount <= 0:
        return (0.0, 0.0, 0.0), (0.0, 0.0, 0.0)
    xs, ys, zs = v[0:m.vertexCount * 3:3], v[1:m.vertexCount * 3:3], v[2:m.vertexCount * 3:3]
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))


def get_ray_collision_mesh(ray, mesh, transform, /):
    f = 'get_ray_collision_mesh'
    r = struct(ray, Ray, f, 'ray')
    m = struct(mesh, Mesh, f, 'mesh')
    matrix = rm._m(struct(transform, Matrix, f, 'transform'))
    origin = (r.position.x, r.position.y, r.position.z)
    direction = (r.direction.x, r.direction.y, r.direction.z)
    best = None
    v = m.vertices
    if v is not None:
        def corner(index):
            x, y, z = v[3 * index], v[3 * index + 1], v[3 * index + 2]
            q = matrix
            return (q[0] * x + q[4] * y + q[8] * z + q[12], q[1] * x + q[5] * y + q[9] * z + q[13],
                    q[2] * x + q[6] * y + q[10] * z + q[14])
        indices = m.indices
        for i in range(m.triangleCount):
            if indices is not None:
                a, b, c = indices[3 * i], indices[3 * i + 1], indices[3 * i + 2]
            else:
                a, b, c = 3 * i, 3 * i + 1, 3 * i + 2
            found = ray_triangle(origin, direction, corner(a), corner(b), corner(c))
            if found is not None and (best is None or best[0] > found[0]):
                best = found
    if best is None:
        return RayCollision(False, 0.0, Vector3(), Vector3())
    t, point, normal = best
    return RayCollision(True, t, Vector3(*point), Vector3(*normal))


# Modelos -------------------------------------------------------------------------------------

def _model(meshes, materials, mesh_material):
    model = Model()
    model.transform = _identity()
    model.meshCount = len(meshes)
    model.materialCount = len(materials)
    model.meshes = meshes
    model.materials = materials
    model.meshMaterial = mesh_material
    return model


def load_model_from_mesh(mesh, /):
    m = struct(mesh, Mesh, 'load_model_from_mesh', 'mesh')
    return _model([m], [load_material_default()], [0])


def _texture_from_bytes(data, function):
    size = _png_size(data[:32]) or _jpeg_bytes_size(data)
    if not size or not size[0] or not size[1]:
        print(f'WARNING: {function}: o modelo tem uma textura que não é PNG nem JPG; ela ficou de fora.')
        return None
    width, height = size
    rt.count_texture(width, height, function)
    texture_id = rt.new_id()
    rt.pending_textures.append([texture_id, 'e', len(data), bytes(data)])
    return Texture(texture_id, width, height, 1, 7)


def _jpeg_bytes_size(data):
    if data[:2] != b'\xff\xd8':
        return None
    at = 2
    while at + 4 <= len(data):
        if data[at] != 0xFF:
            return None
        kind = data[at + 1]
        length = _bin.unpack_from('>H', data, at + 2)[0]
        if kind in (0xC0, 0xC1, 0xC2) and at + 9 <= len(data):
            height, width = _bin.unpack_from('>HH', data, at + 5)
            return width, height
        at += 2 + length
    return None


_MODEL_FORMATS = ('.glb', '.gltf')


def load_model(fileName, /):
    f = 'load_model'
    rt.require_window(f)
    relative, absolute = rt.project_path(fileName, f)
    extension = os.path.splitext(relative)[1].lower()
    if extension not in _MODEL_FORMATS:
        raise ValueError(f'{f}: o Estúdio abre modelos .glb e .gltf (como os do Molda), e o arquivo '
                         f'{relative!r} é {extension or "sem extensão"}.')
    data = _gltf.load_model(absolute, f)
    meshes = []
    for part in data['meshes']:
        mesh = make_mesh(part['vertices'], part['texcoords'], part['normals'], part['colors'],
                         part['indices'], part['boneIds'], part['boneWeights'], part['texcoords2'])
        meshes.append(mesh)
    materials = [load_material_default()]
    for entry in data['materials']:
        material = load_material_default()
        albedo = material.maps[K.MATERIAL_MAP_ALBEDO]
        if entry['image'] is not None:
            texture = _texture_from_bytes(entry['image'][0], f)
            if texture is not None:
                albedo.texture = texture
        albedo.color = Color(*entry['color'])
        material.maps[K.MATERIAL_MAP_ROUGHNESS].value = entry['roughness']
        material.maps[K.MATERIAL_MAP_METALNESS].value = entry['metallic']
        materials.append(material)
    model = _model(meshes, materials, list(data['meshMaterial']))
    bones = data['bones']
    if len(bones) > MAX_BONES:
        raise ValueError(f'{f}: o esqueleto tem {len(bones)} ossos; o Estúdio anima até {MAX_BONES}.')
    model.skeleton.boneCount = len(bones)
    model.skeleton.bones = [BoneInfo(name.encode('utf-8'), parent) for name, parent in bones]
    model.skeleton.bindPose = [Transform(Vector3(*t), Vector4(*r), Vector3(*s))
                               for t, r, s in data['bindPose']]
    for mesh in meshes:
        mesh.boneCount = len(bones)
        upload(mesh, f)
    if bones:
        model.currentPose = [Transform(Vector3(*t), Vector4(*r), Vector3(*s))
                             for t, r, s in data['bindPose']]
        model.boneMatrices = [_identity() for _ in bones]
    if not meshes:
        print(f'WARNING: MESH: [{relative}] Failed to load model mesh(es) data')
    return model


def is_model_valid(model, /):
    m = struct(model, Model, 'is_model_valid', 'model')
    if not m.meshes or not m.materials or m.meshMaterial is None or m.meshCount <= 0 or m.materialCount <= 0:
        return False
    return all(mesh.vertices is None or mesh.vaoId > 0 for mesh in m.meshes[:m.meshCount])


def unload_model(model, /):
    m = struct(model, Model, 'unload_model', 'model')
    for mesh in (m.meshes or [])[:m.meshCount]:
        unload_mesh(mesh)


def get_model_bounding_box(model, /):
    m = struct(model, Model, 'get_model_bounding_box', 'model')
    low, high = (0.0, 0.0, 0.0), (0.0, 0.0, 0.0)
    if m.meshCount > 0:
        low, high = _mesh_bounds(m.meshes[0])
        for mesh in m.meshes[1:m.meshCount]:
            a, b = _mesh_bounds(mesh)
            low = tuple(min(low[i], a[i]) for i in range(3))
            high = tuple(max(high[i], b[i]) for i in range(3))
    t = rm._m(m.transform)

    def apply(p):
        return Vector3(t[0] * p[0] + t[4] * p[1] + t[8] * p[2] + t[12],
                       t[1] * p[0] + t[5] * p[1] + t[9] * p[2] + t[13],
                       t[2] * p[0] + t[6] * p[1] + t[10] * p[2] + t[14])
    return BoundingBox(apply(low), apply(high))


# Desenho -------------------------------------------------------------------------------------

def _drawing(function):
    if not rt.window.open:
        rt.require_window(function)


def _packed(c):
    return (c.r << 24) | (c.g << 16) | (c.b << 8) | c.a


def emit_mesh(mesh, material, matrix, diffuse, wires, bones=None):
    """Um registro OP_MESH: malha, shader, cores, modo, matriz, texturas dos mapas e ossos."""
    if not mesh.vaoId:
        return
    record = [rt.OP_MESH, mesh.vaoId, material.shader.id, diffuse,
              _packed(material.maps[K.MATERIAL_MAP_METALNESS].color), 1 if wires else 0]
    record.extend(matrix)
    maps = [(i, m.texture.id) for i, m in enumerate(material.maps[:MAX_MATERIAL_MAPS])
            if m.texture.id > 0]
    record.append(len(maps))
    for index, texture_id in maps:
        record.extend((index, texture_id))
    if bones and mesh.boneIndices is not None:
        record.append(len(bones))
        for bone in bones:
            record.extend(rm._m(bone))
    else:
        record.append(0)
    rt.ops.extend(record)


def draw_mesh(mesh, material, transform, /):
    f = 'draw_mesh'
    m = struct(mesh, Mesh, f, 'mesh')
    mat = struct(material, Material, f, 'material')
    matrix = rm._m(struct(transform, Matrix, f, 'transform'))
    _drawing(f)
    emit_mesh(m, mat, matrix, _packed(mat.maps[K.MATERIAL_MAP_ALBEDO].color), False)


def _draw_model(f, model, position, axis, angle, scale, tint, wires):
    m = struct(model, Model, f, 'model')
    px, py, pz = position
    sx, sy, sz = scale
    t = color(tint, f, 'tint')
    _drawing(f)
    scaling = (sx, 0.0, 0.0, 0.0, 0.0, sy, 0.0, 0.0, 0.0, 0.0, sz, 0.0, 0.0, 0.0, 0.0, 1.0)
    rotation = rm._rotate(axis, angle * math.pi / 180.0)
    moving = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, px, py, pz, 1.0)
    matrix = rm._mul(rm._m(m.transform), rm._mul(rm._mul(scaling, rotation), moving))
    tr, tg, tb, ta = (t >> 24) & 255, (t >> 16) & 255, (t >> 8) & 255, t & 255
    bones = m.boneMatrices if m.skeleton.boneCount else None
    for i in range(m.meshCount):
        material = m.materials[m.meshMaterial[i]]
        c = material.maps[K.MATERIAL_MAP_ALBEDO].color
        diffuse = ((c.r * tr // 255) << 24) | ((c.g * tg // 255) << 16) | ((c.b * tb // 255) << 8) \
            | (c.a * ta // 255)
        emit_mesh(m.meshes[i], material, matrix, diffuse, wires, bones)


def draw_model(model, position, scale, tint, /):
    f = 'draw_model'
    s = number(scale, f, 'scale')
    _draw_model(f, model, vec3(position, f, 'position'), (0.0, 1.0, 0.0), 0.0, (s, s, s), tint, False)


def draw_model_ex(model, position, rotationAxis, rotationAngle, scale, tint, /):
    f = 'draw_model_ex'
    _draw_model(f, model, vec3(position, f, 'position'), vec3(rotationAxis, f, 'rotationAxis'),
                number(rotationAngle, f, 'rotationAngle'), vec3(scale, f, 'scale'), tint, False)


def draw_model_wires(model, position, scale, tint, /):
    f = 'draw_model_wires'
    s = number(scale, f, 'scale')
    _draw_model(f, model, vec3(position, f, 'position'), (0.0, 1.0, 0.0), 0.0, (s, s, s), tint, True)


def draw_model_wires_ex(model, position, rotationAxis, rotationAngle, scale, tint, /):
    f = 'draw_model_wires_ex'
    _draw_model(f, model, vec3(position, f, 'position'), vec3(rotationAxis, f, 'rotationAxis'),
                number(rotationAngle, f, 'rotationAngle'), vec3(scale, f, 'scale'), tint, True)


# Animações -----------------------------------------------------------------------------------

class _PoseRow:
    """Uma pose (keyframePoses[quadro]): cada osso vira um Transform quando o jogo o lê."""
    __slots__ = ('_raw',)

    def __init__(self, raw):
        self._raw = raw

    def __len__(self):
        return len(self._raw)

    def __getitem__(self, bone):
        if isinstance(bone, slice):
            return [self[i] for i in range(*bone.indices(len(self._raw)))]
        t, r, s = self._raw[bone]
        return Transform(Vector3(*t), Vector4(*r), Vector3(*s))


class _KeyframePoses:
    """animation.keyframePoses: [quadro][osso] dá um Transform, como no raylib.

    Por dentro as poses ficam como tuplas (milhares de structs por animação pesariam no
    navegador), e o Transform só nasce na leitura. Ele é uma cópia: mudar o Transform lido não
    muda a animação.
    """
    __slots__ = ('_raw',)

    def __init__(self, raw):
        self._raw = raw

    def __len__(self):
        return len(self._raw)

    def __getitem__(self, frame):
        if isinstance(frame, slice):
            return [self[i] for i in range(*frame.indices(len(self._raw)))]
        return _PoseRow(self._raw[frame])


def _raw_poses(anim):
    poses = anim.keyframePoses
    return poses._raw if isinstance(poses, _KeyframePoses) else poses


def load_model_animations(fileName, animCount, /):
    f = 'load_model_animations'
    relative, absolute = rt.project_path(fileName, f)
    extension = os.path.splitext(relative)[1].lower()
    if extension not in _MODEL_FORMATS:
        raise ValueError(f'{f}: o Estúdio lê animações de .glb e .gltf, e o arquivo {relative!r} é '
                         f'{extension or "sem extensão"}.')
    animations = []
    for name, bones, poses in _gltf.load_animations(absolute, f):
        animation = ModelAnimation()
        animation.name = name.encode('utf-8')
        animation.boneCount = len(bones)
        animation.keyframeCount = len(poses)
        animation.keyframePoses = _KeyframePoses(poses)
        animations.append(animation)
    from ._ffi import Pointer
    # No raylib do computador, None derruba o programa e um número dá TypeError: o contador
    # precisa ser a caixinha do ffi, que o raylib preenche.
    if not isinstance(animCount, Pointer):
        raise TypeError(f'{f}: o contador precisa ser ffi.new("int *", 0), que o raylib '
                        f'preenche com quantos movimentos vieram (recebeu '
                        f'{type(animCount).__name__}).')
    animCount[0] = len(animations)
    return Pointer('ModelAnimation *', animations)


def unload_model_animations(animations, animCount, /):
    pass


def is_model_animation_valid(model, anim, /):
    f = 'is_model_animation_valid'
    m = struct(model, Model, f, 'model')
    a = struct(anim, ModelAnimation, f, 'anim')
    return m.skeleton.boneCount == a.boneCount


def _pose_matrix(t, r, s):
    scaling = (s[0], 0.0, 0.0, 0.0, 0.0, s[1], 0.0, 0.0, 0.0, 0.0, s[2], 0.0, 0.0, 0.0, 0.0, 1.0)
    moving = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, t[0], t[1], t[2], 1.0)
    return rm._mul(rm._mul(scaling, rm.quaternion_to_matrix_values(r)), moving)


def _frames(anim, frame):
    current = int(frame)
    following = current + 1
    blend = min(max(frame - current, 0.0), 1.0)
    count = anim.keyframeCount
    if current >= count:
        current %= count
    if following >= count:
        following %= count
    return current, following, blend


def _interpolate(a, b, blend):
    (ta, ra, sa), (tb, rb, sb) = a, b
    return (tuple(ta[i] + blend * (tb[i] - ta[i]) for i in range(3)), rm.slerp(ra, rb, blend),
            tuple(sa[i] + blend * (sb[i] - sa[i]) for i in range(3)))


def _store_pose(model, bone, pose):
    t, r, s = pose
    current = model.currentPose[bone]
    current.translation = t
    current.rotation = r
    current.scale = s
    bind = model.skeleton.bindPose[bone]
    bind_matrix = _pose_matrix((bind.translation.x, bind.translation.y, bind.translation.z),
                               (bind.rotation.x, bind.rotation.y, bind.rotation.z, bind.rotation.w),
                               (bind.scale.x, bind.scale.y, bind.scale.z))
    matrix = rm._mul(rm._invert(bind_matrix), _pose_matrix(t, r, s))
    target = model.boneMatrices[bone]
    (target.m0, target.m1, target.m2, target.m3, target.m4, target.m5, target.m6, target.m7,
     target.m8, target.m9, target.m10, target.m11, target.m12, target.m13, target.m14,
     target.m15) = matrix


def update_model_animation(model, anim, frame, /):
    f = 'update_model_animation'
    m = struct(model, Model, f, 'model')
    a = struct(anim, ModelAnimation, f, 'anim')
    value = number(frame, f, 'frame')
    if m.boneMatrices is None or a.keyframeCount <= 0 or not m.skeleton.bones or a.keyframePoses is None:
        return
    current, following, blend = _frames(a, value)
    poses = _raw_poses(a)
    for bone in range(min(m.skeleton.boneCount, len(poses[current]))):
        _store_pose(m, bone, _interpolate(poses[current][bone], poses[following][bone], blend))


def update_model_animation_ex(model, animA, frameA, animB, frameB, blend, /):
    f = 'update_model_animation_ex'
    m = struct(model, Model, f, 'model')
    a = struct(animA, ModelAnimation, f, 'animA')
    b = struct(animB, ModelAnimation, f, 'animB')
    fa, fb, mix = number(frameA, f, 'frameA'), number(frameB, f, 'frameB'), number(blend, f, 'blend')
    if m.boneMatrices is None or not (a.keyframeCount > 0 and a.keyframePoses is not None and
                                      b.keyframeCount > 0 and b.keyframePoses is not None and
                                      0.0 <= mix <= 1.0):
        return
    ca = int(fa) % a.keyframeCount
    na, blend_a = ca + 1, min(max(fa - ca, 0.0), 1.0)
    na %= a.keyframeCount
    cb = int(fb) % b.keyframeCount
    nb, blend_b = cb + 1, min(max(fb - cb, 0.0), 1.0)
    nb %= b.keyframeCount
    poses_a, poses_b = _raw_poses(a), _raw_poses(b)
    for bone in range(m.skeleton.boneCount):
        pa = _interpolate(poses_a[ca][bone], poses_a[na][bone], blend_a)
        pb = _interpolate(poses_b[cb][bone], poses_b[nb][bone], blend_b)
        _store_pose(m, bone, _interpolate(pa, pb, mix))

