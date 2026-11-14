import { expect, test } from 'bun:test'
import type { MoradaCatalog, MoradaInstance, MoradaPiece } from '@sistemazero/core/morada'
import {
  AnimationClip,
  AnimationMixer,
  Bone,
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  Skeleton,
  SkinnedMesh,
  Texture,
  Vector3,
} from 'three'
import {
  moradaMovingParts,
  moradaPalette,
  prepareMoradaScene,
  stepMoradaAnimation,
  stepMoradaParts,
} from '../src/morada/instance'

test('pausa congela pose e gaveta; retomar continua de onde parou', () => {
  const root = new Group(),
    drawer = new Group(),
    animated = new Group()
  drawer.name = 'gaveta'
  animated.name = 'respiracao'
  root.add(drawer, animated)
  const mixer = new AnimationMixer(root)
  const clip = new AnimationClip('parado', 1, [
    new NumberKeyframeTrack('respiracao.position[y]', [0, 1], [0, 1]),
  ])
  mixer.clipAction(clip).play()
  const parts = moradaMovingParts(root, piece)
  if (!parts[0]) throw new Error('A gaveta precisa do interativo')
  parts[0].target = 1
  stepMoradaAnimation(mixer, parts, 0.1, false)
  const before = { y: animated.position.y, z: drawer.position.z }
  for (let i = 0; i < 10; i++) stepMoradaAnimation(mixer, parts, 0.1, true)
  expect(animated.position.y).toBe(before.y)
  expect(drawer.position.z).toBe(before.z)
  stepMoradaAnimation(mixer, parts, 0.1, false)
  expect(animated.position.y).toBeCloseTo(0.2)
  expect(drawer.position.z).toBeGreaterThan(before.z)
})

const piece: MoradaPiece = {
  id: 'armario',
  label: 'Armário',
  category: 'armarios',
  kind: 'furniture',
  group: 'armario',
  file: 'armario.glb',
  thumb: 'armario.webp',
  size: [1, 2, 1],
  min: [0, 0, 0],
  max: [1, 2, 1],
  mount: 'floor',
  colliders: [],
  collisionMeshes: ['colisao'],
  slots: [{ id: 'slot', center: [0, 1, 0], size: [0.5, 0.5, 0.5], part: 'gaveta' }],
  interactions: [{ id: 'gaveta', type: 'slide', axis: [0, 0, 1], amount: 0.5 }],
  materials: [{ name: 'atlas', map: 'paleta.png' }],
  colors: ['madeira'],
  tags: [],
  triangles: 12,
  animations: [],
  points: {},
}
const catalog: MoradaCatalog = {
  version: 1,
  source: { commit: 'teste', generatedAt: '2026-11-14' },
  pieces: { armario: piece },
  textures: {},
  palette: { madeira: { index: 0, hex: '#112233' } },
  files: [],
}
const instance: MoradaInstance = {
  id: 'primeiro',
  pieceId: 'armario',
  position: [0, 0, 0],
  rotation: 0,
}

test('trocar textura remove o tingimento autoral e permite uma cor explícita por cima', () => {
  const root = new Group()
  const material = new MeshStandardMaterial({ color: '#335577' })
  material.name = 'piso'
  root.add(new Mesh(new BoxGeometry(), material))
  const texture = new Texture()
  const textures = new Map([['madeira.png', texture]])
  const data = {
    ...catalog,
    textures: { madeira: { id: 'madeira', label: 'Madeira', kind: 'wood', file: 'madeira.png' } },
  }
  const plain = prepareMoradaScene(
    root,
    { ...piece, materials: [{ name: 'piso' }] },
    { materials: { piso: { texture: 'madeira' } } },
    data,
    textures,
  )
  const tinted = prepareMoradaScene(
    root,
    { ...piece, materials: [{ name: 'piso' }] },
    { materials: { piso: { texture: 'madeira', color: '#ff0000' } } },
    data,
    textures,
  )
  const original = root.children[0] as Mesh
  expect(
    ((plain.scene.children[0] as Mesh).material as MeshStandardMaterial).color.getHexString(),
  ).toBe('ffffff')
  expect(
    ((tinted.scene.children[0] as Mesh).material as MeshStandardMaterial).color.getHexString(),
  ).toBe('ff0000')
  expect((original.material as MeshStandardMaterial).color.getHexString()).toBe('335577')
  plain.dispose()
  tinted.dispose()
})

test('montagens preservam a origem, compartilham geometria e isolam cores e partes móveis', () => {
  const original = new Group()
  const geometry = new BoxGeometry()
  const material = new MeshStandardMaterial()
  material.name = 'atlas'
  const drawer = new Mesh(geometry, material)
  drawer.name = 'gaveta'
  drawer.position.set(0.3, 0.7, 0.2)
  const slot = new Group()
  slot.name = 'slot'
  drawer.add(slot)
  const collider = new Mesh(geometry, material)
  collider.name = 'colisao'
  original.add(drawer, collider)
  const sourceTexture = new Texture()
  const first = prepareMoradaScene(
    original,
    piece,
    { ...instance, colors: { madeira: '#ff0000' } },
    catalog,
    new Map([['paleta.png', sourceTexture]]),
  )
  const second = prepareMoradaScene(
    original,
    piece,
    instance,
    catalog,
    new Map([['paleta.png', sourceTexture]]),
  )
  const a = first.scene.getObjectByName('gaveta') as Mesh
  const b = second.scene.getObjectByName('gaveta') as Mesh
  expect(a.position.toArray()).toEqual([0.3, 0.7, 0.2])
  expect(a.geometry).toBe(geometry)
  expect(a.material).not.toBe(b.material)
  expect((a.material as MeshStandardMaterial).map).not.toBe(sourceTexture)
  expect((b.material as MeshStandardMaterial).map).toBe(sourceTexture)
  expect(first.scene.getObjectByName('colisao')?.visible).toBe(false)
  expect(collider.visible).toBe(true)
  const parts = moradaMovingParts(first.scene, piece)
  if (parts[0]) parts[0].target = 1
  stepMoradaParts(parts, 1)
  expect(a.position.z).toBeCloseTo(0.7)
  first.scene.updateMatrixWorld(true)
  expect(first.scene.getObjectByName('slot')?.getWorldPosition(new Vector3()).z).toBeCloseTo(0.7)
  expect(b.position.z).toBeCloseTo(0.2)
  expect(drawer.position.z).toBeCloseTo(0.2)
  let geometryDisposed = false,
    textureDisposed = false
  geometry.addEventListener('dispose', () => {
    geometryDisposed = true
  })
  sourceTexture.addEventListener('dispose', () => {
    textureDisposed = true
  })
  first.dispose()
  second.dispose()
  expect(geometryDisposed).toBe(false)
  expect(textureDisposed).toBe(false)
})

test('pets têm ossos próprios e um mixer não move outro pet', () => {
  const original = new Group(),
    bone = new Bone()
  bone.name = 'Hips'
  original.add(bone)
  const mesh = new SkinnedMesh(new BoxGeometry(), new MeshStandardMaterial())
  original.add(mesh)
  mesh.bind(new Skeleton([bone]), new Matrix4())
  const a = prepareMoradaScene(original, piece, instance, catalog)
  const b = prepareMoradaScene(original, piece, instance, catalog)
  const clip = new AnimationClip('andar', 1, [
    new NumberKeyframeTrack('Hips.position[x]', [0, 1], [0, 1]),
  ])
  const mixer = new AnimationMixer(a.scene)
  mixer.clipAction(clip).play()
  mixer.update(0.5)
  expect(a.scene.getObjectByName('Hips')?.position.x).toBeCloseTo(0.5)
  expect(b.scene.getObjectByName('Hips')?.position.x).toBe(0)
  expect(bone.position.x).toBe(0)
  const sk = a.scene.children.find((x) => x instanceof SkinnedMesh) as SkinnedMesh
  expect(sk.skeleton.bones[0] === a.scene.getObjectByName('Hips')).toBe(true)
  a.dispose()
  b.dispose()
})

test('paleta troca a célula certa, preservando o restante e sem DOM', () => {
  const palette = moradaPalette(catalog, { madeira: '#aabbcc' })
  const data = palette.image.data
  if (!data) throw new Error('A paleta precisa ter pixels.')
  expect(Array.from(data.slice(15 * 16 * 4, 15 * 16 * 4 + 4))).toEqual([170, 187, 204, 255])
  expect(Array.from(data.slice(0, 4))).toEqual([255, 255, 255, 255])
  palette.dispose()
})
