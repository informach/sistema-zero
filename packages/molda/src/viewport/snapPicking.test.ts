import { describe, expect, test } from 'bun:test'
import { BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { createModelAsset, createPart } from '../core/model'
import { raycastSnapTarget } from './snapPicking'

describe('raycastSnapTarget', () => {
  test('atravessa fontes, gêmeos e escondidas, mas acerta uma peça trancada', () => {
    const moving = createPart({
      id: 'moving',
      name: 'moving',
      from: [0, 0, 0],
      to: [1, 1, 1],
      color: 2,
    })
    const twin = { ...moving, id: 'twin', mirrorOf: 'moving' }
    const hidden = createPart({
      id: 'hidden',
      name: 'hidden',
      from: [0, 0, 0],
      to: [1, 1, 1],
      color: 2,
    })
    hidden.hidden = true
    const locked = createPart({
      id: 'locked',
      name: 'locked',
      from: [0, 0, 0],
      to: [1, 1, 1],
      color: 2,
    })
    locked.locked = true
    const behind = createPart({
      id: 'behind',
      name: 'behind',
      from: [0, 0, 0],
      to: [1, 1, 1],
      color: 2,
    })
    const model = {
      ...createModelAsset({ name: 'snap', starter: false }),
      parts: [moving, twin, hidden, locked, behind],
    }
    const material = new MeshBasicMaterial()
    const depths: Record<string, number> = { moving: 6, twin: 5, hidden: 4, locked: 3, behind: 2 }
    const objects = new Map(
      model.parts.map((part) => {
        const mesh = new Mesh(new BoxGeometry(1, 1, 1), material)
        mesh.position.z = depths[part.id] ?? 0
        mesh.userData.partId = part.id
        mesh.updateMatrixWorld(true)
        return [part.id, mesh]
      }),
    )
    const raycaster = new Raycaster(new Vector3(0, 0, 10), new Vector3(0, 0, -1))

    const hit = raycastSnapTarget(raycaster, model, ['moving'], (id) => objects.get(id))

    expect(hit?.object.userData.partId).toBe('locked')
    for (const mesh of objects.values()) mesh.geometry.dispose()
    material.dispose()
  })
})
