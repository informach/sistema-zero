"""Shaders do raylib (extensão Raylib 3D): load_shader, as posições dos uniforms e os valores.

O shader é compilado pelo navegador (GLSL 330 do computador vira GLSL ES 300 lá), mas o jogo
pergunta as posições AGORA (`get_shader_location`). Então as posições saem daqui, com a regra
medida no raylib 6.0.1.0 do computador: só valem os uniforms que o shader USA (declarado e não
usado dá -1, como no driver), numeradas em ordem alfabética; os atributos têm posição fixa pelo
nome (o rlgl as amarra antes de ligar o programa). O navegador recebe a lista de nomes e acha
cada posição pelo índice.
"""
import re

from . import _constants as K
from . import _rt as rt
from ._ffi import NULL, Pointer
from ._structs import Matrix, Shader, Texture, Vector2, Vector3, Vector4
from ._args import integer, struct

MAX_SHADER_LOCATIONS = 32
MAX_SHADER_CHARS = 64 * 1024
DEFAULT_SHADER_ID = 3

# rlgl: RL_DEFAULT_SHADER_ATTRIB_LOCATION_* (o rlgl amarra estes nomes antes de ligar o programa).
ATTRIBUTES = {'vertexPosition': 0, 'vertexTexCoord': 1, 'vertexNormal': 2, 'vertexColor': 3,
              'vertexTangent': 4, 'vertexTexCoord2': 5, 'vertexBoneIndices': 7,
              'vertexBoneWeights': 8, 'instanceTransform': 9}

# O shader padrão do rlgl em GLSL 330: é o que fica no lugar de um ffi.NULL.
DEFAULT_VS = '''#version 330
in vec3 vertexPosition;
in vec2 vertexTexCoord;
in vec4 vertexColor;
out vec2 fragTexCoord;
out vec4 fragColor;
uniform mat4 mvp;
void main()
{
    fragTexCoord = vertexTexCoord;
    fragColor = vertexColor;
    gl_Position = mvp*vec4(vertexPosition, 1.0);
}
'''
DEFAULT_FS = '''#version 330
in vec2 fragTexCoord;
in vec4 fragColor;
out vec4 finalColor;
uniform sampler2D texture0;
uniform vec4 colDiffuse;
void main()
{
    vec4 texelColor = texture(texture0, fragTexCoord);
    finalColor = texelColor*colDiffuse*fragColor;
}
'''

_COMMENTS = re.compile(r'//[^\n]*|/\*.*?\*/', re.S)
_UNIFORM = re.compile(r'\buniform\s+(?:(?:lowp|mediump|highp)\s+)?\w+\s+([^;]+);')
_INPUT = re.compile(r'\b(?:in|attribute)\s+(?:(?:lowp|mediump|highp)\s+)?\w+\s+(\w+)\s*;')
_ASSIGN = re.compile(r'\b(\w+)\s*=\s*([^;]+);')

# id do shader → [nomes dos uniforms ativos, nomes dos atributos ativos]
_known = {DEFAULT_SHADER_ID: [['colDiffuse', 'mvp', 'texture0'],
                              ['vertexPosition', 'vertexTexCoord', 'vertexColor']]}


def _top_level_split(text):
    parts, depth, start = [], 0, 0
    for i, char in enumerate(text):
        if char in '([':
            depth += 1
        elif char in ')]':
            depth -= 1
        elif char == ',' and depth == 0:
            parts.append(text[start:i])
            start = i + 1
    parts.append(text[start:])
    return parts


def _declared(code):
    names = []
    for match in _UNIFORM.finditer(code):
        for part in _top_level_split(match.group(1)):
            name = re.match(r'\s*(\w+)', part)
            if name:
                names.append(name.group(1))
    return names


def _used(code, name):
    """O nome aparece no código fora das próprias declarações de uniform."""
    body = _UNIFORM.sub(' ', code)
    return re.search(rf'\b{re.escape(name)}\b', body) is not None


def _active(vs, fs):
    """(uniforms ativos em ordem alfabética, atributos ativos) do par de shaders."""
    vs_code, fs_code = _COMMENTS.sub(' ', vs), _COMMENTS.sub(' ', fs)
    uniforms = set()
    for code in (vs_code, fs_code):
        for name in _declared(code):
            if _used(code, name):
                uniforms.add(name)
    # Um atributo que só alimenta uma saída que o fragment não lê some no driver (medido:
    # vertexColor dá -1 quando o fragment não usa fragColor).
    fs_body = _INPUT.sub(' ', fs_code)
    feeds = {}
    for match in _ASSIGN.finditer(vs_code):
        feeds.setdefault(match.group(1), []).append(match.group(2))
    attributes = []
    for match in _INPUT.finditer(vs_code):
        name = match.group(1)
        if name not in ATTRIBUTES:
            continue
        uses = [target for target, expressions in feeds.items()
                if any(re.search(rf'\b{name}\b', e) for e in expressions)]
        reached = [target for target in uses
                   if target == 'gl_Position' or re.search(rf'\b{target}\b', fs_body)]
        if reached or (not uses and _used(vs_code, name)):
            attributes.append(name)
    return sorted(uniforms), attributes


def _source(value, function, param):
    if value is NULL:
        return None
    if value is None:
        raise TypeError(f'{function}: para não passar o {param}, use ffi.NULL (no raylib do '
                        'computador, None não vale aqui).')
    if isinstance(value, bytes):
        value = value.decode('utf-8')
    if not isinstance(value, str):
        raise TypeError(f'{function}: o {param} precisa ser um texto ou ffi.NULL, mas recebeu '
                        f'{type(value).__name__}.')
    return value


def _locs(uniforms, attributes):
    locs = [-1] * MAX_SHADER_LOCATIONS

    def attrib(loc, name):
        if name in attributes:
            locs[loc] = ATTRIBUTES[name]

    def uniform(loc, name):
        if name in uniforms:
            locs[loc] = uniforms.index(name)

    attrib(K.SHADER_LOC_VERTEX_POSITION, 'vertexPosition')
    attrib(K.SHADER_LOC_VERTEX_TEXCOORD01, 'vertexTexCoord')
    attrib(K.SHADER_LOC_VERTEX_TEXCOORD02, 'vertexTexCoord2')
    attrib(K.SHADER_LOC_VERTEX_NORMAL, 'vertexNormal')
    attrib(K.SHADER_LOC_VERTEX_TANGENT, 'vertexTangent')
    attrib(K.SHADER_LOC_VERTEX_COLOR, 'vertexColor')
    attrib(K.SHADER_LOC_VERTEX_BONEIDS, 'vertexBoneIndices')
    attrib(K.SHADER_LOC_VERTEX_BONEWEIGHTS, 'vertexBoneWeights')
    attrib(K.SHADER_LOC_VERTEX_INSTANCETRANSFORM, 'instanceTransform')
    uniform(K.SHADER_LOC_MATRIX_MVP, 'mvp')
    uniform(K.SHADER_LOC_MATRIX_VIEW, 'matView')
    uniform(K.SHADER_LOC_MATRIX_PROJECTION, 'matProjection')
    uniform(K.SHADER_LOC_MATRIX_MODEL, 'matModel')
    uniform(K.SHADER_LOC_MATRIX_NORMAL, 'matNormal')
    uniform(K.SHADER_LOC_MATRIX_BONETRANSFORMS, 'boneMatrices')
    uniform(K.SHADER_LOC_COLOR_DIFFUSE, 'colDiffuse')
    uniform(K.SHADER_LOC_MAP_DIFFUSE, 'texture0')
    uniform(K.SHADER_LOC_MAP_SPECULAR, 'texture1')
    uniform(K.SHADER_LOC_MAP_NORMAL, 'texture2')
    return locs


def default_shader():
    uniforms, attributes = _known[DEFAULT_SHADER_ID]
    return Shader(DEFAULT_SHADER_ID, _locs(uniforms, attributes))


def load_shader_from_memory(vsCode, fsCode, /):
    f = 'load_shader_from_memory'
    vs, fs = _source(vsCode, f, 'vsCode'), _source(fsCode, f, 'fsCode')
    if vs is None and fs is None:
        print('WARNING: SHADER: Shader files provided are not valid, using default shader')
        return default_shader()
    for code in (vs, fs):
        if code is not None and len(code) > MAX_SHADER_CHARS:
            raise ValueError(f'{f}: o shader passa de {MAX_SHADER_CHARS} letras.')
    uniforms, attributes = _active(vs or DEFAULT_VS, fs or DEFAULT_FS)
    shader_id = rt.new_id()
    _known[shader_id] = [uniforms, attributes]
    rt.pending_models.append(['shader', shader_id, vs, fs, uniforms, 0, b''])
    return Shader(shader_id, _locs(uniforms, attributes))


def _read(path, function):
    if path is NULL:
        return NULL
    if path is None:
        raise TypeError(f'{function}: para não passar um arquivo, use ffi.NULL (no raylib do '
                        'computador, None não vale aqui).')
    _, absolute = rt.project_path(path, function)
    with open(absolute, encoding='utf-8') as stream:
        return stream.read()


def load_shader(vsFileName, fsFileName, /):
    f = 'load_shader'
    return load_shader_from_memory(_read(vsFileName, f), _read(fsFileName, f))


def is_shader_valid(shader, /):
    s = struct(shader, Shader, 'is_shader_valid', 'shader')
    return s.id > 0 and s.locs is not None


def unload_shader(shader, /):
    s = struct(shader, Shader, 'unload_shader', 'shader')
    if s.id != DEFAULT_SHADER_ID and s.id in _known:
        del _known[s.id]
        rt.pending_free.append(s.id)


def get_shader_location(shader, uniformName, /):
    s = struct(shader, Shader, 'get_shader_location', 'shader')
    name = uniformName.decode('utf-8') if isinstance(uniformName, bytes) else uniformName
    uniforms = _known.get(s.id, [[], []])[0]
    if name in uniforms:
        return uniforms.index(name)
    return -1


def get_shader_location_attrib(shader, attribName, /):
    s = struct(shader, Shader, 'get_shader_location_attrib', 'shader')
    name = attribName.decode('utf-8') if isinstance(attribName, bytes) else attribName
    return ATTRIBUTES[name] if name in _known.get(s.id, [[], []])[1] else -1


# Quantos números cada tipo de uniform lê (SHADER_UNIFORM_*): FLOAT, VEC2, VEC3, VEC4, INT...
_SIZES = {K.SHADER_UNIFORM_FLOAT: 1, K.SHADER_UNIFORM_VEC2: 2, K.SHADER_UNIFORM_VEC3: 3,
          K.SHADER_UNIFORM_VEC4: 4, K.SHADER_UNIFORM_INT: 1, K.SHADER_UNIFORM_IVEC2: 2,
          K.SHADER_UNIFORM_IVEC3: 3, K.SHADER_UNIFORM_IVEC4: 4, K.SHADER_UNIFORM_SAMPLER2D: 1}
_FIELDS = {Vector2: ('x', 'y'), Vector3: ('x', 'y', 'z'), Vector4: ('x', 'y', 'z', 'w')}


def _numbers(value, function):
    """Os números que o ponteiro guarda, como o C os leria na memória."""
    if isinstance(value, Pointer):
        items = value.items
    elif type(value) in _FIELDS:
        items = [value]
    else:
        raise TypeError(f'{function}: o valor precisa vir do ffi (ffi.new("struct Vector2 *", '
                        f'[1, 0]) ou ffi.new("float *", 0.5)) ou ser um Vector, mas recebeu '
                        f'{type(value).__name__}. No raylib do computador, número ou lista '
                        'solta não vale aqui.')
    out = []
    for item in items:
        fields = _FIELDS.get(type(item))
        if fields:
            out.extend(float(getattr(item, name)) for name in fields)
        elif isinstance(item, (int, float)):
            out.append(float(item))
        else:
            raise TypeError(f'{function}: o ffi guarda um {type(item).__name__}, que não é número.')
    return out


def _uniform(function, shader, locIndex, value, uniformType, count):
    s = struct(shader, Shader, function, 'shader')
    loc = integer(locIndex, function, 'locIndex')
    kind = integer(uniformType, function, 'uniformType')
    if loc < 0:
        return
    size = _SIZES.get(kind)
    if size is None:
        raise ValueError(f'{function}: o Estúdio ainda não envia uniforms do tipo {kind} '
                         '(use FLOAT, VEC2, VEC3, VEC4, INT ou IVEC).')
    numbers = _numbers(value, function)
    needed = size * count
    # O C lê o que vier depois na memória quando o ponteiro guarda menos números que o tipo
    # pede; aqui o que falta vale zero.
    numbers.extend([0.0] * (needed - len(numbers)))
    rt.ops.extend((rt.OP_SHADER_VALUE, s.id, loc, kind, count))
    rt.ops.extend(numbers[:needed])


def set_shader_value(shader, locIndex, value, uniformType, /):
    _uniform('set_shader_value', shader, locIndex, value, uniformType, 1)


def set_shader_value_v(shader, locIndex, value, uniformType, count, /):
    f = 'set_shader_value_v'
    n = integer(count, f, 'count')
    if not 1 <= n <= 256:
        raise ValueError(f'{f}: count vai de 1 a 256.')
    _uniform(f, shader, locIndex, value, uniformType, n)


def set_shader_value_matrix(shader, locIndex, mat, /):
    f = 'set_shader_value_matrix'
    s = struct(shader, Shader, f, 'shader')
    loc = integer(locIndex, f, 'locIndex')
    m = struct(mat, Matrix, f, 'mat')
    if loc >= 0:
        rt.ops.extend((rt.OP_SHADER_MATRIX, s.id, loc))
        rt.ops.extend(getattr(m, f'm{i}') for i in range(16))


def set_shader_value_texture(shader, locIndex, texture, /):
    f = 'set_shader_value_texture'
    s = struct(shader, Shader, f, 'shader')
    loc = integer(locIndex, f, 'locIndex')
    t = struct(texture, Texture, f, 'texture')
    if loc >= 0:
        rt.ops.extend((rt.OP_SHADER_TEXTURE, s.id, loc, t.id))


def begin_shader_mode(shader, /):
    s = struct(shader, Shader, 'begin_shader_mode', 'shader')
    rt.ops.extend((rt.OP_SHADER_MODE, s.id))


def end_shader_mode():
    rt.ops.extend((rt.OP_SHADER_MODE, DEFAULT_SHADER_ID))
