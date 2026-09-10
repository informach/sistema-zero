import { zipSync } from 'fflate'
import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three'
import { linearUnitToSrgb } from '../core/colorTransfer'
import { requireScene } from '../scene/validation'
import { MAX_SCENE_GLB_BYTES } from './GlbBinary'
import type { SceneGlbIssue } from './sceneGlbReport'

// This is the private subset written by encodeSceneGlb, never an input-file reader.
interface EncodedScene {
  scene: number
  scenes: { nodes?: number[] }[]
  nodes?: {
    name: string
    translation: number[]
    rotation: number[]
    scale: number[]
    children?: number[]
    mesh?: number
    skin?: number
  }[]
  meshes?: {
    primitives: { attributes: Record<string, number>; indices: number; material: number }[]
  }[]
  accessors?: {
    bufferView: number
    byteOffset?: number
    count: number
    type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT4'
    componentType: number
  }[]
  bufferViews?: { byteOffset: number; byteLength: number }[]
  skins?: { joints: number[]; inverseBindMatrices: number }[]
  animations?: unknown[]
  materials?: {
    pbrMetallicRoughness: {
      baseColorFactor: number[]
      baseColorTexture?: { index: number }
      metallicFactor: number
      roughnessFactor: number
      metallicRoughnessTexture?: unknown
    }
    normalTexture?: unknown
    alphaMode: string
    doubleSided: boolean
  }[]
  textures?: { source: number }[]
  images?: { bufferView: number }[]
}

/** OBJ bakes the authored rest pose, world hierarchy and mirrors; the report requires consent. */
export function sceneGlbToObj(glb: Uint8Array<ArrayBuffer>, sourceId: string) {
  const jsonEnd = 20 + new DataView(glb.buffer).getUint32(12, true)
  const json: EncodedScene = JSON.parse(new TextDecoder().decode(glb.subarray(20, jsonEnd)))
  const binary = new DataView(glb.buffer, Math.min(jsonEnd + 8, glb.byteLength))
  const issues: SceneGlbIssue[] = [{ code: 'obj-structure', sourceId }]
  if (json.animations?.length || json.skins?.length) issues.push({ code: 'obj-static', sourceId })
  if (
    json.materials?.some(
      (m) =>
        m.pbrMetallicRoughness.baseColorTexture ||
        m.normalTexture ||
        m.pbrMetallicRoughness.metallicRoughnessTexture ||
        m.pbrMetallicRoughness.metallicFactor !== 0 ||
        m.pbrMetallicRoughness.roughnessFactor !== 1 ||
        m.alphaMode === 'MASK' ||
        m.doubleSided,
    )
  )
    issues.push({ code: 'obj-material', sourceId })
  const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }
  const accessor = (id: number) => {
    const a = json.accessors![id]!,
      view = json.bufferViews![a.bufferView]!
    const size = sizes[a.type],
      bytes = a.componentType === 5123 ? 2 : 4
    requireScene(
      a.componentType === 5126 || a.componentType === 5123 || a.componentType === 5125,
      'export',
      'Componente de malha inválido.',
    )
    const start = view.byteOffset + (a.byteOffset ?? 0)
    return {
      count: a.count,
      get: (i: number, k = 0) => {
        const offset = start + (i * size + k) * bytes
        return a.componentType === 5126
          ? binary.getFloat32(offset, true)
          : bytes === 2
            ? binary.getUint16(offset, true)
            : binary.getUint32(offset, true)
      },
    }
  }
  const worlds = new Map<number, Matrix4>()
  const visit = (id: number, parent: Matrix4) => {
    const node = json.nodes![id]!
    const world = new Matrix4()
      .compose(
        new Vector3().fromArray(node.translation),
        new Quaternion().fromArray(node.rotation),
        new Vector3().fromArray(node.scale),
      )
      .premultiply(parent)
    worlds.set(id, world)
    for (const child of node.children ?? []) visit(child, world)
  }
  for (const root of json.scenes[json.scene]!.nodes ?? []) visit(root, new Matrix4())
  const files: Record<string, Uint8Array> = {},
    text = new TextEncoder()
  const mtl: string[] = []
  for (const [i, material] of (json.materials ?? []).entries()) {
    const pbr = material.pbrMetallicRoughness,
      rgba = pbr.baseColorFactor
    mtl.push(
      `newmtl acabamento_${i}`,
      `Kd ${rgba.slice(0, 3).map(linearUnitToSrgb).join(' ')}`,
      `d ${rgba[3]}`,
      'Ks 0 0 0',
      'illum 2',
    )
    if (pbr.baseColorTexture) {
      const imageId = json.textures![pbr.baseColorTexture.index]!.source,
        filename = `pintura_${imageId}.png`
      if (!files[filename]) {
        const view = json.bufferViews![json.images![imageId]!.bufferView]!
        files[filename] = glb.subarray(
          jsonEnd + 8 + view.byteOffset,
          jsonEnd + 8 + view.byteOffset + view.byteLength,
        )
      }
      mtl.push(`map_Kd ${filename}`)
    }
    mtl.push('')
  }
  const obj = ['# Molda: formas na pose salva', 'mtllib modelo.mtl']
  let count = 0,
    textBytes = 0
  const push = (line: string) => {
    textBytes += line.length + 1 // All generated OBJ lines are ASCII.
    requireScene(
      textBytes <= MAX_SCENE_GLB_BYTES * 2,
      'export',
      'A malha ficou grande demais para OBJ. Reduza os detalhes das formas.',
    )
    obj.push(line)
  }
  const position = new Vector3(),
    normal = new Vector3(),
    normalMatrix = new Matrix3()
  for (const [nodeId, world] of worlds) {
    const node = json.nodes![nodeId]!
    if (node.mesh === undefined) continue
    push(`o peca_${nodeId}`)
    const skin = node.skin === undefined ? undefined : json.skins![node.skin]!
    const inverseBind = skin ? accessor(skin.inverseBindMatrices) : undefined
    const palette = skin?.joints.map((joint, i) =>
      worlds
        .get(joint)!
        .clone()
        .multiply(
          new Matrix4().fromArray(Array.from({ length: 16 }, (_, k) => inverseBind!.get(i, k))),
        ),
    )
    for (const primitive of json.meshes![node.mesh]!.primitives) {
      const a = primitive.attributes,
        positions = accessor(a.POSITION!),
        normals = accessor(a.NORMAL!),
        uvs = accessor(a.TEXCOORD_0!),
        indices = accessor(primitive.indices)
      const joints = palette ? accessor(a.JOINTS_0!) : undefined,
        weights = palette ? accessor(a.WEIGHTS_0!) : undefined
      const blended = new Matrix4()
      let reflected = world.determinant() < 0
      for (let i = 0; i < positions.count; i++) {
        let matrix = world
        if (palette && joints && weights) {
          blended.elements.fill(0)
          for (let slot = 0; slot < 4; slot++) {
            const weight = weights.get(i, slot)
            if (!weight) continue
            const joint = palette[joints.get(i, slot)]!
            for (let k = 0; k < 16; k++) blended.elements[k]! += joint.elements[k]! * weight
          }
          matrix = blended
          if (i === 0) reflected = matrix.determinant() < 0
        }
        position
          .set(positions.get(i, 0), positions.get(i, 1), positions.get(i, 2))
          .applyMatrix4(matrix)
        normal
          .set(normals.get(i, 0), normals.get(i, 1), normals.get(i, 2))
          .applyNormalMatrix(normalMatrix.getNormalMatrix(matrix))
        push(`v ${position.x} ${position.y} ${position.z}`)
        // OBJ's V origin is opposite to glTF; the existing top-down PNG is unchanged.
        push(`vt ${uvs.get(i, 0)} ${1 - uvs.get(i, 1)}`)
        push(`vn ${normal.x} ${normal.y} ${normal.z}`)
      }
      push(`usemtl acabamento_${primitive.material}`)
      for (let i = 0; i < indices.count; i += 3) {
        const order = reflected ? [0, 2, 1] : [0, 1, 2]
        push(
          `f ${order
            .map((k) => {
              const id = count + indices.get(i + k) + 1
              return `${id}/${id}/${id}`
            })
            .join(' ')}`,
        )
      }
      count += positions.count
    }
  }
  files['modelo.obj'] = text.encode(`${obj.join('\n')}\n`)
  files['modelo.mtl'] = text.encode(mtl.join('\n'))
  files['LEIA-ME.txt'] = text.encode(
    'Extraia todos os arquivos para a mesma pasta. Abra modelo.obj e mantenha modelo.mtl e as pinturas ao lado dele. Esta cópia tem formas estáticas na pose salva. Para continuar editando ossos, movimentos e camadas, guarde também o projeto Molda.\n',
  )
  return { bytes: zipSync(files, { level: 6 }), issues }
}
