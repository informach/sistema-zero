import { describe, expect, test } from 'bun:test'
import type { Mesh } from 'three'
import { MOLDE_FRONT_COLOR, SceneMoldeGuide } from './SceneMoldeGuide'

describe('guia do molde no palco', () => {
  test('a caixa em contorno e a frente rosa na face +z, só na tela', () => {
    const guide = new SceneMoldeGuide()
    expect(guide.root.visible).toBe(false)
    guide.update({ min: [-2, 0, -1], max: [2, 6, 1] })
    expect(guide.root.visible).toBe(true)
    expect(guide.root.children.map((c) => c.name)).toEqual([
      'molda-molde-box',
      'molda-molde-front',
      'molda-molde-front-outline',
    ])
    const veil = guide.root.children[1] as Mesh
    expect(veil.position.z).toBeGreaterThan(1)
    expect(veil.position.z).toBeLessThan(1.01)
    expect([veil.position.x, veil.position.y]).toEqual([0, 3])
    const material = veil.material as unknown as { color: { getHex(): number } }
    expect(material.color.getHex()).toBe(MOLDE_FRONT_COLOR)
  })

  test('o mesmo molde não reconstrói; sem molde some e solta o que tinha', () => {
    const guide = new SceneMoldeGuide()
    guide.update({ min: [-2, 0, -1], max: [2, 6, 1] })
    const box = guide.root.children[0]
    guide.update({ min: [-2, 0, -1], max: [2, 6, 1] })
    expect(guide.root.children[0]).toBe(box)
    guide.update(null)
    expect(guide.root.visible).toBe(false)
    expect(guide.root.children).toHaveLength(0)
    guide.dispose()
  })
})
