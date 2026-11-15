import { beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { BoxGeometry, Group, Mesh, Quaternion, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { authoredColliderShapes, syncAuthoredCollider } from '../src/mundo/morada-colisao'
import { glbDeAutoria } from './ajuda-glb-autoria'

const require = createRequire(import.meta.url)
const RAPIER = (
  await import(
    require.resolve('@dimforge/rapier3d-compat', {
      paths: [require.resolve('@react-three/rapier')],
    })
  )
).default
beforeAll(async () => {
  await RAPIER.init()
})

test('colisão autoral com várias primitivas conserva todas as malhas do grupo glTF', async () => {
  const file = await glbDeAutoria(['face-a', 'face-b'])
  const gltf = await new GLTFLoader().parseAsync(file.buffer, '')
  const node = gltf.scene.getObjectByName('criacao')!
  expect(node.children).toHaveLength(2)
  expect(authoredColliderShapes(gltf.scene, ['criacao'])).toHaveLength(2)
})

test('malha de colisão acompanha mover, girar e mudar o cômodo sem deixar parede invisível', () => {
  const room = new Group(),
    instance = new Group(),
    root = new Group()
  room.position.set(3, 0, 1)
  room.add(instance)
  instance.add(root)
  const mesh = new Mesh(new BoxGeometry(0.5, 2, 3))
  mesh.name = 'colisao'
  mesh.position.set(0.2, 1, 0.3)
  mesh.scale.set(0.6, 1, 1.2)
  root.add(mesh)
  const original = mesh.geometry.getAttribute('position').array.slice()
  const shape = authoredColliderShapes(root, ['colisao'])[0]!
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
  try {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased())
    world.createCollider(RAPIER.ColliderDesc.trimesh(shape.vertices, shape.indices), body)
    const position = new Vector3(),
      rotation = new Quaternion()
    const sync = () => {
      syncAuthoredCollider(shape.node, body, position, rotation)
      world.step()
    }
    const hit = (x: number, z: number) =>
      world.castRay(new RAPIER.Ray({ x, y: 5, z }, { x: 0, y: -1, z: 0 }), 10, true)
    sync()
    expect(hit(3.2, 1.3)).not.toBeNull()
    expect(hit(3.2, 2.3)).not.toBeNull()
    expect(hit(4.2, 1.3)).toBeNull()
    instance.position.set(4, 0, -2)
    instance.rotation.y = Math.PI / 2
    sync()
    const center = mesh.getWorldPosition(new Vector3())
    expect(hit(3.2, 1.3)).toBeNull()
    expect(hit(center.x, center.z)).not.toBeNull()
    expect(hit(center.x + 1, center.z)).not.toBeNull()
    expect(hit(center.x, center.z + 1)).toBeNull()
    // Agora gira só a parte móvel e depois desloca o cômodo inteiro.
    mesh.rotation.y = Math.PI / 2
    room.position.x += 5
    sync()
    const next = mesh.getWorldPosition(new Vector3())
    expect(hit(center.x, center.z)).toBeNull()
    expect(hit(next.x, next.z)).not.toBeNull()
    expect(hit(next.x + 1, next.z)).toBeNull()
    expect(hit(next.x, next.z + 1)).not.toBeNull()
    expect(mesh.geometry.getAttribute('position').array).toEqual(original)
  } finally {
    world.free()
  }
})
