"""Leitura de .glb e .gltf como o LoadGLTF e o LoadModelAnimationsGLTF do raylib 6.0.

O que muda o resultado e por isso segue o raylib:

* cada primitiva de triângulos de cada nó vira uma malha, com a transformação do nó (e dos pais)
  aplicada nos vértices; a hierarquia não fica;
* os materiais começam no índice 1 (o 0 é o material padrão);
* índices de 32 bits viram 16 bits (truncados), cores viram 0..255;
* só o primeiro esqueleto (skin) conta; as animações são amostradas a 60 quadros por segundo,
  com as mesmas regras de tempo e interpolação.
"""
import base64
import json
import os
import struct as _bin
from array import array
from urllib.parse import unquote

from bisect import bisect_right
from functools import partial
from itertools import chain, repeat

from . import _floatvec as V
from . import _raymath as rm
from ._float32 import F, fabsf, fmaxf

# As contas em float, operação por operação, como no cgltf e no rmodels.c (ver _float32.py).
GLTF_FRAMERATE = F(60.0)
_EPSILON = F(0.000001)
_COMPONENT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4),
              5126: ('f', 4)}
_SIZE = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
IDENTITY = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0)


class GltfError(ValueError):
    pass


class Document:
    def __init__(self, absolute, function):
        self.function = function
        self.folder = os.path.dirname(absolute)
        with open(absolute, 'rb') as stream:
            data = stream.read()
        binary = None
        if data[:4] == b'glTF':
            length = _bin.unpack_from('<I', data, 8)[0]
            offset = 12
            doc = None
            while offset + 8 <= min(length, len(data)):
                size, kind = _bin.unpack_from('<II', data, offset)
                chunk = data[offset + 8:offset + 8 + size]
                if kind == 0x4E4F534A:
                    doc = json.loads(chunk.decode('utf-8'))
                elif kind == 0x004E4942 and binary is None:
                    binary = chunk
                offset += 8 + size
            if doc is None:
                raise GltfError(f'{function}: o arquivo .glb não tem a parte JSON.')
        else:
            try:
                doc = json.loads(data.decode('utf-8'))
            except (UnicodeDecodeError, ValueError):
                raise GltfError(f'{function}: o arquivo não é um .glb nem um .gltf válido.') from None
        self.doc = doc
        self.binary = binary
        self._buffers = {}
        self.nodes = doc.get('nodes', [])
        self.parent = {}
        for index, node in enumerate(self.nodes):
            for child in node.get('children', []):
                self.parent[child] = index
        self._world = {}

    # Dados ---------------------------------------------------------------------------------------

    def _uri_bytes(self, uri):
        if uri.startswith('data:'):
            return base64.b64decode(uri.split(',', 1)[1])
        path = os.path.normpath(os.path.join(self.folder, unquote(uri)))
        if not os.path.isfile(path):
            raise GltfError(f'{self.function}: faltou o arquivo {uri!r} que o modelo usa (ele '
                            'precisa estar na mesma pasta do .gltf).')
        with open(path, 'rb') as stream:
            return stream.read()

    def buffer(self, index):
        if index not in self._buffers:
            buffer = self.doc['buffers'][index]
            uri = buffer.get('uri')
            self._buffers[index] = self._uri_bytes(uri) if uri else (self.binary or b'')
        return self._buffers[index]

    def view_bytes(self, index):
        view = self.doc['bufferViews'][index]
        data = self.buffer(view['buffer'])
        start = view.get('byteOffset', 0)
        return data[start:start + view['byteLength']], view.get('byteStride', 0)

    def accessor(self, index):
        """(valores em lista plana, componentes por elemento, tipo do componente, normalizado)."""
        acc = self.doc['accessors'][index]
        components = _SIZE[acc['type']]
        code, size = _COMPONENT[acc['componentType']]
        count = acc['count']
        if 'bufferView' not in acc:
            values = [0] * (count * components)
        else:
            data, stride = self.view_bytes(acc['bufferView'])
            offset = acc.get('byteOffset', 0)
            element = components * size
            if not stride or stride == element:
                raw = array(code)
                raw.frombytes(data[offset:offset + count * element])
                values = raw.tolist()
            else:
                values = []
                fmt = '<' + code * components
                for i in range(count):
                    values.extend(_bin.unpack_from(fmt, data, offset + i * stride))
        return values, components, acc['componentType'], acc.get('normalized', False)

    def image(self, index):
        """(bytes do PNG/JPG, tipo) da imagem `index`."""
        image = self.doc['images'][index]
        if 'bufferView' in image:
            data, _ = self.view_bytes(image['bufferView'])
            return bytes(data), image.get('mimeType', '')
        try:
            return self._uri_bytes(image['uri']), image.get('mimeType', '')
        except GltfError:
            # O raylib só avisa e desenha o modelo com a textura branca; o jogo continua.
            print(f"Aviso: {self.function}: a imagem {image['uri']!r} que o modelo usa não está "
                  'na pasta do .gltf, então o modelo fica sem essa textura.')
            return None

    def joint_parent(self, joint, joints):
        """O osso pai: o raylib 6.0.1.0 do pip sobe pelos ancestrais até achar um osso (um nó
        intermediário, como o "[base 1]" do Molda, não corta o esqueleto). Medido no real."""
        parent = self.parent.get(joint)
        seen = set()
        while parent is not None and parent not in seen:
            if parent in joints:
                return joints.index(parent)
            seen.add(parent)
            parent = self.parent.get(parent)
        return -1

    # Transformações dos nós ----------------------------------------------------------------------

    def local(self, index):
        """cgltf_node_transform_local: a matriz do nó em float (coluna-maior, T·R·S)."""
        node = self.nodes[index]
        if 'matrix' in node:
            return tuple(F(v) for v in node['matrix'])
        (tx, ty, tz), (qx, qy, qz, qw), (sx, sy, sz) = self.trs(index)
        return ((1 - 2 * qy * qy - 2 * qz * qz) * sx, (2 * qx * qy + 2 * qz * qw) * sx,
                (2 * qx * qz - 2 * qy * qw) * sx, F(0),
                (2 * qx * qy - 2 * qz * qw) * sy, (1 - 2 * qx * qx - 2 * qz * qz) * sy,
                (2 * qy * qz + 2 * qx * qw) * sy, F(0),
                (2 * qx * qz + 2 * qy * qw) * sz, (2 * qy * qz - 2 * qx * qw) * sz,
                (1 - 2 * qx * qx - 2 * qy * qy) * sz, F(0),
                tx, ty, tz, F(1))

    def world(self, index):
        """cgltf_node_transform_world: o nó, depois o pai, o avô..., só na parte 3x3 (a
        translação de cada pai é somada), como o cgltf faz."""
        if index is None:
            return IDENTITY
        if index not in self._world:
            lm = list(self.local(index))
            parent = self.parent.get(index)
            while parent is not None:
                pm = self.local(parent)
                for i in range(4):
                    l0, l1, l2 = lm[i * 4], lm[i * 4 + 1], lm[i * 4 + 2]
                    lm[i * 4] = l0 * pm[0] + l1 * pm[4] + l2 * pm[8]
                    lm[i * 4 + 1] = l0 * pm[1] + l1 * pm[5] + l2 * pm[9]
                    lm[i * 4 + 2] = l0 * pm[2] + l1 * pm[6] + l2 * pm[10]
                lm[12] += pm[12]
                lm[13] += pm[13]
                lm[14] += pm[14]
                parent = self.parent.get(parent)
            self._world[index] = tuple(lm)
        return self._world[index]

    def trs(self, index):
        """A translação, rotação e escala do nó, como o cgltf guarda (um nó descrito por matriz
        fica com os valores padrão, e é isso que a animação do raylib lê)."""
        node = self.nodes[index]
        return (tuple(F(v) for v in node.get('translation', (0.0, 0.0, 0.0))),
                tuple(F(v) for v in node.get('rotation', (0.0, 0.0, 0.0, 1.0))),
                tuple(F(v) for v in node.get('scale', (1.0, 1.0, 1.0))))


_IDENTITY = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0)


def _trs_matrix(t, r, s):
    """MatrixScale · QuaternionToMatrix · MatrixTranslate, na ordem do rmodels.c."""
    scaling = (s[0], 0.0, 0.0, 0.0, 0.0, s[1], 0.0, 0.0, 0.0, 0.0, s[2], 0.0, 0.0, 0.0, 0.0, 1.0)
    moving = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, t[0], t[1], t[2], 1.0)
    return rm._mul(rm._mul(scaling, rm.quaternion_to_matrix_values(r)), moving)


def decompose(m):
    """MatrixDecompose do raymath, em float: (translação, rotação, escala)."""
    m = rm._f(m)
    eps = F(1e-9)
    translation = (m[12], m[13], m[14])
    columns = [(m[0], m[4], m[8]), (m[1], m[5], m[9]), (m[2], m[6], m[10])]
    stabilizer = eps
    for column in columns:
        for value in column:
            stabilizer = fmaxf(stabilizer, fabsf(value))

    def scaled(v, k):
        return (v[0] * k, v[1] * k, v[2] * k)

    def dot(a, b):
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

    def sub(a, b):
        return (a[0] - b[0], a[1] - b[1], a[2] - b[2])

    columns = [scaled(column, 1.0 / stabilizer) for column in columns]
    sx = rm._length3(columns[0])
    if sx > eps:
        columns[0] = scaled(columns[0], 1.0 / sx)
    columns[1] = sub(columns[1], scaled(columns[0], dot(columns[0], columns[1])))
    sy = rm._length3(columns[1])
    if sy > eps:
        columns[1] = scaled(columns[1], 1.0 / sy)
    columns[2] = sub(columns[2], scaled(columns[0], dot(columns[0], columns[2])))
    columns[2] = sub(columns[2], scaled(columns[1], dot(columns[1], columns[2])))
    sz = rm._length3(columns[2])
    if sz > eps:
        columns[2] = scaled(columns[2], 1.0 / sz)
    scale = (sx, sy, sz)
    if dot(columns[0], rm._cross(columns[1], columns[2])) < 0:
        scale = (-sx, -sy, -sz)
        columns = [(-c[0], -c[1], -c[2]) for c in columns]
    scale = scaled(scale, stabilizer)
    # A matriz de rotação do C é escrita por posição: m0, m4, m8, m12, m1, m5...
    c0, c1, c2 = columns
    fields = (c0[0], c1[0], c2[0], 0.0, c0[1], c1[1], c2[1], 0.0,
              c0[2], c1[2], c2[2], 0.0, 0.0, 0.0, 0.0, 1.0)
    return translation, rm.quaternion_from_matrix_values(fields), scale


def _transform(values, matrix, normalize=False):
    """Vector3Transform em todos os vértices de uma vez (e Vector3Normalize, para as normais que
    vêm em inteiro)."""
    m = rm._f(matrix)
    count = len(values) // 3
    if not count:
        return
    x, y, z = V.FV(values[0::3]), V.FV(values[1::3]), V.FV(values[2::3])

    def row(a, b, c, d):
        # mat.a*x + mat.b*y + mat.c*z + mat.d, com os atalhos exatos dos 0 e 1 da matriz.
        total = V._accumulate(None, a, x, count)
        total = V._accumulate(total, b, y, count)
        total = V._accumulate(total, c, z, count)
        return V.vec(V._accumulate(total, d, 1.0, count), count)

    point = [row(m[0], m[4], m[8], m[12]), row(m[1], m[5], m[9], m[13]),
             row(m[2], m[6], m[10], m[14])]
    if normalize:
        length = V.sqrt(point[0] * point[0] + point[1] * point[1] + point[2] * point[2])
        keep = [v != 0.0 for v in length.a]
        inverse = 1.0 / length
        point = [V.choose(keep, c * inverse, c, count) for c in point]
    values[0::3], values[1::3], values[2::3] = point[0].a, point[1].a, point[2].a


def _transpose(m):
    return (m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14],
            m[3], m[7], m[11], m[15])


def _u8(value):
    return int(value) & 0xFF


def load_model(absolute, function):
    """As malhas, os materiais e o esqueleto do arquivo, prontos para virar o Model do raylib."""
    doc = Document(absolute, function)
    gltf = doc.doc
    for node in doc.nodes:
        mesh = gltf['meshes'][node['mesh']] if 'mesh' in node else None
        for primitive in (mesh or {}).get('primitives', []):
            if 'KHR_draco_mesh_compression' in primitive.get('extensions', {}):
                raise GltfError(f'{function}: o modelo usa compressão Draco, que o raylib não '
                                'abre. Exporte o .glb sem compressão.')

    materials = []
    for material in gltf.get('materials', []):
        entry = {'color': (255, 255, 255, 255), 'image': None, 'roughness': 0.0, 'metallic': 0.0}
        pbr = material.get('pbrMetallicRoughness')
        if pbr is not None:
            texture = pbr.get('baseColorTexture')
            if texture is not None:
                source = gltf['textures'][texture['index']].get('source')
                if source is not None:
                    entry['image'] = doc.image(source)
            factor = pbr.get('baseColorFactor', (1.0, 1.0, 1.0, 1.0))
            entry['color'] = tuple(_u8(int(v * 255)) for v in factor)
            entry['roughness'] = float(pbr.get('roughnessFactor', 1.0))
            entry['metallic'] = float(pbr.get('metallicFactor', 1.0))
        materials.append(entry)
    material_index = {id(material): i for i, material in enumerate(gltf.get('materials', []))}

    skins = gltf.get('skins', [])
    skin = skins[0] if skins else None
    joints = skin['joints'] if skin else []
    bones = []
    bind_pose = []
    for joint in joints:
        node = doc.nodes[joint]
        bones.append(((node.get('name') or '')[:31], doc.joint_parent(joint, joints)))
        bind_pose.append(decompose(doc.world(joint)))

    meshes = []
    mesh_material = []
    for node_index, node in enumerate(doc.nodes):
        if 'mesh' not in node:
            continue
        world = doc.world(node_index)
        normal_matrix = _transpose(rm._invert(world))
        for primitive in gltf['meshes'][node['mesh']].get('primitives', []):
            if primitive.get('mode', 4) != 4:
                continue
            mesh = {'vertices': None, 'normals': None, 'texcoords': None, 'texcoords2': None,
                    'colors': None, 'indices': None, 'boneIds': None, 'boneWeights': None,
                    'vertexCount': 0}
            attributes = primitive.get('attributes', {})
            has_joints = False
            for name, accessor in attributes.items():
                values, components, kind, _ = doc.accessor(accessor)
                if name == 'POSITION' and components == 3 and kind in (5126, 5123, 5122):
                    vertices = [float(v) for v in values]
                    _transform(vertices, world)
                    mesh['vertices'] = vertices
                    mesh['vertexCount'] = len(vertices) // 3
                elif name == 'NORMAL' and components == 3 and kind in (5126, 5122, 5121, 5120):
                    normals = [float(v) for v in values]
                    # O raylib normaliza as normais que vêm em inteiro (short, byte).
                    _transform(normals, normal_matrix, normalize=kind != 5126)
                    mesh['normals'] = normals
                elif name.startswith('TEXCOORD_') and components == 2:
                    if kind == 5126:
                        coords = [float(v) for v in values]
                    elif kind == 5121:
                        coords = [F(v) / 255.0 for v in values]
                    elif kind == 5123:
                        coords = [F(v) / 65535.0 for v in values]
                    else:
                        continue
                    slot = name[9:]
                    if slot == '0':
                        mesh['texcoords'] = coords
                    elif slot == '1':
                        mesh['texcoords2'] = coords
                elif name == 'COLOR_0' and components in (3, 4) and kind in (5121, 5123, 5126):
                    if kind == 5121:
                        convert = int
                    elif kind == 5123:
                        convert = lambda v: _u8(int(F(v) / 65535.0 * 255.0))  # noqa: E731
                    else:
                        convert = lambda v: _u8(int(F(v) * 255.0))  # noqa: E731
                    colors = bytearray()
                    for i in range(0, len(values), components):
                        colors.extend(convert(values[i + c]) for c in range(components))
                        if components == 3:
                            colors.append(255)
                    mesh['colors'] = bytes(colors)
                elif name == 'JOINTS_0' and components == 4 and kind in (5121, 5123):
                    has_joints = True
                    mesh['boneIds'] = bytes(_u8(v) for v in values)
                elif name == 'WEIGHTS_0' and components == 4 and kind in (5121, 5123, 5126):
                    scale = 255.0 if kind == 5121 else 65535.0 if kind == 5123 else 1.0
                    mesh['boneWeights'] = [F(v) / scale for v in values]
            if mesh['vertices'] is None:
                continue
            if 'indices' in primitive:
                values, _, kind, _ = doc.accessor(primitive['indices'])
                if kind in (5121, 5123, 5125):
                    mesh['indices'] = [v & 0xFFFF for v in values]
            material = primitive.get('material')
            mesh_material.append(material + 1 if material is not None else 0)
            # Malha filha de um osso, sem pesos: os vértices seguem esse osso.
            parent = doc.parent.get(node_index)
            if skin and not has_joints and parent is not None and 'mesh' not in doc.nodes[parent]:
                if parent in joints:
                    count = mesh['vertexCount']
                    mesh['boneIds'] = bytes([joints.index(parent), 0, 0, 0] * count)
                    mesh['boneWeights'] = [1.0, 0.0, 0.0, 0.0] * count
            meshes.append(mesh)
    del material_index
    return {'meshes': meshes, 'materials': materials, 'meshMaterial': mesh_material,
            'bones': bones, 'bindPose': bind_pose}


# Animações ----------------------------------------------------------------------------------

def _float_equals(a, b):
    """FloatEquals do raymath, em float."""
    return fabsf(a - b) <= _EPSILON * fmaxf(1.0, fmaxf(fabsf(a), fabsf(b)))


def _keyframes(times, frame_times):
    """O laço do GetPoseAtTimeGLTF para cada tempo: (quadro-chave, início, fim). Sem um par que
    contenha o tempo, o raylib fica no quadro-chave 0 com o último par (é o que ele faz depois do
    fim da animação)."""
    n = len(times)
    last = (times[n - 2], times[n - 1]) if n >= 2 else (0.0, 0.0)
    ordered = all(times[i] <= times[i + 1] for i in range(n - 1))
    keys, starts, ends = [], [], []
    for time in frame_times:
        found = -1
        if ordered:
            i = bisect_right(times, time) - 1
            if 0 <= i <= n - 2 and times[i] <= time < times[i + 1]:
                found = i
        else:
            for i in range(n - 1):
                if times[i] <= time < times[i + 1]:
                    found = i
                    break
        if found < 0:
            keys.append(0)
            starts.append(last[0])
            ends.append(last[1])
        else:
            keys.append(found)
            starts.append(times[found])
            ends.append(times[found + 1])
    return keys, starts, ends


def _sample(interpolation, components, jobs, frame_times):
    """GetPoseAtTimeGLTF de vários canais (mesma interpolação e mesmo caminho) em todos os
    quadros de uma vez. jobs = [(tempos, valores)]; devolve, por canal, um FV por componente."""
    frames = len(frame_times)
    count = frames * len(jobs)
    keys, starts, ends, sources = [], [], [], []
    for times, values in jobs:
        k, a, b = _keyframes(times, frame_times)
        keys += k
        starts += a
        ends += b
        sources.append((values, len(values) // components))
    clock = V.FV(frame_times * len(jobs))
    tstart, tend = V.FV(starts), V.FV(ends)
    # FloatEquals(tend, tstart): o quadro vira STEP.
    limit = V.fmax(1.0, V.fmax(V.fabs(tend), V.fabs(tstart), count), count) * _EPSILON
    step = [g <= lim for g, lim in zip(V.fabs(tend - tstart).a, limit.a)]
    duration = V.fmax(tend - tstart, _EPSILON, count)
    t = (clock - tstart) / duration
    t = V.choose(V.less(t, 0.0, count), 0.0, t, count)
    t = V.choose(V.greater(t, 1.0, count), 1.0, t, count)

    def read(offset=0, factor=1, plus=0):
        # O valor de índice factor*(quadro-chave + offset) + plus, canal por canal.
        out = [[] for _ in range(components)]
        for job, (values, total) in enumerate(sources):
            for k in keys[job * frames:(job + 1) * frames]:
                i = min(max(factor * (k + offset) + plus, 0), total - 1) * components
                for c in range(components):
                    out[c].append(values[i + c])
        return tuple(V.FV(column) for column in out)

    held = read()
    if interpolation == 'STEP':
        moved = held
    elif interpolation == 'CUBICSPLINE':
        v1, tangent1 = read(0, 3, 1), read(0, 3, 2)
        v2, tangent2 = read(1, 3, 1), read(1, 3, 0)
        if components == 3:
            # Vector3CubicHermite
            p2, p3 = t * t, t * t * t
            moved = tuple((2 * p3 - 3 * p2 + 1) * v1[i] + (p3 - 2 * p2 + t) * tangent1[i]
                          + (-2 * p3 + 3 * p2) * v2[i] + (p3 - p2) * tangent2[i] for i in range(3))
        else:
            v1, v2 = V._normalize4(v1, count), V._normalize4(v2, count)
            flip = V.less(v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2] + v1[3] * v2[3], 0.0, count)
            v2 = tuple(V.choose(flip, -c, c, count) for c in v2)
            zero = V.FV.full(0.0, count)
            out_tangent = (tangent1[0] * duration, tangent1[1] * duration, tangent1[2] * duration,
                           zero * duration)
            in_tangent = (tangent2[0] * duration, tangent2[1] * duration, tangent2[2] * duration,
                          zero * duration)
            # QuaternionCubicHermiteSpline: t3 é t2*t.
            t2 = t * t
            t3 = t2 * t
            h00, h10, h01, h11 = 2 * t3 - 3 * t2 + 1, t3 - 2 * t2 + t, -2 * t3 + 3 * t2, t3 - t2
            moved = V._normalize4(tuple(v1[i] * h00 + out_tangent[i] * h10 + v2[i] * h01
                                        + in_tangent[i] * h11 for i in range(4)), count)
    else:
        following = read(1)
        moved = (V.vector3_lerp(held, following, t) if components == 3
                 else V.quaternion_slerp(held, following, t, count))
    final = tuple(V.choose(step, held[i], moved[i], count) for i in range(components))
    return [tuple(V.FV(c.a[j * frames:(j + 1) * frames]) for c in final) for j in range(len(jobs))]


class PoseTable:
    """As poses de uma animação em colunas de float (translação x, y, z, rotação x, y, z, w,
    escala x, y, z), no índice quadro*ossos + osso.

    O raylib calcula todas as poses no load_model_animations; aqui cada animação é calculada na
    primeira vez que o jogo a usa (o resultado é o mesmo). Um modelo com dezenas de animações
    abre na hora, e o jogo só paga pelas que toca.
    """
    __slots__ = ('frames', 'bones', '_columns', '_build')

    def __init__(self, frames, bones, build):
        self.frames = frames
        self.bones = bones
        self._columns = None
        self._build = build

    @property
    def columns(self):
        if self._columns is None:
            self._columns = self._build()
            self._build = None
        return self._columns

    def pose(self, frame, bone):
        k = frame * self.bones + bone
        c = self.columns
        return ((c[0][k], c[1][k], c[2][k]), (c[3][k], c[4][k], c[5][k], c[6][k]),
                (c[7][k], c[8][k], c[9][k]))

    def frame(self, frame):
        start = frame * self.bones
        return [column[start:start + self.bones] for column in self.columns]


def _pose_table(per_bone, offsets, bones, frames):
    """jointLocal·extOffset, MatrixDecompose e BuildPoseFromParentJoints, em bloco."""
    count = len(per_bone)
    total = count * frames
    components = [list(t) + list(r) + list(s) for t, r, s in per_bone]

    def column(index):
        return V.FV(array('f', chain.from_iterable(V.items(components[b][index], frames)
                                                    for b in range(count))))

    t, r, s = (column(0), column(1), column(2)), tuple(column(i) for i in range(3, 7)), \
        (column(7), column(8), column(9))
    offset = tuple(V.FV(array('f', chain.from_iterable(repeat(offsets[b][e], frames)
                                                        for b in range(count))))
                   for e in range(16))
    local = V.trs_matrix(t, r, s, total)
    moved, rotated, scaled = V.matrix_decompose(V.matrix_multiply(local, offset, total), total)
    flat = list(moved) + list(rotated) + list(scaled)

    def piece(fv, b):
        return V.FV(fv.a[b * frames:(b + 1) * frames])

    pose = [(tuple(piece(flat[i], b) for i in range(3)), tuple(piece(flat[i], b) for i in range(3, 7)),
             tuple(piece(flat[i], b) for i in range(7, 10))) for b in range(count)]
    for i, (_, parent) in enumerate(bones):
        if parent < 0 or parent > i:
            continue
        bt, br, bs = pose[i]
        pt, pr, ps = pose[parent]
        br = V.quaternion_multiply(pr, br)
        bs = (bs[0] * ps[0], bs[1] * ps[1], bs[2] * ps[2])
        bt = (bt[0] * ps[0], bt[1] * ps[1], bt[2] * ps[2])
        bt = V.vector3_rotate_by_quaternion(bt, pr)
        bt = (bt[0] + pt[0], bt[1] + pt[1], bt[2] + pt[2])
        pose[i] = (bt, br, bs)
    values = [[c.a for c in list(bt) + list(br) + list(bs)] for bt, br, bs in pose]
    return [array('f', [values[b][c][j] for j in range(frames) for b in range(count)])
            for c in range(10)]


def _animation_columns(doc, joints, bones, offsets, channels, interpolation, keyframes):
    """As poses de uma animação: a amostragem de cada canal e a montagem pela hierarquia."""
    frame_times = [F(frame) / GLTF_FRAMERATE for frame in range(keyframes)]
    per_bone = [list(doc.trs(joint)) for joint in joints]
    # Os canais com a mesma interpolação e o mesmo caminho são amostrados juntos.
    groups = {}
    for bone in range(len(joints)):
        for slot, path in enumerate(('translation', 'rotation', 'scale')):
            found = channels[bone].get(path)
            if found is not None and found[1] is not None:
                groups.setdefault((interpolation[bone], slot), []).append((bone, found))
    for (kind, slot), members_of in groups.items():
        sampled = _sample(kind, 4 if slot == 1 else 3, [found for _, found in members_of],
                          frame_times)
        for (bone, _), value in zip(members_of, sampled):
            per_bone[bone][slot] = value
    return _pose_table(per_bone, offsets, bones, keyframes)


def load_animations(absolute, function):
    """[(nome, ossos [(nome, pai)], PoseTable)] do primeiro esqueleto."""
    doc = Document(absolute, function)
    gltf = doc.doc
    skins = gltf.get('skins', [])
    if not skins:
        return []
    joints = skins[0]['joints']
    bones = []
    for joint in joints:
        bones.append(((doc.nodes[joint].get('name') or '')[:31], doc.joint_parent(joint, joints)))
    # O raylib do pip (commit 10a889c) guarda em cada osso o que os nós que NÃO são ossos entre ele
    # e o osso pai somam (só os campos TRS do nó, como o cgltf), e decompõe junta·esse caminho.
    members = set(joints)
    offsets = []
    for joint in joints:
        offset = _IDENTITY
        node = doc.parent.get(joint)
        while node is not None and node not in members:
            offset = rm._mul(offset, _trs_matrix(*doc.trs(node)))
            node = doc.parent.get(node)
        offsets.append(offset)
    result = []
    for animation in gltf.get('animations', []):
        channels = [{} for _ in joints]
        interpolation = ['LINEAR'] * len(joints)
        duration = F(0.0)
        for channel in animation.get('channels', []):
            target = channel.get('target', {})
            node = target.get('node')
            if node not in members:
                continue
            bone = joints.index(node)
            sampler = animation['samplers'][channel['sampler']]
            path = target.get('path')
            times, _, _, _ = doc.accessor(sampler['input'])
            values, components, kind, _ = doc.accessor(sampler['output'])
            # A interpolação fica no osso: vale a do último canal dele, para os três caminhos.
            interpolation[bone] = sampler.get('interpolation', 'LINEAR')
            if path in ('translation', 'rotation', 'scale'):
                # O raylib só lê saída em float; com outro tipo o valor do nó fica.
                channels[bone][path] = (times, values if kind == 5126 else None)
            if times:
                duration = F(times[-1]) if F(times[-1]) > duration else duration
        # Contas em float, como no C: (int)(animDuration*GLTF_FRAMERATE) + 1 e j/GLTF_FRAMERATE.
        keyframes = int(duration * GLTF_FRAMERATE) + 1
        table = PoseTable(keyframes, len(joints),
                          partial(_animation_columns, doc, joints, bones, offsets, channels,
                                  interpolation, keyframes))
        result.append(((animation.get('name') or '')[:31], bones, table))
    return result
