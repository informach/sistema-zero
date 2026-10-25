/**
 * The shaders of the Raylib 3D extension in the browser. The game writes GLSL 330 (what the
 * desktop raylib compiles); WebGL2 takes GLSL ES 300, so the source is translated here: the
 * version line, the float precision and the uniform initializers (not allowed in ES; their
 * values are set right after linking). Nothing else is rewritten: a shader that only compiles on
 * desktop GL stops with the browser's own message.
 *
 * The uniform locations the game holds come from Python (the active uniforms, alphabetical, as
 * measured on the desktop raylib); `uniforms[location]` is the name, and the GL location is
 * looked up by that name in each program.
 */
import { RAYLIB_SHADER_UNIFORM } from './protocol'

export const DEFAULT_SHADER_ID = 3
export type ShaderLayout = 'mesh' | 'batch'

/** Where each vertex array keeps each attribute (the mesh VAO and the 2D batch VAO). */
const LOCATIONS: Record<ShaderLayout, Record<string, number>> = {
  mesh: {
    vertexPosition: 0,
    vertexTexCoord: 1,
    vertexNormal: 2,
    vertexColor: 3,
    vertexBoneIndices: 4,
    vertexBoneWeights: 5,
  },
  batch: { vertexPosition: 0, vertexTexCoord: 1, vertexColor: 2 },
}

/**
 * rlgl's default vertex shader, plus the skinning raylib does on the CPU
 * (UpdateModelAnimationVertexBuffers: Σ weight · bone · vertex), here per vertex from a texture
 * with one bone matrix per row. The internal names start with `sz` so a game's own uniform can
 * never collide with them.
 */
export const MESH_VERTEX = `#version 300 es
in vec3 vertexPosition;
in vec2 vertexTexCoord;
in vec4 vertexColor;
in vec4 vertexBoneIndices;
in vec4 vertexBoneWeights;
uniform mat4 mvp;
uniform int szSkinned;
uniform highp sampler2D szBoneMatrices;
out vec2 fragTexCoord;
out vec4 fragColor;
mat4 szBone(int i) {
  return mat4(texelFetch(szBoneMatrices, ivec2(0, i), 0), texelFetch(szBoneMatrices, ivec2(1, i), 0),
              texelFetch(szBoneMatrices, ivec2(2, i), 0), texelFetch(szBoneMatrices, ivec2(3, i), 0));
}
void main() {
  vec4 position = vec4(vertexPosition, 1.0);
  if (szSkinned == 1) {
    vec3 sum = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      float weight = vertexBoneWeights[i];
      if (weight != 0.0) sum += (szBone(int(vertexBoneIndices[i])) * position).xyz * weight;
    }
    position = vec4(sum, 1.0);
  }
  fragTexCoord = vertexTexCoord;
  fragColor = vertexColor;
  gl_Position = mvp * position;
}`
const BATCH_VERTEX = `#version 300 es
in vec3 vertexPosition;
in vec2 vertexTexCoord;
in vec4 vertexColor;
uniform mat4 mvp;
out vec2 fragTexCoord;
out vec4 fragColor;
void main() {
  fragTexCoord = vertexTexCoord;
  fragColor = vertexColor;
  gl_Position = mvp * vec4(vertexPosition, 1.0);
}`
/** rlgl's default fragment shader: texel × colDiffuse × vertex color, no lighting. */
export const DEFAULT_FRAGMENT = `#version 300 es
precision mediump float;
in vec2 fragTexCoord;
in vec4 fragColor;
uniform sampler2D texture0;
uniform vec4 colDiffuse;
out vec4 finalColor;
void main() {
  finalColor = texture(texture0, fragTexCoord) * colDiffuse * fragColor;
}`

const VERSION = /^[ \t]*#version[ \t]+(\d+)([ \t]+\w+)?[ \t]*$/m
const EXTENSION = /^[ \t]*#extension[^\n]*$/gm
const INITIALIZED =
  /\buniform\s+((?:lowp|mediump|highp)\s+)?(float|int|vec[234]|ivec[234])\s+(\w+)\s*=\s*([^;]+);/g
const SIZE: Record<string, number> = {
  float: 1,
  int: 1,
  vec2: 2,
  vec3: 3,
  vec4: 4,
  ivec2: 2,
  ivec3: 3,
  ivec4: 4,
}
const MAX_SOURCE = 64 * 1024

export interface UniformDefault {
  name: string
  type: string
  values: number[]
}

/** GLSL 330 → GLSL ES 300, with the uniform initializers taken out (and returned). */
export function translateGlsl(source: string): { code: string; defaults: UniformDefault[] } {
  const version = VERSION.exec(source)
  if (!version)
    throw new Error(
      'O shader precisa começar com #version 330, como os shaders do raylib do computador.',
    )
  if (version[1] !== '330')
    throw new Error(
      `O Estúdio entende shaders #version 330 (os do raylib do computador); este é #version ${version[1]}.`,
    )
  const defaults: UniformDefault[] = []
  // In GLSL ES a #extension has to come before any other statement, the precisions included.
  const extensions: string[] = []
  const code = source
    .replace(EXTENSION, (line) => {
      extensions.push(line.trim())
      return ''
    })
    .replace(
      VERSION,
      ['#version 300 es', ...extensions, 'precision highp float;', 'precision highp int;'].join(
        '\n',
      ),
    )
    .replace(INITIALIZED, (_all, precision: string | undefined, type: string, name, value) => {
      defaults.push({ name, type, values: literal(type, String(value).trim()) })
      return `uniform ${precision ?? ''}${type} ${name};`
    })
  return { code, defaults }
}

function literal(type: string, text: string): number[] {
  const size = SIZE[type]!
  const number = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?[fF]?$/
  const plain = text.replace(/[fF]$/, '')
  if (number.test(text)) return Array(size).fill(Number(plain))
  const call = /^(\w+)\s*\(([^()]*)\)$/.exec(text)
  if (call && call[1] === type) {
    const parts = call[2]!.split(',').map((part) => part.trim())
    if (parts.every((part) => number.test(part))) {
      const values = parts.map((part) => Number(part.replace(/[fF]$/, '')))
      if (values.length === 1) return Array(size).fill(values[0])
      if (values.length === size) return values
    }
  }
  throw new Error(
    `O valor inicial do uniform precisa ser um número ou ${type}(números) (o shader tem "${text}").`,
  )
}

interface StoredValue {
  kind: number
  values: Float32Array | Int32Array
}

interface ShaderRecord {
  vertex: string | null
  fragment: string | null
  uniforms: readonly string[]
  values: Map<number, StoredValue>
  matrices: Map<number, Float32Array>
  programs: Partial<Record<ShaderLayout, Linked>>
}

export interface Linked {
  program: WebGLProgram
  layout: ShaderLayout
  skinning: boolean
  location(name: string): WebGLUniformLocation | null
}

/** What the draw already knows: the matrices, the tint and the material textures. */
export interface AutomaticUniforms {
  mvp: Float32Array
  colDiffuse: readonly [number, number, number, number]
  model?: Float32Array
  view?: Float32Array
  projection?: Float32Array
  /** [texture unit, texture id] of the material maps 0, 1 and 2 (texture0..texture2). */
  maps?: ReadonlyArray<readonly [number, number]>
}

const INT_KINDS: ReadonlySet<number> = new Set([
  RAYLIB_SHADER_UNIFORM.INT,
  RAYLIB_SHADER_UNIFORM.IVEC2,
  RAYLIB_SHADER_UNIFORM.IVEC3,
  RAYLIB_SHADER_UNIFORM.IVEC4,
  RAYLIB_SHADER_UNIFORM.SAMPLER2D,
])
const COMPONENTS: Record<number, number> = {
  [RAYLIB_SHADER_UNIFORM.FLOAT]: 1,
  [RAYLIB_SHADER_UNIFORM.VEC2]: 2,
  [RAYLIB_SHADER_UNIFORM.VEC3]: 3,
  [RAYLIB_SHADER_UNIFORM.VEC4]: 4,
  [RAYLIB_SHADER_UNIFORM.INT]: 1,
  [RAYLIB_SHADER_UNIFORM.IVEC2]: 2,
  [RAYLIB_SHADER_UNIFORM.IVEC3]: 3,
  [RAYLIB_SHADER_UNIFORM.IVEC4]: 4,
  [RAYLIB_SHADER_UNIFORM.SAMPLER2D]: 1,
}
const MAX_SHADERS = 64
const MAX_UNIFORM_COUNT = 256
/** rlgl's RL_DEFAULT_BATCH_MAX_TEXTURE_UNITS: the extra textures of set_shader_value_texture. */
const MAX_EXTRA_TEXTURES = 4

export function createShaderStore(
  gl: WebGL2RenderingContext,
  textures: (id: number) => WebGLTexture | undefined,
) {
  const shaders = new Map<number, ShaderRecord>()
  const defaults: Partial<Record<ShaderLayout, Linked>> = {}
  /**
   * rlgl's activeTextureId: SetShaderValueTexture points the sampler at unit 1 + i and keeps
   * the texture here, and only the batch draw (rlDrawRenderBatch) binds it. DrawMesh does not:
   * there the unit holds a material map or nothing (measured: the sampler reads black).
   */
  const active: number[] = []
  let black: WebGLTexture | null = null

  function compile(type: number, source: string, what: string) {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('O navegador não deixou criar um shader.')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`O ${what} não compilou. O navegador disse: ${log}`)
    }
    return shader
  }

  function link(
    layout: ShaderLayout,
    vertex: string,
    fragment: string,
    defaultsToSet: readonly UniformDefault[],
  ): Linked {
    const program = gl.createProgram()
    const parts = [
      compile(gl.VERTEX_SHADER, vertex, 'vertex shader'),
      compile(gl.FRAGMENT_SHADER, fragment, 'fragment shader'),
    ]
    for (const part of parts) gl.attachShader(program, part)
    for (const [name, index] of Object.entries(LOCATIONS[layout]))
      gl.bindAttribLocation(program, index, name)
    gl.linkProgram(program)
    for (const part of parts) gl.deleteShader(part)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error(`O shader não ligou o vertex ao fragment. O navegador disse: ${log}`)
    }
    const cache = new Map<string, WebGLUniformLocation | null>()
    const linked: Linked = {
      program,
      layout,
      skinning: vertex === MESH_VERTEX,
      location(name) {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name))
        return cache.get(name)!
      },
    }
    if (defaultsToSet.length) {
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
      gl.useProgram(program)
      for (const value of defaultsToSet) {
        const at = linked.location(value.name)
        if (!at) continue
        const integer = value.type === 'int' || value.type.startsWith('ivec')
        upload(at, value.values.length, integer, value.values, 1)
      }
    }
    return linked
  }

  function upload(
    at: WebGLUniformLocation,
    size: number,
    integer: boolean,
    values: ArrayLike<number>,
    count: number,
  ) {
    const data = integer ? Int32Array.from(values) : Float32Array.from(values)
    const n = size * count
    if (integer) {
      const v = data as Int32Array
      if (size === 1) gl.uniform1iv(at, v, 0, n)
      else if (size === 2) gl.uniform2iv(at, v, 0, n)
      else if (size === 3) gl.uniform3iv(at, v, 0, n)
      else gl.uniform4iv(at, v, 0, n)
    } else {
      const v = data as Float32Array
      if (size === 1) gl.uniform1fv(at, v, 0, n)
      else if (size === 2) gl.uniform2fv(at, v, 0, n)
      else if (size === 3) gl.uniform3fv(at, v, 0, n)
      else gl.uniform4fv(at, v, 0, n)
    }
  }

  return {
    /** A `['shader', id, vs, fs, uniforms, 0]` entry. */
    define(entry: readonly unknown[]) {
      const [, id, vertex, fragment, uniforms] = entry
      const text = (value: unknown) =>
        value === null || (typeof value === 'string' && value.length <= MAX_SOURCE)
      if (
        typeof id !== 'number' ||
        !Number.isSafeInteger(id) ||
        id <= DEFAULT_SHADER_ID ||
        !text(vertex) ||
        !text(fragment) ||
        !Array.isArray(uniforms) ||
        uniforms.length > 256 ||
        !uniforms.every((name) => typeof name === 'string' && /^\w{1,64}$/.test(name))
      )
        throw new Error('Shader do Raylib com formato inválido.')
      if (!shaders.has(id) && shaders.size >= MAX_SHADERS)
        throw new Error(`O Estúdio guarda até ${MAX_SHADERS} shaders por jogo.`)
      this.free(id)
      shaders.set(id, {
        vertex: vertex as string | null,
        fragment: fragment as string | null,
        uniforms: uniforms as string[],
        values: new Map(),
        matrices: new Map(),
        programs: {},
      })
    },
    free(id: number) {
      const shader = shaders.get(id)
      if (!shader) return
      for (const linked of Object.values(shader.programs)) gl.deleteProgram(linked.program)
      shaders.delete(id)
    },
    /** The program for drawing with shader `id` on this layout (the default one for id 3). */
    program(id: number, layout: ShaderLayout): Linked {
      const shader = shaders.get(id)
      if (!shader) {
        defaults[layout] ??= link(
          layout,
          layout === 'mesh' ? MESH_VERTEX : BATCH_VERTEX,
          DEFAULT_FRAGMENT,
          [],
        )
        return defaults[layout]
      }
      if (!shader.programs[layout]) {
        const vertex = shader.vertex === null ? null : translateGlsl(shader.vertex)
        const fragment = shader.fragment === null ? null : translateGlsl(shader.fragment)
        shader.programs[layout] = link(
          layout,
          vertex?.code ?? (layout === 'mesh' ? MESH_VERTEX : BATCH_VERTEX),
          fragment?.code ?? DEFAULT_FRAGMENT,
          [...(vertex?.defaults ?? []), ...(fragment?.defaults ?? [])],
        )
      }
      return shader.programs[layout]
    },
    has(id: number) {
      return shaders.has(id)
    },
    /** OP_SHADER_VALUE: [shader, location, kind, count, values...]; returns the next record. */
    value(r: Float64Array, at: number) {
      if (at + 4 > r.length) throw new Error('Lista de desenho do Raylib inválida.')
      const id = r[at]!
      const location = r[at + 1]!
      const kind = r[at + 2]!
      const count = r[at + 3]!
      const size = COMPONENTS[kind]
      if (
        size === undefined ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > MAX_UNIFORM_COUNT ||
        at + 4 + size * count > r.length
      )
        throw new Error('Lista de desenho do Raylib inválida.')
      const numbers = r.subarray(at + 4, at + 4 + size * count)
      const shader = shaders.get(id)
      if (shader && Number.isInteger(location) && location >= 0)
        shader.values.set(location, {
          kind,
          values: INT_KINDS.has(kind) ? Int32Array.from(numbers) : Float32Array.from(numbers),
        })
      return at + 4 + size * count
    },
    matrix(id: number, location: number, values: Float64Array) {
      const shader = shaders.get(id)
      if (shader && location >= 0) shader.matrices.set(location, Float32Array.from(values))
    },
    texture(id: number, location: number, texture: number) {
      const shader = shaders.get(id)
      if (!shader || location < 0) return
      let slot = active.indexOf(texture)
      if (slot < 0) {
        // Full: rlSetUniformSampler leaves the sampler as it was.
        if (active.length >= MAX_EXTRA_TEXTURES) return
        slot = active.push(texture) - 1
      }
      shader.values.set(location, {
        kind: RAYLIB_SHADER_UNIFORM.SAMPLER2D,
        values: Int32Array.of(1 + slot),
      })
    },
    /**
     * Uses the program and sets what rlgl sets on a draw (DrawMesh / rlDrawRenderBatch) plus
     * every value the game gave this shader. The game's values go last, as SetShaderValue
     * would overwrite what was there.
     */
    use(id: number, linked: Linked, automatic: AutomaticUniforms) {
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
      gl.useProgram(linked.program)
      const matrix = (name: string, value: Float32Array | undefined) => {
        const at = value && linked.location(name)
        if (at) gl.uniformMatrix4fv(at, false, value!)
      }
      matrix('mvp', automatic.mvp)
      matrix('matModel', automatic.model)
      matrix('matView', automatic.view)
      matrix('matProjection', automatic.projection)
      if (automatic.model && linked.location('matNormal'))
        matrix('matNormal', normalMatrix(automatic.model))
      const diffuse = linked.location('colDiffuse')
      if (diffuse) gl.uniform4f(diffuse, ...automatic.colDiffuse)
      for (const [unit, texture] of automatic.maps ?? [[0, 1] as const]) {
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, textures(texture) ?? textures(1) ?? null)
        const at = linked.location(`texture${unit}`)
        if (at) gl.uniform1i(at, unit)
      }
      const shader = shaders.get(id)
      if (shader) {
        for (const [location, stored] of shader.values) {
          const name = shader.uniforms[location]
          const at = name ? linked.location(name) : null
          if (!at) continue
          const size = COMPONENTS[stored.kind]!
          upload(at, size, INT_KINDS.has(stored.kind), stored.values, stored.values.length / size)
        }
        for (const [location, value] of shader.matrices) {
          const name = shader.uniforms[location]
          const at = name ? linked.location(name) : null
          if (at) gl.uniformMatrix4fv(at, false, value)
        }
      }
      const maps = new Set((automatic.maps ?? []).map(([unit]) => unit))
      // Only a game's shader reads the extra units; the default one never does.
      for (let slot = 0; shader && slot < MAX_EXTRA_TEXTURES; slot++) {
        const unit = 1 + slot
        if (maps.has(unit)) continue
        gl.activeTexture(gl.TEXTURE0 + unit)
        const texture = linked.layout === 'batch' ? active[slot] : undefined
        if (texture !== undefined) {
          gl.bindTexture(gl.TEXTURE_2D, textures(texture) ?? textures(1) ?? null)
          continue
        }
        if (!black) {
          black = gl.createTexture()
          gl.bindTexture(gl.TEXTURE_2D, black)
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 255]),
          )
        }
        gl.bindTexture(gl.TEXTURE_2D, black)
      }
      gl.activeTexture(gl.TEXTURE0)
    },
    /**
     * rlDrawRenderBatch ends with "Reset active texture units for next batch": the textures of
     * SetShaderValueTexture last until the next batch draw (a state change, a camera, the end
     * of the frame), never for the whole game.
     */
    endBatch() {
      active.length = 0
    },
    dispose() {
      for (const id of [...shaders.keys()]) this.free(id)
      for (const linked of Object.values(defaults)) gl.deleteProgram(linked.program)
      if (black) gl.deleteTexture(black)
      black = null
    },
  }
}

export type ShaderStore = ReturnType<typeof createShaderStore>

/** matNormal: transpose(inverse(model)), as rlgl computes it for DrawMesh. */
function normalMatrix(m: Float32Array) {
  const a = Array.from(m)
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = a as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const b00 = a00 * a11 - a01 * a10
  const b01 = a00 * a12 - a02 * a10
  const b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11
  const b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30
  const b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31
  const b10 = a21 * a33 - a23 * a31
  const b11 = a22 * a33 - a23 * a32
  const inv = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06)
  const inverse = [
    (a11 * b11 - a12 * b10 + a13 * b09) * inv,
    (-a01 * b11 + a02 * b10 - a03 * b09) * inv,
    (a31 * b05 - a32 * b04 + a33 * b03) * inv,
    (-a21 * b05 + a22 * b04 - a23 * b03) * inv,
    (-a10 * b11 + a12 * b08 - a13 * b07) * inv,
    (a00 * b11 - a02 * b08 + a03 * b07) * inv,
    (-a30 * b05 + a32 * b02 - a33 * b01) * inv,
    (a20 * b05 - a22 * b02 + a23 * b01) * inv,
    (a10 * b10 - a11 * b08 + a13 * b06) * inv,
    (-a00 * b10 + a01 * b08 - a03 * b06) * inv,
    (a30 * b04 - a31 * b02 + a33 * b00) * inv,
    (-a20 * b04 + a21 * b02 - a23 * b00) * inv,
    (-a10 * b09 + a11 * b07 - a12 * b06) * inv,
    (a00 * b09 - a01 * b07 + a02 * b06) * inv,
    (-a30 * b03 + a31 * b01 - a32 * b00) * inv,
    (a20 * b03 - a21 * b01 + a22 * b00) * inv,
  ]
  const out = new Float32Array(16)
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) out[col * 4 + row] = inverse[row * 4 + col]!
  return out
}
