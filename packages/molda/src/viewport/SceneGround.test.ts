import { expect, test } from 'bun:test'
import { Box3, DirectionalLight, type Mesh, Plane, Ray, Vector3 } from 'three'
import { SceneGround } from './SceneGround'

test.each([
  0, 10, -4,
])('ground receiver contains projected caster corners at height %s without shading the whole stage', (height) => {
  const sun = new DirectionalLight()
  const ground = new SceneGround(document.createElement('canvas'), sun, () => {})
  try {
    const bounds = {
      min: [-3, height, -4] as [number, number, number],
      max: [3, height + 2, 4] as [number, number, number],
    }
    ground.update(bounds)
    ground.root.updateMatrixWorld(true)
    const receiver = ground.root.getObjectByName('molda-ground-shadow') as Mesh
    const footprint = new Box3().setFromObject(receiver)
    const surface = new Plane(new Vector3(0, 1, 0), -receiver.position.y)
    const direction = sun.target.position.clone().sub(sun.position).normalize()
    for (const x of [bounds.min[0], bounds.max[0]])
      for (const y of [bounds.min[1], bounds.max[1]])
        for (const z of [bounds.min[2], bounds.max[2]]) {
          const projected = new Ray(new Vector3(x, y, z), direction).intersectPlane(
            surface,
            new Vector3(),
          )!
          expect(projected.x).toBeGreaterThan(footprint.min.x)
          expect(projected.x).toBeLessThan(footprint.max.x)
          expect(projected.z).toBeGreaterThan(footprint.min.z)
          expect(projected.z).toBeLessThan(footprint.max.z)
        }
    expect(receiver.scale.x).toBeLessThan(8)
    expect(receiver.scale.y).toBeLessThan(10)
    ground.update(null)
    expect(receiver.visible).toBe(false)
    ground.update(bounds)
    expect(receiver.visible).toBe(true)
  } finally {
    ground.dispose()
  }
})
