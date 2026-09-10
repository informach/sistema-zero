import { expect, test } from 'bun:test'
import { unzipSync } from 'fflate'
import { validateBytes } from 'gltf-validator'
import sharp from 'sharp'
import { Color, Mesh, MeshPhongMaterial, type Object3D, SkinnedMesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { createSceneSkin } from '../scene/skinCommands'
import { readGlb, readImage } from '../testing/glbRead'
import { animatedScene } from '../testing/sceneAnimation'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { prepareSceneGlbInWorker } from '../workers/sceneGlb'
import { readSceneGlbReply, sceneGlbReply } from '../workers/sceneGlbProtocol'
import { encodeSceneFile } from './sceneFile'
import { encodeSceneGlb } from './sceneGlb'

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
function vertices(root: Object3D) {
  root.updateMatrixWorld(true)
  const result: number[][] = []
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return
    const index = node.geometry.index,
      position = node.geometry.getAttribute('position')
    for (let i = 0; i < (index?.count ?? position.count); i++) {
      const vertex = new Vector3()
      node.getVertexPosition(index ? index.getX(i) : i, vertex)
      vertex.applyMatrix4(node.matrixWorld)
      result.push(vertex.toArray().map((n) => Math.round(n * 1e5) / 1e5))
    }
  })
  return result.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
}
function dispose(root: Object3D) {
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return
    node.geometry.dispose()
    for (const material of Array.isArray(node.material) ? node.material : [node.material])
      material.dispose()
    if (node instanceof SkinnedMesh) node.skeleton.dispose()
  })
}

test('glTF worker embeds exactly the portable GLB binary, materials, hierarchy, skins and animations; Khronos validates it', async () => {
  const source = animatedScene(),
    before = structuredClone(source)
  const result = await prepareSceneGlbInWorker({
    document: source,
    documentId: source.id,
    revision: 1,
    animatedPaint: false,
    format: 'gltf',
  })
  const parsed = JSON.parse(decode(result.bytes)),
    portable = encodeSceneGlb(source, { allowLosses: true }),
    original = readGlb(portable.bytes)
  const uri = parsed.buffers[0].uri
  delete parsed.buffers[0].uri
  expect(parsed).toEqual(original.json)
  const buffer = Buffer.from(uri.split(',')[1], 'base64')
  const jsonEnd = 20 + new DataView(portable.bytes.buffer).getUint32(12, true)
  expect(buffer).toEqual(
    Buffer.from(portable.bytes.subarray(jsonEnd + 8, jsonEnd + 8 + buffer.length)),
  )
  const report = (await validateBytes(result.bytes, {
    format: 'gltf',
    maxIssues: 100,
    writeTimestamp: false,
  })) as { issues: { numErrors: number; numWarnings: number } }
  expect(report.issues.numErrors).toBe(0)
  expect(report.issues.numWarnings).toBe(0)
  expect(source).toEqual(before)
  // A result for another format cannot reuse this report or its consent.
  const token = {
    documentId: source.id,
    revision: 1,
    animatedPaint: false,
    format: 'gltf' as const,
  }
  expect(() =>
    readSceneGlbReply(sceneGlbReply(token, result), { ...token, format: 'obj' }),
  ).toThrow()
})

test('OBJ ZIP uses matching MTL names, sRGB colors, intact PNGs and opposite V convention; source is untouched', async () => {
  const source = animatedScene(),
    before = structuredClone(source)
  await expect(encodeSceneFile(source, { format: 'obj' })).rejects.toThrow('Confira')
  const result = await prepareSceneGlbInWorker({
    document: source,
    documentId: source.id,
    revision: 1,
    animatedPaint: true,
    format: 'obj',
  })
  expect(result.issues.map((issue) => issue.code)).toContain('obj-static')
  expect(result.clips).toEqual([])
  const files = unzipSync(result.bytes),
    obj = decode(files['modelo.obj']!),
    mtl = decode(files['modelo.mtl']!)
  const materials = new MTLLoader().parse(mtl, '')
  const model = new OBJLoader().parse(obj)
  expect(obj).toContain('mtllib modelo.mtl')
  expect(Object.keys(materials.materialsInfo).length).toBeGreaterThan(0)
  const glb = readGlb(encodeSceneGlb(source, { allowLosses: true }).bytes)
  for (const [name, bytes] of Object.entries(files)) {
    if (!name.endsWith('.png')) continue
    const id = Number(name.match(/\d+/)![0])
    expect(Buffer.from(bytes)).toEqual(Buffer.from(readImage(glb, id)))
    const image = await sharp(Buffer.from(bytes)).raw().toBuffer({ resolveWithObject: true })
    expect(image.info.width).toBeGreaterThan(0)
    expect(mtl).toContain(name)
  }
  expect(model.children.length).toBeGreaterThan(0)
  expect(source).toEqual(before)
  dispose(model)
})

test('OBJ rest pose matches the independent glTF skin consumer, including reflected and fractional world transforms', async () => {
  const fixture = makeSceneSkinFixture(),
    { id, ...input } = fixture.input
  const source = createSceneSkin(fixture.document, input, () => id)
  const original = encodeSceneGlb(source, { allowLosses: true })
  const loaded = await new GLTFLoader().parseAsync(original.bytes.buffer, '')
  const result = await encodeSceneFile(source, { format: 'obj', allowLosses: true })
  const files = unzipSync(result.bytes),
    obj = new OBJLoader().parse(decode(files['modelo.obj']!))
  try {
    expect(vertices(obj)).toEqual(vertices(loaded.scene))
    expect(vertices(obj).length).toBeGreaterThan(0)
    const info = new MTLLoader().parse(decode(files['modelo.mtl']!), '')
    const material = info.create('acabamento_0')
    const gltfMaterial = (loaded.scene.getObjectsByProperty('isMesh', true)[0] as Mesh).material
    expect(Array.isArray(gltfMaterial)).toBe(false)
    if (
      material instanceof MeshPhongMaterial &&
      !Array.isArray(gltfMaterial) &&
      'color' in gltfMaterial &&
      gltfMaterial.color instanceof Color
    )
      for (const channel of ['r', 'g', 'b'] as const)
        expect(material.color[channel]).toBeCloseTo(gltfMaterial.color[channel], 9)
  } finally {
    dispose(obj)
    dispose(loaded.scene)
  }
})
