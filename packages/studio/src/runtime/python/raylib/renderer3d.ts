/**
 * The 3D half of the Raylib renderer (the Raylib 3D extension): the 3D camera, the rlgl state and
 * the immediate shapes of rmodels.c (raylib 6.0), tessellated exactly as raylib does it (same
 * rings, same sides, same winding) into the shared rlgl-like batch. The 2D renderer hands over
 * every opcode from 60 on.
 */
import { RAYLIB_OP, RAYLIB_OP_ARITY } from './protocol'
import { createShaderStore, DEFAULT_SHADER_ID } from './raylibShaders'

export interface Raylib3DHost {
  setProjection(matrix: Float32Array): void
  setView(matrix: Float32Array): void
  restore2D(): void
  size(): readonly [number, number]
  /** The rlgl matrices right now: the transform is null when no rl_push_matrix is active. */
  matrices(): { projection: Float32Array; view: Float32Array; transform: Float32Array | null }
  vertex(x: number, y: number, u: number, v: number, color: number, z?: number): void
  begin(mode: 0 | 1, texture?: number, vertices?: number): void
  /** rlPushMatrix / rlPopMatrix and the transforms that act on the current matrix. */
  push(): void
  pop(): void
  translate(x: number, y: number, z: number): void
  rotate(degrees: number, x: number, y: number, z: number): void
  scale(x: number, y: number, z: number): void
}

export interface Raylib3D {
  /** Runs one 3D opcode whose arguments start at `at`; returns where the next record starts. */
  op(op: number, list: Float64Array, at: number, host: Raylib3DHost): number
  /** Re-applies the rlgl state that outlives a frame (culling, depth mask, blending). */
  frameStart(): void
  /** Uploads the meshes the module registered this frame (their bytes follow in `blobs`). */
  load(models: readonly unknown[], blobs: Uint8Array): void
  /** Releases a mesh or shader the game unloaded (ids it does not know are ignored). */
  free(id: number): void
  /**
   * The 2D batch is about to draw: with a shader of the game active (BeginShaderMode), use it
   * and answer true; otherwise false and the batch uses its own program.
   */
  batch(mvp: Float32Array, texture: number): boolean
  dispose(): void
}

const CULL_NEAR = 0.05
const CULL_FAR = 4000
const DEG2RAD = Math.PI / 180
const DEFAULT_TEXTURE = 1
const GRID_CENTER = 0x7f7f7fff
const GRID_LINE = 0xbfbfbfff

type Vec3 = readonly [number, number, number]

/** rlFrustum on an identity matrix (column-major m0..m15). */
function frustum(l: number, r: number, b: number, t: number, n: number, f: number) {
  const rl = r - l
  const tb = t - b
  const fn = f - n
  return new Float32Array([
    (n * 2) / rl,
    0,
    0,
    0,
    0,
    (n * 2) / tb,
    0,
    0,
    (r + l) / rl,
    (t + b) / tb,
    -(f + n) / fn,
    -1,
    0,
    0,
    -(f * n * 2) / fn,
    0,
  ])
}
function ortho(l: number, r: number, b: number, t: number, n: number, f: number) {
  const rl = r - l
  const tb = t - b
  const fn = f - n
  return new Float32Array([
    2 / rl,
    0,
    0,
    0,
    0,
    2 / tb,
    0,
    0,
    0,
    0,
    -2 / fn,
    0,
    -(l + r) / rl,
    -(t + b) / tb,
    -(f + n) / fn,
    1,
  ])
}
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
function normalize(v: Vec3): Vec3 {
  const length = Math.sqrt(dot(v, v))
  return length === 0 ? v : [v[0] / length, v[1] / length, v[2] / length]
}
/** Vector3Perpendicular: crossed with the axis where the vector is smallest. */
function perpendicular(v: Vec3): Vec3 {
  let lowest = Math.abs(v[0])
  let axis: Vec3 = [1, 0, 0]
  if (Math.abs(v[1]) < lowest) {
    lowest = Math.abs(v[1])
    axis = [0, 1, 0]
  }
  if (Math.abs(v[2]) < lowest) axis = [0, 0, 1]
  return cross(v, axis)
}
/** MatrixLookAt. */
function lookAt(eye: Vec3, target: Vec3, up: Vec3) {
  const vz = normalize(sub(eye, target))
  const vx = normalize(cross(up, vz))
  const vy = cross(vz, vx)
  return new Float32Array([
    vx[0],
    vy[0],
    vz[0],
    0,
    vx[1],
    vy[1],
    vz[1],
    0,
    vx[2],
    vy[2],
    vz[2],
    0,
    -dot(vx, eye),
    -dot(vy, eye),
    -dot(vz, eye),
    1,
  ])
}

/**
 * raymath MatrixMultiply(left, right): apply `left`, then `right` (column-major m0..m15), with
 * every product and sum rounded to float as the C does: the last bit decides depth ties.
 */
function mul(a: Float32Array, b: Float32Array) {
  const f = Math.fround
  const out = new Float32Array(16)
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      out[col * 4 + row] = f(
        f(
          f(f(a[col * 4]! * b[row]!) + f(a[col * 4 + 1]! * b[4 + row]!)) +
            f(a[col * 4 + 2]! * b[8 + row]!),
        ) + f(a[col * 4 + 3]! * b[12 + row]!),
      )
  return out
}

const HAS_TEXCOORDS = 1
const HAS_NORMALS = 2
const HAS_COLORS = 4
const HAS_INDICES = 8
const HAS_BONES = 16
const MAX_MESH_VERTICES = 2_000_000
const MAX_BONES = 256
/** The record before the map list: mesh, shader, diffuse, specular, wires and the 16 matrix. */
const MESH_HEADER = 21

interface GpuMesh {
  vao: WebGLVertexArrayObject
  buffers: WebGLBuffer[]
  /** The triangle index buffer (the VAO goes back to it after drawing the wires). */
  elements: WebGLBuffer | null
  vertexCount: number
  flags: number
  indexCount: number
  indices: Uint16Array | null
  /** CPU copies for the wire mode, which decides front faces per draw. */
  positions: Float32Array
  boneIds: Uint8Array | null
  boneWeights: Float32Array | null
  wires: WebGLBuffer | null
}

export function createRaylib3D(
  gl: WebGL2RenderingContext,
  shared: { flush(): void; textures(id: number): WebGLTexture | undefined },
): Raylib3D {
  // State that outlives a frame, as in rlgl (rlglInit: culling on, LEQUAL depth, blending on).
  let culling = true
  let depthMask = true
  let colorBlend = true
  gl.depthFunc(gl.LEQUAL)
  const meshes = new Map<number, GpuMesh>()
  const shaders = createShaderStore(gl, shared.textures)
  let batchShader = DEFAULT_SHADER_ID
  let boneTexture: WebGLTexture | null = null

  /** One `['mesh', id, vertexCount, indexCount, flags, size]` entry; returns the bytes it used. */
  function upload(entry: unknown, blobs: Uint8Array, offset: number) {
    if (Array.isArray(entry) && entry[0] === 'shader' && entry.length === 6) {
      shaders.define(entry)
      return 0
    }
    if (!Array.isArray(entry) || entry[0] !== 'mesh' || entry.length !== 6)
      throw new Error('Modelo do Raylib com formato inválido.')
    const [, id, count, indexCount, flags, size] = entry as unknown[]
    const whole = (value: unknown): value is number =>
      typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    if (!whole(id) || !whole(count) || !whole(indexCount) || !whole(flags) || !whole(size))
      throw new Error('Modelo do Raylib com formato inválido.')
    if (count > MAX_MESH_VERTICES) throw new Error('A malha tem vértices demais para o Estúdio.')
    const expected =
      count * 12 +
      (flags & HAS_TEXCOORDS ? count * 8 : 0) +
      (flags & HAS_NORMALS ? count * 12 : 0) +
      (flags & HAS_COLORS ? count * 4 : 0) +
      (flags & HAS_INDICES ? indexCount * 2 : 0) +
      (flags & HAS_BONES ? count * 20 : 0)
    if (expected !== size || offset + size > blobs.byteLength)
      throw new Error('Os dados de uma malha chegaram incompletos.')
    free(id)
    let at = offset
    // A copy per part: the typed arrays need their own aligned buffer.
    const take = (bytes: number) => {
      const part = blobs.slice(at, at + bytes)
      at += bytes
      return part
    }
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const buffers: WebGLBuffer[] = []
    const attribute = (
      index: number,
      data: Uint8Array,
      components: number,
      type: number,
      normalized: boolean,
    ) => {
      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      gl.vertexAttribPointer(index, components, type, normalized, 0, 0)
      gl.enableVertexAttribArray(index)
      buffers.push(buffer)
    }
    const positionBytes = take(count * 12)
    attribute(0, positionBytes, 3, gl.FLOAT, false)
    if (flags & HAS_TEXCOORDS) attribute(1, take(count * 8), 2, gl.FLOAT, false)
    if (flags & HAS_NORMALS) attribute(2, take(count * 12), 3, gl.FLOAT, false)
    if (flags & HAS_COLORS) attribute(3, take(count * 4), 4, gl.UNSIGNED_BYTE, true)
    let indices: Uint16Array | null = null
    let elements: WebGLBuffer | null = null
    if (flags & HAS_INDICES) {
      indices = new Uint16Array(take(indexCount * 2).buffer)
      elements = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
      buffers.push(elements)
    }
    let boneIds: Uint8Array | null = null
    let boneWeights: Float32Array | null = null
    if (flags & HAS_BONES) {
      boneIds = take(count * 4)
      attribute(4, boneIds, 4, gl.UNSIGNED_BYTE, false)
      const weights = take(count * 16)
      boneWeights = new Float32Array(weights.buffer)
      attribute(5, weights, 4, gl.FLOAT, false)
    }
    gl.bindVertexArray(null)
    meshes.set(id, {
      vao,
      buffers,
      elements,
      vertexCount: count,
      flags,
      indexCount: flags & HAS_INDICES ? indexCount : 0,
      indices,
      positions: new Float32Array(positionBytes.buffer),
      boneIds,
      boneWeights,
      wires: null,
    })
    return size
  }

  function free(id: number) {
    shaders.free(id)
    if (batchShader === id) batchShader = DEFAULT_SHADER_ID
    const mesh = meshes.get(id)
    if (!mesh) return
    gl.deleteVertexArray(mesh.vao)
    for (const buffer of mesh.buffers) gl.deleteBuffer(buffer)
    if (mesh.wires) gl.deleteBuffer(mesh.wires)
    meshes.delete(id)
  }

  /**
   * rlEnableWireMode (WebGL has no glPolygonMode): the edges of the triangles that the GPU would
   * draw. Polygon mode keeps back-face culling, so with culling on only the triangles facing the
   * camera give lines (measured on the desktop raylib: no back edges, diagonals included). The
   * facing is decided here per draw, with the same skinning as the shader.
   */
  function wireIndices(mesh: GpuMesh, mvp: Float32Array, bones: Float32Array | null) {
    const p = mesh.positions
    const ids = mesh.boneIds
    const weights = mesh.boneWeights
    const skin = bones && ids && weights ? { bones, ids, weights } : null
    const clip = new Float64Array(mesh.vertexCount * 3)
    const done = new Uint8Array(mesh.vertexCount)
    const project = (v: number) => {
      if (done[v]) return
      done[v] = 1
      let x = p[v * 3]!
      let y = p[v * 3 + 1]!
      let z = p[v * 3 + 2]!
      if (skin) {
        let sx = 0
        let sy = 0
        let sz = 0
        for (let i = 0; i < 4; i++) {
          const w = skin.weights[v * 4 + i]!
          if (w === 0) continue
          const m = skin.ids[v * 4 + i]! * 16
          const b = skin.bones
          sx += (b[m]! * x + b[m + 4]! * y + b[m + 8]! * z + b[m + 12]!) * w
          sy += (b[m + 1]! * x + b[m + 5]! * y + b[m + 9]! * z + b[m + 13]!) * w
          sz += (b[m + 2]! * x + b[m + 6]! * y + b[m + 10]! * z + b[m + 14]!) * w
        }
        x = sx
        y = sy
        z = sz
      }
      const cw = mvp[3]! * x + mvp[7]! * y + mvp[11]! * z + mvp[15]!
      clip[v * 3] = (mvp[0]! * x + mvp[4]! * y + mvp[8]! * z + mvp[12]!) / cw
      clip[v * 3 + 1] = (mvp[1]! * x + mvp[5]! * y + mvp[9]! * z + mvp[13]!) / cw
      clip[v * 3 + 2] = cw
    }
    const corner = (i: number) => (mesh.indices ? mesh.indices[i]! : i)
    const triangles = Math.floor((mesh.indices ? mesh.indexCount : mesh.vertexCount) / 3)
    const lines = new Uint32Array(triangles * 6)
    let used = 0
    for (let t = 0; t < triangles; t++) {
      const a = corner(t * 3)
      const b = corner(t * 3 + 1)
      const c = corner(t * 3 + 2)
      if (a >= mesh.vertexCount || b >= mesh.vertexCount || c >= mesh.vertexCount) continue
      project(a)
      project(b)
      project(c)
      // Behind the eye the GPU would clip the polygon first; those triangles give no edges here.
      if (clip[a * 3 + 2]! <= 0 || clip[b * 3 + 2]! <= 0 || clip[c * 3 + 2]! <= 0) continue
      if (culling) {
        const ax = clip[a * 3]!
        const ay = clip[a * 3 + 1]!
        const area =
          (clip[b * 3]! - ax) * (clip[c * 3 + 1]! - ay) -
          (clip[c * 3]! - ax) * (clip[b * 3 + 1]! - ay)
        if (!(area > 0)) continue
      }
      lines.set([a, b, b, c, c, a], used)
      used += 6
    }
    mesh.wires ??= gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.wires)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, lines.subarray(0, used), gl.DYNAMIC_DRAW)
    return used
  }

  /** OP_MESH (variable length): returns where the next record starts. */
  function drawMesh(r: Float64Array, start: number, host: Raylib3DHost) {
    let at = start
    const need = (count: number) => {
      if (!Number.isInteger(count) || count < 0 || at + count > r.length)
        throw new Error('Lista de desenho do Raylib inválida.')
    }
    need(MESH_HEADER)
    const id = r[at]!
    const shaderId = r[at + 1]!
    const color = r[at + 2]!
    const wiresMode = r[at + 4]! !== 0
    const model = new Float32Array(r.subarray(at + 5, at + MESH_HEADER))
    at += MESH_HEADER
    need(1)
    const maps = r[at++]!
    need(maps * 2)
    // DrawMesh binds map i to texture unit i; the shaders read maps 0..2 as texture0..2.
    const units: Array<readonly [number, number]> = [[0, DEFAULT_TEXTURE]]
    for (let i = 0; i < maps; i++) {
      const index = r[at + i * 2]!
      if (index === 0) units[0] = [0, r[at + i * 2 + 1]!]
      else if (index === 1 || index === 2) units.push([index, r[at + i * 2 + 1]!])
    }
    at += maps * 2
    need(1)
    const bones = r[at++]!
    if (bones > MAX_BONES) throw new Error(`O Estúdio anima até ${MAX_BONES} ossos por modelo.`)
    need(bones * 16)
    const boneData = bones ? new Float32Array(r.subarray(at, at + bones * 16)) : null
    at += bones * 16
    const mesh = meshes.get(id)
    if (!mesh) return at
    shared.flush()
    const { projection, view, transform } = host.matrices()
    // DrawMesh: matModel = transform × rlGetMatrixTransform(), then × view × projection.
    const matModel = transform ? mul(model, transform) : model
    const mvp = mul(mul(matModel, view), projection)
    const linked = shaders.program(shaders.has(shaderId) ? shaderId : DEFAULT_SHADER_ID, 'mesh')
    shaders.use(shaderId, linked, {
      mvp,
      colDiffuse: [
        ((color >>> 24) & 255) / 255,
        ((color >>> 16) & 255) / 255,
        ((color >>> 8) & 255) / 255,
        (color & 255) / 255,
      ],
      model: matModel,
      view,
      projection,
      maps: units,
    })
    const skinned = boneData !== null && (mesh.flags & HAS_BONES) !== 0
    if (linked.skinning) {
      gl.uniform1i(linked.location('szSkinned'), skinned ? 1 : 0)
      gl.activeTexture(gl.TEXTURE3)
      boneTexture ??= gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, boneTexture)
      if (skinned) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, bones, 0, gl.RGBA, gl.FLOAT, boneData)
      }
      gl.uniform1i(linked.location('szBoneMatrices'), 3)
      gl.activeTexture(gl.TEXTURE0)
    }
    gl.bindVertexArray(mesh.vao)
    // What the mesh does not have takes raylib's defaults (rlSetVertexAttributeDefault).
    if (!(mesh.flags & HAS_TEXCOORDS)) gl.vertexAttrib2f(1, 0, 0)
    if (!(mesh.flags & HAS_NORMALS)) gl.vertexAttrib3f(2, 0, 0, 1)
    if (!(mesh.flags & HAS_COLORS)) gl.vertexAttrib4f(3, 1, 1, 1, 1)
    if (!(mesh.flags & HAS_BONES)) {
      gl.vertexAttrib4f(4, 0, 0, 0, 0)
      gl.vertexAttrib4f(5, 0, 0, 0, 0)
    }
    if (wiresMode) {
      const count = wireIndices(mesh, mvp, skinned ? boneData : null)
      if (count) gl.drawElements(gl.LINES, count, gl.UNSIGNED_INT, 0)
      // The VAO keeps the element buffer last bound: give it its triangles back.
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.elements)
    } else if (mesh.indices) gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0)
    else gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount)
    gl.bindVertexArray(null)
    return at
  }

  function frameStart() {
    gl.depthFunc(gl.LEQUAL)
    gl.depthMask(depthMask)
    if (culling) gl.enable(gl.CULL_FACE)
    else gl.disable(gl.CULL_FACE)
    if (!colorBlend) gl.disable(gl.BLEND)
  }

  function op(code: number, r: Float64Array, at: number, host: Raylib3DHost): number {
    if (code === RAYLIB_OP.MESH) return drawMesh(r, at, host)
    if (code === RAYLIB_OP.SHADER_VALUE) return shaders.value(r, at)
    const arity = RAYLIB_OP_ARITY[code]
    if (arity === undefined || at + arity > r.length)
      throw new Error('Lista de desenho do Raylib inválida.')
    const tri = (a: Vec3, b: Vec3, c: Vec3, color: number) => {
      host.begin(0, DEFAULT_TEXTURE, 3)
      host.vertex(a[0], a[1], 0, 0, color, a[2])
      host.vertex(b[0], b[1], 0, 0, color, b[2])
      host.vertex(c[0], c[1], 0, 0, color, c[2])
    }
    const line = (a: Vec3, b: Vec3, color: number) => {
      host.begin(1, DEFAULT_TEXTURE, 2)
      host.vertex(a[0], a[1], 0, 0, color, a[2])
      host.vertex(b[0], b[1], 0, 0, color, b[2])
    }
    const v3 = (i: number): Vec3 => [r[at + i]!, r[at + i + 1]!, r[at + i + 2]!]
    switch (code) {
      case RAYLIB_OP.BEGIN_3D: {
        shared.flush()
        const [w, h] = host.size()
        const aspect = w / h
        const fovy = r[at + 9]!
        const projection = r[at + 10]!
        if (projection === 0) {
          const top = CULL_NEAR * Math.tan(fovy * 0.5 * DEG2RAD)
          const right = top * aspect
          host.setProjection(frustum(-right, right, -top, top, CULL_NEAR, CULL_FAR))
        } else if (projection === 1) {
          const top = fovy / 2
          const right = top * aspect
          host.setProjection(ortho(-right, right, -top, top, CULL_NEAR, CULL_FAR))
        } else
          host.setProjection(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
        host.setView(lookAt(v3(0), v3(3), v3(6)))
        gl.enable(gl.DEPTH_TEST)
        break
      }
      case RAYLIB_OP.END_3D:
        host.restore2D()
        gl.disable(gl.DEPTH_TEST)
        break
      case RAYLIB_OP.LINE_3D:
        line(v3(0), v3(3), r[at + 6]!)
        break
      case RAYLIB_OP.POINT_3D:
        host.push()
        host.translate(r[at]!, r[at + 1]!, r[at + 2]!)
        line([0, 0, 0], [0, 0, 0.1], r[at + 3]!)
        host.pop()
        break
      case RAYLIB_OP.CIRCLE_3D: {
        const radius = r[at + 3]!
        const color = r[at + 8]!
        host.push()
        host.translate(r[at]!, r[at + 1]!, r[at + 2]!)
        host.rotate(r[at + 7]!, r[at + 4]!, r[at + 5]!, r[at + 6]!)
        for (let i = 0; i < 360; i += 10)
          line(
            [Math.sin(DEG2RAD * i) * radius, Math.cos(DEG2RAD * i) * radius, 0],
            [Math.sin(DEG2RAD * (i + 10)) * radius, Math.cos(DEG2RAD * (i + 10)) * radius, 0],
            color,
          )
        host.pop()
        break
      }
      case RAYLIB_OP.TRIANGLE_3D:
        tri(v3(0), v3(3), v3(6), r[at + 9]!)
        break
      case RAYLIB_OP.CUBE:
        cube(host, tri, v3(0), r[at + 3]!, r[at + 4]!, r[at + 5]!, r[at + 6]!)
        break
      case RAYLIB_OP.CUBE_WIRES:
        cubeWires(host, line, v3(0), r[at + 3]!, r[at + 4]!, r[at + 5]!, r[at + 6]!)
        break
      case RAYLIB_OP.SPHERE:
        sphere(host, tri, v3(0), r[at + 3]!, r[at + 4]!, r[at + 5]!, r[at + 6]!)
        break
      case RAYLIB_OP.SPHERE_WIRES:
        sphereWires(host, line, v3(0), r[at + 3]!, r[at + 4]!, r[at + 5]!, r[at + 6]!)
        break
      case RAYLIB_OP.CYLINDER:
        cylinder(host, tri, v3(0), r[at + 3]!, r[at + 4]!, r[at + 5]!, r[at + 6]!, r[at + 7]!)
        break
      case RAYLIB_OP.CYLINDER_WIRES:
        cylinderWires(host, line, v3(0), r[at + 3]!, r[at + 4]!, r[at + 5]!, r[at + 6]!, r[at + 7]!)
        break
      case RAYLIB_OP.CYLINDER_EX:
        cylinderEx(tri, v3(0), v3(3), r[at + 6]!, r[at + 7]!, r[at + 8]!, r[at + 9]!)
        break
      case RAYLIB_OP.CYLINDER_WIRES_EX:
        cylinderWiresEx(line, v3(0), v3(3), r[at + 6]!, r[at + 7]!, r[at + 8]!, r[at + 9]!)
        break
      case RAYLIB_OP.CAPSULE:
        capsule(tri, line, false, v3(0), v3(3), r[at + 6]!, r[at + 7]!, r[at + 8]!, r[at + 9]!)
        break
      case RAYLIB_OP.CAPSULE_WIRES:
        capsule(tri, line, true, v3(0), v3(3), r[at + 6]!, r[at + 7]!, r[at + 8]!, r[at + 9]!)
        break
      case RAYLIB_OP.PLANE: {
        const color = r[at + 5]!
        host.push()
        host.translate(r[at]!, r[at + 1]!, r[at + 2]!)
        host.scale(r[at + 3]!, 1, r[at + 4]!)
        const a: Vec3 = [-0.5, 0, -0.5]
        const b: Vec3 = [-0.5, 0, 0.5]
        const c: Vec3 = [0.5, 0, 0.5]
        const d: Vec3 = [0.5, 0, -0.5]
        tri(a, b, c, color)
        tri(a, c, d, color)
        host.pop()
        break
      }
      case RAYLIB_OP.GRID: {
        const half = Math.trunc(r[at]! / 2)
        const spacing = r[at + 1]!
        for (let i = -half; i <= half; i++) {
          const color = i === 0 ? GRID_CENTER : GRID_LINE
          line([i * spacing, 0, -half * spacing], [i * spacing, 0, half * spacing], color)
          line([-half * spacing, 0, i * spacing], [half * spacing, 0, i * spacing], color)
        }
        break
      }
      case RAYLIB_OP.QUAD_3D: {
        const texture = shared.textures(r[at]!) ? r[at]! : DEFAULT_TEXTURE
        const color = r[at + 1]!
        const corner = (i: number) => at + 2 + i * 5
        host.begin(0, texture, 6)
        for (const i of [0, 1, 2, 0, 2, 3]) {
          const p = corner(i)
          host.vertex(r[p]!, r[p + 1]!, r[p + 3]!, r[p + 4]!, color, r[p + 2]!)
        }
        break
      }
      case RAYLIB_OP.RL_STATE: {
        shared.flush()
        const on = r[at + 1]! !== 0
        switch (r[at]!) {
          case 1:
            if (on) gl.enable(gl.DEPTH_TEST)
            else gl.disable(gl.DEPTH_TEST)
            break
          case 2:
            depthMask = on
            gl.depthMask(on)
            break
          case 3:
            culling = on
            if (on) gl.enable(gl.CULL_FACE)
            else gl.disable(gl.CULL_FACE)
            break
          case 4:
            colorBlend = on
            if (on) gl.enable(gl.BLEND)
            else gl.disable(gl.BLEND)
            break
        }
        break
      }
      case RAYLIB_OP.SHADER_MODE:
        shared.flush()
        batchShader = r[at]!
        break
      case RAYLIB_OP.SHADER_MATRIX:
        shaders.matrix(r[at]!, r[at + 1]!, r.subarray(at + 2, at + 18))
        break
      case RAYLIB_OP.SHADER_TEXTURE:
        shaders.texture(r[at]!, r[at + 1]!, r[at + 2]!)
        break
      default:
        throw new Error('Lista de desenho do Raylib inválida.')
    }
    return at + arity
  }

  return {
    op,
    frameStart,
    load(models, blobs) {
      let offset = 0
      for (const entry of models) offset += upload(entry, blobs, offset)
    },
    free,
    batch(mvp, texture) {
      if (batchShader === DEFAULT_SHADER_ID || !shaders.has(batchShader)) return false
      const linked = shaders.program(batchShader, 'batch')
      // rlDrawRenderBatch: colDiffuse white, the batch texture on unit 0.
      shaders.use(batchShader, linked, { mvp, colDiffuse: [1, 1, 1, 1], maps: [[0, texture]] })
      return true
    },
    dispose() {
      for (const id of [...meshes.keys()]) free(id)
      shaders.dispose()
      if (boneTexture) gl.deleteTexture(boneTexture)
      boneTexture = null
    },
  }
}

type Tri = (a: Vec3, b: Vec3, c: Vec3, color: number) => void
type Line = (a: Vec3, b: Vec3, color: number) => void

/** DrawCube: twelve triangles around the center, in rmodels.c's order. */
function cube(
  host: Raylib3DHost,
  tri: Tri,
  p: Vec3,
  w: number,
  h: number,
  l: number,
  color: number,
) {
  host.push()
  host.translate(p[0], p[1], p[2])
  const x0 = -w / 2
  const x1 = w / 2
  const y0 = -h / 2
  const y1 = h / 2
  const z0 = -l / 2
  const z1 = l / 2
  // Front, back, top, bottom, right, left.
  tri([x0, y0, z1], [x1, y0, z1], [x0, y1, z1], color)
  tri([x1, y1, z1], [x0, y1, z1], [x1, y0, z1], color)
  tri([x0, y0, z0], [x0, y1, z0], [x1, y0, z0], color)
  tri([x1, y1, z0], [x1, y0, z0], [x0, y1, z0], color)
  tri([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], color)
  tri([x1, y1, z0], [x0, y1, z0], [x1, y1, z1], color)
  tri([x0, y0, z0], [x1, y0, z1], [x0, y0, z1], color)
  tri([x1, y0, z0], [x1, y0, z1], [x0, y0, z0], color)
  tri([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], color)
  tri([x1, y0, z1], [x1, y0, z0], [x1, y1, z1], color)
  tri([x0, y0, z0], [x0, y1, z1], [x0, y1, z0], color)
  tri([x0, y0, z1], [x0, y1, z1], [x0, y0, z0], color)
  host.pop()
}

function cubeWires(
  host: Raylib3DHost,
  line: Line,
  p: Vec3,
  w: number,
  h: number,
  l: number,
  color: number,
) {
  host.push()
  host.translate(p[0], p[1], p[2])
  const x0 = -w / 2
  const x1 = w / 2
  const y0 = -h / 2
  const y1 = h / 2
  const z0 = -l / 2
  const z1 = l / 2
  for (const z of [z1, z0]) {
    line([x0, y0, z], [x1, y0, z], color)
    line([x1, y0, z], [x1, y1, z], color)
    line([x1, y1, z], [x0, y1, z], color)
    line([x0, y1, z], [x0, y0, z], color)
  }
  line([x0, y1, z1], [x0, y1, z0], color)
  line([x1, y1, z1], [x1, y1, z0], color)
  line([x0, y0, z1], [x0, y0, z0], color)
  line([x1, y0, z1], [x1, y0, z0], color)
  host.pop()
}

/** DrawSphereEx: the optimized version (rotations instead of sin/cos per vertex). */
function sphere(
  host: Raylib3DHost,
  tri: Tri,
  p: Vec3,
  radius: number,
  rings: number,
  slices: number,
  color: number,
) {
  host.push()
  host.translate(p[0], p[1], p[2])
  host.scale(radius, radius, radius)
  const ringAngle = DEG2RAD * (180 / (rings + 1))
  const sliceAngle = DEG2RAD * (360 / slices)
  const cosRing = Math.fround(Math.cos(ringAngle))
  const sinRing = Math.fround(Math.sin(ringAngle))
  const cosSlice = Math.fround(Math.cos(sliceAngle))
  const sinSlice = Math.fround(Math.sin(sliceAngle))
  let v0: Vec3 = [0, 0, 0]
  let v1: Vec3 = [0, 0, 0]
  let v2: Vec3 = [0, 1, 0]
  let v3: Vec3 = [sinRing, cosRing, 0]
  for (let i = 0; i < rings + 1; i++) {
    for (let j = 0; j < slices; j++) {
      v0 = v2
      v1 = v3
      v2 = [cosSlice * v2[0] - sinSlice * v2[2], v2[1], sinSlice * v2[0] + cosSlice * v2[2]]
      v3 = [cosSlice * v3[0] - sinSlice * v3[2], v3[1], sinSlice * v3[0] + cosSlice * v3[2]]
      tri(v0, v3, v1, color)
      tri(v0, v2, v3, color)
    }
    v2 = v3
    v3 = [cosRing * v3[0] + sinRing * v3[1], -sinRing * v3[0] + cosRing * v3[1], v3[2]]
  }
  host.pop()
}

function sphereWires(
  host: Raylib3DHost,
  line: Line,
  p: Vec3,
  radius: number,
  rings: number,
  slices: number,
  color: number,
) {
  host.push()
  host.translate(p[0], p[1], p[2])
  host.scale(radius, radius, radius)
  const at = (i: number, j: number): Vec3 => {
    const ring = DEG2RAD * (270 + (180 / (rings + 1)) * i)
    const slice = DEG2RAD * ((360 * j) / slices)
    return [Math.cos(ring) * Math.sin(slice), Math.sin(ring), Math.cos(ring) * Math.cos(slice)]
  }
  for (let i = 0; i < rings + 2; i++) {
    for (let j = 0; j < slices; j++) {
      line(at(i, j), at(i + 1, j + 1), color)
      line(at(i + 1, j + 1), at(i + 1, j), color)
      line(at(i + 1, j), at(i, j), color)
    }
  }
  host.pop()
}

function cylinder(
  host: Raylib3DHost,
  tri: Tri,
  p: Vec3,
  top: number,
  bottom: number,
  height: number,
  sides: number,
  color: number,
) {
  const step = 360 / sides
  const ring = (i: number, radius: number, y: number): Vec3 => [
    Math.sin(DEG2RAD * i * step) * radius,
    y,
    Math.cos(DEG2RAD * i * step) * radius,
  ]
  host.push()
  host.translate(p[0], p[1], p[2])
  if (top > 0) {
    for (let i = 0; i < sides; i++) {
      tri(ring(i, bottom, 0), ring(i + 1, bottom, 0), ring(i + 1, top, height), color)
      tri(ring(i, top, height), ring(i, bottom, 0), ring(i + 1, top, height), color)
    }
    for (let i = 0; i < sides; i++)
      tri([0, height, 0], ring(i, top, height), ring(i + 1, top, height), color)
  } else {
    for (let i = 0; i < sides; i++)
      tri([0, height, 0], ring(i, bottom, 0), ring(i + 1, bottom, 0), color)
  }
  for (let i = 0; i < sides; i++) tri([0, 0, 0], ring(i + 1, bottom, 0), ring(i, bottom, 0), color)
  host.pop()
}

function cylinderWires(
  host: Raylib3DHost,
  line: Line,
  p: Vec3,
  top: number,
  bottom: number,
  height: number,
  sides: number,
  color: number,
) {
  const step = 360 / sides
  const ring = (i: number, radius: number, y: number): Vec3 => [
    Math.sin(DEG2RAD * i * step) * radius,
    y,
    Math.cos(DEG2RAD * i * step) * radius,
  ]
  host.push()
  host.translate(p[0], p[1], p[2])
  for (let i = 0; i < sides; i++) {
    line(ring(i, bottom, 0), ring(i + 1, bottom, 0), color)
    line(ring(i + 1, bottom, 0), ring(i + 1, top, height), color)
    line(ring(i + 1, top, height), ring(i, top, height), color)
    line(ring(i, top, height), ring(i, bottom, 0), color)
  }
  host.pop()
}

/** The four corners of side `i` of a cylinder between two points (DrawCylinderEx). */
function cylinderBasis(start: Vec3, end: Vec3) {
  const direction = sub(end, start)
  const b1 = normalize(perpendicular(direction))
  const b2 = normalize(cross(b1, direction))
  return (center: Vec3, angle: number, radius: number): Vec3 => {
    const s = Math.sin(angle) * radius
    const c = Math.cos(angle) * radius
    return [
      center[0] + s * b1[0] + c * b2[0],
      center[1] + s * b1[1] + c * b2[1],
      center[2] + s * b1[2] + c * b2[2],
    ]
  }
}

function cylinderEx(
  tri: Tri,
  start: Vec3,
  end: Vec3,
  startRadius: number,
  endRadius: number,
  sides: number,
  color: number,
) {
  const at = cylinderBasis(start, end)
  const base = (2 * Math.PI) / sides
  for (let i = 0; i < sides; i++) {
    const w1 = at(start, base * i, startRadius)
    const w2 = at(start, base * (i + 1), startRadius)
    const w3 = at(end, base * i, endRadius)
    const w4 = at(end, base * (i + 1), endRadius)
    if (startRadius > 0) tri(start, w2, w1, color)
    tri(w1, w2, w3, color)
    tri(w2, w4, w3, color)
    if (endRadius > 0) tri(end, w3, w4, color)
  }
}

function cylinderWiresEx(
  line: Line,
  start: Vec3,
  end: Vec3,
  startRadius: number,
  endRadius: number,
  sides: number,
  color: number,
) {
  const at = cylinderBasis(start, end)
  const base = (2 * Math.PI) / sides
  for (let i = 0; i < sides; i++) {
    const w1 = at(start, base * i, startRadius)
    const w2 = at(start, base * (i + 1), startRadius)
    const w3 = at(end, base * i, endRadius)
    const w4 = at(end, base * (i + 1), endRadius)
    line(w1, w2, color)
    line(w1, w3, color)
    line(w3, w4, color)
  }
}

/** DrawCapsule / DrawCapsuleWires: two hemispheres and the tube between them. */
function capsule(
  tri: Tri,
  line: Line,
  wires: boolean,
  start: Vec3,
  end: Vec3,
  radius: number,
  slices: number,
  rings: number,
  color: number,
) {
  let direction = sub(end, start)
  const sphereCase = direction[0] === 0 && direction[1] === 0 && direction[2] === 0
  if (sphereCase) direction = [0, 1, 0]
  let b0 = normalize(direction)
  const b1 = normalize(perpendicular(direction))
  const b2 = normalize(cross(b1, direction))
  let capCenter = end
  const sliceAngle = (2 * Math.PI) / slices
  const ringAngle = (Math.PI * 0.5) / rings
  const capPoint = (i: number, j: number): Vec3 => {
    const ringSin = Math.sin(sliceAngle * j) * Math.cos(ringAngle * i)
    const ringCos = Math.cos(sliceAngle * j) * Math.cos(ringAngle * i)
    const up = Math.sin(ringAngle * i)
    return [
      capCenter[0] + (up * b0[0] + ringSin * b1[0] + ringCos * b2[0]) * radius,
      capCenter[1] + (up * b0[1] + ringSin * b1[1] + ringCos * b2[1]) * radius,
      capCenter[2] + (up * b0[2] + ringSin * b1[2] + ringCos * b2[2]) * radius,
    ]
  }
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < slices; j++) {
        const w1 = capPoint(i, j)
        const w2 = capPoint(i, j + 1)
        const w3 = capPoint(i + 1, j)
        const w4 = capPoint(i + 1, j + 1)
        if (wires) {
          line(w1, w2, color)
          line(w2, w3, color)
          line(w1, w3, color)
          line(w2, w4, color)
          line(w3, w4, color)
        } else if (c === 0) {
          tri(w1, w2, w3, color)
          tri(w2, w4, w3, color)
        } else {
          tri(w1, w3, w2, color)
          tri(w2, w3, w4, color)
        }
      }
    }
    capCenter = start
    b0 = [-b0[0], -b0[1], -b0[2]]
  }
  if (sphereCase) return
  const around = (center: Vec3, j: number): Vec3 =>
    add(center, [
      Math.sin(sliceAngle * j) * radius * b1[0] + Math.cos(sliceAngle * j) * radius * b2[0],
      Math.sin(sliceAngle * j) * radius * b1[1] + Math.cos(sliceAngle * j) * radius * b2[1],
      Math.sin(sliceAngle * j) * radius * b1[2] + Math.cos(sliceAngle * j) * radius * b2[2],
    ])
  for (let j = 0; j < slices; j++) {
    const w1 = around(start, j)
    const w2 = around(start, j + 1)
    const w3 = around(end, j)
    const w4 = around(end, j + 1)
    if (wires) {
      line(w1, w3, color)
      line(w2, w4, color)
      line(w2, w3, color)
    } else {
      tri(w1, w2, w3, color)
      tri(w2, w4, w3, color)
    }
  }
}
