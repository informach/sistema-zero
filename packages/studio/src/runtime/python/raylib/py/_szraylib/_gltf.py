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
import math
import os
import struct as _bin
from array import array
from urllib.parse import unquote

from . import _raymath as rm

GLTF_FRAMERATE = 60.0
_EPSILON = 0.000001
_F32 = _bin.Struct('<f')


def _f32(value):
    """O valor como o float do C: decide em que quadro-chave o raylib cai."""
    return _F32.unpack(_F32.pack(value))[0]
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
        node = self.nodes[index]
        if 'matrix' in node:
            return tuple(float(v) for v in node['matrix'])
        t = node.get('translation', (0.0, 0.0, 0.0))
        r = node.get('rotation', (0.0, 0.0, 0.0, 1.0))
        s = node.get('scale', (1.0, 1.0, 1.0))
        # Coluna-maior: T·R·S (escala primeiro), como o cgltf_node_transform_local.
        rot = rm.quaternion_to_matrix_values(tuple(float(v) for v in r))
        scale = (s[0], 0.0, 0.0, 0.0, 0.0, s[1], 0.0, 0.0, 0.0, 0.0, s[2], 0.0, 0.0, 0.0, 0.0, 1.0)
        move = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, t[0], t[1], t[2], 1.0)
        return rm._mul(rm._mul(scale, rot), move)

    def world(self, index):
        if index is None:
            return IDENTITY
        if index not in self._world:
            matrix = self.local(index)
            parent = self.parent.get(index)
            if parent is not None:
                matrix = rm._mul(matrix, self.world(parent))
            self._world[index] = matrix
        return self._world[index]

    def trs(self, index):
        """A translação, rotação e escala do nó, como o cgltf guarda (um nó descrito por matriz
        fica com os valores padrão, e é isso que a animação do raylib lê)."""
        node = self.nodes[index]
        return (tuple(float(v) for v in node.get('translation', (0.0, 0.0, 0.0))),
                tuple(float(v) for v in node.get('rotation', (0.0, 0.0, 0.0, 1.0))),
                tuple(float(v) for v in node.get('scale', (1.0, 1.0, 1.0))))


_IDENTITY = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0)


def _trs_matrix(t, r, s):
    """MatrixScale · QuaternionToMatrix · MatrixTranslate, na ordem do rmodels.c."""
    scaling = (s[0], 0.0, 0.0, 0.0, 0.0, s[1], 0.0, 0.0, 0.0, 0.0, s[2], 0.0, 0.0, 0.0, 0.0, 1.0)
    moving = (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, t[0], t[1], t[2], 1.0)
    return rm._mul(rm._mul(scaling, rm.quaternion_to_matrix_values(r)), moving)


def decompose(m):
    """MatrixDecompose do raymath: (translação, rotação, escala)."""
    eps = 1e-9
    translation = (m[12], m[13], m[14])
    columns = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]]
    stabilizer = eps
    for column in columns:
        stabilizer = max(stabilizer, abs(column[0]), abs(column[1]), abs(column[2]))
    columns = [[v / stabilizer for v in column] for column in columns]
    dot = lambda a, b: a[0] * b[0] + a[1] * b[1] + a[2] * b[2]  # noqa: E731
    length = lambda a: math.sqrt(dot(a, a))  # noqa: E731
    sx = length(columns[0])
    if sx > eps:
        columns[0] = [v / sx for v in columns[0]]
    shear = [dot(columns[0], columns[1]), 0.0, 0.0]
    columns[1] = [columns[1][i] - columns[0][i] * shear[0] for i in range(3)]
    sy = length(columns[1])
    if sy > eps:
        columns[1] = [v / sy for v in columns[1]]
    shear[1] = dot(columns[0], columns[2])
    columns[2] = [columns[2][i] - columns[0][i] * shear[1] for i in range(3)]
    shear[2] = dot(columns[1], columns[2])
    columns[2] = [columns[2][i] - columns[1][i] * shear[2] for i in range(3)]
    sz = length(columns[2])
    if sz > eps:
        columns[2] = [v / sz for v in columns[2]]
    scale = [sx, sy, sz]
    if dot(columns[0], rm._cross(columns[1], columns[2])) < 0:
        scale = [-v for v in scale]
        columns = [[-v for v in column] for column in columns]
    scale = tuple(v * stabilizer for v in scale)
    rotation_matrix = (columns[0][0], columns[0][1], columns[0][2], 0.0,
                       columns[1][0], columns[1][1], columns[1][2], 0.0,
                       columns[2][0], columns[2][1], columns[2][2], 0.0,
                       0.0, 0.0, 0.0, 1.0)
    # O raymath monta essa matriz pelos campos m0, m4, m8... (a ordem do struct).
    fields = (rotation_matrix[0], rotation_matrix[4], rotation_matrix[8], rotation_matrix[12],
              rotation_matrix[1], rotation_matrix[5], rotation_matrix[9], rotation_matrix[13],
              rotation_matrix[2], rotation_matrix[6], rotation_matrix[10], rotation_matrix[14],
              rotation_matrix[3], rotation_matrix[7], rotation_matrix[11], rotation_matrix[15])
    return translation, rm.quaternion_from_matrix_values(fields), scale


def _transform(values, matrix):
    m = matrix
    for i in range(0, len(values), 3):
        x, y, z = values[i], values[i + 1], values[i + 2]
        values[i] = m[0] * x + m[4] * y + m[8] * z + m[12]
        values[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
        values[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]


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
                    _transform(normals, normal_matrix)
                    mesh['normals'] = normals
                elif name.startswith('TEXCOORD_') and components == 2:
                    if kind == 5126:
                        coords = [float(v) for v in values]
                    elif kind == 5121:
                        coords = [v / 255.0 for v in values]
                    elif kind == 5123:
                        coords = [v / 65535.0 for v in values]
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
                        convert = lambda v: _u8(int(v / 65535.0 * 255.0))  # noqa: E731
                    else:
                        convert = lambda v: _u8(int(v * 255.0))  # noqa: E731
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
                    mesh['boneWeights'] = [v / scale for v in values]
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
    return abs(a - b) <= _EPSILON * max(1.0, max(abs(a), abs(b)))


def _pose_at(interpolation, times, values, components, time):
    """GetPoseAtTimeGLTF, com o comportamento do raylib depois do último quadro-chave."""
    tstart = tend = 0.0
    keyframe = 0
    for i in range(len(times) - 1):
        tstart, tend = times[i], times[i + 1]
        if tstart <= time < tend:
            keyframe = i
            break
    if _float_equals(tend, tstart):
        interpolation = 'STEP'
    duration = max(_f32(tend - tstart), _EPSILON)
    t = min(max(_f32(_f32(time - tstart) / duration), 0.0), 1.0)

    def read(index):
        return tuple(values[index * components:index * components + components])

    if interpolation == 'STEP':
        return read(keyframe)
    if interpolation == 'CUBICSPLINE':
        v1, tangent1 = read(3 * keyframe + 1), read(3 * keyframe + 2)
        v2, tangent2 = read(3 * (keyframe + 1) + 1), read(3 * (keyframe + 1))
        t2, t3 = t * t, t * t * t
        if components == 3:
            return tuple((2 * t3 - 3 * t2 + 1) * v1[i] + (t3 - 2 * t2 + t) * tangent1[i]
                         + (-2 * t3 + 3 * t2) * v2[i] + (t3 - t2) * tangent2[i] for i in range(3))
        v1, v2 = rm._qnormalize(v1), rm._qnormalize(v2)
        if sum(v1[i] * v2[i] for i in range(4)) < 0.0:
            v2 = tuple(-v for v in v2)
        out_tangent = (tangent1[0] * duration, tangent1[1] * duration, tangent1[2] * duration, 0.0)
        in_tangent = (tangent2[0] * duration, tangent2[1] * duration, tangent2[2] * duration, 0.0)
        h00, h10, h01, h11 = 2 * t3 - 3 * t2 + 1, t3 - 2 * t2 + t, -2 * t3 + 3 * t2, t3 - t2
        return rm._qnormalize(tuple(v1[i] * h00 + out_tangent[i] * h10 + v2[i] * h01
                                    + in_tangent[i] * h11 for i in range(4)))
    a, b = read(keyframe), read(keyframe + 1)
    if components == 3:
        return tuple(a[i] + t * (b[i] - a[i]) for i in range(3))
    return rm.slerp(a, b, t)


def build_pose_from_parents(bones, transforms):
    for i, (_, parent) in enumerate(bones):
        if parent < 0 or parent > i:
            continue
        t, r, s = transforms[i]
        pt, pr, ps = transforms[parent]
        r = rm._qmul(pr, r)
        s = (s[0] * ps[0], s[1] * ps[1], s[2] * ps[2])
        t = (t[0] * ps[0], t[1] * ps[1], t[2] * ps[2])
        t = rm._rotate_by_quaternion(t, pr)
        t = (t[0] + pt[0], t[1] + pt[1], t[2] + pt[2])
        transforms[i] = (t, r, s)


def load_animations(absolute, function):
    """[(nome, ossos [(nome, pai)], quadros [[(t, r, s) por osso]])] do primeiro esqueleto."""
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
        duration = 0.0
        for channel in animation.get('channels', []):
            target = channel.get('target', {})
            node = target.get('node')
            if node not in members:
                continue
            bone = joints.index(node)
            sampler = animation['samplers'][channel['sampler']]
            path = target.get('path')
            times, _, _, _ = doc.accessor(sampler['input'])
            values, components, _, _ = doc.accessor(sampler['output'])
            if path in ('translation', 'rotation', 'scale'):
                channels[bone][path] = (sampler.get('interpolation', 'LINEAR'), times, values)
            if times:
                duration = max(duration, times[-1])
        # Contas em float, como no C: (int)(animDuration*GLTF_FRAMERATE) + 1 e j/GLTF_FRAMERATE.
        keyframes = int(_f32(duration * GLTF_FRAMERATE)) + 1
        poses = []
        for frame in range(keyframes):
            time = _f32(frame / GLTF_FRAMERATE)
            pose = []
            for bone, joint in enumerate(joints):
                t, r, s = doc.trs(joint)
                found = channels[bone]
                if 'translation' in found:
                    t = _pose_at(found['translation'][0], found['translation'][1], found['translation'][2], 3, time)
                if 'rotation' in found:
                    r = _pose_at(found['rotation'][0], found['rotation'][1], found['rotation'][2], 4, time)
                if 'scale' in found:
                    s = _pose_at(found['scale'][0], found['scale'][1], found['scale'][2], 3, time)
                pose.append(decompose(rm._mul(_trs_matrix(t, r, s), offsets[bone])))
            build_pose_from_parents(bones, pose)
            poses.append(pose)
        result.append(((animation.get('name') or '')[:31], bones, poses))
    return result
